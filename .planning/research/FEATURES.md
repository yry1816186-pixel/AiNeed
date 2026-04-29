# Feature Research

**Domain:** AI Fashion Recommendation Platform (Mobile)
**Researched:** 2026-04-29
**Confidence:** HIGH (existing features validated)

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature                    | Why Expected                       | Complexity | Notes             |
| -------------------------- | ---------------------------------- | ---------- | ----------------- |
| User registration/login    | Personalization requires identity  | MEDIUM     | ✓ Built (Phase 1) |
| Profile management         | Body metrics drive recommendations | MEDIUM     | ✓ Built (Phase 2) |
| AI-powered recommendations | Core value proposition             | HIGH       | ✓ Built (Phase 3) |
| Product browsing           | Discovery → purchase               | MEDIUM     | ✓ Built (Phase 4) |
| Shopping cart + checkout   | Commerce closure                   | HIGH       | ✓ Built (Phase 4) |
| Order tracking             | Post-purchase experience           | MEDIUM     | ✓ Built (Phase 4) |
| Search                     | Find specific items                | MEDIUM     | ✓ Built           |
| Notifications              | Re-engagement                      | MEDIUM     | ✓ Built           |

### Differentiators (Competitive Advantage)

| Feature                          | Value Proposition                           | Complexity | Notes             |
| -------------------------------- | ------------------------------------------- | ---------- | ----------------- |
| Conversational AI stylist (Yiyi) | Natural dialogue, not form-filling          | HIGH       | ✓ Built — Phase 3 |
| Virtual try-on (GLM multi-modal) | See outfits on yourself                     | HIGH       | ✓ Built — Phase 3 |
| 4-step guided onboarding         | Instant user profile without complex forms  | MEDIUM     | ✓ Built — Phase 2 |
| Scene-based recommendations      | "What should I wear to an interview?"       | HIGH       | ✓ Built — Phase 3 |
| ProfileDebugPanel (demo mode)    | Showcase inclusivity with profile switching | LOW        | ✓ Built — Phase 4 |
| RecommendationFunnel (6 layers)  | Transparent AI reasoning                    | HIGH       | ✓ Built — Phase 4 |
| Voice input + TTS response       | Hands-free interaction                      | MEDIUM     | ✓ Built — Phase 3 |
| Community                        | User-generated outfit sharing               | MEDIUM     | ✓ Built — Phase 4 |
| Wardrobe management              | Personal item tracking                      | MEDIUM     | ✓ Built — Phase 4 |
| Style quiz                       | Personality-based matching                  | MEDIUM     | ✓ Built — Phase 4 |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature                       | Why Requested             | Why Problematic                       | Alternative                    |
| ----------------------------- | ------------------------- | ------------------------------------- | ------------------------------ |
| Real-time chat between users  | "Social features"         | Moderation burden, CSAM risk          | Async community posts only     |
| AI-generated clothing designs | "Design your own clothes" | IP infringement risk, quality control | Manual curation from partners  |
| AR real-time try-on           | "Like Snapchat filters"   | Dev cost enormous, accuracy poor      | GLM image-based try-on (built) |
| OAuth social login            | "Faster signup"           | Privacy concern for fashion data      | Email/password (simpler)       |
| Live streaming shopping       | "Like Taobao Live"        | Infrastructure cost prohibitive       | Deferred to future             |
| Rent clothing                 | "New business model"      | Logistics complexity                  | Purchase only for v1           |

## Feature Dependencies

```
[User Profile] ──requires──> [Auth]
[Scene Analysis] ──requires──> [User Profile]
[AI Recommendation] ──requires──> [User Profile] + [Scene Analysis]
[Virtual Try-on] ──enhances──> [AI Recommendation]
[Shopping Cart] ──requires──> [Product Catalog]
[Checkout] ──requires──> [Shopping Cart]
[Order Tracking] ──requires──> [Checkout]
[Community] ──requires──> [Auth] + [Content Moderation]
[Wardrobe] ──requires──> [Auth]
[Notifications] ──requires──> [Auth]
[Demo Mode] ──requires──> [ProfileDebugPanel] + [RecommendationFunnel]
[E2E Integration] ──requires──> [All features]
```

### Dependency Notes

- **AI Recommendation requires User Profile + Scene Analysis**: Recommendations are personalized to body metrics and occasion
- **Virtual Try-on enhances AI Recommendation**: Try-on is the visual "proof" that builds trust in recommendations
- **Demo Mode requires ProfileDebugPanel + RecommendationFunnel**: Showcases personalization diversity

## Phase 5-6 Requirements

### Phase 5: E2E Integration + Competition Demo

Features needed for the competition demo:

- [ ] 3-consecutive-run stability (zero crashes, ≤150s/run)
- [ ] Demo warmup/Preflight scripts (15 Docker services health check)
- [ ] Demo fallback: pre-recording + PPT backup
- [ ] Voice interaction reliability (GLM fallback pipeline)
- [ ] Offline resilience (pre-cached recommendations)
- [ ] Demo mode toggle + demo data preloading

### Phase 6: Copyright + Diversity + Polish

Features for production readiness:

- [ ] Software copyright application (60-90 day pipeline)
- [ ] Marqo-FashionSigLIP migration (replace FashionCLIP)
- [ ] Diversity constraints on model output
- [ ] Legal/TOS documents
- [ ] Production hardening (security audit results)

## Feature Prioritization Matrix

| Feature                 | User Value       | Implementation Cost | Priority |
| ----------------------- | ---------------- | ------------------- | -------- |
| 3-run demo stability    | HIGH             | MEDIUM              | P1       |
| Voice reliability       | HIGH             | MEDIUM              | P1       |
| Demo fallback plan      | MEDIUM           | LOW                 | P1       |
| Software copyright      | HIGH (legal req) | LOW (time only)     | P1       |
| FashionSigLIP migration | MEDIUM           | HIGH                | P2       |
| Diversity constraints   | HIGH             | MEDIUM              | P2       |
| Production hardening    | HIGH             | HIGH                | P2       |

## Sources

- `docs/demo-script.md` — Competition demo flow
- `docs/DEMO-SCRIPT-TEST-PLAN.md` — 3-run rehearsa test plan
- `docs/XUNO_FINAL_PLAN.md` — 42 frozen decisions
- `CLAUDE.md` — Project state and constraints
- Existing codebase — 18 feature modules verified

---

_Feature research for: AI Fashion Recommendation_
_Researched: 2026-04-29_
