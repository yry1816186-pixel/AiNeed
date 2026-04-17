$files = @(
  'C:\AiNeed\apps\mobile\src\shared\components\charts\ColorPalette.tsx',
  'C:\AiNeed\apps\mobile\src\shared\components\charts\TagCloud.tsx',
  'C:\AiNeed\apps\mobile\src\shared\components\screens\TryOnHistoryScreen.tsx',
  'C:\AiNeed\apps\mobile\src\shared\components\screens\TryOnScreen.tsx',
  'C:\AiNeed\apps\mobile\src\features\profile\screens\components\ColorSeasonCard.tsx',
  'C:\AiNeed\apps\mobile\src\features\profile\screens\components\StyleTagsCard.tsx'
)

foreach ($f in $files) {
  if (Test-Path $f) {
    $c = Get-Content $f -Raw -Encoding UTF8
    $c = $c -replace 'colors\.brand\.warmPrimary', 'colors.primary'
    $c = $c -replace 'colors\.brand\.warmAccent', 'colors.gold'
    $c = $c -replace 'colors\.brand\.warmSecondary', 'colors.secondary'
    $c = $c -replace 'colors\.brand\.primary', 'colors.primary'
    $c = $c -replace '\.coral\b', '.primaryLight'
    $c = $c -replace '\.ocean\b', '.info'
    $c = $c -replace '\.mint\b', '.successLight'
    $c = $c -replace '\.main\b', '.primary'
    $c = $c -replace '\.light\b(?!["\w])', '.primaryLight'
    $c = $c -replace '\.dark\b(?!["\w])', '.primaryDark'
    Set-Content $f -Value $c -Encoding UTF8 -NoNewline
    Write-Host "Fixed color properties in $f"
  }
}
