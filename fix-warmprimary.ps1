# Fix WarmPrimaryColors property references
$base = 'C:\AiNeed\apps\mobile\src'

$files = @(
  "$base\shared\components\screens\TryOnScreen.tsx",
  "$base\shared\components\screens\TryOnHistoryScreen.tsx"
)

foreach ($f in $files) {
  if (-not (Test-Path $f)) { Write-Host "NOT FOUND: $f"; continue }

  $c = Get-Content $f -Raw -Encoding UTF8
  $modified = $false

  # Fix WarmPrimaryColors.info -> WarmPrimaryColors.ocean
  if ($c -match 'WarmPrimaryColors\.info') {
    $c = $c -replace 'WarmPrimaryColors\.info', 'WarmPrimaryColors.ocean'
    $modified = $true
  }

  # Fix WarmPrimaryColors.primaryLight -> WarmPrimaryColors.coral
  if ($c -match 'WarmPrimaryColors\.primaryLight') {
    $c = $c -replace 'WarmPrimaryColors\.primaryLight', 'WarmPrimaryColors.coral'
    $modified = $true
  }

  # Fix WarmPrimaryColors.successLight -> WarmPrimaryColors.mint
  if ($c -match 'WarmPrimaryColors\.successLight') {
    $c = $c -replace 'WarmPrimaryColors\.successLight', 'WarmPrimaryColors.mint'
    $modified = $true
  }

  if ($modified) {
    Set-Content $f -Value $c -Encoding UTF8 -NoNewline
    Write-Host "Fixed WarmPrimaryColors in $f"
  }
}
