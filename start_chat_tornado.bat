@echo off
title ChatTornado Launcher

echo ==========================================
echo        Starting ChatTornado...
echo ==========================================

:: Start React (Vite)
start "ChatTornado Frontend" cmd /k ^
cd /d "%~dp0" ^&^& ^
npm run dev -- --host

:: Start FastAPI Backend
start "ChatTornado Backend" cmd /k ^
cd /d "%~dp0backend" ^&^& ^
call venv\Scripts\activate.bat ^&^& ^
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

echo.
echo Frontend and Backend are starting...
echo You can close this launcher window.
pause