#!/bin/bash
echo "Starting AI Fashion Service..."
cd "$(dirname "$0")"

echo "Checking Python environment..."
python3 --version || { echo "Python not found! Please install Python 3.10+"; exit 1; }

echo "Installing dependencies..."
pip3 install -r requirements.txt -q -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn || \
pip3 install -r requirements.txt -q -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com || \
pip3 install -r requirements.txt -q

echo ""
echo "========================================"
echo "Starting AI Service on port 8001"
echo "========================================"
echo ""

python3 -m uvicorn services.ai_service:app --host 0.0.0.0 --port 8001 --reload
