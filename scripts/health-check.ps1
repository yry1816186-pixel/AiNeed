$ok = 0
$fail = 0

function Check-Tcp($name, $port) {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("localhost", $port)
    $tcp.Close()
    Write-Host "  OK $name - healthy (port $port)" -ForegroundColor Green
    $script:ok++
  } catch {
    Write-Host "  FAIL $name - unhealthy (localhost:$port)" -ForegroundColor Red
    $script:fail++
  }
}

function Check-Http($name, $url) {
  try {
    $r = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing
    Write-Host "  OK $name - healthy ($($r.StatusCode))" -ForegroundColor Green
    $script:ok++
  } catch {
    Write-Host "  FAIL $name - unhealthy ($url)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "XUNO Backend Health Check" -ForegroundColor Cyan
Write-Host "================================"

Write-Host "`nInfrastructure:" -ForegroundColor Yellow
Check-Tcp "PostgreSQL" 5432
Check-Tcp "Redis" 6379
Check-Tcp "MinIO" 9000
Check-Tcp "Qdrant" 6333

Write-Host "`nApplication:" -ForegroundColor Yellow
Check-Http "FastAPI AI" "http://localhost:8002/health"
Check-Http "NestJS API" "http://localhost:3001/api/v1/health"

Write-Host "`n================================"
Write-Host "  OK: $ok healthy" -ForegroundColor Green
Write-Host "  FAIL: $fail unhealthy" -ForegroundColor Red

if ($fail -gt 0) { exit 1 }
exit 0
