@echo off
title Node.js Memory Limiter - Trae IDE Optimizer
echo ============================================
echo   Node.js Memory Limiter for Trae IDE
echo   16GB RAM System Optimized
echo   No admin required - user-level settings
echo ============================================
echo.

echo [1/5] Setting NODE_OPTIONS to limit V8 heap...
setx NODE_OPTIONS "--max-old-space-size=2048 --max-semi-space-size=64 --optimize-for-size" >nul 2>&1
echo   max-old-space-size=2048MB (per process, was 4288MB)
echo   max-semi-space-size=64MB
echo   optimize-for-size=enabled

echo [2/5] Setting Trae/VS Code specific memory limits...
setx VSCODE_MAX_MEMORY 2048 >nul 2>&1
setx TSSERVER_MAX_MEMORY 1024 >nul 2>&1
echo   VSCODE_MAX_MEMORY=2048MB
echo   TSSERVER_MAX_MEMORY=1024MB

echo [3/5] Disabling Node.js experimental features that consume memory...
setx NODE_NO_WARNINGS 1 >nul 2>&1
setx NODE_COMPILE_CACHE 0 >nul 2>&1
echo   NODE_NO_WARNINGS=1
echo   NODE_COMPILE_CACHE=0

echo [4/5] Configuring pnpm to reduce memory footprint...
if exist "c:\AiNeed\.npmrc" (
    findstr /C:"network-concurrency" c:\AiNeed\.npmrc >nul 2>&1
    if %errorLevel% neq 0 (
        echo. >> c:\AiNeed\.npmrc
        echo network-concurrency=3>> c:\AiNeed\.npmrc
        echo child-concurrency=2>> c:\AiNeed\.npmrc
        echo   Added network-concurrency=3
        echo   Added child-concurrency=2
    ) else (
        echo   .npmrc already has concurrency settings
    )
) else (
    echo network-concurrency=3> c:\AiNeed\.npmrc
    echo child-concurrency=2>> c:\AiNeed\.npmrc
    echo   Created .npmrc with concurrency limits
)

echo [5/5] Applying to current session...
set NODE_OPTIONS=--max-old-space-size=2048 --max-semi-space-size=64 --optimize-for-size
set VSCODE_MAX_MEMORY=2048
set TSSERVER_MAX_MEMORY=1024
echo   Current session updated

echo.
echo ============================================
echo   DONE! Memory limits applied.
echo.
echo   BEFORE: Each Node process could use 4288MB
echo   AFTER:  Each Node process capped at 2048MB
echo.
echo   With 4 Node processes: 17GB -^> 8GB max
echo   This leaves 8GB for system + Trae IDE
echo.
echo   IMPORTANT: Restart Trae IDE for changes
echo   to take effect!
echo ============================================
echo.
pause
