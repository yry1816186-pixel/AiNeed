# Convert StyleSheet.create with colors references to createStyles pattern
# This handles files where 'colors' is used in StyleSheet but only available via useTheme inside components

$files = @(
  'C:\AiNeed\apps\mobile\src\features\commerce\screens\CartScreen.tsx',
  'C:\AiNeed\apps\mobile\src\features\community\screens\CommunityFeed.tsx',
  'C:\AiNeed\apps\mobile\src\features\home\screens\RecommendationsScreen.tsx',
  'C:\AiNeed\apps\mobile\src\features\wardrobe\screens\FavoritesScreen.tsx',
  'C:\AiNeed\apps\mobile\src\features\onboarding\screens\OnboardingScreen.tsx',
  'C:\AiNeed\apps\mobile\src\features\onboarding\screens\steps\BasicInfoStep.tsx',
  'C:\AiNeed\apps\mobile\src\design-system\primitives\EmptyState\EmptyState.tsx'
)

foreach ($f in $files) {
  if (-not (Test-Path $f)) { Write-Host "NOT FOUND: $f"; continue }

  $c = Get-Content $f -Raw -Encoding UTF8

  # Only process if it has StyleSheet.create with colors references
  if ($c -notmatch 'StyleSheet\.create\(' -or $c -notmatch 'colors\.') {
    Write-Host "SKIP (no StyleSheet.create with colors): $f"
    continue
  }

  # Check if already using createStyles for the main styles
  if ($c -match 'createStyles\(') {
    Write-Host "SKIP (already using createStyles): $f"
    continue
  }

  # Replace: const styles = StyleSheet.create({  =>  const useStyles = createStyles((colors) => StyleSheet.create({
  $c = $c -replace 'const styles = StyleSheet\.create\(\{', 'const useStyles = createStyles((colors) => StyleSheet.create({'

  # Close the createStyles: });  =>  }));
  # Find the last }); that closes StyleSheet.create and add extra )
  # We need to find the specific closing of StyleSheet.create
  # The pattern is: }); followed by a newline and then const/export
  $c = $c -replace '\}\);(\r?\n(?:const |export ))', '});$1'

  # Actually, we need to change the closing of StyleSheet.create from });
  # to })); to close createStyles as well
  # This is tricky - let's find the StyleSheet.create closing
  # We'll look for the pattern where }); is followed by a blank line or const/export
  $c = $c -replace '(?<=StyleSheet\.create\(\{[\s\S]*?)\}\);(\r?\n\r?\n(?:const |export ))', '}));$1'

  # Add const styles = useStyles(colors); inside the main component
  # Find the main component and add after useTheme
  if ($c -match '\{ colors \} = useTheme\(\)') {
    $c = $c -replace '(\{ colors \} = useTheme\(\);)', "`$1`n  const styles = useStyles(colors);"
  }

  Set-Content $f -Value $c -Encoding UTF8 -NoNewline
  Write-Host "Converted StyleSheet.create to createStyles in $f"
}
