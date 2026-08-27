import os
import io
import base64
import numpy as np
from PIL import Image, ImageOps
from flask import Flask, request, jsonify, render_template

os.environ['TF_USE_LEGACY_KERAS'] = '1'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import tensorflow as tf
from tensorflow.keras.layers import DepthwiseConv2D

app = Flask(__name__)

original_init = DepthwiseConv2D.__init__
def patched_init(self, *args, **kwargs):
    kwargs.pop('groups', None)
    original_init(self, *args, **kwargs)
DepthwiseConv2D.__init__ = patched_init

original_from_config = DepthwiseConv2D.from_config
@classmethod
def patched_from_config(cls, config):
    if isinstance(config, dict):
        config.pop('groups', None)
    return original_from_config(config)
DepthwiseConv2D.from_config = patched_from_config

MODEL_PATH = 'keras_model.h5' if os.path.exists('keras_model.h5') else 'model.h5'
model = None
try:
    model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    print(f"✅ SUCCESS: Model '{MODEL_PATH}' loaded cleanly!")
except Exception as e:
    print(f"❌ CRITICAL ERROR loading model ({MODEL_PATH}): {e}")

LABELS_PATH = 'labels.txt'
CLASS_NAMES = []

if os.path.exists(LABELS_PATH):
    with open(LABELS_PATH, 'r', encoding='utf-8-sig') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(maxsplit=1)
            if len(parts) == 2 and parts[0].isdigit():
                CLASS_NAMES.append(parts[1].strip())
            else:
                CLASS_NAMES.append(line)
    print(f"✅ Loaded class labels from {LABELS_PATH}: {CLASS_NAMES}")
else:
    CLASS_NAMES = ['Rock', 'Paper', 'Scissor']
    print(f"⚠️ WARNING: {LABELS_PATH} not found. Using fallback list: {CLASS_NAMES}")

def preprocess_image(base64_string):
    try:
        if not base64_string:
            return None
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        img_bytes = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        image = ImageOps.fit(image, (224, 224), Image.Resampling.LANCZOS)

        image_array = np.asarray(image)
        normalized_image_array = (image_array.astype(np.float32) / 127.5) - 1.0
        return np.expand_dims(normalized_image_array, axis=0)
    except Exception as e:
        print(f"❌ Preprocessing Error: {e}")
        return None

def predict_gesture(base64_string, player_name):
    if model is None:
        return "Unknown"

    processed_data = preprocess_image(base64_string)
    if processed_data is None:
        return "Unknown"

    try:
        raw_predictions = model(processed_data, training=False).numpy()[0]
        max_index = int(np.argmax(raw_predictions))
        predicted_class = CLASS_NAMES[max_index]

        score_str = ", ".join(f"{CLASS_NAMES[i]}={raw_predictions[i]:.3f}" for i in range(len(CLASS_NAMES)))
        print(f"🎯 {player_name}: [{score_str}] -> {predicted_class}")
        return predicted_class
    except Exception as e:
        print(f"❌ Prediction Error for {player_name}: {e}")
        return "Unknown"

def evaluate_winner(p1, p2):
    def clean(g):
        g_cap = g.capitalize()
        return "Scissor" if g_cap in ["Scissors", "Scissor"] else g_cap

    p1_c = clean(p1)
    p2_c = clean(p2)

    if p1_c == "Unknown" or p2_c == "Unknown":
        return "UNKNOWN GESTURE DETECTED ❓"
    if p1_c == p2_c:
        return "IT'S A TIE! 🤝"

    winning_rules = {
        "Rock": "Scissor",
        "Scissor": "Paper",
        "Paper": "Rock"
    }

    if winning_rules.get(p1_c) == p2_c:
        return "PLAYER 1 WINS! 🏆"
    else:
        return "PLAYER 2 WINS! 🏆"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    p1_gesture = predict_gesture(data.get('p1_image'), "PLAYER 1")
    p2_gesture = predict_gesture(data.get('p2_image'), "PLAYER 2")

    result = evaluate_winner(p1_gesture, p2_gesture)
    return jsonify({
        'player1_gesture': p1_gesture,
        'player2_gesture': p2_gesture,
        'result': result
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)