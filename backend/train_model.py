"""
train_model.py — Incremental binary intrusion-detection training.

What this version does:
  1. Loads a labeled CSV dataset.
  2. Cleans NaN / Infinity values.
  3. Uses the same 10 CICIDS-style flow features.
  4. Encodes labels as:
       BENIGN = 0
       any non-BENIGN label = 1 attack
  5. If no model exists:
       creates a new SGDClassifier model.
  6. If an incremental model already exists:
       updates it with the new dataset using partial_fit().
  7. If an old non-incremental model exists, such as RandomForest:
       backs it up and creates a new incremental SGDClassifier model.
  8. Saves model and scaler to:
       model/ids_model.pkl
       model/scaler.pkl

Important:
  - This model supports predict_proba(), so your existing Flask API can keep using it.
  - Existing RandomForest models cannot be truly fine-tuned. The first run after
    switching to this script will create a new SGD model. Future runs can update it.
"""

import argparse
import os
import shutil
import sys
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import SGDClassifier
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
from sklearn.utils import shuffle


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DEFAULT_DATA_PATH = os.path.join(BASE_DIR, "data", "cicids.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")
MODEL_PATH = os.path.join(MODEL_DIR, "ids_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

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

LABEL_COL = "Label"
CLASSES = np.array([0, 1], dtype=int)  # 0 = BENIGN, 1 = ATTACK
RANDOM_STATE = 42


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train or incrementally update the NetGuard IDS model."
    )
    parser.add_argument(
        "--data",
        default=DEFAULT_DATA_PATH,
        help="Path to labeled CSV dataset. Default: data/cicids.csv",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Ignore existing model and train a new incremental model from this dataset.",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=3,
        help="Number of passes over the training split. Default: 3",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=20000,
        help="Mini-batch size for partial_fit. Default: 20000",
    )
    return parser.parse_args()


def load_and_clean(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset not found at {path}")

    df = pd.read_csv(path, low_memory=False)
    df.columns = df.columns.str.strip()

    missing = [c for c in FEATURES + [LABEL_COL] if c not in df.columns]
    if missing:
        raise KeyError(f"Columns not found after normalization: {missing}")

    df[FEATURES] = df[FEATURES].apply(pd.to_numeric, errors="coerce")
    df = df.replace([np.inf, -np.inf], np.nan)

    n_before = len(df)
    df = df.dropna(subset=FEATURES + [LABEL_COL])
    n_after = len(df)

    print(
        f"Loaded {n_before:,} rows; dropped {n_before - n_after:,} with NaN/inf "
        f"-> {n_after:,} rows remain."
    )

    return df


def encode_labels(df: pd.DataFrame) -> pd.Series:
    # BENIGN = 0, anything else such as DDoS / DoS / ATTACK = 1
    return (df[LABEL_COL].astype(str).str.strip().str.upper() != "BENIGN").astype(int)


def backup_file(path: str) -> None:
    if not os.path.exists(path):
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder = os.path.dirname(path)
    filename = os.path.basename(path)
    backup_path = os.path.join(folder, f"{filename}.backup_{timestamp}")

    shutil.copy2(path, backup_path)
    print(f"Backed up {filename} -> {backup_path}")


def backup_existing_artifacts() -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)
    backup_file(MODEL_PATH)
    backup_file(SCALER_PATH)


def make_model() -> SGDClassifier:
    """
    SGDClassifier with log_loss behaves like fast online logistic regression.
    It supports:
      - partial_fit()
      - predict()
      - predict_proba()
    """
    return SGDClassifier(
        loss="log_loss",
        penalty="l2",
        alpha=0.0001,
        max_iter=1,
        tol=None,
        random_state=RANDOM_STATE,
    )


def make_sample_weights(y: pd.Series) -> np.ndarray:
    """
    Balance BENIGN and ATTACK during training without using class_weight='balanced',
    because class_weight='balanced' is not safe for partial_fit workflows.
    """
    y_array = np.asarray(y, dtype=int)
    n_total = len(y_array)

    counts = {
        0: max(1, int((y_array == 0).sum())),
        1: max(1, int((y_array == 1).sum())),
    }

    weights_by_class = {
        0: n_total / (2.0 * counts[0]),
        1: n_total / (2.0 * counts[1]),
    }

    return np.array([weights_by_class[int(label)] for label in y_array], dtype=float)


def partial_fit_batches(
    model: SGDClassifier,
    X_scaled: np.ndarray,
    y: pd.Series,
    epochs: int,
    batch_size: int,
) -> SGDClassifier:
    y_array = np.asarray(y, dtype=int)

    if len(np.unique(y_array)) < 2:
        raise ValueError(
            "Dataset must contain both BENIGN and ATTACK rows for safe training/update."
        )

    sample_weights = make_sample_weights(y_array)

    for epoch in range(1, epochs + 1):
        X_epoch, y_epoch, w_epoch = shuffle(
            X_scaled,
            y_array,
            sample_weights,
            random_state=RANDOM_STATE + epoch,
        )

        for start in range(0, len(X_epoch), batch_size):
            end = start + batch_size
            model.partial_fit(
                X_epoch[start:end],
                y_epoch[start:end],
                classes=CLASSES,
                sample_weight=w_epoch[start:end],
            )

        print(f"Completed epoch {epoch}/{epochs}")

    return model


