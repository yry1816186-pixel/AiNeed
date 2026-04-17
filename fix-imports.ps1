# Fix useAuthStore imports from wrong paths
$base = 'C:\AiNeed\apps\mobile\src'

$files = @(
  "$base\features\profile\screens\SettingsScreen.tsx",
  "$base\features\profile\screens\SharePosterScreen.tsx",
  "$base\features\home\screens\RecommendationsScreen.tsx",
  "$base\features\wardrobe\screens\FavoritesScreen.tsx",
  "$base\features\home\components\heartrecommend\HeartRecommendScreen.tsx"
)

foreach ($f in $files) {
  if (-not (Test-Path $f)) { Write-Host "NOT FOUND: $f"; continue }

  $c = Get-Content $f -Raw -Encoding UTF8
  $modified = $false

  # Fix useAuthStore import from ../stores/index
  if ($c -match "from ['`"']\.\.\/stores\/index['`"']") {
    $c = $c -replace "from ['`"']\.\.\/stores\/index['`"']", "from '../../auth/stores'"
    $modified = $true
  }

  # Fix useAuthStore import from ../../../stores/index
  if ($c -match "from ['`"']\.\.\/\.\.\/\.\.\/stores\/index['`"']") {
    $c = $c -replace "from ['`"']\.\.\/\.\.\/\.\.\/stores\/index['`"']", "from '../../../stores/index'"
    $modified = $true
  }

  # Fix useAuthStore + useHeartRecommendStore from ../../stores
  if ($c -match "from ['`"']\.\.\/\.\.\/stores['`"']") {
    # Check what's imported
    if ($c -match 'useAuthStore.*useHeartRecommendStore') {
      # Split into two imports
      $c = $c -replace "import \{ useAuthStore, useHeartRecommendStore \} from ['`"']\.\.\/\.\.\/stores['`"'];", "import { useAuthStore } from '../../auth/stores';`nimport { useHeartRecommendStore } from '../stores/heartRecommendStore';"
      $modified = $true
    } elseif ($c -match 'useAuthStore') {
      $c = $c -replace "from ['`"']\.\.\/\.\.\/stores['`"']", "from '../../auth/stores'"
      $modified = $true
    }
  }

  if ($modified) {
    Set-Content $f -Value $c -Encoding UTF8 -NoNewline
    Write-Host "Fixed useAuthStore import in $f"
  }
}
