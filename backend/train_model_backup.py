"""
train_model.py — Train a binary intrusion-detection classifier on CICIDS 2017.

Pipeline:
  load CSV -> drop NaN/inf -> select 10 flow features ->
  binary-encode label (BENIGN=0, attack=1) -> scale ->
  RandomForest (train on 80%) -> evaluate on 20% -> persist model + scaler.

A note on "step 6": there is no HuggingFace model in this script. TAPAS
(google/tapas-base) is a table-question-answering transformer, not a tabular
classifier, so it is not appropriate here. We use scikit-learn's
RandomForestClassifier and "fine-tune" it by fitting on the training split.
"""

import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "cicids.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")
MODEL_PATH = os.path.join(MODEL_DIR, "ids_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

# Requested features. CICIDS ships headers with stray leading spaces
# (e.g. ' Flow Duration'); we strip headers on load so these clean names resolve.
FEATURES = [
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
LABEL_COL = "Label"  # raw file calls it ' Label'; normalized to 'Label' on load
RANDOM_STATE = 42


def load_and_clean(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Dataset not found at {path}. Run download_data.py first."
        )

    df = pd.read_csv(path, low_memory=False)
    df.columns = df.columns.str.strip()  # fix CICIDS leading-space headers

    missing = [c for c in FEATURES + [LABEL_COL] if c not in df.columns]
    if missing:
        raise KeyError(f"Columns not found after normalization: {missing}")

    # Coerce features to numeric (some CICIDS exports store rates as "Infinity"),
    # treat +/-inf as missing, then drop any row containing NaN/inf.
    df[FEATURES] = df[FEATURES].apply(pd.to_numeric, errors="coerce")
    df = df.replace([np.inf, -np.inf], np.nan)

    n_before = len(df)
    df = df.dropna()
    n_after = len(df)
    print(
        f"Loaded {n_before:,} rows; dropped {n_before - n_after:,} with NaN/inf "
        f"-> {n_after:,} rows remain."
    )
    return df


def main() -> int:
    try:
        df = load_and_clean(DATA_PATH)
    except (FileNotFoundError, KeyError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    X = df[FEATURES].astype(float)
    # Binary label: BENIGN -> 0, any attack label -> 1.
    y = (df[LABEL_COL].astype(str).str.strip().str.upper() != "BENIGN").astype(int)
    print(
        f"Class balance: BENIGN(0) = {int((y == 0).sum()):,}   "
        f"attack(1) = {int((y == 1).sum()):,}"
    )

    # Split BEFORE scaling so the scaler is fit on training data only (no leakage).
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE, stratify=y
    )
    print(f"Train: {len(X_train):,} rows   Test: {len(X_test):,} rows")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # RandomForest is scale-invariant, but we scale (and save the scaler) as
    # requested so downstream/scale-sensitive models stay consistent.
    model = RandomForestClassifier(
        n_estimators=100, random_state=RANDOM_STATE, n_jobs=-1
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    print("\n=== Test-set performance (positive class = attack) ===")
    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1 score : {f1:.4f}")

    print("\nConfusion matrix (rows = actual, cols = predicted):")
    print("                pred BENIGN   pred ATTACK")
    print(f"  act BENIGN   {tn:>12,}  {fp:>12,}")
    print(f"  act ATTACK   {fn:>12,}  {tp:>12,}")

    print("\nClassification report:")
    print(
        classification_report(
            y_test, y_pred, target_names=["BENIGN", "ATTACK"], digits=4
        )
    )

    print("Feature importances:")
    for name, imp in sorted(
        zip(FEATURES, model.feature_importances_), key=lambda t: t[1], reverse=True
    ):
        print(f"  {name:<26} {imp:.4f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\nSaved model  -> {MODEL_PATH}")
    print(f"Saved scaler -> {SCALER_PATH}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
