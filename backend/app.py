import os
import pickle
from typing import Any, Dict

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "student-mat.csv")
MODEL_PATH = os.path.join(BASE_DIR, "..", "student_model.pkl")

app = Flask(__name__)
CORS(app)

model_bundle: Dict[str, Any] = {}


def _coerce_numeric_columns(df: pd.DataFrame) -> pd.DataFrame:
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="ignore")
    return df


def train_and_save_model() -> Dict[str, Any]:
    data = pd.read_csv(DATA_PATH, sep=";")
    data = _coerce_numeric_columns(data)

    if "G3" not in data.columns:
        raise ValueError("Dataset must include G3 column.")

    data["slow_learner"] = (data["G3"] < 10).astype(int)

    feature_columns = [col for col in data.columns if col not in ["G3", "slow_learner"]]
    X = data[feature_columns].copy()
    y = data["slow_learner"].copy()

    categorical_columns = X.select_dtypes(include=["object", "category"]).columns.tolist()
    numeric_columns = [col for col in feature_columns if col not in categorical_columns]

    for col in numeric_columns:
        X[col] = pd.to_numeric(X[col], errors="coerce")

    numeric_defaults = X[numeric_columns].median(numeric_only=True).to_dict()
    categorical_defaults = {
        col: X[col].mode(dropna=True).iloc[0] if not X[col].mode(dropna=True).empty else "unknown"
        for col in categorical_columns
    }

    defaults: Dict[str, Any] = {}
    for col in feature_columns:
        if col in numeric_defaults:
            defaults[col] = float(numeric_defaults[col]) if pd.notna(numeric_defaults[col]) else 0.0
        else:
            defaults[col] = categorical_defaults.get(col, "unknown")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_columns),
            ("num", "passthrough", numeric_columns),
        ]
    )

    model_candidates = {
        "RandomForest": RandomForestClassifier(n_estimators=300, random_state=42),
        "XGBoost": XGBClassifier(
            n_estimators=300,
            learning_rate=0.08,
            max_depth=5,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42,
            eval_metric="logloss",
            use_label_encoder=False,
        ),
    }

    best_name = ""
    best_accuracy = -1.0
    best_pipeline = None

    for name, clf in model_candidates.items():
        pipeline = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("classifier", clf),
            ]
        )

        pipeline.fit(X_train, y_train)
        preds = pipeline.predict(X_test)
        acc = accuracy_score(y_test, preds)

        if acc > best_accuracy:
            best_accuracy = acc
            best_name = name
            best_pipeline = pipeline

    if best_pipeline is None:
        raise RuntimeError("No model could be trained.")

    total_students = int(len(data))
    slow_pct = float(data["slow_learner"].mean() * 100)

    grade_bins = pd.cut(
        data["G3"],
        bins=[-0.1, 4.9, 9.9, 14.9, 20.0],
        labels=["0-4", "5-9", "10-14", "15-20"],
    )
    grade_distribution = (
        grade_bins.value_counts().sort_index().to_dict()
        if not grade_bins.isna().all()
        else {"0-4": 0, "5-9": 0, "10-14": 0, "15-20": 0}
    )

    bundle = {
        "model": best_pipeline,
        "best_model": best_name,
        "model_accuracy": float(best_accuracy),
        "feature_columns": feature_columns,
        "defaults": defaults,
        "total_students": total_students,
        "slow_learner_percentage": slow_pct,
        "grade_distribution": {k: int(v) for k, v in grade_distribution.items()},
    }

    with open(MODEL_PATH, "wb") as file:
        pickle.dump(bundle, file)

    return bundle


@app.route("/predict", methods=["POST"])
def predict() -> Any:
    if not model_bundle:
        return jsonify({"error": "Model is not loaded."}), 500

    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "JSON payload is required."}), 400

    print("[BACKEND] ========== PREDICTION REQUEST ==========")
    print(f"[BACKEND] Received payload: {payload}")
    
    row = dict(model_bundle["defaults"])
    feature_columns = model_bundle["feature_columns"]

    for key, value in payload.items():
        if key in feature_columns:
            row[key] = value

    input_df = pd.DataFrame([row], columns=feature_columns)
    
    print(f"[BACKEND] Feature columns: {feature_columns}")
    print(f"[BACKEND] Input DataFrame before conversion:")
    print(input_df)

    for col in feature_columns:
        if isinstance(model_bundle["defaults"].get(col), float):
            input_df[col] = pd.to_numeric(input_df[col], errors="coerce")
            input_df[col] = input_df[col].fillna(model_bundle["defaults"][col])

    print(f"[BACKEND] Input DataFrame after conversion:")
    print(input_df)
    
    model = model_bundle["model"]
    print(f"[BACKEND] Model type: {type(model)}")
    print(f"[BACKEND] Calling model.predict()...")
    
    pred = int(model.predict(input_df)[0])
    print(f"[BACKEND] Raw model.predict() output: {pred} (type: {type(pred).__name__})")
    
    proba = model.predict_proba(input_df)[0]
    print(f"[BACKEND] Raw model.predict_proba() output: {proba}")

    slow_idx = 1
    slow_probability = float(proba[slow_idx])
    confidence = slow_probability if pred == 1 else float(1 - slow_probability)
    
    print(f"[BACKEND] Slow probability: {slow_probability}")
    print(f"[BACKEND] Final prediction: {pred} (0=Normal, 1=Slow)")
    print(f"[BACKEND] Confidence: {confidence}")
    print("[BACKEND] ========== END PREDICTION ==========\n")

    recs = _get_remedial_recommendations(payload) if pred == 1 else []

    return jsonify(
        {
            "prediction": pred,
            "label": "Slow Learner" if pred == 1 else "Normal Student",
            "confidence": round(confidence * 100, 2),
            "slow_learner_probability": round(slow_probability * 100, 2),
            "model_used": model_bundle["best_model"],
            "recommendations": recs
        }
    )


