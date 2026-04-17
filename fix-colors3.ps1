# Fix remaining color property errors across all files
$base = 'C:\AiNeed\apps\mobile\src'

$files = Get-ChildItem -Path $base -Recurse -Filter '*.tsx' | Select-Object -ExpandProperty FullName

foreach ($f in $files) {
  $c = Get-Content $f -Raw -Encoding UTF8
  $modified = $false

  # Fix colors.brand.primary -> colors.primary
  if ($c -match 'colors\.brand\.primary\b') {
    $c = $c -replace 'colors\.brand\.primary\b', 'colors.primary'
    $modified = $true
  }

  # Fix colors.brand.warmAccent -> colors.gold
  if ($c -match 'colors\.brand\.warmAccent') {
    $c = $c -replace 'colors\.brand\.warmAccent', 'colors.gold'
    $modified = $true
  }

  # Fix colors.brand.warmSecondary -> colors.secondary
  if ($c -match 'colors\.brand\.warmSecondary') {
    $c = $c -replace 'colors\.brand\.warmSecondary', 'colors.secondary'
    $modified = $true
  }

  # Fix colors.text as string -> colors.textPrimary (when used as color value)
  if ($c -match 'colors\.text as string') {
    $c = $c -replace 'colors\.text as string', 'colors.textPrimary'
    $modified = $true
  }

  # Fix DesignTokens.colors.textPrimary -> use FlatColors equivalent
  if ($c -match 'DesignTokens\.colors\.textPrimary') {
    $c = $c -replace 'DesignTokens\.colors\.textPrimary', 'DesignTokens.colors.neutral[800]'
    $modified = $true
  }

  # Fix DesignTokens.colors.textSecondary
  if ($c -match 'DesignTokens\.colors\.textSecondary') {
    $c = $c -replace 'DesignTokens\.colors\.textSecondary', 'DesignTokens.colors.neutral[500]'
    $modified = $true
  }

  # Fix DesignTokens.colors.surface
  if ($c -match 'DesignTokens\.colors\.surface\b') {
    $c = $c -replace 'DesignTokens\.colors\.surface\b', 'DesignTokens.colors.neutral[50]'
    $modified = $true
  }

  # Fix DesignTokens.colors.textTertiary
  if ($c -match 'DesignTokens\.colors\.textTertiary') {
    $c = $c -replace 'DesignTokens\.colors\.textTertiary', 'DesignTokens.colors.neutral[400]'
    $modified = $true
  }

  if ($modified) {
    Set-Content $f -Value $c -Encoding UTF8 -NoNewline
    Write-Host "Fixed color properties in $f"
  }
}

Write-Host "Done fixing remaining color properties"
