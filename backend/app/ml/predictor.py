"""
Loads trained joblib models (training them on the fly if missing) and
exposes clean prediction functions used by the API routers.
"""
import os
import subprocess
import sys
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_DIR = os.path.join(BASE_DIR, "ml", "models")

FLOOD_MODEL_PATH = os.path.join(MODEL_DIR, "flood_model.joblib")
FIRE_MODEL_PATH = os.path.join(MODEL_DIR, "fire_model.joblib")

_flood_bundle = None
_fire_bundle = None


def _train_if_missing():
    if not (os.path.exists(FLOOD_MODEL_PATH) and os.path.exists(FIRE_MODEL_PATH)):
        train_script = os.path.join(BASE_DIR, "ml", "training", "train_models.py")
        subprocess.run([sys.executable, train_script], check=True, cwd=BASE_DIR)


def _load_models():
    global _flood_bundle, _fire_bundle
    if _flood_bundle is None or _fire_bundle is None:
        _train_if_missing()
        _flood_bundle = joblib.load(FLOOD_MODEL_PATH)
        _fire_bundle = joblib.load(FIRE_MODEL_PATH)
    return _flood_bundle, _fire_bundle


def risk_level_from_score(score: float) -> str:
    if score < 0.30:
        return "LOW"
    if score < 0.55:
        return "MODERATE"
    if score < 0.80:
        return "HIGH"
    return "CRITICAL"


def predict_flood(features: dict):
    flood_bundle, _ = _load_models()
    model, feature_order = flood_bundle["model"], flood_bundle["features"]
    row = [[features[f] for f in feature_order]]
    score = float(model.predict(row)[0])
    score = max(0.0, min(1.0, score))

    importances = dict(zip(feature_order, model.feature_importances_.tolist()))
    top_factors = sorted(importances.items(), key=lambda kv: kv[1], reverse=True)[:4]
    factors = [{"factor": _humanize(name), "importance": round(val, 3), "value": features[name]} for name, val in top_factors]

    return {
        "risk_score": round(score, 4),
        "risk_level": risk_level_from_score(score),
        "contributing_factors": factors,
    }


def predict_fire(features: dict):
    _, fire_bundle = _load_models()
    model, feature_order = fire_bundle["model"], fire_bundle["features"]
    row = [[features[f] for f in feature_order]]
    score = float(model.predict(row)[0])
    score = max(0.0, min(1.0, score))

    importances = dict(zip(feature_order, model.feature_importances_.tolist()))
    top_factors = sorted(importances.items(), key=lambda kv: kv[1], reverse=True)[:4]
    factors = [{"factor": _humanize(name), "importance": round(val, 3), "value": features[name]} for name, val in top_factors]

    return {
        "risk_score": round(score, 4),
        "risk_level": risk_level_from_score(score),
        "contributing_factors": factors,
    }


def _humanize(name: str) -> str:
    return name.replace("_", " ").replace("pct", "%").replace("kmh", "km/h").replace("hpa", "hPa").replace("mm", "mm").replace("c", "°C").strip().title()
