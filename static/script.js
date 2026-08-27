let p1Image = null;
let p1Score = 0;
let p2Score = 0;
let currentRound = 1;
let maxRounds = 5;
let videoStream = null;

const GESTURE_ICONS = {
    "Rock": "✊",
    "Paper": "✋",
    "Scissors": "✌️",
    "Scissor": "✌️",
    "Unknown": "❓"
};

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const exitBtn = document.getElementById('exit-btn');

    if (startBtn) startBtn.addEventListener('click', startMatch);
    if (exitBtn) exitBtn.addEventListener('click', resetMatch);
});

async function startMatch() {
    const matchLengthSelect = document.getElementById('match-length');
    maxRounds = parseInt(matchLengthSelect.value) || 5;
    
    p1Score = 0;
    p2Score = 0;
    currentRound = 1;
    p1Image = null;

    document.getElementById('log-body').innerHTML = '';
    resetRoundDisplay();
    updateUI();

    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('arena-screen').classList.remove('hidden');

    const video1 = document.getElementById('webcam-p1');
    const video2 = document.getElementById('webcam-p2');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (video1) video1.srcObject = videoStream;
            if (video2) video2.srcObject = videoStream;
        } catch (err) {
            console.error("Webcam access error:", err);
            alert("Webcam permission is required to play.");
        }
    }
}

function resetRoundDisplay() {
    p1Image = null;
    document.getElementById('p1-status').innerText = 'READY TO SCAN';
    document.getElementById('p2-status').innerText = 'WAITING FOR P1';

    const p1Preview = document.getElementById('p1-preview');
    const p2Preview = document.getElementById('p2-preview');
    if (p1Preview) p1Preview.classList.add('hidden');
    if (p2Preview) p2Preview.classList.add('hidden');

    const p1Overlay = document.getElementById('p1-move-overlay');
    const p2Overlay = document.getElementById('p2-move-overlay');
    if (p1Overlay) p1Overlay.classList.add('hidden');
    if (p2Overlay) p2Overlay.classList.add('hidden');

    const p1Btn = document.getElementById('p1-scan-btn');
    const p2Btn = document.getElementById('p2-scan-btn');
    
    if (p1Btn) {
        p1Btn.disabled = false;
        p1Btn.classList.remove('btn-disabled');
    }
    if (p2Btn) {
        p2Btn.disabled = true;
        p2Btn.classList.add('btn-disabled');
    }

    document.getElementById('round-result-banner').innerText = `ROUND ${currentRound}/${maxRounds} - PLAYER 1 TURN`;
}

function captureWebcamFrame(videoId) {
    const video = document.getElementById(videoId);
    if (!video) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    // Mirror image capture to align with Teachable Machine training
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
}

function scanP1() {
    if (currentRound > maxRounds) {
        alert("Match complete! Click 'ABORT MATCH' to start a new game.");
        return;
    }

    p1Image = captureWebcamFrame('webcam-p1');
    if (!p1Image) return;

    // Keep image preview hidden so Player 2 cannot see Player 1's move
    const p1Preview = document.getElementById('p1-preview');
    if (p1Preview) {
        p1Preview.src = p1Image;
        p1Preview.classList.add('hidden');
    }

    document.getElementById('p1-status').innerText = 'LOCKED 🔒';
    const p1Overlay = document.getElementById('p1-move-overlay');
    if (p1Overlay) {
        p1Overlay.innerText = '🔒 MOVE LOCKED';
        p1Overlay.classList.remove('hidden');
    }

    const p1Btn = document.getElementById('p1-scan-btn');
    const p2Btn = document.getElementById('p2-scan-btn');
    p1Btn.disabled = true;
    p1Btn.classList.add('btn-disabled');

    document.getElementById('p2-status').innerText = 'READY TO SCAN!';
    p2Btn.disabled = false;
    p2Btn.classList.remove('btn-disabled');

    document.getElementById('round-result-banner').innerText = 'PLAYER 1 LOCKED! PLAYER 2 TURN.';
}

