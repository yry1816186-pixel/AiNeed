@echo off
echo Starting AI Fashion Service...
cd /d %~dp0\..

echo Checking Python environment...
python --version 2>nul
if errorlevel 1 (
    echo Python not found! Please install Python 3.11+
    pause
    exit /b 1
)

echo Installing dependencies...
pip install -e ml -q -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
if errorlevel 1 (
    echo Failed with Tsinghua mirror! Trying with Aliyun mirror...
    pip install -e ml -q -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com
    if errorlevel 1 (
        echo Failed with Aliyun mirror! Trying with official PyPI...
        pip install -e ml -q
    )
)

echo.
echo ========================================
echo Starting AI Service on port 8002
echo ========================================
echo.

python -m uvicorn ml.api.main:app --host 0.0.0.0 --port 8002 --reload

pause
