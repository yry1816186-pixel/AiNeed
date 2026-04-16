$srcRoot = "C:\AiNeed\apps\mobile\src"
Get-ChildItem -Path "$srcRoot\features" -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $origContent = $content
    $relPath = $_.FullName.Substring($srcRoot.Length + 1)
    $parts = $relPath -split '\\'
    
    # features/xxx/screens/file.tsx -> need ../../../ to reach src/
    # features/xxx/components/file.tsx -> need ../../../ to reach src/
    # features/xxx/hooks/file.ts -> need ../../../ to reach src/
    # features/xxx/services/file.ts -> need ../../../ to reach src/
    # features/xxx/stores/file.ts -> need ../../../ to reach src/
    # features/xxx/types/file.ts -> need ../../../ to reach src/
    # features/xxx/screens/components/file.tsx -> need ../../../../ to reach src/
    
    # Count depth from features root: features=0, xxx=1, sub=2, file=3+
    $featureDepth = $parts.Count - 2  # subtract "features" and filename
    
    if ($featureDepth -ge 2) {
        # Files in features/xxx/screens/ or deeper need ../../ replaced with ../../../
        # Currently they have ../../ which resolves to features/ - need ../../../ to reach src/
        
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
            # Replace ../../xxx with ../../../xxx (for features/xxx/screens/ files)
            $content = $content.Replace("from `"../../$p", "from `"../../../$p")
            $content = $content.Replace("from '../../$p", "from '../../../$p")
        }
    }
    
    if ($content -ne $origContent) {
        [System.IO.File]::WriteAllText($_.FullName, $content)
        Write-Host "Fixed: $($_.Name)"
    }
}
Write-Host "DONE"
