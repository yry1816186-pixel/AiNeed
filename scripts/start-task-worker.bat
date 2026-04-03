@echo off
echo Starting AI Task Worker...
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    exit /b1
)

REM Set environment variables
set REDIS_URL=redis://localhost:6379
set LOG_LEVEL=INFO

REM Change to ml directory
cd /d "%~dp0ml"

REM Start the task worker
echo Starting task worker for all queues...
python -m services.task_worker --all --redis-url %REDIS_URL%

pause
