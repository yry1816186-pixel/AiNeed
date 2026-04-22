# Research Summary: XUNO AI Fashion Decision Platform

**Domain:** AI-powered fashion decision platform (brownfield restructuring)
**Researched:** 2026-04-22
**Overall confidence:** MEDIUM-HIGH (stack and architecture HIGH; market projections and cold-start CTR MEDIUM)

## Executive Summary

XUNO is a brownfield React Native + NestJS monorepo undergoing a fundamental restructuring from a feature-catalog app to a decision-first platform. The core thesis: the homepage should answer "what do I wear today" in 1-2 steps, not present a feature grid. This restructuring touches every major subsystem: navigation (5 tabs to 4), recommendation pipeline (flat scoring to 6-layer funnel), user profiling (gender-primary to attribute-first), AI stylist (multi-screen to single-screen with embedded try-on), and virtual try-on (standalone tab to decision action).

The technology stack is well-established with locked dependencies (react-native 0.76.8, screens 4.4.0, reanimated 3.16.7, svg 15.8.0). No new npm packages are needed for the 48-hour sprint; all navigation, state management (Zustand), and UI components (BottomSheet, FlashList) are already installed. New additions are confined to the ML service: `optimum[onnxruntime]` for FashionCLIP ONNX export and `torch` for SASRec training. Qdrant is already installed for vector storage. The stack research is HIGH confidence -- everything was verified against the actual codebase and Context7 documentation.

The architecture centers on a 6-layer funnel pipeline (Compliance, Context, Fit, Budget, Style, Wardrobe) driven by a single RecommendationOrchestrator entry point. The critical gap is the FashionCLIP embedding pipeline -- products need pre-computed 512-dim embeddings stored in Qdrant before vector search can work. The existing SASRec implementation is custom-built and should NOT be replaced with external libraries. Build order follows strict dependency chains: schema enrichment before profile aggregation, embedding pipeline before funnel stages, funnel before UX integration.

Feature research identifies 10 table-stakes features (daily recommendations, weather-aware styling, digital wardrobe, AI stylist, graceful degradation), 10 differentiators (decision-first Today Tab, gender-optional onboarding, embedded try-on, 3-layer recommendation pipeline), and 8 anti-features (standalone VTO tab, community tab, gender-based segmentation, collaborative filtering, feature grid homepage). Competitive analysis of 10+ apps confirms that no competitor does decision-first homepage, embedded try-on, or gender-optional profiling -- XUNO's three core differentiators are genuinely novel.

Pitfall research identifies 20 domain-specific risks. The four most critical are: (1) gender field removal cascading through 6+ hidden dependencies, each needing individual attribute-based replacement; (2) FashionCLIP embeddings carrying latent gender bias from Farfetch training data, undermining the gender-optional architecture at the embedding level; (3) cold-start recommendations being incoherent without garmentPreference in onboarding Step 2; (4) PIPL compliance requirements (GB/T 45574-2025) for body data collection requiring per-purpose consent architecture designed before onboarding is built.

## Key Findings

**Stack:** Zero new npm packages for the 48-hour sprint. All dependencies already installed. New ML additions: `optimum` for ONNX export, `torch` for SASRec training. FashionCLIP served via ONNX Runtime (25%+ speedup over PyTorch). Custom SASRec implementation retained (has cold-start embeddings + dual backend). Qdrant for vector storage. No quantization for FashionCLIP (int8 causes vector drift).

**Architecture:** 6-layer funnel (L1-L4 hard filters eliminate 95% of candidates, L5-L6 soft scoring on remaining 5%). FashionCLIP embeddings pre-computed at ingestion time. Graceful degradation cascade from full AI pipeline down to rule-only templates. On-device + cloud split for privacy-sensitive operations.

**Critical pitfall:** FashionCLIP embeddings from Farfetch data encode latent gender associations. Without diversity constraints in retrieval and balanced seed images in onboarding, the "gender-optional" architecture is undermined at the vector level. Detection: run pipeline with 5 profiles having same scenario/budget but different styleExpression; if 80%+ of results are same gender-coded category, bias dominates.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Phase 1: Foundation (Hours 0-8)** - Data schema + TS errors + gender field downgrade

   - Addresses: ClothingItem schema enrichment, 6-layer UserProfile Prisma schema, TS error elimination
   - Avoids: PITFALL 7 (interface drift between agents) by freezing contracts BEFORE sprint starts
   - Avoids: PITFALL 15 (locked dependency bugs) by checking issue trackers pre-sprint

2. **Phase 2: Pipeline Core (Hours 8-16)** - Recommendation pipeline repair + mock data seed

   - Addresses: Orchestrator as single entry point, ColdStartService refactor, mock data coverage matrix
   - Avoids: PITFALL 2 (pipeline disconnected from data) by requiring integration test per profile
   - Avoids: PITFALL 10 (homogeneous mock data) via coverage matrix: 5 items per (scenario x budget x bodyType)

3. **Phase 3: Navigation + Screens (Hours 16-28)** - 4-tab restructure + Today/Discover screens

   - Addresses: Tab restructuring, Today Tab (scene card + 2 of 5 sections), Discover Tab (progressive layout)
   - Avoids: PITFALL 3 (navigation state crash) via NAV_VERSION state migration
   - Avoids: PITFALL 9 (Today Tab too complex) by implementing only 2 sections in sprint

