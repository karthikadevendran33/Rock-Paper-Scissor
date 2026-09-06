# Rock-Paper-Scissor

# AI Gesture Battle Arena

A 2-player local web application that runs Rock-Paper-Scissors battles using your webcam and a custom Teachable Machine model. Player 1 locks in a gesture invisibly, Player 2 scans next, and both moves reveal simultaneously to declare the round winner.

---

## Key Features

* **Zero-Knowledge Input Locking:** Masks Player 1's choice behind a lock status to prevent screen-peeking before Player 2 plays.
* **Stateless Model Processing:** Uses direct TensorFlow execution (`model(tensor, training=False)`) to eliminate Keras thread-caching bugs during back-to-back predictions.
* **Mirrored Frame Capture:** Flips webcam canvas matrices horizontally to match Teachable Machine's default training orientation.
* **Live Combat HUD:** Displays scores, real-time status updates, and a complete round-by-round battle log.

---

## Tech Stack

| Component | Technology |
| --- | --- |
| **Backend** | Python 3.9+, Flask, TensorFlow 2.x, Pillow, NumPy |
| **Frontend** | Vanilla JavaScript (Canvas API, Fetch API), HTML5, Cyberpunk CSS |
| **Machine Learning** | Keras (`.h5` model format), Teachable Machine export |

---

## Project Structure

```text
.
├── app.py                  # Flask routes, preprocessing, and model inference
├── keras_model.h5          # Exported TensorFlow/Keras binary
├── labels.txt              # Mapped class names (0 Rock, 1 Paper, 2 Scissor)
├── static/
│   ├── script.js           # MediaStream controller and game loop state
│   └── style.css           # Cyberpunk glassmorphism UI stylesheet
└── templates/
    └── index.html          # Arena layout template

```

---

## Quickstart Guide

1. **Install Dependencies:**
```bash
pip install flask tensorflow pillow numpy

```


2. **Verify Model Files:**
Ensure `keras_model.h5` and `labels.txt` reside in the root directory alongside `app.py`.
3. **Launch the Application:**
```bash
python app.py

```


Open `[http://127.0.0.1:5000](http://127.0.0.1:5000)` in your web browser.

---

## How to Play

1. Select max rounds (1, 3, or 5) and click **INITIALIZE ARENA**.
2. **Player 1:** Form a gesture in front of the lens and click **SCAN PLAYER 1**. Your move locks invisibly.
3. **Player 2:** Step into the frame, form a gesture, and click **SCAN PLAYER 2**.
4. Both hands reveal simultaneously on-screen, and the winner is logged to the scoreboard!
