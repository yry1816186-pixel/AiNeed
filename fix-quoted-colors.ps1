# Fix remaining common patterns across all files

$base = 'C:\AiNeed\apps\mobile\src'

# Fix 1: colors.text -> colors.textPrimary (where .text is used as a color value, not as object access)
# This is tricky because colors.text is a valid object, but when used as a color value it should be colors.textPrimary
# Only fix the pattern where it's used as a direct color value like: color: colors.text

# Fix 2: "colors.xxx" (quoted string) -> colors.xxx (unquoted) in createStyles blocks
$files = Get-ChildItem -Path $base -Recurse -Filter '*.tsx' | Select-Object -ExpandProperty FullName

foreach ($f in $files) {
  $c = Get-Content $f -Raw -Encoding UTF8
  $modified = $false

  # Fix quoted color references in style objects: "colors.primary" -> colors.primary
  if ($c -match '"colors\.') {
    $c = $c -replace '"colors\.primary"', 'colors.primary'
    $c = $c -replace '"colors\.primaryLight"', 'colors.primaryLight'
    $c = $c -replace '"colors\.textPrimary"', 'colors.textPrimary'
    $c = $c -replace '"colors\.textSecondary"', 'colors.textSecondary'
    $c = $c -replace '"colors\.textTertiary"', 'colors.textTertiary'
    $c = $c -replace '"colors\.surface"', 'colors.surface'
    $c = $c -replace '"colors\.background"', 'colors.background'
    $c = $c -replace '"colors\.backgroundSecondary"', 'colors.backgroundSecondary'
    $c = $c -replace '"colors\.backgroundTertiary"', 'colors.backgroundTertiary'
    $c = $c -replace '"colors\.border"', 'colors.border'
    $c = $c -replace '"colors\.error"', 'colors.error'
    $c = $c -replace '"colors\.success"', 'colors.success'
    $c = $c -replace '"colors\.infoLight"', 'colors.infoLight'
    $c = $c -replace '"colors\.info"', 'colors.info'
    $modified = $true
  }

  if ($modified) {
    Set-Content $f -Value $c -Encoding UTF8 -NoNewline
    Write-Host "Fixed quoted colors in $f"
  }
}

Write-Host "Done fixing quoted colors"
