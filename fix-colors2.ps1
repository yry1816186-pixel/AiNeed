# Fix files that use 'colors' in StyleSheet but don't import useTheme or destructure colors

$filesToFix = @(
  'C:\AiNeed\apps\mobile\src\features\commerce\screens\CartScreen.tsx',
  'C:\AiNeed\apps\mobile\src\features\community\screens\CommunityFeed.tsx',
  'C:\AiNeed\apps\mobile\src\features\home\screens\RecommendationsScreen.tsx',
  'C:\AiNeed\apps\mobile\src\features\wardrobe\screens\FavoritesScreen.tsx',
  'C:\AiNeed\apps\mobile\src\features\onboarding\screens\OnboardingScreen.tsx',
  'C:\AiNeed\apps\mobile\src\features\onboarding\screens\steps\BasicInfoStep.tsx',
  'C:\AiNeed\apps\mobile\src\design-system\primitives\EmptyState\EmptyState.tsx'
)

foreach ($f in $filesToFix) {
  if (Test-Path $f) {
    $c = Get-Content $f -Raw -Encoding UTF8

    # Check if colors is already destructured from useTheme
    if ($c -match 'useTheme' -and $c -match 'colors') {
      Write-Host "SKIP (already has useTheme+colors): $f"
      continue
    }

    # Check if file uses 'colors.' pattern (indicating it needs colors)
    if ($c -notmatch 'colors\.') {
      Write-Host "SKIP (no colors. usage): $f"
      continue
    }

    # Add useTheme import if not present
    if ($c -notmatch 'useTheme') {
      # Find the design-system import line and add useTheme
      $c = $c -replace "(import [^;]+ from ['`"'][^'`"]*design-system[^'`"]*['`"];)", "`$1`nimport { useTheme } from '../../../shared/contexts/ThemeContext';"
      if ($c -notmatch 'useTheme') {
        $c = $c -replace "(import [^;]+ from ['`"'][^'`"]*theme[^'`"]*['`"];)", "`$1`nimport { useTheme } from '../../../shared/contexts/ThemeContext';"
      }
    }

    # Add const { colors } = useTheme(); after the component function opening
    # Look for patterns like: const XxxScreen: React.FC = () => {
    # or: export default function XxxScreen() {
    if ($c -notmatch '\{ colors \} = useTheme') {
      $c = $c -replace '(const \w+: React\.FC[^=]*= \(\) => \{)', "`$1`n  const { colors } = useTheme();"
      $c = $c -replace '(export default function \w+\(\) \{)', "`$1`n  const { colors } = useTheme();"
      $c = $c -replace '(export const \w+: React\.FC[^=]*= \(\) => \{)', "`$1`n  const { colors } = useTheme();"
    }

    Set-Content $f -Value $c -Encoding UTF8 -NoNewline
    Write-Host "Fixed colors in $f"
  } else {
    Write-Host "NOT FOUND: $f"
  }
}
