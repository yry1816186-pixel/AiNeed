$srcRoot = "C:\AiNeed\apps\mobile\src"
Get-ChildItem -Path "$srcRoot\shared" -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $origContent = $content
    $relPath = $_.FullName.Substring($srcRoot.Length + 1)
    $parts = $relPath -split '\\'
    $dirParts = $parts[0..($parts.Count - 2)]
    $depthFromSrc = $dirParts.Count
    $dotsNeeded = "../" * $depthFromSrc
    
    $srcPaths = @(
        'design-system/theme',
        'theme/tokens/',
        'contexts/ThemeContext',
        'services/api/',
        'types/',
        'stores/'
    )
    
    foreach ($p in $srcPaths) {
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
