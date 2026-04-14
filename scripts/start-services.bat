@echo off
chcp 65001 >nul
echo ========================================
echo    xuno 服务启动脚本
echo ========================================
echo.

echo [1/4] 检查 Docker 服务...
docker ps >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)
echo       Docker 运行正常

echo.
echo [2/4] 检查环境变量...
if not defined POSTGRES_PASSWORD (
    echo [错误] 请设置 POSTGRES_PASSWORD 环境变量
    echo        示例: set POSTGRES_PASSWORD=your_secure_password
    pause
    exit /b 1
)
if not defined MINIO_ROOT_PASSWORD (
    echo [错误] 请设置 MINIO_ROOT_PASSWORD 环境变量
    echo        示例: set MINIO_ROOT_PASSWORD=your_secure_password
    pause
    exit /b 1
)
if not defined REDIS_PASSWORD (
    echo [警告] REDIS_PASSWORD 未设置，将使用随机密码
    for /f "tokens=1-5 delims=/" %%a in ('echo %date% %time%') do set REDIS_PASSWORD=redis_%%a%%b%%c
)
echo       环境变量检查通过

echo.
echo [3/4] 启动基础服务...
docker start postgres 2>nul || docker run -d --name postgres -e POSTGRES_USER=xuno -e POSTGRES_PASSWORD=%POSTGRES_PASSWORD% -e POSTGRES_DB=xuno -p 5432:5432 postgres:15
docker start redis 2>nul || docker run -d --name redis --requirepass %REDIS_PASSWORD% -p 6379:6379 redis:7
docker start minio 2>nul || docker run -d --name minio -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=%MINIO_ROOT_PASSWORD% -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
echo       基础服务启动完成

echo.
echo [4/4] 启动后端服务...
start "xuno Backend" cmd /k "cd /d c:\xuno\apps\backend && pnpm dev"
echo       后端服务启动中... (http://localhost:3001)

echo.
echo [5/5] 启动 AI 服务...
start "xuno AI" cmd /k "cd /d c:\xuno\ml && python start_all_services.py"
echo       AI 服务启动中... (http://localhost:8001-8003)

echo.
echo ========================================
echo    所有服务已启动！
echo ========================================
echo.
echo    后端 API:     http://localhost:3001
echo    MinIO 控制台:  http://localhost:9001
echo    GLM Try-On:   http://localhost:8002
echo    SASRec:       http://localhost:8002
echo    Body Analysis: http://localhost:8003
echo.
echo    按 Ctrl+C 停止服务
echo ========================================
pause
