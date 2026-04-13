@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 寻裳 HarmonyOS Build Script
echo ========================================

set "NODE_HOME=C:\Program Files\Huawei\DevEco Studio\tools\node"
set "SDK_HOME=C:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony"
set "HVIGOR_HOME=C:\Program Files\Huawei\DevEco Studio\tools\hvigor"
set "PROJECT_DIR=c:\AiNeed\apps\harmony"

set "PATH=%NODE_HOME%;%PATH%"
set "HARMONYOS_SDK_HOME=%SDK_HOME%"
set "OHOS_SDK_HOME=%SDK_HOME%"
set "HVIGOR_USER_HOME=%PROJECT_DIR%\.hvigor"
set "HVIGOR_APP_HOME=%PROJECT_DIR%"

echo.
echo [Step 1] Clean project...
if exist "%PROJECT_DIR%\.hvigor\project_caches" rd /s /q "%PROJECT_DIR%\.hvigor\project_caches"

echo.
echo [Step 2] Build HAP...
cd /d "%PROJECT_DIR%"
"%NODE_HOME%\node.exe" "%HVIGOR_HOME%\bin\hvigorw.js" --mode module -p product=default -p module=entry@default assembleHap --no-daemon

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
dir /b "%PROJECT_DIR%\entry\build\default\outputs\default\*.hap" 2>nul

endlocal
