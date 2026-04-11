# AiNeed AI Services Startup Script (PowerShell)
# 启动所有本地 AI 推理服务

param(
    [switch]$Core,      # 只启动核心服务
    [switch]$All,       # 启动所有服务
    [switch]$Install    # 安装依赖
)

$ErrorActionPreference = "Stop"

$ML_DIR = Split-Path -Parent $PSScriptRoot
$MODELS_DIR = Join-Path $ML_DIR "models"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AiNeed AI Services Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Python
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  Python not found! Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

# 安装依赖
if ($Install) {
    Write-Host ""
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    Push-Location $ML_DIR
    pip install -r requirements.txt
    Pop-Location
    Write-Host "  Dependencies installed" -ForegroundColor Green
}

# 创建模型目录
if (-not (Test-Path $MODELS_DIR)) {
    New-Item -ItemType Directory -Path $MODELS_DIR -Force | Out-Null
    Write-Host "Created models directory: $MODELS_DIR" -ForegroundColor Green
}

# 检查依赖
Write-Host ""
Write-Host "Checking required packages..." -ForegroundColor Yellow
$requiredPackages = @("torch", "fastapi", "uvicorn", "mediapipe")
$missingPackages = @()

foreach ($pkg in $requiredPackages) {
    python -c "import $pkg; print('OK')" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  $pkg : OK" -ForegroundColor Green
    } else {
        Write-Host "  $pkg : MISSING" -ForegroundColor Red
        $missingPackages += $pkg
    }
}

if ($missingPackages.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing packages: $($missingPackages -join ', ')" -ForegroundColor Red
    Write-Host "Run with -Install flag to install dependencies" -ForegroundColor Yellow
    Write-Host "  .\start_services.ps1 -Install" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting AI services..." -ForegroundColor Cyan
Write-Host ""

# 定义服务
$services = @(
    @{
        Name = "Main AI Service"
        Port = 8001
        Script = "services.ai_service:app"
        Description = "Body analysis, clothing analysis, style understanding"
    }
)

if ($All) {
    $services += @(
        @{
            Name = "SASRec Recommendation"
            Port = 8002
            Script = "inference.sasrec_server:app"
            Description = "Sequential recommendation"
        },
        @{
            Name = "Body Analysis"
            Port = 8003
            Script = "inference.body_analysis_server:app"
            Description = "Dedicated body analysis"
        }
    )
}

# 启动服务
$jobs = @()

foreach ($svc in $services) {
    Write-Host "Starting $($svc.Name) on port $($svc.Port)..." -ForegroundColor Yellow
    Write-Host "  $($svc.Description)" -ForegroundColor Gray
    
    $job = Start-Job -ScriptBlock {
        param($mlDir, $script, $port)
        Set-Location $mlDir
        python -m uvicorn $script --host 0.0.0.0 --port $port 2>&1
    } -ArgumentList $ML_DIR, $svc.Script, $svc.Port
    
    $jobs += @{
        Job = $job
        Name = $svc.Name
        Port = $svc.Port
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Services Started" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

foreach ($svc in $services) {
    Write-Host "  $($svc.Name): http://localhost:$($svc.Port)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Health check endpoints:" -ForegroundColor Yellow
foreach ($svc in $services) {
    Write-Host "  http://localhost:$($svc.Port)/health" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# 等待用户中断
try {
    while ($true) {
        foreach ($j in $jobs) {
            $output = Receive-Job -Job $j.Job -ErrorAction SilentlyContinue
            if ($output) {
                Write-Host "[$($j.Name)] $output" -ForegroundColor Gray
            }
        }
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "Stopping services..." -ForegroundColor Yellow
    foreach ($j in $jobs) {
        Stop-Job -Job $j.Job
        Remove-Job -Job $j.Job
    }
    Write-Host "All services stopped" -ForegroundColor Green
}
