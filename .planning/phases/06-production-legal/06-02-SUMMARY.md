---
phase: 06-production-legal
plan: 02
subsystem: legal
tags: [copyright, privacy-policy, user-agreement, ai-compliance, pipl, software-registration]

requires:
  - phase: 06-01
    provides: FashionSigLIP naming cleanup, diversity scoring infrastructure
provides:
  - Submission-ready software copyright application template
  - Software manual covering all 6 functional modules
  - Source code excerpt structure (60-page format)
  - Automated source code extraction script
  - Finalized privacy policy (PIPL-compliant)
  - Finalized user service agreement
  - AI compliance declaration
affects: [production-readiness, legal-compliance, copyright-filing]

tech-stack:
  added: [bash-scripting]
  patterns: [placeholder-marking-for-user-completion]

key-files:
  created:
    - scripts/extract-copyright-materials.sh
  modified:
    - docs/software-copyright/application.md
    - docs/software-copyright/software-manual.md
    - docs/software-copyright/source-code-excerpt.md
    - docs/LEGAL/privacy-policy.md
    - docs/LEGAL/user-agreement.md
    - docs/LEGAL/ai-compliance-declaration.md

key-decisions:
  - "FashionCLIP references replaced with FashionSigLIP across all copyright and legal documents"
  - "Personal info fields marked with clear PLACEHOLDER markers for user completion"
  - "Privacy policy updated with cross-border transfer clause for GLM API calls to zhipu.cn"
  - "Source code extraction script uses bash with UTF-8 encoding support for Chinese characters"

patterns-established:
  - "Placeholder pattern: （请填写...） for Chinese docs, [PLACEHOLDER] for English docs"

requirements-completed: [PROD-01, PROD-04]

duration: 12min
completed: 2026-04-29
---

# Phase 6 Plan 2: Copyright Materials + Legal Documents Summary

**Software copyright application template finalized with all 6 modules, extraction script created, and PIPL-compliant privacy policy + user agreement + AI compliance declaration completed**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-29
- **Completed:** 2026-04-29
- **Tasks:** 2 (+ 1 checkpoint approved)
- **Files modified:** 6

## Accomplishments

- Copyright application template reviewed and corrected (FashionSigLIP references, version dates, all 6 modules verified)
- Software manual verified for all 6 functional modules with screenshot placeholders
- Source code extraction script created (`scripts/extract-copyright-materials.sh`) with paginated output, UTF-8 support
- Privacy policy finalized with cross-border transfer, AI data handling, PIPL compliance
- User agreement finalized with AI liability clauses, payment terms, dispute resolution
- AI compliance declaration verified for accuracy (development tools, human review process)

## Task Commits

Each task was committed atomically:

1. **Task 1: Finalize software copyright materials and create extraction script** - `7af46f4a` (feat)
2. **Task 2: Finalize legal documents (privacy policy, user agreement, AI compliance)** - `7cfc11ed` (feat)

**Task 3: Checkpoint human-verify** — APPROVED by user

## Files Created/Modified

- `docs/software-copyright/application.md` - Copyright application template with all placeholders
- `docs/software-copyright/software-manual.md` - Software manual with 6 module descriptions
- `docs/software-copyright/source-code-excerpt.md` - 60-page source code structure
- `scripts/extract-copyright-materials.sh` - Automated extraction script
- `docs/LEGAL/privacy-policy.md` - PIPL-compliant privacy policy V2.0
- `docs/LEGAL/user-agreement.md` - User service agreement V2.0
- `docs/LEGAL/ai-compliance-declaration.md` - AI tool usage declaration

## Decisions Made

- Replaced all FashionCLIP references with FashionSigLIP across documents for consistency with Phase 06-01 cleanup
- Marked all user-fillable fields with clear `（请填写...）` or `[PLACEHOLDER]` markers so the user only needs to fill personal/company info
- Privacy policy includes explicit cross-border data transfer clause for GLM API calls (zhipu.cn servers)
- Extraction script uses bash for portability, handles UTF-8 encoding for Chinese source files

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**User must fill in placeholder fields before submission:**

- Company/personal information in `docs/software-copyright/application.md` (marked with `（请填写...）`)
- Contact information in `docs/LEGAL/privacy-policy.md` and `docs/LEGAL/ai-compliance-declaration.md`
- Screenshot captures in `docs/software-copyright/software-manual.md` (marked with `[截图: ...]`)
- Run `bash scripts/extract-copyright-materials.sh ./copyright-output/` to generate actual source code excerpt

## Next Phase Readiness

- All copyright materials and legal documents are submission-ready
- PROD-01 (copyright filing materials) and PROD-04 (legal documents) requirements satisfied
- Ready for any remaining production-legal phase work

## Self-Check: PASSED

- FOUND: .planning/phases/06-production-legal/06-02-SUMMARY.md
- FOUND: 7af46f4a (Task 1 commit)
- FOUND: 7cfc11ed (Task 2 commit)
- FOUND: ad8a8425 (Plan metadata commit)

---

_Phase: 06-production-legal_
_Completed: 2026-04-29_
