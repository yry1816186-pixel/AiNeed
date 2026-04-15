---
phase: 06
slug: ai
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x |
| **Config file** | ml/api/tests/conftest.py |
| **Quick run command** | `cd ml && python -m pytest api/tests/ -x -q --tb=short` |
| **Full suite command** | `cd ml && python -m pytest api/tests/ -v --tb=long` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd ml && python -m pytest api/tests/ -x -q --tb=short`
- **After every plan wave:** Run `cd ml && python -m pytest api/tests/ -v --tb=long`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | AISV-01 | — | N/A | unit | `python -c "from ml.services.body_analyzer import BodyAnalyzer"` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | AISV-01 | — | N/A | unit | `grep -r "sys.path" ml/ --include="*.py" \| wc -l` → 0 | ✅ | ⬜ pending |
| 06-01-03 | 01 | 1 | AISV-01 | — | N/A | unit | `test -f ml/pyproject.toml` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 1 | AISV-02 | — | N/A | unit | `python -c "from ml.api.routes.stylist import router"` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 1 | AISV-02 | — | N/A | unit | `grep -c "stylist_chat\|intelligent_stylist_api" ml/api/main.py` → 0 | ✅ | ⬜ pending |
| 06-03-01 | 03 | 2 | AISV-04 | — | N/A | unit | `python -c "from ml.api.routes.analysis import router"` | ✅ | ⬜ pending |
| 06-03-02 | 03 | 2 | AISV-04 | — | N/A | unit | `grep -c "body_analysis\|style_analysis\|photo_quality" ml/api/main.py` → 0 | ✅ | ⬜ pending |
| 06-04-01 | 04 | 2 | AISV-03 | — | N/A | unit | `test -d ml/services/stylist && test -d ml/services/tryon && test -d ml/services/analysis` | ✅ | ⬜ pending |
| 06-04-02 | 04 | 2 | AISV-03 | — | N/A | unit | `python -c "from ml.services.stylist.intelligent_stylist_service import IntelligentStylistService"` | ✅ | ⬜ pending |
| 06-05-01 | 05 | 3 | AISV-03 | — | N/A | unit | `cd ml && python -m pytest api/tests/ -x -q` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `ml/api/tests/test_stylist.py` — 更新导入路径
- [ ] `ml/api/tests/test_body_analysis.py` — 更新导入路径
- [ ] `ml/api/tests/test_style_analysis.py` — 更新导入路径
- [ ] `ml/api/tests/test_photo_quality.py` — 更新导入路径
- [ ] `ml/api/tests/conftest.py` — 移除 sys.path hack

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker 构建成功 | AISV-01 | 需要 Docker 环境 | `docker build -t xuno-ml ml/api/` |
| API 端点可达 | AISV-02 | 需要运行服务 | `curl http://localhost:8001/health` |
| 虚拟试衣端点工作 | AISV-03 | 需要 GLM API Key | `curl -X POST http://localhost:8001/api/v1/virtual-tryon/generate` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
