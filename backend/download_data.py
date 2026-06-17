"""
download_data.py — Fetch and summarize the CICIDS 2017 DDoS dataset.

Downloads the "Friday-WorkingHours-Afternoon-DDos" CSV from CICIDS 2017,
saves it to data/cicids.csv, then prints a quick summary:
total rows, column names, and BENIGN vs attack counts.
"""

import os
import sys

import pandas as pd
import requests

DATA_URL = (
    "https://intrusion-detection.ca/MachineLearningCVE/"
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv"
)

# Resolve paths relative to this file so the script works from any CWD.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_PATH = os.path.join(DATA_DIR, "cicids.csv")


def download(url: str, dest: str) -> None:
    """Stream the dataset to disk — the file is large, so don't buffer it in memory."""
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print(f"Downloading dataset from:\n  {url}")
    with requests.get(url, stream=True, timeout=60) as response:
        response.raise_for_status()
        total = int(response.headers.get("Content-Length", 0))
        downloaded = 0
        with open(dest, "wb") as f:
            for chunk in response.iter_content(chunk_size=1 << 20):  # 1 MB chunks
                if not chunk:
                    continue
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded / total * 100
                    print(
                        f"\r  {downloaded / 1e6:6.1f} / {total / 1e6:.1f} MB ({pct:3.0f}%)",
                        end="",
                    )
        if total:
            print()
    print(f"Saved to: {dest}")


def load_csv(path: str) -> pd.DataFrame:
    """Read the CSV, falling back to latin-1 if it isn't valid UTF-8."""
    try:
        return pd.read_csv(path, low_memory=False)
    except UnicodeDecodeError:
        return pd.read_csv(path, low_memory=False, encoding="latin-1")


def find_label_column(df: pd.DataFrame) -> str:
    """CICIDS CSVs name the target column ' Label' (note the leading space)."""
    for col in df.columns:
        if col.strip().lower() == "label":
            return col
    raise KeyError("No 'Label' column found in the dataset.")


def summarize(path: str) -> None:
    df = load_csv(path)

    print("\n=== Dataset summary ===")
    print(f"Total rows:    {len(df):,}")
    print(f"Total columns: {len(df.columns)}")

    print("\nColumn names:")
    for i, col in enumerate(df.columns):
        print(f"  {i:>2}. {col!r}")

    label_col = find_label_column(df)
    labels = df[label_col].astype(str).str.strip()

    benign = int((labels.str.upper() == "BENIGN").sum())
    attacks = len(df) - benign

    print("\nBENIGN vs attacks:")
    print(f"  BENIGN : {benign:,}")
    print(f"  Attacks: {attacks:,}")

    print("\nPer-label counts:")
    for label, count in labels.value_counts().items():
        print(f"  {label:<22} {count:,}")


def main() -> int:
    try:
        download(DATA_URL, OUTPUT_PATH)
    except requests.RequestException as e:
        print(f"\nERROR: download failed: {e}", file=sys.stderr)
        return 1

    try:
        summarize(OUTPUT_PATH)
    except Exception as e:
        print(f"\nERROR: could not summarize dataset: {e}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
