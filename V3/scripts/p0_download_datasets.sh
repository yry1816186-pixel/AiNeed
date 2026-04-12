#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RAW_DIR="${PROJECT_ROOT}/data/raw"
LOG_FILE="${PROJECT_ROOT}/data/raw/download.log"
MIN_DISK_GB=100

REQUIRED_COMMANDS=(wget curl)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local level="$1"
    shift
    local msg="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[${timestamp}] [${level}] ${msg}" | tee -a "${LOG_FILE}"
}

info()  { log "INFO"  "${BLUE}${*}${NC}"; }
ok()    { log "OK"    "${GREEN}${*}${NC}"; }
warn()  { log "WARN"  "${YELLOW}${*}${NC}"; }
error() { log "ERROR" "${RED}${*}${NC}"; }

check_disk_space() {
    local avail_gb
    if command -v df &>/dev/null; then
        avail_gb=$(df -BG "${PROJECT_ROOT}" | awk 'NR==2 {gsub(/G/,"",$4); print $4}')
        if [[ ${avail_gb} -lt ${MIN_DISK_GB} ]]; then
            error "Insufficient disk space: ${avail_gb}GB available, ${MIN_DISK_GB}GB required"
            exit 1
        fi
        ok "Disk space check passed: ${avail_gb}GB available"
    fi
}

check_prerequisites() {
    info "Checking prerequisites..."

    for cmd in "${REQUIRED_COMMANDS[@]}"; do
        if ! command -v "${cmd}" &>/dev/null; then
            error "Required command not found: ${cmd}"
            exit 1
        fi
    done

    if ! command -v huggingface-cli &>/dev/null; then
        warn "huggingface-cli not found. Install with: pip install huggingface_hub"
        warn "Polyvore download will be skipped"
    fi

    if ! command -v kaggle &>/dev/null; then
        warn "kaggle CLI not found. Install with: pip install kaggle"
        warn "iMaterialist download will be skipped"
    fi

    check_disk_space
    ok "Prerequisites check complete"
}

create_directories() {
    info "Creating data directories..."
    mkdir -p "${RAW_DIR}"/{polyvore,deepfashion2,amazon,imaterialist}
    mkdir -p "$(dirname "${LOG_FILE}")"
    ok "Directories created: ${RAW_DIR}/{polyvore,deepfashion2,amazon,imaterialist}"
}

download_polyvore() {
    info "=== [1/4] Downloading Polyvore Outfits ==="
    local target="${RAW_DIR}/polyvore"
    local marker="${target}/.download_complete"

    if [[ -f "${marker}" ]]; then
        ok "Polyvore already downloaded (marker found). Skipping."
        return 0
    fi

    if ! command -v huggingface-cli &>/dev/null; then
        warn "huggingface-cli not available. Skipping Polyvore download."
        warn "To download manually: huggingface-cli download mvasil/polyvore-outfits --repo-type dataset --local-dir ${target}"
        return 0
    fi

    info "Downloading from HuggingFace: mvasil/polyvore-outfits"
    info "Target: ${target}"

    if huggingface-cli download mvasil/polyvore-outfits \
        --repo-type dataset \
        --local-dir "${target}"; then
        touch "${marker}"
        ok "Polyvore download complete"
    else
        error "Polyvore download failed. Re-run to resume (HuggingFace CLI supports resume)."
        return 1
    fi
}

download_deepfashion2() {
    info "=== [2/4] DeepFashion2 ==="
    local target="${RAW_DIR}/deepfashion2"
    local marker="${target}/.download_complete"

    if [[ -f "${marker}" ]]; then
        ok "DeepFashion2 already downloaded (marker found). Skipping."
        return 0
    fi

    warn "DeepFashion2 requires manual download from official source."
    warn "GitHub: https://github.com/switchablenorms/DeepFashion2"
    warn "Steps:"
    warn "  1. Visit the GitHub repo and follow their download instructions"
    warn "  2. Place extracted files in: ${target}/"
    warn "  3. After download, create marker: touch ${marker}"
    warn "  Expected structure: ${target}/train/ ${target}/validation/ ${target}/test/"

    if [[ -d "${target}/train" ]] && [[ -d "${target}/validation" ]]; then
        touch "${marker}"
        ok "DeepFashion2 data detected. Marker created."
    else
        info "Waiting for manual download. You can re-run this script after placing the data."
    fi
}

