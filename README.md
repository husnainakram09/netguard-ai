# NetGuard AI

A full-stack Intrusion Detection System project. This repository is currently a
**scaffold only** — both apps are initialized, wired together via CORS, and
verified to run, but no detection features have been built yet.

## Structure

```
netguard/
├── frontend/        Vite + React + TailwindCSS (v4)
└── backend/         Flask API
```

## Tech stack

| Layer    | Tools                                                              |
|----------|--------------------------------------------------------------------|
| Frontend | Vite 8, React 19, TailwindCSS 4 (via @tailwindcss/vite plugin)      |
| Backend  | Flask 3, flask-cors, pandas, scikit-learn, numpy, requests         |

## Prerequisites

- Node.js 18+ (developed on Node 22)
- Python 3.10+ (developed on Python 3.12)

## Frontend — setup & run

```bash
cd frontend
npm install          # restore dependencies (node_modules is not committed)
npm run dev          # start dev server at http://localhost:5173
npm run build        # production build into dist/
```

Tailwind is configured through the official Vite plugin (`@tailwindcss/vite`) in
`vite.config.js`. The entry stylesheet `src/index.css` imports Tailwind and loads
`tailwind.config.js` via the `@config` directive, so you can extend the theme or
add plugins in that file as the project grows.

## Backend — setup & run

```bash
cd backend
python3 -m venv venv                 # create the virtual environment
source venv/bin/activate             # Windows: venv\Scripts\activate
pip install -r requirements.txt      # restore dependencies (venv is not committed)
python app.py                        # start API at http://127.0.0.1:5000
```

Endpoints currently available:

- `GET /` — service info
- `GET /api/health` — health check

## Notes

`node_modules/` and `venv/` are intentionally excluded from the repository. Run
the install commands above to recreate them locally.
