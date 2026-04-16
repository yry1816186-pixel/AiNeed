$srcRoot = "C:\AiNeed\apps\mobile\src"
Get-ChildItem -Path "$srcRoot\features" -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $origContent = $content
    $relPath = $_.FullName.Substring($srcRoot.Length + 1)
    $parts = $relPath -split '\\'
    
    # Only fix files in screens/ or components/ subdirs (depth >= 4: features\xxx\screens\file)
    if ($parts.Length -ge 4) {
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
            'stores/profileStore',
            'stores/consultantStore',
            'types/api',
            'types/navigation'
        )
        foreach ($p in $srcPaths) {
            # Double quotes
            $content = $content.Replace("from `"../$p", "from `"../../$p")
            # Single quotes
            $content = $content.Replace("from '../$p", "from '../../$p")
        }
    }
    if ($content -ne $origContent) {
        [System.IO.File]::WriteAllText($_.FullName, $content)
        Write-Host "Fixed: $($_.Name)"
    }
}
Write-Host "DONE"
