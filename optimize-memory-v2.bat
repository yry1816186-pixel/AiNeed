@echo off
title Windows Memory Optimization v2 - Deep Clean
echo ============================================
echo   Windows Memory Optimization v2
echo   Deep Clean for Dev Machine
echo   Run as Administrator!
echo ============================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Please run as Administrator!
    echo Right-click - Run as administrator
    pause
    exit /b 1
)

echo [1/9] Core system optimizations...
sc stop SysMain >nul 2>&1 & sc config SysMain start=disabled >nul 2>&1
sc stop WSearch >nul 2>&1 & sc config WSearch start=disabled >nul 2>&1
powercfg /h off 2>nul
powershell -Command "Disable-MMAgent -mc" 2>nul
echo   SysMain, Search, Hibernation, MemCompression: DONE

echo [2/9] Disabling telemetry and diagnostics...
sc stop DiagTrack >nul 2>&1 & sc config DiagTrack start=disabled >nul 2>&1
sc stop WerSvc >nul 2>&1 & sc config WerSvc start=disabled >nul 2>&1
sc stop WdiServiceHost >nul 2>&1 & sc config WdiServiceHost start=disabled >nul 2>&1
sc stop WdiSystemHost >nul 2>&1 & sc config WdiSystemHost start=disabled >nul 2>&1
sc stop whesvc >nul 2>&1 & sc config whesvc start=disabled >nul 2>&1
sc stop DPS >nul 2>&1 & sc config DPS start=disabled >nul 2>&1
sc stop dptftcs >nul 2>&1 & sc config dptftcs start=disabled >nul 2>&1
echo   DONE

echo [3/9] Disabling Bluetooth, Camera, Sensors...
sc stop bthserv >nul 2>&1 & sc config bthserv start=disabled >nul 2>&1
sc stop BTAGService >nul 2>&1 & sc config BTAGService start=disabled >nul 2>&1
sc stop BthAvctpSvc >nul 2>&1 & sc config BthAvctpSvc start=disabled >nul 2>&1
sc stop FrameServer >nul 2>&1 & sc config FrameServer start=disabled >nul 2>&1
sc stop FrameServerMonitor >nul 2>&1 & sc config FrameServerMonitor start=disabled >nul 2>&1
sc stop SensorService >nul 2>&1 & sc config SensorService start=disabled >nul 2>&1
sc stop lfsvc >nul 2>&1 & sc config lfsvc start=disabled >nul 2>&1
echo   DONE

echo [4/9] Disabling game, print, phone, sync, push...
sc stop GameInputRedistService >nul 2>&1 & sc config GameInputRedistService start=disabled >nul 2>&1
sc stop Spooler >nul 2>&1 & sc config Spooler start=disabled >nul 2>&1
sc stop StiSvc >nul 2>&1 & sc config StiSvc start=disabled >nul 2>&1
sc stop PhoneSvc >nul 2>&1 & sc config PhoneSvc start=disabled >nul 2>&1
sc stop WpnService >nul 2>&1 & sc config WpnService start=disabled >nul 2>&1
sc stop CDPSvc >nul 2>&1 & sc config CDPSvc start=disabled >nul 2>&1
sc stop OneSyncSvc_8833e >nul 2>&1 & sc config OneSyncSvc_8833e start=disabled >nul 2>&1
echo   DONE

