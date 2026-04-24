# 软著源代码提取脚本

# 使用方法：在项目根目录 c:\AiNeed 下执行
# PowerShell: .\docs\LEGAL\extract-source-code.ps1

$ErrorActionPreference = "Stop"
$projectRoot = "c:\AiNeed"
$outputDir = "$projectRoot\docs\LEGAL\source-code"

if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$header = @"
================================================================================
寻裳AI智能穿搭推荐系统 V1.0 - 源代码
软件著作权登记申请材料 - 软件鉴别材料
================================================================================

"@

$frontFiles = @(
    "$projectRoot\apps\backend\src\main.ts",
    "$projectRoot\apps\backend\src\app.module.ts",
    "$projectRoot\ml\services\stylist\intelligent_stylist_service.py",
    "$projectRoot\ml\services\tryon\visual_outfit_service.py",
    "$projectRoot\ml\services\analysis\color_season_analyzer.py",
    "$projectRoot\ml\services\analysis\body_analyzer.py"
)

$backFiles = @(
    "$projectRoot\ml\services\stylist\full_outfit_engine.py",
    "$projectRoot\ml\services\tryon\tryon_postprocessor.py",
    "$projectRoot\ml\services\rag\hybrid_retriever.py",
    "$projectRoot\ml\services\common\algorithm_gateway.py",
    "$projectRoot\ml\services\recommender\fashion_knowledge_rag.py",
    "$projectRoot\ml\services\stylist\dialog_engine.py"
)

function Extract-SourceCode {
    param(
        [string[]]$Files,
        [string]$OutputPath,
        [string]$Section,
        [int]$MaxLines = 1500
    )

    $content = $header
    $totalLines = 0

    foreach ($file in $Files) {
        if (!(Test-Path $file)) {
            Write-Warning "File not found: $file"
            continue
        }

        $relativePath = $file.Replace($projectRoot + "\", "")
        $fileContent = Get-Content $file -Encoding UTF8
        $fileLines = $fileContent.Count

        $content += "`n"
        $content += "// ========== FILE: $relativePath ==========`n"
        $content += "// Lines: $fileLines`n"
        $content += "`n"

        $linesToAdd = $fileContent
        if ($totalLines + $fileLines -gt $MaxLines) {
            $remaining = $MaxLines - $totalLines
            if ($Section -eq "back") {
                $linesToAdd = $fileContent | Select-Object -Last $remaining
            } else {
                $linesToAdd = $fileContent | Select-Object -First $remaining
            }
        }

        $lineNum = 1
        foreach ($line in $linesToAdd) {
            $sanitized = $line -replace '(?i)(api[_-]?key|secret|password|token)\s*[=:]\s*["\x27]?[^\s"\x27,;]+', '$1=***REDACTED***'
            $paddedNum = "{0,4}" -f $lineNum
            $content += "$paddedNum  $sanitized`n"
            $lineNum++
        }

        $totalLines += $linesToAdd.Count
        if ($totalLines -ge $MaxLines) { break }
    }

    $content | Out-File -FilePath $OutputPath -Encoding UTF8 -NoNewline
    Write-Host "$Section section: $totalLines lines extracted -> $OutputPath"
}

Write-Host "Extracting front 30 pages (first ~1500 lines)..."
Extract-SourceCode -Files $frontFiles -OutputPath "$outputDir\front-30-pages.txt" -Section "front" -MaxLines 1500

Write-Host "Extracting back 30 pages (last ~1500 lines)..."
Extract-SourceCode -Files $backFiles -OutputPath "$outputDir\back-30-pages.txt" -Section "back" -MaxLines 1500

Write-Host "`nExtraction complete!"
Write-Host "Output directory: $outputDir"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review extracted files for any remaining sensitive data"
Write-Host "2. Format for printing: 50 lines per page, Consolas 10pt"
Write-Host "3. Add page headers: software name + version"
Write-Host "4. Add page footers: page number (Page X of 60)"