async function scanP2() {
    if (!p1Image) {
        alert("Player 1 must scan first!");
        return;
    }

    const p2Image = captureWebcamFrame('webcam-p2');
    if (!p2Image) return;

    const p2Btn = document.getElementById('p2-scan-btn');
    p2Btn.disabled = true;
    p2Btn.classList.add('btn-disabled');

    document.getElementById('round-result-banner').innerText = 'AI EVALUATING MATCH... 🧠';

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                p1_image: p1Image,
                p2_image: p2Image
            })
        });

        const data = await response.json();

        if (data.result) {
            const p1Move = data.player1_gesture;
            const p2Move = data.player2_gesture;
            const winnerText = data.result;

            const p1Icon = GESTURE_ICONS[p1Move] || '✋';
            const p2Icon = GESTURE_ICONS[p2Move] || '✋';

            // Reveal both snapshots after evaluation finishes
            const p1Preview = document.getElementById('p1-preview');
            const p2Preview = document.getElementById('p2-preview');
            if (p1Preview) {
                p1Preview.src = p1Image;
                p1Preview.classList.remove('hidden');
            }
            if (p2Preview) {
                p2Preview.src = p2Image;
                p2Preview.classList.remove('hidden');
            }

            document.getElementById('p1-status').innerText = `${p1Icon} ${p1Move.toUpperCase()}`;
            document.getElementById('p2-status').innerText = `${p2Icon} ${p2Move.toUpperCase()}`;

            const p1Overlay = document.getElementById('p1-move-overlay');
            const p2Overlay = document.getElementById('p2-move-overlay');
            if (p1Overlay) {
                p1Overlay.innerText = `${p1Icon} ${p1Move}`;
                p1Overlay.classList.remove('hidden');
            }
            if (p2Overlay) {
                p2Overlay.innerText = `${p2Icon} ${p2Move}`;
                p2Overlay.classList.remove('hidden');
            }

            if (winnerText.includes("PLAYER 1 WINS")) {
                p1Score++;
            } else if (winnerText.includes("PLAYER 2 WINS")) {
                p2Score++;
            }

            document.getElementById('round-result-banner').innerText = `P1 (${p1Move}) vs P2 (${p2Move}) ➔ ${winnerText}`;
            addLogEntry(currentRound, p1Move, p2Move, winnerText);

            currentRound++;

            if (currentRound > maxRounds) {
                let finalWinner = p1Score > p2Score 
                    ? "PLAYER 1 WINS THE MATCH! 🏆" 
                    : (p2Score > p1Score ? "PLAYER 2 WINS THE MATCH! 🏆" : "MATCH ENDED IN A TIE! 🤝");
                document.getElementById('round-result-banner').innerText = finalWinner;
            } else {
                setTimeout(() => {
                    resetRoundDisplay();
                }, 3500);
            }

            updateUI();
        }
    } catch (err) {
        console.error("Error evaluating round:", err);
        document.getElementById('round-result-banner').innerText = "ERROR SCANNING. TRY AGAIN.";
        resetRoundDisplay();
    }
}

function updateUI() {
    document.getElementById('p1-score').innerText = p1Score;
    document.getElementById('p2-score').innerText = p2Score;
    document.getElementById('round-indicator').innerText = `ROUND ${Math.min(currentRound, maxRounds)}/${maxRounds}`;
}

function addLogEntry(round, p1Move, p2Move, result) {
    const logBody = document.getElementById('log-body');
    if (!logBody) return;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>R${round}</td>
        <td>${p1Move}</td>
        <td>${p2Move}</td>
        <td>${result}</td>
    `;
    logBody.appendChild(row);
}

function resetMatch() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }

    document.getElementById('arena-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
    document.getElementById('log-body').innerHTML = '';
    p1Image = null;
}