import os
import pickle
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "student_model.pkl")

MODEL: Any = None
MODEL_BUNDLE: Dict[str, Any] = {}
MODEL_LOADED = False
MODEL_ERROR = ""


def load_model() -> Tuple[bool, str]:
	"""Load model from an absolute path and keep startup crash-free."""
	global MODEL, MODEL_BUNDLE, MODEL_LOADED, MODEL_ERROR

	try:
		if not os.path.exists(MODEL_PATH):
			msg = f"Model file not found at: {MODEL_PATH}"
			print(f"[ERROR] {msg}")
			MODEL_LOADED = False
			MODEL_ERROR = msg
			return False, msg

		with open(MODEL_PATH, "rb") as model_file:
			loaded_obj = pickle.load(model_file)

		if isinstance(loaded_obj, dict) and "model" in loaded_obj:
			MODEL_BUNDLE = loaded_obj
			MODEL = loaded_obj["model"]
		else:
			MODEL = loaded_obj
			MODEL_BUNDLE = {}

		MODEL_LOADED = True
		MODEL_ERROR = ""
		print(f"[INFO] Model loaded successfully from: {MODEL_PATH}")
		return True, "Model loaded successfully"
	except Exception as exc:
		msg = f"Failed to load model: {str(exc)}"
		print(f"[ERROR] {msg}")
		MODEL = None
		MODEL_BUNDLE = {}
		MODEL_LOADED = False
		MODEL_ERROR = msg
		return False, msg


@app.route("/", methods=["GET"])
def health() -> Any:
	return "API is running", 200


@app.route("/predict", methods=["POST"])
def predict() -> Any:
	try:
		if not MODEL_LOADED or MODEL is None:
			return (
				jsonify(
					{
						"success": False,
						"error": "Model is not available.",
						"details": MODEL_ERROR,
					}
				),
				503,
			)

		payload = request.get_json(silent=True)
		if not payload:
			return (
				jsonify(
					{
						"success": False,
						"error": "Invalid request. JSON payload is required.",
					}
				),
				400,
			)

		feature_columns = MODEL_BUNDLE.get("feature_columns")
		defaults = MODEL_BUNDLE.get("defaults", {})

		if feature_columns:
			row = dict(defaults)
			for key in feature_columns:
				if key in payload:
					row[key] = payload[key]
			input_df = pd.DataFrame([row], columns=feature_columns)
		else:
			input_df = pd.DataFrame([payload])

		prediction_raw = MODEL.predict(input_df)
		prediction = int(np.asarray(prediction_raw).flatten()[0])

		response: Dict[str, Any] = {
			"success": True,
			"prediction": prediction,
			"label": "Slow Learner" if prediction == 1 else "Not Slow Learner",
		}

		if hasattr(MODEL, "predict_proba"):
			probabilities = MODEL.predict_proba(input_df)
			row_prob = np.asarray(probabilities)[0]
			slow_probability = float(row_prob[1]) if len(row_prob) > 1 else float(row_prob[0])
			response["slow_learner_probability"] = round(slow_probability * 100, 2)

		return jsonify(response), 200
	except Exception as exc:
		print(f"[ERROR] Prediction failed: {str(exc)}")
		return (
			jsonify(
				{
					"success": False,
					"error": "Prediction failed.",
					"details": str(exc),
				}
			),
			500,
		)


loaded, load_message = load_model()
if loaded:
	print("[INFO] Server started and model is ready.")
else:
	print(f"[WARN] Server started without model. {load_message}")
