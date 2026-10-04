@echo off
setlocal
echo ============================================
echo  Sentinel - Disaster Platform: SETUP
echo ============================================

cd /d "%~dp0.."

echo.
echo [1/5] Creating Python virtual environment (backend)...
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat

echo.
echo [2/5] Installing backend dependencies...
pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
    echo Backend dependency install FAILED. See errors above.
    pause
    exit /b 1
)

if not exist .env (
    echo.
    echo [3/5] Creating backend\.env from .env.example...
    copy .env.example .env >nul
) else (
    echo.
    echo [3/5] backend\.env already exists, skipping.
)

echo.
echo [4/5] Training ML models and seeding demo data...
python ml\training\train_models.py
python seed.py

call venv\Scripts\deactivate.bat
cd ..

echo.
echo [5/5] Installing frontend dependencies (this can take a minute)...
cd frontend
if not exist .env (
    copy .env.example .env >nul
)
call npm install
if errorlevel 1 (
    echo Frontend dependency install FAILED. See errors above.
    pause
    exit /b 1
)
cd ..

echo.
echo ============================================
echo  Setup complete.
echo  Next: run scripts\start-backend.bat in one
echo  window, and scripts\start-frontend.bat in
echo  another.
echo ============================================
pause
