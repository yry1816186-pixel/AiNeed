$path = 'c:\AiNeed\apps\mobile\src\features\community\screens\InspirationWardrobeScreen.tsx'
$content = [System.IO.File]::ReadAllText($path)
$content = $content -replace '(?<![a-zA-Z0-9_])s\.', 'styles.'
[System.IO.File]::WriteAllText($path, $content)
Write-Host "Done"