echo [5/9] Disabling misc unnecessary services...
sc stop SSDPSRV >nul 2>&1 & sc config SSDPSRV start=disabled >nul 2>&1
sc stop SharedAccess >nul 2>&1 & sc config SharedAccess start=disabled >nul 2>&1
sc stop InventorySvc >nul 2>&1 & sc config InventorySvc start=disabled >nul 2>&1
sc stop DoSvc >nul 2>&1 & sc config DoSvc start=disabled >nul 2>&1
sc stop DusmSvc >nul 2>&1 & sc config DusmSvc start=disabled >nul 2>&1
sc stop TrkWks >nul 2>&1 & sc config TrkWks start=disabled >nul 2>&1
sc stop WebClient >nul 2>&1 & sc config WebClient start=disabled >nul 2>&1
sc stop wlidsvc >nul 2>&1 & sc config wlidsvc start=disabled >nul 2>&1
sc stop MapsBroker >nul 2>&1 & sc config MapsBroker start=disabled >nul 2>&1
sc stop LanmanServer >nul 2>&1 & sc config LanmanServer start=disabled >nul 2>&1
sc stop SQLWriter >nul 2>&1 & sc config SQLWriter start=disabled >nul 2>&1
sc stop WbioSrvc >nul 2>&1 & sc config WbioSrvc start=disabled >nul 2>&1
sc stop WaaSMedicSvc >nul 2>&1 & sc config WaaSMedicSvc start=disabled >nul 2>&1
sc stop TokenBroker >nul 2>&1 & sc config TokenBroker start=disabled >nul 2>&1
sc stop InstallService >nul 2>&1 & sc config InstallService start=disabled >nul 2>&1
echo   DONE

echo [6/9] Disabling Intel bloat services...
sc stop IntelAudioService >nul 2>&1 & sc config IntelAudioService start=disabled >nul 2>&1
sc stop ipfsvc >nul 2>&1 & sc config ipfsvc start=disabled >nul 2>&1
sc stop jhi_service >nul 2>&1 & sc config jhi_service start=disabled >nul 2>&1
sc stop WMIRegistrationService >nul 2>&1 & sc config WMIRegistrationService start=disabled >nul 2>&1
sc stop IntelGraphicsSoftwareService >nul 2>&1 & sc config IntelGraphicsSoftwareService start=disabled >nul 2>&1
echo   DONE

echo [7/9] Disabling third-party bloat services...
sc stop "Wallpaper Engine Service" >nul 2>&1 & sc config "Wallpaper Engine Service" start=disabled >nul 2>&1
sc stop NahimicService >nul 2>&1 & sc config NahimicService start=disabled >nul 2>&1
sc stop GlideXNearService >nul 2>&1 & sc config GlideXNearService start=disabled >nul 2>&1
sc stop GlideXRemoteService >nul 2>&1 & sc config GlideXRemoteService start=disabled >nul 2>&1
sc stop GlideXService >nul 2>&1 & sc config GlideXService start=disabled >nul 2>&1
sc stop GlideXServiceExt >nul 2>&1 & sc config GlideXServiceExt start=disabled >nul 2>&1
sc stop TobiiALENOVOYXX0 >nul 2>&1 & sc config TobiiALENOVOYXX0 start=disabled >nul 2>&1
sc stop "Flash Helper Service" >nul 2>&1 & sc config "Flash Helper Service" start=disabled >nul 2>&1
sc stop "OfficePLUS Service" >nul 2>&1 & sc config "OfficePLUS Service" start=disabled >nul 2>&1
sc stop "PCManager Service Store" >nul 2>&1 & sc config "PCManager Service Store" start=disabled >nul 2>&1
sc stop ElevocService >nul 2>&1 & sc config ElevocService start=disabled >nul 2>&1
sc stop PBCCRCPassGuardXInputService >nul 2>&1 & sc config PBCCRCPassGuardXInputService start=disabled >nul 2>&1
sc stop WSAIFabricSvc >nul 2>&1 & sc config WSAIFabricSvc start=disabled >nul 2>&1
echo   DONE

echo [8/9] Disabling startup apps and NVIDIA overlay...
powershell -Command "Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -EA 0 | Select-Object -Property * | Format-List" 2>nul
reg add "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" /v GlobalUserDisabled /t REG_DWORD /d 1 /f >nul 2>&1
reg delete "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" /v "NVIDIA Share" /f >nul 2>&1
reg delete "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" /v "NvBackend" /f >nul 2>&1
reg add "HKLM:\SOFTWARE\NVIDIA Corporation\NvControlPanel2\Client" /v OptInOrOutPreference /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM:\SOFTWARE\NVIDIA Corporation\Global\GFExperience" /v Enabled /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search" /v SearchboxTaskbarMode /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v ShowCopilotButton /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v TaskbarDa /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v TaskbarMn /t REG_DWORD /d 0 /f >nul 2>&1
echo   DONE

