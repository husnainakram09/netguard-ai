import os
import sys
import pandas as pd
import kagglehub

# DATASET = "chethuhn/network-intrusion-dataset"
DATASET = "bertvankeulen/cicids-2017"
# FILE_NAME = "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv"
FILE_NAME = "friday.csv"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_PATH = os.path.join(DATA_DIR, FILE_NAME)


def download_dataset():
    print("Downloading dataset from Kaggle...")

    path = kagglehub.dataset_download(DATASET)

    file_path = os.path.join(path, FILE_NAME)

    print(f"Found file at: {file_path}")
    return file_path


def load_csv(path: str) -> pd.DataFrame:
    try:
        return pd.read_csv(path, low_memory=False, encoding="utf-8")
    except UnicodeDecodeError:
        return pd.read_csv(path, low_memory=False, encoding="latin-1")


def main():
    try:
        file_path = download_dataset()

        print("Loading CSV safely...")
        df = load_csv(file_path)

        os.makedirs(DATA_DIR, exist_ok=True)
        OUTPUT_PATH = os.path.join(DATA_DIR, "cicids.csv") # to rename the output file to cicids.csv
        df.to_csv(OUTPUT_PATH, index=False)

        print("Saved to:", OUTPUT_PATH)

        print("\nRows:", len(df))
        print("Columns:", len(df.columns))

    except Exception as e:
        print("ERROR:", e)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())