4. **Phase 4: Onboarding + Stylist (Hours 28-40)** - 4-step onboarding + Stylist single-screen

   - Addresses: Gender-optional onboarding with garmentPreference in Step 2, FashionCLIP style seeds, Stylist chat + try-on merge
   - Avoids: PITFALL 1 (gender cascade) via complete dependency map before any file changes
   - Avoids: PITFALL 11 (try-on disrupts chat) via bottom-sheet pattern
   - Avoids: PITFALL 8 (incoherent cold start) by adding garmentPreference to Step 2

5. **Phase 5: Integration + Polish (Hours 40-48)** - End-to-end testing + data verification

   - Addresses: Full pipeline test (onboarding -> Today Tab -> recommendation -> try-on)
   - Avoids: PITFALL 7 compounding debt via 30-minute integration checks at each phase boundary

6. **Long-term Phase A: Compliance (Week 1-2)** - PIPL + GB/T 45574-2025 consent architecture

   - Addresses: Per-purpose consent for body data, SensitiveDataCatalog, cross-border transfer assessment
   - Research flag: Needs China legal expert review; code patterns are clear but legal requirements need validation

7. **Long-term Phase B-C: Embedding Pipeline + Product Sync (Week 3-6)** - FashionCLIP batch embedding + Taobao Ke / JD Alliance

   - Addresses: Real product data replacing mock, pre-computed embeddings for full catalog
   - Research flag: Taobao Ke enterprise registration takes 1-2 weeks, should start in Phase A

8. **Long-term Phase D-E: AI Tuning + Monetization (Week 7-13)** - SASRec training pipeline, FashionCLIP bias correction, membership tiers
   - Addresses: Behavioral feedback loop, CTR improvement from 5-12% to 15-25%, content-product monetization
   - Research flag: Cold-start CTR projections are LOW confidence, need real-world validation

**Phase ordering rationale:**

- Phase 1 must come first because all downstream systems depend on correct schema and gender field handling
- Phase 2 must precede Phase 3-4 because screens need a working recommendation pipeline to display
- Phase 3 and Phase 4 are partially parallelizable (different agents, different directories) but share frozen interface contracts
- Phase 5 is explicitly integration, not new development -- catching cross-agent issues
- Long-term phases follow strict dependency chain: compliance before real data sync, data before AI tuning, AI quality before monetization

**Research flags for phases:**

- Phase 1: LOW risk -- standard schema changes, well-understood patterns
- Phase 2: MEDIUM risk -- ColdStartService refactor is complex; mock data coverage requires careful design
- Phase 3: MEDIUM risk -- navigation state migration is tricky but well-documented pattern
- Phase 4: HIGH risk -- onboarding + FashionCLIP seeds + gender removal interact in complex ways; needs deepest attention
- Phase 5: MEDIUM risk -- integration testing reveals hidden assumptions; expect 3-5 critical bugs
- Phase A: HIGH risk -- PIPL compliance has legal dimensions beyond engineering control
- Phase D: MEDIUM risk -- FashionCLIP bias correction requires empirical measurement, not just code changes

## Confidence Assessment

| Area              | Confidence  | Notes                                                                                                                                                                                                     |
| ----------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack             | HIGH        | All dependencies verified against codebase package.json files and Context7 docs. Zero new npm packages needed.                                                                                            |
| Features          | MEDIUM-HIGH | Competitive analysis based on 10+ real apps. Anti-features validated by The Interline industry analysis. Monetization projections are LOW confidence (Chinese market specific).                           |
| Architecture      | HIGH        | 6-layer funnel pattern is industry standard. FashionCLIP + Qdrant integration verified via Context7. Build order derived from actual dependency analysis.                                                 |
| Pitfalls          | HIGH        | 20 pitfalls identified from project-specific codebase analysis, published research (FashionCLIP bias, VTO trust gap), and regulatory analysis (PIPL GB/T 45574-2025).                                     |
| Onboarding Design | MEDIUM-HIGH | 50-second feasibility based on per-step interaction time analysis. Cold-start CTR projections (5-12% batch 1) are theoretical, not measured. garmentPreference comprehension risk assessed as LOW-MEDIUM. |
| Market (China)    | MEDIUM      | Monetization projections and user willingness-to-pay are based on limited industry data. Taobao Ke API limitations are from general knowledge, not verified against current API docs.                     |

## Gaps to Address

- **Cold-start CTR validation:** The 5-12% batch 1 CTR projection is theoretical. Needs real-world A/B testing post-launch. Alarm threshold: if batch 1 CTR is below 3%, the pipeline is broken.
- **FashionCLIP bias magnitude:** Latent gender bias direction is well-documented, but the specific magnitude for XUNO's product catalog needs empirical measurement. Plan a bias audit in Phase D.
- **PIPL legal review:** Code-level consent architecture is designed, but legal requirements (especially GB/T 45574-2025 per-purpose consent and cross-border transfer rules) need a China-qualified legal review.
- **Chinese market monetization:** The 3-5% paid conversion and 2-4 yuan/month ARPU projections in the fusion plan are optimistic given free alternatives on Xiaohongshu and Douyin. Content-product monetization (reports, capsule plans) is the right strategy but conversion rates are unknown.
- **Onboarding A/B testing:** Scene-first vs style-first ordering has no direct A/B test data. The theoretical case is strong, but formal testing should begin at 500+ weekly users.
- **SASRec cold-start performance:** SASRec with <10 behavior events is expected to be weak. The scoring weight progression (SASRec 0% at cold start -> 35% at 20+ interactions) needs validation against actual user behavior data.
