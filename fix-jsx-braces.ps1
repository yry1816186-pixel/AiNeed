# Fix missing curly braces around JSX color attributes: color=colors.xxx -> color={colors.xxx}
$base = 'C:\AiNeed\apps\mobile\src'

$files = @(
  "$base\features\commerce\components\CouponSelector.tsx",
  "$base\features\commerce\components\PaymentWaitingScreen.tsx",
  "$base\features\commerce\screens\OrderDetailScreen.tsx",
  "$base\features\community\components\social\SocialInteractions.tsx",
  "$base\features\community\screens\BloggerProductScreen.tsx"
)

foreach ($f in $files) {
  if (-not (Test-Path $f)) { Write-Host "NOT FOUND: $f"; continue }

  $c = Get-Content $f -Raw -Encoding UTF8
  $modified = $false

  # Fix color=colors.xxx -> color={colors.xxx} in JSX
  # Pattern: color=colors.something followed by space or />
  if ($c -match 'color=colors\.') {
    $c = $c -replace 'color=colors\.(\w+)', 'color={colors.$1}'
    $modified = $true
  }

  if ($modified) {
    Set-Content $f -Value $c -Encoding UTF8 -NoNewline
    Write-Host "Fixed JSX color braces in $f"
  }
}
