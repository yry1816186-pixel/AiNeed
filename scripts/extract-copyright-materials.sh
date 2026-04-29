#!/usr/bin/env bash
# extract-copyright-materials.sh
# 从源代码文件列表生成软著申请所需的60页源代码鉴别材料
# 用法: bash scripts/extract-copyright-materials.sh [输出目录]

set -euo pipefail

OUTPUT_DIR="${1:-./copyright-output}"
LINES_PER_PAGE=50
LINES_PER_SECTION=1500

SOURCE_FILES=(
  "apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts"
  "ml/services/stylist/intelligent_style_recommender.py"
  "ml/services/rag/embeddings.py"
  "ml/services/stylist/dialog_engine.py"
  "ml/services/stylist/style_understanding_service.py"
  "ml/services/recommender/sasrec_service.py"
  "ml/services/rag/hybrid_retriever.py"
  "ml/services/recommender/fashion_knowledge_rag.py"
  "apps/mobile/src/features/today/components/RecommendationFunnel.tsx"
  "apps/backend/src/domains/identity/privacy/consent.guard.ts"
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

mkdir -p "${OUTPUT_DIR}"

HEADER=$'源代码鉴别材料\n软件名称：寻裳智能穿搭推荐系统 V1.0\n'

FRONT_FILE="${OUTPUT_DIR}/front-30-pages.txt"
BACK_FILE="${OUTPUT_DIR}/back-30-pages.txt"
COMBINED_FILE="${OUTPUT_DIR}/source-code-full.txt"

echo "${HEADER}" > "${FRONT_FILE}"
echo "${HEADER}" > "${BACK_FILE}"
echo "${HEADER}" > "${COMBINED_FILE}"

page_num=0
total_lines=0

echo "=== 前30页：核心业务逻辑（前1500行） ==="
echo ""

for file in "${SOURCE_FILES[@]:0:5}"; do
  full_path="${PROJECT_ROOT}/${file}"

  if [[ ! -f "${full_path}" ]]; then
    echo "[WARNING] 文件不存在: ${file}"
    continue
  fi

  file_lines=$(wc -l < "${full_path}" | tr -d ' ')
  echo "[INFO] ${file} (${file_lines} 行)"

  {
    echo ""
    echo "//================================================================"
    echo "// 文件: ${file}"
    echo "// 行数: ${file_lines}"
    echo "//================================================================"
    echo ""
    head -n "${LINES_PER_SECTION}" "${full_path}"
  } >> "${FRONT_FILE}"

  {
    echo ""
    echo "//================================================================"
    echo "// 文件: ${file}"
    echo "// 行数: ${file_lines}"
    echo "//================================================================"
    echo ""
    head -n "${LINES_PER_SECTION}" "${full_path}"
  } >> "${COMBINED_FILE}"

  total_lines=$((total_lines + file_lines > LINES_PER_SECTION ? LINES_PER_SECTION : file_lines))
done

echo ""
echo "=== 后30页：推荐算法与前端展示（后1500行） ==="
echo ""

for file in "${SOURCE_FILES[@]:5}"; do
  full_path="${PROJECT_ROOT}/${file}"

  if [[ ! -f "${full_path}" ]]; then
    echo "[WARNING] 文件不存在: ${file}"
    continue
  fi

  file_lines=$(wc -l < "${full_path}" | tr -d ' ')
  echo "[INFO] ${file} (${file_lines} 行)"

  {
    echo ""
    echo "//================================================================"
    echo "// 文件: ${file}"
    echo "// 行数: ${file_lines}"
    echo "//================================================================"
    echo ""
    tail -n "${LINES_PER_SECTION}" "${full_path}"
  } >> "${BACK_FILE}"

  {
    echo ""
    echo "//================================================================"
    echo "// 文件: ${file}"
    echo "// 行数: ${file_lines}"
    echo "//================================================================"
    echo ""
    tail -n "${LINES_PER_SECTION}" "${full_path}"
  } >> "${COMBINED_FILE}"

  total_lines=$((total_lines + file_lines > LINES_PER_SECTION ? LINES_PER_SECTION : file_lines))
done

front_pages=$(( $(wc -l < "${FRONT_FILE}" | tr -d ' ') / LINES_PER_PAGE + 1 ))
back_pages=$(( $(wc -l < "${BACK_FILE}" | tr -d ' ') / LINES_PER_PAGE + 1 ))
total_pages=$(( front_pages + back_pages ))

echo ""
echo "=== 生成完成 ==="
echo "前30页: ${FRONT_FILE} (${front_pages} 页)"
echo "后30页: ${BACK_FILE} (${back_pages} 页)"
echo "合并文件: ${COMBINED_FILE} (${total_pages} 页)"
echo ""
echo "目标页数: 60 页 (前30 + 后30)"
echo "实际页数: ${total_pages} 页"

if [[ ${total_pages} -lt 60 ]]; then
  echo "[WARNING] 总页数不足 60 页，请补充更多源代码文件"
elif [[ ${total_pages} -gt 70 ]]; then
  echo "[WARNING] 总页数超过 70 页，建议调整每个文件的提取行数"
else
  echo "[OK] 页数符合软著申请要求"
fi

paginated_file="${OUTPUT_DIR}/source-code-paginated.txt"
echo "" > "${paginated_file}"
echo "${HEADER}" >> "${paginated_file}"
echo "每页 ${LINES_PER_PAGE} 行，连续编页" >> "${paginated_file}"
echo "" >> "${paginated_file}"

page_num=1
line_num=0
temp_file="${OUTPUT_DIR}/.temp_page.txt"

while IFS= read -r line; do
  echo "${line}" >> "${temp_file}"
  line_num=$((line_num + 1))

  if [[ ${line_num} -ge ${LINES_PER_PAGE} ]]; then
    {
      echo ""
      echo "================ 第 ${page_num} 页 ================"
      echo ""
    } >> "${paginated_file}"
    cat "${temp_file}" >> "${paginated_file}"
    echo "" >> "${paginated_file}"
    rm -f "${temp_file}"
    line_num=0
    page_num=$((page_num + 1))
  fi
done < "${COMBINED_FILE}"

if [[ -f "${temp_file}" && ${line_num} -gt 0 ]]; then
  {
    echo ""
    echo "================ 第 ${page_num} 页 ================"
    echo ""
  } >> "${paginated_file}"
  cat "${temp_file}" >> "${paginated_file}"
  rm -f "${temp_file}"
fi

echo "分页文件: ${paginated_file} (${page_num} 页)"
echo ""
echo "=== 完成 ==="
