param(
  [int]$Port = 3010
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logPath = Join-Path $repoRoot "backend-start-pass11.log"
$tailPath = Join-Path $repoRoot "backend-start-pass11-tail.txt"
$emailPath = Join-Path $repoRoot "backend-auth-email-pass3.txt"
$registerPath = Join-Path $repoRoot "backend-auth-register-pass3.json"
$registerLogoutPath = Join-Path $repoRoot "backend-auth-register-logout-pass1.json"
$loginPath = Join-Path $repoRoot "backend-auth-login-pass3.json"
$mePath = Join-Path $repoRoot "backend-auth-me-pass3.json"
$refreshPath = Join-Path $repoRoot "backend-auth-refresh-pass1.json"
$logoutPath = Join-Path $repoRoot "backend-auth-logout-pass1.json"
$healthPath = Join-Path $repoRoot "backend-health-pass2.json"
$summaryPath = Join-Path $repoRoot "backend-auth-summary-pass1.json"

if (Test-Path $logPath) {
  Remove-Item $logPath -Force
}

$startCommand = "set PORT=$Port&& pnpm.cmd --filter @aineed/backend start > `"$logPath`" 2>&1"
$process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $startCommand -WorkingDirectory $repoRoot -PassThru

function Stop-BackendProcess {
  param([int]$ProcessId)

  try {
    taskkill /PID $ProcessId /T /F | Out-Null
  } catch {
    Write-Warning "Failed to stop backend process ${ProcessId}: $($_.Exception.Message)"
  }
}

function Write-JsonFile {
  param(
    [string]$Path,
    [object]$Value
  )

  $Value | ConvertTo-Json -Depth 20 | Set-Content -Path $Path
}

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Uri,
    [object]$Body = $null,
    [hashtable]$Headers = $null
  )

  try {
    $params = @{
      Method = $Method
      Uri = $Uri
      TimeoutSec = 20
    }

    if ($null -ne $Body) {
      $params.ContentType = "application/json"
      $params.Body = $Body | ConvertTo-Json -Depth 20
    }

    if ($Headers) {
      $params.Headers = $Headers
    }

    return @{
      ok = $true
      data = Invoke-RestMethod @params
    }
  } catch {
    $responseBody = $null

    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $responseBody = $reader.ReadToEnd()
      $reader.Dispose()
    }

    return @{
      ok = $false
      message = $_.Exception.Message
      body = $responseBody
    }
  }
}

try {
  $baseUrl = "http://localhost:$Port/api/v1"
  $started = $false

  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Path $logPath) {
      $logContent = Get-Content $logPath -Raw
      if ($logContent -match "Nest application successfully started" -or $logContent -match "AiNeed API running on:") {
        $started = $true
        break
      }
    }
  }

  if (-not $started) {
    throw "Backend did not become ready on port $Port"
  }

  $email = "audit_$(Get-Date -Format 'yyyyMMdd_HHmmss')@example.com"
  $password = "Password123"
  $nickname = "AuditUser"
  Set-Content -Path $emailPath -Value $email

  $register = Invoke-JsonRequest -Method "POST" -Uri "$baseUrl/auth/register" -Body @{
    email = $email
    password = $password
    nickname = $nickname
  }
  Write-JsonFile -Path $registerPath -Value $register

  $registerAccessToken = $null
  $registerRefreshToken = $null
  if ($register.ok -and $register.data.accessToken) {
    $registerAccessToken = $register.data.accessToken
    $registerRefreshToken = $register.data.refreshToken
  }

  if ($registerAccessToken -and $registerRefreshToken) {
    $registerLogout = Invoke-JsonRequest -Method "POST" -Uri "$baseUrl/auth/logout" -Body @{
      refreshToken = $registerRefreshToken
    } -Headers @{
      Authorization = "Bearer $registerAccessToken"
    }
  } else {
    $registerLogout = @{
      ok = $false
      message = "register failed, register logout skipped"
    }
  }
  Write-JsonFile -Path $registerLogoutPath -Value $registerLogout

  $login = Invoke-JsonRequest -Method "POST" -Uri "$baseUrl/auth/login" -Body @{
    email = $email
    password = $password
  }
  Write-JsonFile -Path $loginPath -Value $login

  $accessToken = $null
  $refreshToken = $null
  if ($login.ok -and $login.data.accessToken) {
    $accessToken = $login.data.accessToken
    $refreshToken = $login.data.refreshToken
  }

  if ($accessToken) {
    $me = Invoke-JsonRequest -Method "GET" -Uri "$baseUrl/auth/me" -Headers @{
      Authorization = "Bearer $accessToken"
    }
  } else {
    $me = @{
      ok = $false
      message = "login failed, /me skipped"
    }
  }
  Write-JsonFile -Path $mePath -Value $me

  if ($refreshToken) {
    $refresh = Invoke-JsonRequest -Method "POST" -Uri "$baseUrl/auth/refresh" -Body @{
      refreshToken = $refreshToken
    }
  } else {
    $refresh = @{
      ok = $false
      message = "login failed, /refresh skipped"
    }
  }
  Write-JsonFile -Path $refreshPath -Value $refresh

  $logoutAccessToken = $accessToken
  $logoutRefreshToken = $refreshToken
  if ($refresh.ok -and $refresh.data.refreshToken) {
    $logoutAccessToken = $refresh.data.accessToken
    $logoutRefreshToken = $refresh.data.refreshToken
  }

  if ($logoutAccessToken) {
    $logoutBody = $null
    if ($logoutRefreshToken) {
      $logoutBody = @{
        refreshToken = $logoutRefreshToken
      }
    }

    $logout = Invoke-JsonRequest -Method "POST" -Uri "$baseUrl/auth/logout" -Body $logoutBody -Headers @{
      Authorization = "Bearer $logoutAccessToken"
    }
  } else {
    $logout = @{
      ok = $false
      message = "login failed, /logout skipped"
    }
  }
  Write-JsonFile -Path $logoutPath -Value $logout

  $health = Invoke-JsonRequest -Method "GET" -Uri "$baseUrl/health"
  Write-JsonFile -Path $healthPath -Value $health

  Get-Content $logPath -Tail 120 | Set-Content $tailPath

  $summary = @{
    started = $started
    port = $Port
    processId = $process.Id
    registerOk = $register.ok
    registerLogoutOk = $registerLogout.ok
    loginOk = $login.ok
    meOk = $me.ok
    refreshOk = $refresh.ok
    logoutOk = $logout.ok
    healthOk = $health.ok
  }
  Write-JsonFile -Path $summaryPath -Value $summary
  $summary | ConvertTo-Json -Compress
} finally {
  Stop-BackendProcess -ProcessId $process.Id
}
