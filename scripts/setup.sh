#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

echo "============================================"
echo " Sentinel - Disaster Platform: SETUP"
echo "============================================"

echo ""
echo "[1/5] Creating Python virtual environment (backend)..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

echo ""
echo "[2/5] Installing backend dependencies..."
pip install --upgrade pip > /dev/null
pip install -r requirements.txt

if [ ! -f ".env" ]; then
    echo ""
    echo "[3/5] Creating backend/.env from .env.example..."
    cp .env.example .env
else
    echo ""
    echo "[3/5] backend/.env already exists, skipping."
fi

echo ""
echo "[4/5] Training ML models and seeding demo data..."
python ml/training/train_models.py
python seed.py

deactivate
cd ..

echo ""
echo "[5/5] Installing frontend dependencies..."
cd frontend
if [ ! -f ".env" ]; then
    cp .env.example .env
fi
npm install
cd ..

echo ""
echo "============================================"
echo " Setup complete."
echo " Next: run scripts/start-backend.sh in one"
echo " terminal, and scripts/start-frontend.sh in"
echo " another."
echo "============================================"