@app.route("/stats", methods=["GET"])
def stats() -> Any:
    if not model_bundle:
        return jsonify({"error": "Model is not loaded."}), 500

    return jsonify(
        {
            "total_students": model_bundle["total_students"],
            "slow_learner_percentage": round(model_bundle["slow_learner_percentage"], 2),
            "model_accuracy": round(model_bundle["model_accuracy"] * 100, 2),
            "best_model": model_bundle["best_model"],
            "grade_distribution": model_bundle["grade_distribution"],
        }
    )


def _get_remedial_recommendations(row: Dict[str, Any]) -> list:
    """Generate actionable recommendations based on student indicators."""
    recs = []
    
    absences = float(row.get("absences", 0))
    failures = float(row.get("failures", 0))
    studytime = float(row.get("studytime", 2))
    g1 = float(row.get("G1", 10))
    g2 = float(row.get("G2", 10))
    
    if absences > 10:
        recs.append({
            "title": "Attendance Improvement Plan Needed",
            "desc": "Student is missing too many classes, coordinate with parents immediately.",
            "icon": "⚠️"
        })
    
    if studytime <= 2:
        recs.append({
            "title": "Increase Daily Study Hours",
            "desc": "Student needs minimum 2 hours of focused study per day, assign a study buddy.",
            "icon": "⚠️"
        })
    
    if failures > 0:
        recs.append({
            "title": "Subject Specific Remedial Classes Required",
            "desc": "Student has prior failures, needs targeted intervention in weak subjects.",
            "icon": "⚠️"
        })
    
    if g1 < 8 or g2 < 8:
        recs.append({
            "title": "Basic Concept Revision Needed",
            "desc": "Fundamental concepts are weak, start from basics before moving forward.",
            "icon": "⚠️"
        })
    
    if not recs:
        recs.append({
            "title": "General Monitoring Required",
            "desc": "Keep close track of this student's progress weekly.",
            "icon": "⚠️"
        })
    
    return recs


@app.route("/bulk_predict", methods=["POST"])
def bulk_predict() -> Any:
    if not model_bundle:
        return jsonify({"error": "Model is not loaded."}), 500

    file = request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"error": "No file provided."}), 400

    try:
        df = pd.read_csv(file, sep=";")
        df = _coerce_numeric_columns(df)
    except Exception as e:
        return jsonify({"error": f"CSV parsing failed: {str(e)}"}), 400

    feature_columns = model_bundle["feature_columns"]
    model = model_bundle["model"]
    defaults = model_bundle["defaults"]

    results = []
    for idx, row_data in df.iterrows():
        row = dict(defaults)
        
        for key in feature_columns:
            if key in row_data:
                row[key] = row_data[key]

        input_df = pd.DataFrame([row], columns=feature_columns)
        
        for col in feature_columns:
            if isinstance(defaults.get(col), float):
                input_df[col] = pd.to_numeric(input_df[col], errors="coerce")
                input_df[col] = input_df[col].fillna(defaults[col])

        pred = int(model.predict(input_df)[0])
        proba = model.predict_proba(input_df)[0]
        slow_idx = 1
        slow_probability = float(proba[slow_idx])
        confidence = slow_probability if pred == 1 else float(1 - slow_probability)

        recs = _get_remedial_recommendations(row_data.to_dict()) if pred == 1 else []

        results.append({
            "index": int(idx),
            "prediction": pred,
            "label": "Slow Learner" if pred == 1 else "Normal Student",
            "confidence": round(confidence * 100, 2),
            "recommendations": recs
        })

    return jsonify({"results": results, "total": len(results)})


if __name__ == "__main__":
    model_bundle = train_and_save_model()
    app.run(host="0.0.0.0", port=5000, debug=False)
else:
    # Train on import so endpoints work when served by a WSGI/flask command.
    model_bundle = train_and_save_model()
