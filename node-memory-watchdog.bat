@echo off
title Node.js Memory Watchdog
echo ============================================
echo   Node.js Memory Watchdog
echo   Monitoring and auto-reclaiming memory
echo   Press Ctrl+C to stop
echo ============================================
echo.

set THRESHOLD_MB=800
set CHECK_INTERVAL=10
set TOTAL_SYSTEM_MB=16192
set WARN_FREE_MB=2048

:loop
for /f "tokens=2 delims==" %%a in ('wmic OS get FreePhysicalMemory /value 2^>nul') do set FREE_MEM=%%a
set /a FREE_MB=%FREE_MEM: =%/1024

for /f %%a in ('tasklist /fi "imagename eq node.exe" /fo csv /nh 2^>nul ^| find /c /v ""') do set NODE_COUNT=%%a

echo [%time%] Free: %FREE_MB%MB | Node processes: %NODE_COUNT%

if %FREE_MB% LSS %WARN_FREE_MB% (
    echo [WARNING] Free memory below %WARN_FREE_MB%MB!
    echo   Attempting to trigger V8 GC on Node processes...
    
    for /f "tokens=2 delims=," %%p in ('tasklist /fi "imagename eq node.exe" /fo csv /nh 2^>nul') do (
        set PID=%%p
        set PID=!PID:"=!
        
        for /f "tokens=5" %%m in ('tasklist /fi "PID eq !PID!" /fo table /nh 2^>nul') do (
            set MEM=%%m
            set MEM=!MEM:,=!
            set MEM=!MEM: =!
            set MEM=!MEM:K=!
            set /a MEM_MB=!MEM!/1024
            
            if !MEM_MB! GTR %THRESHOLD_MB% (
                echo   [KILL] PID !PID! using !MEM_MB!MB -^> terminating
                taskkill /pid !PID! /f >nul 2>&1
            ) else (
                echo   [OK]   PID !PID! using !MEM_MB!MB
            )
        )
    )
)

setlocal enabledelayedexpansion
for /f "tokens=2 delims==" %%a in ('wmic OS get FreePhysicalMemory /value 2^>nul') do set FREE_AFTER=%%a
set /a FREE_AFTER_MB=%FREE_AFTER: =%/1024
echo   After cleanup: %FREE_AFTER_MB%MB free
endlocal

echo.
timeout /t %CHECK_INTERVAL% /nobreak >nul
goto loop
