@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 寻裳 HarmonyOS Build Script
echo ========================================

set "HVIGORW=C:\Program Files\Huawei\DevEco Studio\tools\hvigor\bin\hvigorw.bat"
set "SDK_ROOT=C:\Program Files\Huawei\DevEco Studio\sdk"
set "SDK_PATH=%SDK_ROOT%\default\openharmony"
set "PROJECT_DIR=c:\AiNeed\apps\harmony"
set "HVIGOR_USER_HOME=C:\hvigor-user-home"
set "NODE_HOME=C:\nodejs-no-space"

echo.
echo [Step 1] Checking build tools...
if not exist "%HVIGORW%" (
    echo ERROR: hvigorw.bat not found at %HVIGORW%
    exit /b 1
)
echo Found hvigorw: %HVIGORW%

if not exist "%NODE_HOME%\node.exe" (
    echo ERROR: no-space Node shim not found at %NODE_HOME%\node.exe
    exit /b 1
)
echo Found no-space Node shim: %NODE_HOME%\node.exe

echo.
echo [Step 2] Checking SDK...
if not exist "%SDK_PATH%" (
    echo ERROR: SDK not found at %SDK_PATH%
    exit /b 1
)
echo Found SDK: %SDK_PATH%

echo.
echo [Step 3] Setting environment variables...
set "DEVECO_SDK_HOME=%SDK_ROOT%"
set "OHOS_BASE_SDK_HOME=%SDK_ROOT%"
set "PATH=%NODE_HOME%;%PATH%"
echo DEVECO_SDK_HOME=%DEVECO_SDK_HOME%
echo OHOS_BASE_SDK_HOME=%OHOS_BASE_SDK_HOME%
echo HVIGOR_USER_HOME=%HVIGOR_USER_HOME%
echo NODE_HOME=%NODE_HOME%

echo.
echo [Step 4] Building HAP (HarmonyOS Ability Package)...
cd /d "%PROJECT_DIR%"
echo Running: "%HVIGORW%" assembleHap --mode module -p product=default
powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:DEVECO_SDK_HOME='%SDK_ROOT%'; $env:OHOS_BASE_SDK_HOME='%SDK_ROOT%'; $env:HVIGOR_USER_HOME='%HVIGOR_USER_HOME%'; $env:NODE_HOME='%NODE_HOME%'; $env:PATH='%NODE_HOME%;' + $env:PATH; Set-Location '%PROJECT_DIR%'; cmd /c '\"%HVIGORW%\" assembleHap --mode module -p product=default'"

if errorlevel 1 (
    echo.
    echo ========================================
    echo Build FAILED!
    echo ========================================
    exit /b 1
)

echo.
echo ========================================
echo Build SUCCESS!
echo ========================================
echo.
echo Output location: %PROJECT_DIR%\entry\build\default\outputs\default\
echo.

dir /b "%PROJECT_DIR%\entry\build\default\outputs\default\*.hap" 2>nul

endlocal
