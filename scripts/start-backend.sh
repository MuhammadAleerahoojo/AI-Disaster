#!/usr/bin/env bash
cd "$(dirname "$0")/../backend"
source venv/bin/activate
echo "Starting backend on http://localhost:8000  (docs at /docs)"
uvicorn app.main:app --reload --port 8000