echo [9/11] Adding Defender exclusions and visual effects...
powershell -Command "Add-MpPreference -ExclusionPath 'C:\AiNeed' -EA 0; Add-MpPreference -ExclusionPath \"$env:USERPROFILE\.trae\" -EA 0; Add-MpPreference -ExclusionProcess 'node.exe' -EA 0; Add-MpPreference -ExclusionProcess 'trae.exe' -EA 0" 2>nul
powershell -Command "Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -Name VisualFXSetting -Value 3 -EA 0; Set-ItemProperty 'HKCU:\Control Panel\Desktop' -Name DragFullWindows -Value 0 -EA 0; Set-ItemProperty 'HKCU:\Control Panel\Desktop\WindowMetrics' -Name MinAnimate -Value 0 -EA 0; Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name TaskbarAnimations -Value 0 -EA 0; Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name ListviewShadow -Value 0 -EA 0; Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name ListviewAlphaSelect -Value 0 -EA 0" 2>nul
echo   DONE

echo [10/11] Setting Node.js memory limits for Trae IDE...
setx NODE_OPTIONS "--max-old-space-size=1536 --max-semi-space-size=64 --optimize-for-size" /M >nul 2>&1
if %errorLevel% neq 0 (
    setx NODE_OPTIONS "--max-old-space-size=1536 --max-semi-space-size=64 --optimize-for-size" >nul 2>&1
)
setx VSCODE_MAX_MEMORY 1536 /M >nul 2>&1
if %errorLevel% neq 0 (
    setx VSCODE_MAX_MEMORY 1536 >nul 2>&1
)
setx TSSERVER_MAX_MEMORY 1024 /M >nul 2>&1
if %errorLevel% neq 0 (
    setx TSSERVER_MAX_MEMORY 1024 >nul 2>&1
)
echo   NODE_OPTIONS: max-old-space-size=1536MB (was 4288MB)
echo   VSCODE_MAX_MEMORY=1536MB
echo   TSSERVER_MAX_MEMORY=1024MB

echo [11/11] Configuring pnpm concurrency limits...
if exist "c:\AiNeed\.npmrc" (
    findstr /C:"network-concurrency" c:\AiNeed\.npmrc >nul 2>&1
    if %errorLevel% neq 0 (
        echo. >> c:\AiNeed\.npmrc
        echo network-concurrency=3>> c:\AiNeed\.npmrc
        echo child-concurrency=2>> c:\AiNeed\.npmrc
        echo   Added concurrency limits to .npmrc
    ) else (
        echo   .npmrc already configured
    )
)
echo   DONE

echo.
echo ============================================
echo   ALL DONE! Restart your computer now.
echo ============================================
echo.
echo Services disabled this round (NEW):
echo   - MapsBroker (Maps)
echo   - LanmanServer (File sharing server)
echo   - SQLWriter (SQL VSS)
echo   - WbioSrvc (Biometric/Fingerprint)
echo   - WaaSMedicSvc (Update medic)
echo   - TokenBroker (Web account)
echo   - InstallService (Store install)
echo   - IntelAudioService, ipfsvc, jhi_service
echo   - WMIRegistrationService
echo   - IntelGraphicsSoftwareService
echo   - NVIDIA Overlay disabled
echo   - Taskbar widgets/Chat/Copilot removed
echo   - Background apps blocked
echo.
echo Node.js memory optimization (NEW):
echo   - Per-process heap: 4288MB -^> 1536MB
echo   - TS Server: capped at 1024MB
echo   - 4 Node processes: 17GB -^> 6GB max
echo   - pnpm concurrency limited to 3/2
echo.
pause