download_amazon() {
    info "=== [3/4] Downloading Amazon Review Fashion ==="
    local target="${RAW_DIR}/amazon"
    local marker="${target}/.download_complete"
    local url="https://jmcauley.ucsd.edu/data/amazon_v2/categoryFilesSmall/Fashion.json.gz"
    local meta_url="https://jmcauley.ucsd.edu/data/amazon_v2/metaFiles2/meta_Fashion.json.gz"
    local review_file="${target}/Fashion.json.gz"
    local meta_file="${target}/meta_Fashion.json.gz"

    if [[ -f "${marker}" ]]; then
        ok "Amazon Fashion already downloaded (marker found). Skipping."
        return 0
    fi

    info "Downloading review data..."
    if [[ -f "${review_file}" ]]; then
        ok "Review file exists, resuming..."
    else
        if wget -c --show-progress -O "${review_file}" "${url}"; then
            ok "Review data downloaded"
        else
            error "Failed to download Amazon review data"
            return 1
        fi
    fi

    info "Downloading metadata..."
    if [[ -f "${meta_file}" ]]; then
        ok "Metadata file exists, resuming..."
    else
        if wget -c --show-progress -O "${meta_file}" "${meta_url}"; then
            ok "Metadata downloaded"
        else
            warn "Failed to download Amazon metadata. Review data is still usable."
        fi
    fi

    touch "${marker}"
    ok "Amazon Fashion download complete"
}

download_imaterialist() {
    info "=== [4/4] iMaterialist Fashion ==="
    local target="${RAW_DIR}/imaterialist"
    local marker="${target}/.download_complete"

    if [[ -f "${marker}" ]]; then
        ok "iMaterialist already downloaded (marker found). Skipping."
        return 0
    fi

    if ! command -v kaggle &>/dev/null; then
        warn "kaggle CLI not available. Skipping iMaterialist download."
        warn "To download manually:"
        warn "  1. Install: pip install kaggle"
        warn "  2. Configure: ~/.kaggle/kaggle.json"
        warn "  3. Run: kaggle competitions download -c imaterialist-fashion-2020-fgvc7 -p ${target}"
        return 0
    fi

    info "Downloading from Kaggle: imaterialist-fashion-2020-fgvc7"
    info "Target: ${target}"

    if kaggle competitions download \
        -c imaterialist-fashion-2020-fgvc7 \
        -p "${target}"; then
        info "Extracting downloaded files..."
        for f in "${target}"/*.zip; do
            if [[ -f "${f}" ]]; then
                unzip -q -o "${f}" -d "${target}/"
                ok "Extracted: ${f}"
            fi
        done
        touch "${marker}"
        ok "iMaterialist download complete"
    else
        error "iMaterialist download failed. Check Kaggle API credentials."
        return 1
    fi
}

print_summary() {
    echo ""
    echo "=========================================="
    echo "  Phase 0 - Dataset Download Summary"
    echo "=========================================="
    echo ""

    local datasets=("polyvore" "deepfashion2" "amazon" "imaterialist")
    for ds in "${datasets[@]}"; do
        local dir="${RAW_DIR}/${ds}"
        local marker="${dir}/.download_complete"
        if [[ -f "${marker}" ]]; then
            local size
            size=$(du -sh "${dir}" 2>/dev/null | awk '{print $1}' || echo "N/A")
            echo -e "  ${GREEN}[DONE]${NC} ${ds} (${size})"
        else
            echo -e "  ${YELLOW}[SKIP]${NC} ${ds} (not yet downloaded)"
        fi
    done

    echo ""
    info "Log file: ${LOG_FILE}"
    echo ""
}

main() {
    info "AiNeed V3 - Phase 0 Dataset Download"
    info "Project root: ${PROJECT_ROOT}"
    info "Raw data dir: ${RAW_DIR}"
    echo ""

    check_prerequisites
    create_directories

    local failed=0

    download_polyvore     || { error "Polyvore download failed"; ((failed++)); }
    download_deepfashion2 || { error "DeepFashion2 download failed"; ((failed++)); }
    download_amazon       || { error "Amazon download failed"; ((failed++)); }
    download_imaterialist || { error "iMaterialist download failed"; ((failed++)); }

    print_summary

    if [[ ${failed} -gt 0 ]]; then
        warn "${failed} download(s) failed. Re-run to resume incomplete downloads."
        exit 1
    fi

    ok "All downloads complete!"
}

main "$@"
