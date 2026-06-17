<div align="center">

# 🛡️ NetGuard AI

### ML-Based Network Intrusion Detection System

*Supervised machine learning applied to real-time network flow classification*

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.9.0-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Dataset](https://img.shields.io/badge/Dataset-CICIDS%202017-00d4ff?style=flat-square)](https://www.unb.ca/cic/datasets/ids-2017.html)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

**NetGuard AI** classifies network flows as **BENIGN** or **DDoS** in real time using a Random Forest
classifier trained on the CICIDS 2017 benchmark dataset. It achieves **99.89% accuracy** and
**F1-score 0.9991** with sub-millisecond inference latency — suitable for inline IDS deployment.

---

</div>

## 📸 Screenshots

| Dashboard | Live Scanner |
|---|---|
| ![Dashboard](screenshots/dashboard.png) | ![Scanner](screenshots/scanner.png) |

| Batch Analyzer | About / Research |
|---|---|
| ![Batch](screenshots/batch.png) | ![About](screenshots/about.png) |

> Add full-page screenshots to a `/screenshots` folder to populate the table above.

---

## ✨ Features

- **Real-time flow classification** — POST a 10-feature vector, receive BENIGN / ATTACK + confidence + threat level in <1 ms
- **Batch analysis** — Upload a CSV, get per-flow predictions, threat breakdown, and a downloadable dated report
- **Live threat feed** — Dashboard shows a simulated real-time alert feed using actual CICIDS 2017 test-set flows
- **Health monitoring** — Navbar polls `/api/health` every 30 seconds; green pulsing dot turns red when backend is offline
- **Toast notifications** — Non-blocking feedback for API errors, offline detection, and batch completion
- **Responsive layout** — Sidebar collapses to a hamburger drawer on screens narrower than 1280 px (tablet-friendly)
- **Page transition animations** — Smooth fade + slide via Framer Motion when switching pages
- **Research-grade About page** — Animated pipeline diagram, confusion matrix visualisation, feature importance analysis, and full academic references

---

## 🔬 Model Performance

Evaluated on a stratified 20% hold-out partition (45,143 flows) of the CICIDS 2017 Friday DDoS file.

| Metric | Value |
|---|---|
| **Accuracy** | 99.89% |
| **Precision** | 99.93% |
| **Recall** | 99.88% |
| **F1-Score** | 99.91% |
| True Positives | 25,575 |
| True Negatives | 19,520 |
| False Positives | 18 |
| False Negatives | 30 |
| **Inference latency** | < 1 ms / flow |

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + Vite | 19.2 / 8.0 |
| Styling | TailwindCSS (v4 Vite plugin) | 4.3.1 |
| Animation | Framer Motion | 12.4 |
| Charts | Recharts | 3.8 |
| Icons | Lucide React | 1.20 |
| CSV parsing | PapaParse | 5.5 |
| Backend | Flask + Flask-CORS | 3.1.3 |
| ML | scikit-learn | 1.9.0 |
| Data | pandas + numpy | 3.0.3 / 2.4.6 |
| Dataset | CICIDS 2017 (UNB) | Friday DDoS subset |

---

## 📁 Project Structure

```
netguard/
├── README.md
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx                # Root layout, page routing, health-check wiring
│       ├── index.css              # Tailwind + radar background + global CSS
│       ├── components/
│       │   ├── Navbar.jsx         # Top bar with live model-health indicator + hamburger
│       │   ├── Sidebar.jsx        # Collapsible navigation drawer
│       │   ├── Spinner.jsx        # Reusable loading spinner
│       │   └── Toast.jsx          # Context-based toast notification system
│       └── pages/
│           ├── Dashboard.jsx      # Overview, KPI cards, alert feed, donut chart
│           ├── LiveScanner.jsx    # Single-flow form with CRT scan animation
│           ├── BatchAnalyzer.jsx  # CSV drag-drop upload + batch classification
│           └── About.jsx          # Research paper-style methodology page
└── backend/
    ├── app.py                     # Flask REST API (4 endpoints, CORS enabled)
    ├── train_model.py             # Train + evaluate RandomForest on CICIDS data
    ├── download_data.py           # Fetch dataset, print class/row summary
    ├── requirements.txt
    └── model/                     # Created automatically by train_model.py
        ├── ids_model.pkl          # Trained RandomForestClassifier (6.3 MB)
        └── scaler.pkl             # Fitted StandardScaler (1.3 KB)
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Minimum |
|---|---|
| Node.js | 18 |
| Python | 3.10 |
| npm | 7 |

---

### 1 — Backend

```bash
cd netguard/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Download the dataset (~74 MB, saved to backend/data/cicids.csv)
python download_data.py

# Train the model (~30 s on a modern laptop)
python train_model.py

# Start the API server
python app.py                     # → http://localhost:5000
```

Expected `train_model.py` output:

```
Loaded 225,745 rows; dropped 34 with NaN/inf → 225,711 rows remain.
Train: 180,568   Test: 45,143
Accuracy : 0.9989   F1 score : 0.9991
Saved model  → backend/model/ids_model.pkl
Saved scaler → backend/model/scaler.pkl
```

---

### 2 — Frontend

```bash
# In a separate terminal
cd netguard/frontend

npm install           # Install all dependencies (including framer-motion, recharts, papaparse)
npm run dev           # → http://localhost:5173
```

Open `http://localhost:5173` in your browser. The green "Model Online" dot in the navbar confirms the backend is reachable.

---

## 📊 Dataset Download

The CICIDS 2017 dataset is published by the **Canadian Institute for Cybersecurity, University of New Brunswick** and is freely available for academic research.

### Automated (recommended)

```bash
cd backend
python download_data.py
```

Downloads `Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv` and saves it as `backend/data/cicids.csv`.

### Manual

1. Visit <https://www.unb.ca/cic/datasets/ids-2017.html>
2. Download **MachineLearningCSV.zip**
3. Extract `Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv`
4. Rename and place at `backend/data/cicids.csv`

> `data/` and `model/` are git-ignored — run both scripts before starting the API.

---

## 🌐 API Reference

All endpoints return JSON. CORS is enabled for all origins.

### `GET /api/health`

```json
{
  "status": "ok",
  "model": "loaded",
  "model_type": "RandomForestClassifier",
  "feature_count": 10,
  "feature_names": ["Flow Duration", "Total Fwd Packets", "..."]
}
```

### `GET /api/stats`

Returns hardcoded demo statistics for the dashboard KPI cards.

### `POST /api/predict`

**Request:**
```json
{
  "features": [72879388.0, 8.0, 4.0, 159.9, 0.2, 6625398.9, 0.0, 0.0, 0.0, 0.0]
}
```

Feature order (must match exactly):

| # | Feature | Unit |
|---|---|---|
| 0 | Flow Duration | µs |
| 1 | Total Fwd Packets | count |
| 2 | Total Backward Packets | count |
| 3 | Flow Bytes/s | B/s |
| 4 | Flow Packets/s | pps |
| 5 | Flow IAT Mean | µs |
| 6 | Fwd PSH Flags | count |
| 7 | Bwd PSH Flags | count |
| 8 | Fwd URG Flags | count |
| 9 | Bwd URG Flags | count |

**Response:**
```json
{
  "prediction": "ATTACK",
  "confidence": 0.9998,
  "threat_level": "HIGH",
  "attack_probability": 0.9998
}
```

Threat level mapping: `HIGH` (P > 0.9) · `MEDIUM` (P > 0.7) · `LOW` (P > 0.5) · `SAFE`

### `POST /api/analyze-batch`

**Request:** `{ "flows": [[...10 numbers], [...], ...] }`

**Response:** per-flow predictions + summary counts + threat breakdown.

---

## 🎓 Research Context

This project is developed for **academic research purposes**, targeting:

- **Network Resilience** — robustness of ML-based detection against volumetric DDoS
- **Secure Communications** — lightweight, latency-sensitive IDS suitable for network edge deployment

### Methodology summary

| Step | Detail |
|---|---|
| Dataset | CICIDS 2017 Friday DDoS — 225,745 CICFlowMeter flows |
| Feature selection | 10 of 78 features via Random Forest Gini importance |
| Preprocessing | StandardScaler; 34 rows with `∞`/NaN values dropped |
| Algorithm | `RandomForestClassifier(n_estimators=100, random_state=42)` |
| Split | Stratified 80 / 20 (seed 42) |
| Top feature | Total Fwd Packets — 41.76% importance |
| Limitation | Generalisation to other CICIDS attack families requires the full multi-day dataset |

### Citation

If you use this project or CICIDS 2017, please cite:

```bibtex
@inproceedings{sharafaldin2018cicids,
  title     = {Toward Generating a New Intrusion Detection Dataset and Intrusion Traffic Characterization},
  author    = {Sharafaldin, Iman and Habibi Lashkari, Arash and Ghorbani, Ali A.},
  booktitle = {4th International Conference on Information Systems Security and Privacy (ICISSP)},
  pages     = {108--116},
  year      = {2018},
  doi       = {10.5220/0006639801080116}
}
```

---

## 🛠️ Development Notes

### Re-training

```bash
cd backend && source venv/bin/activate
python train_model.py   # overwrites model/*.pkl
```

### Running both servers

```bash
# Terminal 1
cd backend && source venv/bin/activate && python app.py

# Terminal 2
cd frontend && npm run dev
```

### Batch CSV format

The Batch Analyzer accepts CSV files with these headers (CICIDS `MachineLearningCSV` format):

```
Flow Duration,Total Fwd Packets,Total Backward Packets,Flow Bytes/s,
Flow Packets/s,Flow IAT Mean,Fwd PSH Flags,Bwd PSH Flags,Fwd URG Flags,Bwd URG Flags
```

Leading spaces are trimmed automatically. Falls back to positional order if headers don't match.

---

## 📄 License

MIT — free for academic, research, and commercial use.

---

<div align="center">

*Built for **Network Resilience and Secure Communications** research.*

</div>
