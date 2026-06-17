"""
NetGuard AI — Flask REST API for intrusion detection.

Endpoints:
  GET  /api/health          → model status
  POST /api/predict         → single-flow classification
  POST /api/analyze-batch   → multi-flow classification with summary
  GET  /api/stats           → demo dashboard statistics
"""

import logging
import os
import sys

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

# ── Configuration ─────────────────────────────────────────────────────────────

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(BASE_DIR, "model", "ids_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "model", "scaler.pkl")

# Must match the order used in train_model.py exactly.
FEATURE_NAMES = [
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Flow IAT Mean",
    "Fwd PSH Flags",
    "Bwd PSH Flags",
    "Fwd URG Flags",
    "Bwd URG Flags",
]
FEATURE_COUNT = len(FEATURE_NAMES)

# ── App setup ─────────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# ── Load model & scaler at startup ────────────────────────────────────────────

_model       = None
_scaler      = None
_model_error: str | None = None

try:
    _model  = joblib.load(MODEL_PATH)
    _scaler = joblib.load(SCALER_PATH)
    log.info(
        "Loaded model (%s, %d features) and scaler from %s",
        type(_model).__name__,
        _model.n_features_in_,
        BASE_DIR,
    )
except Exception as exc:
    _model_error = str(exc)
    log.warning("Could not load model/scaler: %s", _model_error)

# ── Internal helpers ──────────────────────────────────────────────────────────

def _model_ready() -> bool:
    return _model is not None and _scaler is not None


def _threat_level(attack_prob: float) -> str:
    """
    Map attack probability to a human-readable threat level.
    Thresholds applied to P(ATTACK), regardless of predicted class,
    so even a flow predicted BENIGN with P(ATK)=0.45 shows LOW.
    """
    if attack_prob > 0.9:
        return "HIGH"
    if attack_prob > 0.7:
        return "MEDIUM"
    if attack_prob > 0.5:
        return "LOW"
    return "SAFE"


def _classify_one(raw_features: list[float]) -> dict:
    """
    Classify a single flow vector.

    Returns a dict with:
      prediction     – "ATTACK" or "BENIGN"
      confidence     – probability of the predicted class (0–1)
      threat_level   – HIGH / MEDIUM / LOW / SAFE  (driven by P(ATTACK))
      attack_probability – raw P(ATTACK) for transparency
    """
    # Pass as DataFrame so sklearn doesn't emit a feature-name warning.
    X      = pd.DataFrame([raw_features], columns=FEATURE_NAMES)
    Xs     = _scaler.transform(X)
    pred   = int(_model.predict(Xs)[0])          # 0 = BENIGN, 1 = ATTACK
    proba  = _model.predict_proba(Xs)[0]          # [P(BENIGN), P(ATTACK)]
    atk_p  = float(proba[1])
    label  = "ATTACK" if pred == 1 else "BENIGN"
    # confidence = probability assigned to the winning class
    confidence = float(proba[pred])
    return {
        "prediction":        label,
        "confidence":        round(confidence, 4),
        "threat_level":      _threat_level(atk_p),
        "attack_probability": round(atk_p, 4),
    }


def _validate_features(raw) -> tuple[list[float] | None, dict | None]:
    """
    Validate that `raw` is a list of exactly FEATURE_COUNT finite floats.
    Returns (parsed_list, None) on success or (None, error_dict) on failure.
    """
    if not isinstance(raw, list):
        return None, {
            "error": f"'features' must be an array, got {type(raw).__name__}"
        }
    if len(raw) != FEATURE_COUNT:
        return None, {
            "error": f"'features' must contain exactly {FEATURE_COUNT} numbers",
            "expected": FEATURE_COUNT,
            "received": len(raw),
            "feature_order": FEATURE_NAMES,
        }
    try:
        parsed = [float(v) for v in raw]
    except (TypeError, ValueError) as exc:
        return None, {"error": "All feature values must be numeric", "detail": str(exc)}
    if not all(np.isfinite(v) for v in parsed):
        return None, {"error": "Feature values must be finite (no NaN or Infinity)"}
    return parsed, None

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return jsonify(
        name="NetGuard AI API",
        status="ok",
        message="Backend is running.",
        endpoints=["/api/health", "/api/predict", "/api/analyze-batch", "/api/stats"],
    )


@app.get("/api/health")
def health():
    payload = {
        "status": "ok",
        "model":  "loaded" if _model_ready() else "unavailable",
    }
    if _model_error:
        payload["error"] = _model_error
    if _model_ready():
        payload["model_type"]      = type(_model).__name__
        payload["feature_count"]   = _model.n_features_in_
        payload["feature_names"]   = FEATURE_NAMES
    return jsonify(payload)


@app.post("/api/predict")
def predict():
    if not _model_ready():
        return jsonify(error="Model not loaded", detail=_model_error), 503

    body = request.get_json(silent=True)
    if body is None:
        return jsonify(error="Request body must be valid JSON"), 400

    features_raw = body.get("features")
    if features_raw is None:
        return jsonify(
            error="Missing required key 'features'",
            example={"features": [0.0] * FEATURE_COUNT},
        ), 400

    parsed, err = _validate_features(features_raw)
    if err:
        return jsonify(err), 400

    result = _classify_one(parsed)
    return jsonify(result)


@app.post("/api/analyze-batch")
def analyze_batch():
    if not _model_ready():
        return jsonify(error="Model not loaded", detail=_model_error), 503

    body = request.get_json(silent=True)
    if body is None:
        return jsonify(error="Request body must be valid JSON"), 400

    flows = body.get("flows")
    if flows is None:
        return jsonify(error="Missing required key 'flows'"), 400
    if not isinstance(flows, list) or len(flows) == 0:
        return jsonify(error="'flows' must be a non-empty array of feature arrays"), 400

    results = []
    errors  = []

    for idx, flow in enumerate(flows):
        parsed, err = _validate_features(flow)
        if err:
            errors.append({"index": idx, **err})
            continue
        row         = _classify_one(parsed)
        row["index"] = idx
        results.append(row)

    n_attacks = sum(1 for r in results if r["prediction"] == "ATTACK")
    n_benign  = len(results) - n_attacks
    threat_breakdown = {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "SAFE": 0}
    for r in results:
        threat_breakdown[r["threat_level"]] += 1

    response = {
        "total":            len(flows),
        "processed":        len(results),
        "attacks_detected": n_attacks,
        "benign":           n_benign,
        "threat_breakdown": threat_breakdown,
        "each_result":      results,
    }
    if errors:
        response["errors"] = errors

    return jsonify(response)


@app.get("/api/stats")
def stats():
    return jsonify(
        total_analyzed=15_420,
        attacks_blocked=342,
        accuracy=0.98,
        model_name="NetGuard-IDS v1.0",
        dataset="CICIDS 2017",
    )

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
