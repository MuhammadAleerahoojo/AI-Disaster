@echo off
cd /d "%~dp0..\backend"
call venv\Scripts\activate.bat
echo Starting backend on http://localhost:8000  (docs at /docs)
uvicorn app.main:app --reload --port 8000
pause
