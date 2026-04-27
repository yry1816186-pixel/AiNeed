#!/bin/bash
# 软著 2/3 源代码提取脚本
# 用法: bash docs/LEGAL/extract-copyright-2-3.sh

set -e
cd "$(git -C "$(dirname "$0")/../../" rev-parse --show-toplevel 2>/dev/null || echo "/c/AiNeed")"

PROJECT_ROOT="/c/AiNeed"
OUTPUT_DIR="$PROJECT_ROOT/docs/LEGAL/source-code"

sanitize_line() {
  echo "$1" | sed -E 's/(api[_-]?key|secret|password|token|JWT_SECRET|REDIS_PASSWORD|MINIO_SECRET_KEY|ENCRYPTION_KEY|GLM_API_KEY|ZHIPU_API_KEY)\s*[=:]\s*["\x27]?[^\s"\x27,;)]+/REDACTED/gi' | \
    sed -E 's/[a-f0-9]{64}/***REDACTED***/gi'
}

write_file_section() {
  local file="$1"
  local output="$2"
  local start="${3:-1}"
  local end="${4:-999999}"

  if [ ! -f "$file" ]; then
    echo "WARNING: File not found: $file"
    return 0
  fi

  local relpath="${file#$PROJECT_ROOT/}"
  local lines=$(wc -l < "$file")

  echo "" >> "$output"
  echo "// ========== FILE: $relpath ==========" >> "$output"
  echo "// Total lines: $lines (showing $start-$end)" >> "$output"
  echo "" >> "$output"

  local linenum=0
  while IFS= read -r line; do
    linenum=$((linenum + 1))
    if [ $linenum -lt $start ]; then continue; fi
    if [ $linenum -gt $end ]; then break; fi
    local sanitized
    sanitized=$(sanitize_line "$line")
    printf "%4d  %s\n" $linenum "$sanitized" >> "$output"
  done < "$file"
}

write_header() {
  local output="$1"
  local name="$2"
  cat > "$output" <<EOF
================================================================================
${name} - 源代码
软件著作权登记申请材料 - 软件鉴别材料
================================================================================

EOF
}

# ============================================================
# 软著 2: 寻裳移动客户端软件 V1.0
# ============================================================
echo "=== 提取软著 2 (移动端) 源代码 ==="

# 前 30 页 (~1500 行)
C2_FRONT="$OUTPUT_DIR/copyright-2-front-30.txt"
write_header "$C2_FRONT" "寻裳移动客户端软件 V1.0"

# 文件选取:
# App.tsx (299) + MainStackNavigator.tsx (459) + TodayScreen.tsx (189) +
# OnboardingWizard.tsx (369) + authStore.ts (539->only 134 lines needed)
write_file_section "$PROJECT_ROOT/apps/mobile/App.tsx" "$C2_FRONT"
write_file_section "$PROJECT_ROOT/apps/mobile/src/navigation/MainStackNavigator.tsx" "$C2_FRONT"
write_file_section "$PROJECT_ROOT/apps/mobile/src/features/today/screens/TodayScreen.tsx" "$C2_FRONT"
write_file_section "$PROJECT_ROOT/apps/mobile/src/features/onboarding/screens/OnboardingWizard.tsx" "$C2_FRONT"
# authStore.ts - take first 134 lines to reach ~1500
write_file_section "$PROJECT_ROOT/apps/mobile/src/features/auth/stores/authStore.ts" "$C2_FRONT" 1 134

c2_front_lines=$(grep -c '^[[:space:]]*[0-9]' "$C2_FRONT" 2>/dev/null || echo 0)
echo "软著 2 前30页: $c2_front_lines 行"

# 后 30 页 (~1500 行)
C2_BACK="$OUTPUT_DIR/copyright-2-back-30.txt"
write_header "$C2_BACK" "寻裳移动客户端软件 V1.0"

# 从后向前选取:
# AiStylistUnifiedScreen.tsx (1877, last 700) + WardrobeScreen.tsx (726) + ProfileScreen.tsx (660, first 74)
write_file_section "$PROJECT_ROOT/apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx" "$C2_BACK" 1177 1877
write_file_section "$PROJECT_ROOT/apps/mobile/src/features/wardrobe/screens/WardrobeScreen.tsx" "$C2_BACK"
write_file_section "$PROJECT_ROOT/apps/mobile/src/features/profile/screens/ProfileScreen.tsx" "$C2_BACK" 1 74

c2_back_lines=$(grep -c '^[[:space:]]*[0-9]' "$C2_BACK" 2>/dev/null || echo 0)
echo "软著 2 后30页: $c2_back_lines 行"

# ============================================================
# 软著 3: 寻裳 AI 色彩体型智能分析系统 V1.0
# ============================================================
echo "=== 提取软著 3 (Python AI 服务) 源代码 ==="

# 前 30 页 (~1500 行)
C3_FRONT="$OUTPUT_DIR/copyright-3-front-30.txt"
write_header "$C3_FRONT" "寻裳 AI 色彩体型智能分析系统 V1.0"

# 文件选取:
# ml/api/main.py (250) + color_utils.py (447) + color_season_analyzer.py (954, first 803)
write_file_section "$PROJECT_ROOT/ml/api/main.py" "$C3_FRONT"
write_file_section "$PROJECT_ROOT/ml/services/analysis/color_utils.py" "$C3_FRONT"
write_file_section "$PROJECT_ROOT/ml/services/analysis/color_season_analyzer.py" "$C3_FRONT" 1 803

c3_front_lines=$(grep -c '^[[:space:]]*[0-9]' "$C3_FRONT" 2>/dev/null || echo 0)
echo "软著 3 前30页: $c3_front_lines 行"

# 后 30 页 (~1500 行)
C3_BACK="$OUTPUT_DIR/copyright-3-back-30.txt"
write_header "$C3_BACK" "寻裳 AI 色彩体型智能分析系统 V1.0"

# 从后向前选取:
# body_analyzer.py (1723, last 500) + intelligent_stylist_service.py (1742, last 500) + algorithm_gateway.py (746, last 500)
write_file_section "$PROJECT_ROOT/ml/services/analysis/body_analyzer.py" "$C3_BACK" 1223 1723
write_file_section "$PROJECT_ROOT/ml/services/stylist/intelligent_stylist_service.py" "$C3_BACK" 1242 1742
write_file_section "$PROJECT_ROOT/ml/services/common/algorithm_gateway.py" "$C3_BACK" 246 746

c3_back_lines=$(grep -c '^[[:space:]]*[0-9]' "$C3_BACK" 2>/dev/null || echo 0)
echo "软著 3 后30页: $c3_back_lines 行"

echo ""
echo "=== 提取完成 ==="
echo "输出目录: $OUTPUT_DIR"
echo ""
echo "文件列表:"
ls -la "$OUTPUT_DIR"/copyright-*.txt 2>/dev/null
echo ""
echo "下一步:"
echo "1. 检查提取文件中的敏感信息"
echo "2. 格式化打印: 每页 50 行, Consolas 10pt"
echo "3. 添加页眉: 软件名称+版本号"
echo "4. 添加页脚: 页码 (第 X 页 共 60 页)"
