$f = 'C:\AiNeed\apps\mobile\src\features\wardrobe\screens\WardrobeScreen.tsx'
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace 'staticstaticColors', 'staticColors'
Set-Content $f -Value $c -Encoding UTF8 -NoNewline
Write-Host "Fixed staticstaticColors -> staticColors"
