$srcRoot = "C:\AiNeed\apps\mobile\src"
Get-ChildItem -Path "$srcRoot\features" -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $origContent = $content
    $relPath = $_.FullName.Substring($srcRoot.Length + 1)
    $parts = $relPath -split '\\'
    
    # Calculate how many ../ needed to reach src/ from this file
    # parts[0] = "features", parts[1] = feature name, parts[2..n-1] = subdirs, parts[n] = filename
    # From features/xxx/file.ts -> ../../ reaches src/
    # From features/xxx/screens/file.ts -> ../../../ reaches src/
    # From features/xxx/screens/components/file.ts -> ../../../../ reaches src/
    
    $dirParts = $parts[0..($parts.Count - 2)]  # exclude filename
    $depthFromSrc = $dirParts.Count  # how many dirs deep from src/
    $dotsNeeded = "../" * $depthFromSrc  # e.g. 3 dirs deep = ../../../
    
    # These are paths that should resolve to src/ level
    $srcPaths = @(
        'design-system/theme',
        'theme/tokens/',
        'services/api/',
        'i18n',
        'polyfills/',
        'hooks/useAnalytics',
        'types/clothing',
        'contexts/ThemeContext',
        'navigation/types',
        'shared/components/',
        'types/api',
        'types/navigation',
        'types/'
    )
    
    foreach ($p in $srcPaths) {
        # Replace any existing relative path with the correct one
        # Common wrong patterns: ../ (1 level), ../../ (2 levels), ../../../ (3 levels)
        for ($i = 1; $i -le 5; $i++) {
            $wrongPrefix = "../" * $i
            $wrongDbl = "from `"$wrongPrefix$p"
            $wrongSgl = "from '$wrongPrefix$p"
            $rightDbl = "from `"$dotsNeeded$p"
            $rightSgl = "from '$dotsNeeded$p"
            $content = $content.Replace($wrongDbl, $rightDbl)
            $content = $content.Replace($wrongSgl, $rightSgl)
        }
    }
    
    if ($content -ne $origContent) {
        [System.IO.File]::WriteAllText($_.FullName, $content)
        Write-Host "Fixed: $($_.Name) (depth=$depthFromSrc, dots=$dotsNeeded)"
    }
}
Write-Host "DONE"