def can_incrementally_update(model) -> bool:
    return hasattr(model, "partial_fit") and hasattr(model, "predict_proba")


def safe_train_test_split(X: pd.DataFrame, y: pd.Series):
    """
    Use stratify only when both classes have at least two rows.
    This avoids errors with very small update datasets.
    """
    value_counts = y.value_counts()

    if len(value_counts) == 2 and int(value_counts.min()) >= 2:
        return train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=RANDOM_STATE,
            stratify=y,
        )

    return train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=RANDOM_STATE,
        stratify=None,
    )


def evaluate_model(model, scaler, X_test: pd.DataFrame, y_test: pd.Series) -> None:
    X_test_scaled = scaler.transform(X_test)
    y_pred = model.predict(X_test_scaled)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)

    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    print("\n=== Evaluation on current dataset test split ===")
    print("Positive class = ATTACK")
    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1 score : {f1:.4f}")

    print("\nConfusion matrix, rows = actual, cols = predicted:")
    print("                pred BENIGN   pred ATTACK")
    print(f"  act BENIGN   {tn:>12,}  {fp:>12,}")
    print(f"  act ATTACK   {fn:>12,}  {tp:>12}")

    print("\nClassification report:")
    print(
        classification_report(
            y_test,
            y_pred,
            labels=[0, 1],
            target_names=["BENIGN", "ATTACK"],
            digits=4,
            zero_division=0,
        )
    )

    if hasattr(model, "coef_"):
        print("Feature weights, larger absolute value = stronger model influence:")
        coefficients = model.coef_[0]
        for name, coef in sorted(
            zip(FEATURES, coefficients), key=lambda item: abs(item[1]), reverse=True
        ):
            print(f"  {name:<26} {coef:.6f}")


def main() -> int:
    args = parse_args()

    try:
        df = load_and_clean(args.data)
    except (FileNotFoundError, KeyError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    X = df[FEATURES].astype(float)
    y = encode_labels(df)

    benign_count = int((y == 0).sum())
    attack_count = int((y == 1).sum())

    print(
        f"Class balance: BENIGN(0) = {benign_count:,}   "
        f"ATTACK(1) = {attack_count:,}"
    )

    if y.nunique() < 2:
        print(
            "ERROR: Dataset must contain both BENIGN and ATTACK rows.",
            file=sys.stderr,
        )
        return 1

    X_train, X_test, y_train, y_test = safe_train_test_split(X, y)
    print(f"Train: {len(X_train):,} rows   Test: {len(X_test):,} rows")

    os.makedirs(MODEL_DIR, exist_ok=True)

    model_exists = os.path.exists(MODEL_PATH)
    scaler_exists = os.path.exists(SCALER_PATH)

    if args.reset:
        print("\nReset requested. Training a new incremental model.")
        backup_existing_artifacts()
        model = make_model()
        scaler = StandardScaler()
        scaler.fit(X_train)

    elif model_exists and scaler_exists:
        loaded_model = joblib.load(MODEL_PATH)
        loaded_scaler = joblib.load(SCALER_PATH)

        if can_incrementally_update(loaded_model):
            print("\nExisting incremental model found. Updating with new dataset.")
            model = loaded_model
            scaler = loaded_scaler

            if getattr(model, "n_features_in_", len(FEATURES)) != len(FEATURES):
                print(
                    f"ERROR: Existing model expects {model.n_features_in_} features, "
                    f"but this script has {len(FEATURES)} features.",
                    file=sys.stderr,
                )
                return 1
        else:
            print(
                "\nExisting model found, but it is not incremental "
                f"({type(loaded_model).__name__})."
            )
            print("Backing it up and creating a new SGDClassifier model.")
            backup_existing_artifacts()
            model = make_model()
            scaler = StandardScaler()
            scaler.fit(X_train)

    else:
        print("\nNo existing model/scaler found. Training a new incremental model.")
        model = make_model()
        scaler = StandardScaler()
        scaler.fit(X_train)

    # For updates, keep the existing scaler unchanged.
    # This avoids changing the feature space that the existing model already learned.
    X_train_scaled = scaler.transform(X_train)

    model = partial_fit_batches(
        model=model,
        X_scaled=X_train_scaled,
        y=y_train,
        epochs=max(1, args.epochs),
        batch_size=max(1, args.batch_size),
    )

    evaluate_model(model, scaler, X_test, y_test)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    print(f"\nSaved model  -> {MODEL_PATH}")
    print(f"Saved scaler -> {SCALER_PATH}")
    print("\nDone. Restart your Flask backend so it loads the updated model.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
