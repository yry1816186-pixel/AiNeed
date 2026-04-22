# Domain Pitfalls: XUNO AI Fashion Decision Platform Restructuring

**Domain:** AI fashion recommendation platform, brownfield restructuring from feature-catalog to decision-first UX
**Researched:** 2026-04-18
**Confidence:** HIGH (project-specific analysis), MEDIUM (external market sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, user loss, or legal exposure.

### Pitfall 1: Gender Field Removal Cascades Through Hidden Dependencies

**What goes wrong:** Making `gender` optional appears to be a simple schema change, but it silently breaks every downstream system that uses `gender` as a branching key. The fusion plan already identifies `gender = user?.gender || Gender.female` in BodyMetricsService as "the most dangerous design" -- but the cascade extends further than most developers anticipate.

**Why it happens:** In the original codebase, gender was used as a proxy signal for at least 6 different decisions: body fat calculation formula selection, BMR formula selection, clothing size curve selection, default style templates, cold start recommendation buckets, and content filtering. Removing it without replacing each of these 6 decision points with attribute-based alternatives causes silent degradation.

**Consequences:** Users without gender specified get female defaults (the existing fallback), leading to visibly wrong recommendations for male users. ColdStartService returns irrelevant items. BodyMetrics produces inaccurate body fat estimates. ProfileCompleteness scores break if weight redistribution is not handled.

**Prevention:**

1. Before touching `auth.dto.ts`, grep the entire codebase for every reference to `gender`, `Gender.male`, `Gender.female`, and `user?.gender`. Build a complete dependency map.
2. Replace each dependency individually with its attribute-based alternative -- do NOT batch-replace with a single `garmentPreference` substitution.
3. Body fat formula: switch to waist/hip ratio continuous coefficient (as planned in section 11.1). Verify Katch-McArdle formula produces reasonable values for edge cases (very low body fat, very high body fat).
4. ColdStartService: replace male/female buckets with bodyType + styleExpression + primaryScenarios triple. Test with combinations that never existed in the old system (e.g., "rectangle body + 柔和优雅 style + 运动 scenario").
5. ProfileCompleteness: redistribute gender's 10% weight before making gender optional, not after. If you change the weight after, existing users' completeness scores change retroactively.

**Detection:** Create a test matrix: for each service that consumed gender, write a test with `gender = null` and verify the output is not identical to `gender = female`. If it is, the fallback is still gender-implicit.

**Phase:** Phase 2 (Hour 8-16). This is Agent B's primary task. Must complete before navigation restructuring begins.

**Sources:**

- XUNO_FUSION_PLAN.md section 11 (BodyMetricsService modification plan)
- FAccT 2025 paper on gender bias in AI-generated fashion descriptions ([FAccT 2025](https://facctconference.org/static/docs/facct2025-206archivalpdfs/facct2025-final1425-acmpaginated.pdf))

---

### Pitfall 2: Recommendation Pipeline "Works" But Is Disconnected From Real Data

**What goes wrong:** The 3-layer pipeline (rules -> retrieval -> explanation) compiles and returns results, but the data flowing through it is stale, mocked, or circular. StyleQuizResult never reaches the scoring layer. ColdStartService reads gender buckets that no longer exist. The Orchestrator is bypassed by controllers calling sub-services directly.

**Why it happens:** The fusion plan identifies 7 P0 data architecture issues (section 10.1). In a 48-hour sprint, the temptation is to "wire it up" with mock data and move on. But mock data in the recommendation pipeline is not like mock data in a shopping cart -- it produces outputs that look correct but are systematically biased. A rule engine with above_30 temperature rules that give identical advice for 8 different occasions (the unfixed issue in section 12.1) will produce confident but useless recommendations.

**Consequences:** Demo looks functional but the recommendation quality is unreliable. When real data is connected later, the pipeline behavior changes unpredictably because it was never tested against real FashionCLIP embeddings or real SASRec sequences. The 6-layer funnel logic has never been validated end-to-end.

**Prevention:**

1. The Orchestrator must be the ONLY entry point. Verify this by adding a log warning in each sub-service controller method: "Direct call detected -- use Orchestrator instead." During Phase 2, fix every call site that triggers this warning.
2. StyleQuizResult backflow: verify data flow with a concrete integration test. Create a user, complete the style quiz, call the recommendation endpoint, and assert that quiz responses appear in the scoring weights.
3. Mock product data must cover the critical attribute dimensions: at least 5 items per bodyType compatibility, at least 3 items per scenario, at least 2 items per budgetBand. Less than this and the funnel always returns the same items regardless of user profile.
4. The `full_outfit_engine.py` hard-coded rules override must be removed before testing. If it is not, the engine will ignore the JSON rule files and produce simplified results that mask real problems.

**Detection:** Run the pipeline with 3 different user profiles that should produce different results. If the top-3 recommended items are the same across all profiles, the pipeline is disconnected or the mock data is too homogeneous.

**Phase:** Phase 2 (Hour 8-16). Agent A's primary task. The mock data seed (100+ items) must be schema-complete before the pipeline can be meaningfully tested.

**Sources:**

- XUNO_FUSION_PLAN.md sections 5.1-5.5 (recommendation architecture and rule gaps)
- Algonomy: "Why Traditional Recommendations Fail in Fashion" ([algonomy.com](https://algonomy.com/blogs/traditional-recommendations-fail-in-fashion-and-ai-stylists-fix-it/))
- Stylitics: "Top 6 Product Data Mistakes in Fashion Ecommerce" ([stylitics.com](https://stylitics.com/resources/blog/product-data-mistakes-fashion-ecommerce/))

---

### Pitfall 3: Navigation Restructuring Breaks All Existing User State

**What goes wrong:** Moving from 5-tab to 4-tab navigation (removing Community tab, merging TryOn into Stylist, moving Wardrobe from Profile to Discover) breaks every stored navigation state, deep link, and screen-transition assumption in the existing codebase.

**Why it happens:** React Navigation's state is serialized by route name. When tab names change or are removed, the persisted navigation state becomes invalid. Existing users who have the app in a state like `{index: 2, routes: [{name: 'Community'}, ...]}` will crash or land on a wrong screen when the app updates. The fusion plan explicitly defers "Deep Link routing migration" but does not address in-flight navigation state.

**Consequences:** Existing test users (and any beta users) experience crashes or blank screens on app update. The Discover tab's dual-mode behavior (cold-start vs. wardrobe) has no precedent in the old navigation and has never been tested with real state transitions.

**Prevention:**

1. Before Phase 3 begins, add a navigation state migration function in RootNavigator that resets persisted state on version change. This is a 20-line function that prevents the most common crash scenario.
2. The fusion plan says "Feature Flag system is not needed because this is a one-time restructuring." This is correct for feature coexistence but wrong for state migration. Add a single `NAV_VERSION` constant that increments when navigation structure changes, and clears persisted state when it does not match.
3. Map every old route to a new route explicitly:
   - `Community/*` -> `Today/(inspiration)` or `Me/Community`
   - `TryOn/*` -> `Stylist/TryOn`
   - `Profile/Wardrobe` -> `Discover/Wardrobe`
   - `Home` -> `Today`
4. Test with React Navigation's `getStateFromPath` for at least 10 old-format deep links.

**Detection:** After the tab restructuring, launch the app with a persisted navigation state from the old version (save one before starting). If it crashes or navigates to the wrong screen, the migration is incomplete.

**Phase:** Phase 3 (Hour 16-28). Agent A's primary task. Must be done before Today Screen and Discover Screen are built, because those screens define the new state shape.

**Sources:**

- React Navigation documentation on state persistence and migration
- NN/g: "Top 10 Application Design Mistakes" ([nngroup.com](https://www.nngroup.com/articles/top-10-application-design-mistakes/))

---

### Pitfall 4: FashionCLIP Embeddings Carry Latent Gender Bias From Training Data

**What goes wrong:** FashionCLIP is trained on Farfetch product data, which is heavily skewed toward gendered fashion categories. Even though XUNO's recommendation pipeline does not explicitly use gender, the embedding space encodes gendered associations: "dress" clusters near feminine style vectors, "suit jacket" clusters near masculine ones. When a gender-null user gets recommendations, the vector retrieval layer may still produce gender-skewed results based on the user's style image seeds or initial browsing behavior.

**Why it happens:** CLIP-like models learn implicit associations from training data. The GradREC paper (ECNLP 2022) demonstrates that FashionCLIP's latent space encodes "heel height," "trouser length," and "occasion" as organized clusters -- and these clusters correlate with gendered product categories. The original FashionCLIP paper acknowledges that the model's performance is sensitive to the quality and vocabulary of product descriptions, and that it does not provide confidence measures for abstract concepts.

**Consequences:** The "gender-optional" architecture is undermined at the embedding level. A user who selects "中性平衡" (neutral balance) style and "通勤" (commute) scenario may still receive predominantly feminine-coded recommendations because the FashionCLIP nearest neighbors for those queries are biased. This is invisible in unit tests but perceptible to users.

**Prevention:**

1. In Phase 2, when building the mock product data, ensure the mock items are balanced across gender-coded categories. Do NOT just copy real Farfetch-style product data.
2. Add a diversity constraint to the FashionCLIP retrieval layer: when returning top-K items, enforce that the result set spans multiple `expression` labels ("中性", "偏柔和", "偏利落"). This is a simple post-retrieval filter.
3. When Onboarding Step 3 uses style image seeds to extract FashionCLIP embeddings as recommendation seeds, verify that the 6 seed images cover a balanced spectrum. If all 6 seed images are from feminine-coded product photography, the initial embedding will be biased.
4. Medium-term: evaluate ViBA-Net (Visual Body-shape-Aware Network, WACV 2024) as a replacement or augmentation for FashionCLIP in the compatibility scoring layer, as it explicitly models body-shape awareness.

**Detection:** Run the recommendation pipeline with 5 different user profiles (same scenario, same budget, varying styleExpression). If the top-10 results for "中性平衡" contain 80%+ items tagged as feminine-coded (skirts, dresses, heeled shoes), the embedding bias is dominating.

**Phase:** Phase 2 (data seed design) + Long-term Phase D (AI tuning). The mock data design in Phase 2 is the first line of defense.

**Confidence:** MEDIUM -- the bias direction is well-documented in CLIP literature, but the specific magnitude for XUNO's use case needs empirical measurement.

**Sources:**

- FashionCLIP paper: "Contrastive Language and Vision Learning of General Fashion Concepts" ([Nature Scientific Reports](https://www.nature.com/articles/s41598-022-23052-9))
- "Does it come in black?" CLIP-like models as zero-shot recommenders ([ACL ECNLP 2022](https://aclanthology.org/2022.ecnlp-1.22.pdf))
- ViBA-Net: Visual Body-shape-Aware Embeddings ([WACV 2024](https://openaccess.thecvf.com/content/WACV2024/papers/Pang_Learning_Visual_Body-Shape-Aware_Embeddings_for_Fashion_Compatibility_WACV_2024_paper.pdf))
- "Understanding Gender Bias in AI-Generated Product Descriptions" ([FAccT 2025](https://facctconference.org/static/docs/facct2025-206archivalpdfs/facct2025-final1425-acmpaginated.pdf))

---

### Pitfall 5: Virtual Try-On Embedded as Decision Action Losves Trust Without Disclosure

**What goes wrong:** Repositioning virtual try-on from a standalone tab to an embedded action within the Stylist conversation flow changes the user's mental model. As a standalone feature, users approach try-on as an explicit, optional tool. As an embedded action, it appears as an AI-generated claim ("this will look good on you") backed by a synthetic image. Without clear disclosure, users conflate the AI's styling recommendation with the try-on image's visual fidelity.

**Why it happens:** The Wearfits research (2025) documents that virtual try-on has a persistent trust gap: 77% of shoppers want the feature, but actual usage remains low because they do not trust synthetic images about their own bodies. The uncanny valley effect is real: photorealistic but slightly off avatars reduce purchase confidence. The FUSION_PLAN's TryOnResult interface includes a `confidence` field and `fitAssessment`, but these technical outputs do not translate to user trust without deliberate UX design.

**Consequences:** Users accept AI styling advice at face value, then lose trust when the try-on image does not perfectly match reality. This is worse than not having try-on at all -- it actively erodes credibility of the entire decision flow. The return rate paradox: try-on reduces fit-related returns but increases feel-related returns (the physical garment differs from the digital drape).

**Prevention:**

1. Always display a disclosure label on try-on images: "AI-generated visualization, actual fit may vary." The Wearfits research shows disclosure increases trust rather than reducing it.
2. Never use try-on images as the primary evidence for a recommendation. The text explanation ("M-codes should fit your shoulder line well") should be the primary decision support; the try-on image should be supplementary visual evidence.
3. The `confidence` field in TryOnResult must be surfaced to the user, not hidden. Low-confidence results should show a softer prompt: "This item might work -- want to see how it looks?" rather than a definitive try-on.
4. For complex patterns (florals, geometric prints, logos), which garment diffusion models render inaccurately, do not offer try-on or show it with an explicit limitation note.

**Detection:** User testing metric: after viewing a try-on result, do users proceed to next action (save/cart) at higher rates than without it? If try-on reduces conversion for any item category, the trust cost exceeds the value.

**Phase:** Phase 4 (Hour 28-40). Agent A (Stylist single-screen experience) must implement disclosure from day one, not as a later polish item.

**Sources:**

- Wearfits: "Why Shoppers Admire Gen AI Virtual Try-On But Rarely Buy" ([wearfits.com](https://wearfits.com/articles/gen-ai-virtual-try-on-trust))
- The Interline: "Virtual Try-On Hasn't Met The Bar For Consumer Adoption" ([theinterline.com](https://www.theinterline.com/2026/03/23/virtual-try-on-hasnt-met-the-bar-for-consumer-adoption-can-ai-push-it-over/))
- ScienceDirect: Systematic review of virtual try-on technology ([sciencedirect.com](https://www.sciencedirect.com/science/article/pii/S2543925123000347))

---

### Pitfall 6: PIPL Compliance Time Bomb From Body Data and Photo Collection

**What goes wrong:** XUNO collects height, weight, body measurements, user photos, and derives body type classifications. Under China's PIPL and the new national standard GB/T 45574-2025 (effective November 1, 2025), basic physical metrics (height, weight) are NOT classified as sensitive personal information. However, user photos for virtual try-on, detailed body measurements (bust, waist, hip, shoulder, inseam), and derived body composition data (body fat percentage, body type classification) ARE classified as sensitive personal information because their leakage could infringe on personal dignity.

**Why it happens:** The fusion plan correctly identifies PIPL as a blocker but classifies it as "blocking launch, not blocking development." This is the wrong prioritization for two reasons: (1) the consent architecture must be designed before the onboarding flow is built, because retrofitting consent screens into a completed onboarding flow is expensive and error-prone; (2) the new GB/T 45574-2025 standard requires separate consent per processing purpose -- a user consenting to body measurement for size recommendation is NOT consenting to the same data being used for body fat calculation or body type classification.

**Consequences:** Without per-purpose consent mechanisms, the app is non-compliant at launch. The new standard requires: separate consent (not bundled with general terms), written consent for certain processing, impact assessments retained for 3 years, monthly security audits of sensitive data access logs, and deletion mechanisms for sensitive data. Failure to implement these blocks App Store approval and exposes the company to regulatory action.

**Prevention:**

1. Design the consent architecture in Phase A (Long-term), before the Onboarding 4-step flow is finalized. Each data collection point in onboarding must have its own consent moment:
   - Step 2 (height/weight/measurements): consent for size matching
   - Step 3 (style image seeds): consent for embedding-based recommendations (these may not count as SPI, but be conservative)
   - Step 4 (photo upload): consent for virtual try-on AND body analysis, offered separately
2. Implement data minimization: collect body measurements only when the user actively uses a feature that requires them. Do not collect all measurements during onboarding.
3. Build a `SensitiveDataCatalog` table that tracks every piece of SPI, its purpose, consent date, and expiry. This is required by the new standard.
4. For cross-border API calls (GLM, DeepSeek, any overseas LLM): PIPL Article 38 requires a security assessment for cross-border data transfers. If user photos or measurements are sent to overseas API endpoints, this is a potential violation.

**Detection:** Compliance checklist: can a user (a) see what sensitive data is stored, (b) withdraw consent for each purpose independently, (c) request deletion and have it confirmed? If any answer is no, the app is not PIPL-compliant.

**Phase:** Phase A (Long-term, compliance-first). The consent architecture should be designed alongside Onboarding in Phase 4, even if implementation is deferred.

**Confidence:** HIGH -- based on the actual GB/T 45574-2025 standard text analyzed from Morgan Lewis publication.

**Sources:**

- Morgan Lewis: "China's New Standard on Sensitive Personal Information" (GB/T 45574-2025, effective Nov 1, 2025) ([morganlewis.com](https://www.morganlewis.com/pubs/2025/09/chinas-new-standard-on-sensitive-personal-information-goes-into-effect-november-1))
- China Briefing: "New Guidelines on Handling Sensitive Personal Data in China" ([china-briefing.com](https://www.china-briefing.com/news/sensitive-personal-data-in-china-guidelines/))
- DLA Piper: "Important New Guidance on Defining Sensitive Personal Information" ([privacymatters.dlapiper.com](https://privacymatters.dlapiper.com/2024/08/china-important-new-guidance-on-defining-sensitive-personal-information/))

---

### Pitfall 7: 48-Hour Sprint Creates Compounding Technical Debt That Blocks Subsequent Phases

**What goes wrong:** The 48-hour execution plan compresses 5 phases of work into an extreme timeframe with 3 parallel agents. The "can change, don't create new; can run, don't refactor" principle is correct for the sprint, but the debt it creates is not just cosmetic. Specific debt categories that compound:

- **Type debt:** Fixing 137 TS errors by adding type assertions (`as any` alternatives) instead of proper type narrowing. This hides real type mismatches that surface later.
- **Integration debt:** Mock data that satisfies the schema but not the business logic (e.g., all mock items have the same season tag, so season filtering returns everything).
- **State debt:** Onboarding stores with incomplete migration (new fields added, old fields not removed), leading to undefined checks scattered through the codebase.

**Why it happens:** In parallel development with 3 agents, each agent optimizes for its own completion criteria. Agent A finishes the navigation restructuring but leaves old route references in components Agent B owns. Agent B completes the Stylist screen but does not update the recommendation output format that Agent C's data seed depends on. The integration happens in Phase 5, but by then the assumptions have hardened.

**Consequences:** Phase 5 (Hour 40-48) is supposed to be "end-to-end testing + polish," but it becomes "integration debugging." Each integration bug found in Phase 5 requires touching code from multiple Phase 2-4 agents, who are no longer context-loaded. The "known issues list" grows beyond what can be fixed in 8 hours.

**Prevention:**

1. Before the sprint begins, freeze the interface contracts between agents:
   - RecommendationOutput interface (section 5.3 of fusion plan)
   - TryOnResult interface (section 6.3)
   - Navigation route name constants (a single shared file)
   - Onboarding state shape (a single shared type)
2. Each agent writes to its own directory only (the plan already specifies this). But also: each agent must export its interfaces from a shared types file, and import from the same file. No agent defines types inline.
3. At Hour 16 (end of Phase 2) and Hour 28 (end of Phase 3), run a 30-minute integration check: compile the full project, run the app, and verify the critical path (open app -> onboarding -> today tab -> recommendation -> try-on). Fix integration issues immediately, not in Phase 5.
4. The mock data seed is the single highest-risk integration point. Agent C in Phase 2 must produce it, but Agents A and B in Phase 3-4 must consume it. Write the mock data to match the exact RecommendationOutput contract, not the raw ClothingItem schema.

**Detection:** After each phase boundary (Hour 8, 16, 28, 40), run `tsc --noEmit` on the full project. If errors appear that were not there at the previous boundary, the agents have diverged. Stop and fix immediately.

**Phase:** Cross-cutting risk. Affects every phase. The interface contracts must be frozen before Hour 0.

**Sources:**

- ScienceDirect: "Technical Debt is Not Just Technical" -- industrial case study ([sciencedirect.com](https://www.sciencedirect.com/science/article/pii/S0164121225003887))
- MDPI: "A Scoping Review and Assessment Framework for Technical Debt" ([mdpi.com](https://www.mdpi.com/2076-3417/15/13/7165))
- Pragmatic Coders: "What Is Technical Debt? The Complete Guide" ([pragmaticcoders.com](https://www.pragmaticcoders.com/blog/what-is-technical-debt-in-fintech-short-guide))

---

### Pitfall 8: Cold Start With No Gender Signal Produces Incoherent Recommendations

**What goes wrong:** The fusion plan's cold start strategy (section 4.3) relies on primaryScenarios + FashionCLIP seeds + bodyType. But for a brand-new user who has completed only the 4-step onboarding, the system has: 1-3 scenarios (from Step 1), an ageBand + height/weight/usualSize (from Step 2), a styleExpression + 2 style images (from Step 3), and optionally a photo (from Step 4). This is significantly LESS signal than the old system which also had gender.

**Why it happens:** The old ColdStartService used gender as a primary bucketing key. The new system replaces it with bodyType (derived from height/weight/waist-hip ratio), but bodyType alone is a weak signal for clothing category selection. A "rectangle" body type with "通勤" scenario and "简洁利落" style could be satisfied by either a skirt suit or a trouser suit -- and without gender or garmentPreference, the system cannot disambiguate.

**Consequences:** The first 3 recommendations (critical for retention) may include items the user would never wear. A user who wears pants exclusively receives skirt recommendations. A user who prefers dresses receives trouser recommendations. This is not a quality issue -- it is a relevance issue that makes the app feel broken.

**Prevention:**

1. Add garmentPreference to Onboarding Step 2 (alongside height/weight/size). A single question: "Do you usually wear: pants / skirts / both" takes 2 seconds and provides the most critical signal the gender field was proxying for.
2. Alternatively, infer garmentPreference from the style image seeds in Step 3. If the user selects images that predominantly show pants, infer lowerBody: "pants". This requires the 6 seed images to be carefully curated to span garment categories.
3. In the 0-3 recommendation range, use conservative rules: default to gender-neutral items (blazers, coats, sweaters, plain trousers) rather than gendered items (skirts, dresses, ties). This reduces the chance of a jarring first recommendation.
4. The rule engine's `garmentPreference` field (section 3.2) is the intended replacement -- but it MUST be populated during onboarding, not left as null for "gender-optional" users.

**Detection:** Run the cold-start recommendation pipeline with 10 different user profiles where gender is null. If more than 30% of recommendations are clearly mismatched to what a reasonable user would expect (e.g., skirts for someone who selected "运动" scenario + "简洁利落" style + no skirt preference), the cold start needs garmentPreference.

**Phase:** Phase 2 (Agent B: Onboarding + cold start). If garmentPreference is not added to Onboarding Step 2, this pitfall will surface in Phase 5 testing.

**Sources:**

- XUNO_FUSION_PLAN.md sections 3.2, 4.2, 4.3
- General cold-start recommendation research (training data, MEDIUM confidence)

---

## Moderate Pitfalls

### Pitfall 9: Today Tab Degradation Strategy Is Too Complex for 48-Hour Implementation

**What goes wrong:** The Today Tab has 5 content sections (section 2.2: scenario card, today's outfit, candidate matching, wardrobe insights, inspiration). Each section requires data from different sources. When the AI recommendation pipeline fails, the degradation strategy requires generating weather + season + weekday + scenario template-based alternatives. This is a full fallback recommendation engine, not a simple "show cached data" pattern.

**Prevention:** For the 48-hour sprint, implement only 2 of the 5 sections: scenario card (static + weather API) and today's outfit (from recommendation pipeline with rule-engine fallback). The other 3 sections should show empty state with "coming soon" or be hidden entirely. A degraded Today Tab with 2 working sections is better than a broken Today Tab with 5 sections.

**Phase:** Phase 3 (Hour 16-28). Agent B (Today Screen).

---

### Pitfall 10: Mock Product Data Homogeneity Masks Real Pipeline Behavior

**What goes wrong:** 100+ mock products are created, but they cluster around similar attributes (e.g., all casual, all mid-range price, all medium sizes). The 6-layer funnel returns the same items regardless of user profile because the mock data does not cover the attribute space.

**Prevention:** Design the mock data with a coverage matrix: at least 5 items per combination of (scenario x budgetBand x bodyType compatibility). Minimum viable: 8 scenarios x 4 budget bands x 3 body-type compatibilities = 96 items. The remaining items should be edge cases (luxury formal wear, budget athletic wear, etc.).

**Phase:** Phase 2 (Agent C: data seed).

---

### Pitfall 11: Stylist Single-Screen Merge Creates Unusable Layout

**What goes wrong:** Merging AiStylistScreen and AiStylistChatScreen into a single screen with an embedded try-on action creates a layout conflict. Chat interfaces need vertical scrolling. Try-on results need visual space (image + assessment + alternatives). Embedding the try-on in the chat flow means either (a) the try-on result is too small to be useful, or (b) it disrupts the chat flow with a large inline element.

**Prevention:** Use a bottom-sheet pattern for try-on results, not inline chat bubbles. The chat continues to scroll normally; the try-on result appears as an expandable sheet that overlays the chat without replacing it. This pattern is well-established in mobile shopping apps (Amazon, Taobao use it for product previews).

**Phase:** Phase 4 (Hour 28-40). Agent A (Stylist single-screen).

---

### Pitfall 12: Discover Tab Dual-Mode Confuses Users

**What goes wrong:** The Discover tab has two modes: cold-start (product recommendations + search) and wardrobe-mode (wardrobe management + gap recommendations). The transition between modes depends on wardrobe item count (>5 items triggers wardrobe mode). Users who add a few items see a completely different layout, creating confusion.

**Prevention:** Use a progressive approach instead of a hard switch. Always show the search bar and recommendations at the top. Below that, show "My Wardrobe" section that grows as items are added. Below that, show gap recommendations. The layout is the same; the proportions change. No mode switch needed.

**Phase:** Phase 3 (Hour 16-28). Agent C (Discover Screen).

---

### Pitfall 13: Collaborative Filtering Removal Without Verification That It Was Truly "Pseudo"

**What goes wrong:** The fusion plan classifies CollaborativeFilteringService as "pseudo-implementation (just same-category bonus)" and KnowledgeGraphService as "memory-hardcoded graph, insufficient coverage." Removing these is the correct decision if the assessment is accurate. But if any production code path actually depends on these services returning specific values (even incorrect ones), their removal causes null reference errors or fallback to even worse defaults.

**Prevention:** Before deleting these services, search for all imports and callers. If any caller depends on the return shape (not the return value), create a stub that returns the same shape with empty/zero values. This preserves the interface while removing the logic. Remove the stubs in the long-term cleanup phase.

**Phase:** Phase 2 (Agent A: recommendation pipeline repair).

---

### Pitfall 14: Onboarding Step 3 Style Images Require Careful Curation

**What goes wrong:** The 6 style images shown in Onboarding Step 3 are used to extract FashionCLIP embeddings as recommendation seeds. If these images are from a biased source (e.g., all from women's fashion catalogs, all showing the same body type, all in the same aesthetic), the embeddings will initialize the user's recommendation profile in a narrow part of the vector space.

**Prevention:** Curate the 6 images to span: 3 gender-coded feminine looks, 2 gender-coded masculine looks, 1 explicitly gender-neutral look. Each image should represent a different styleExpression value. The images must be AI-generated or properly licensed (as the fusion plan notes in section 14.9.4).

**Phase:** Phase 4 (Agent B: Onboarding 4-step flow).

---

## Minor Pitfalls

### Pitfall 15: Locked Dependencies Prevent Critical Bug Fixes

**What goes wrong:** react-native-screens 4.4.0, reanimated 3.16.7, and svg 15.8.0 are locked and cannot be upgraded. If any of these have known bugs that affect the new navigation structure or animation patterns, there is no fix available.

**Prevention:** Before Phase 3, check the GitHub issue trackers for these specific versions against the planned navigation and animation patterns. If critical bugs exist, design the UI to avoid triggering them rather than hoping they will not appear.

**Phase:** Pre-sprint (before Hour 0).

---

### Pitfall 16: Design Token Unification During Phase 5 Changes Component Sizes

**What goes wrong:** Phase 5 calls for "design token unification (14 gradient types consolidated)" and "corner radius/spacing unification." Changing design tokens retroactively alters every component that uses them. Components that looked correct with the old tokens may overflow or clip with the new ones.

**Prevention:** Do design token unification between phases, not during Phase 5. Create a separate token file for the new values, and apply them to new components only. Migrate old components one at a time in the long-term phase.

**Phase:** Phase 5 (if attempted at all). Consider deferring to Long-term Phase C.

---

### Pitfall 17: Content Copyright for Onboarding and Reference Images

**What goes wrong:** Onboarding style images, "real person outfit references" in recommendations, and scenario card backgrounds all require image assets. Scraping images from fashion blogs or social media is copyright infringement. Using product images from Taobao/JD without permission violates their terms of service.

**Prevention:** Follow the fusion plan's section 14.9.4: use AI-generated images (Stable Diffusion / DALL-E) for all curated content. Budget for 50-100 AI-generated images at approximately $0.04-0.10 per image. This is a one-time cost of approximately $5-10.

**Phase:** Phase 4 (Agent B: Onboarding images).

---

## Phase-Specific Warnings

| Phase Topic                     | Likely Pitfall                                               | Mitigation                                                                        | Phase              |
| ------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------ |
| TS Error Elimination            | Type assertions (`as`) masking real type mismatches          | Flag all `as` casts in code review; require type narrowing instead                | Phase 1 (H0-8)     |
| Gender Field Degradation        | Silent fallback to `Gender.female` in unmapped services      | Complete dependency map before changing any file                                  | Phase 2 (H8-16)    |
| Recommendation Pipeline         | Orchestrator bypass by controllers                           | Add runtime check in each sub-service; fail loudly if called directly             | Phase 2 (H8-16)    |
| 4-Tab Navigation                | Persisted state from 5-tab era crashes app                   | Add NAV_VERSION state migration                                                   | Phase 3 (H16-28)   |
| Today Screen                    | 5 sections too complex for 48h; all break together           | Implement only 2 sections; degrade gracefully                                     | Phase 3 (H16-28)   |
| Discover Dual-Mode              | Hard switch at 5 items confuses users                        | Progressive layout, no mode switch                                                | Phase 3 (H16-28)   |
| Stylist Single-Screen           | Try-on inline disrupts chat flow                             | Bottom-sheet pattern for try-on results                                           | Phase 4 (H28-40)   |
| Onboarding 4-Step               | Missing garmentPreference causes irrelevant cold-start recs  | Add to Step 2 or infer from Step 3 image seeds                                    | Phase 4 (H28-40)   |
| Mock Data Seed                  | Homogeneous data masks pipeline failures                     | Coverage matrix: 5 items per (scenario x budget x bodyType)                       | Phase 2 (H8-16)    |
| FashionCLIP Bias                | Gendered embeddings undermine gender-optional architecture   | Diversity constraint in retrieval layer                                           | Long-term Phase D  |
| PIPL Compliance                 | Consent architecture not designed before onboarding is built | Design consent flows alongside onboarding in Phase A                              | Long-term Phase A  |
| Virtual Try-On Trust            | Embedded try-on without disclosure erodes credibility        | Mandatory disclosure label + confidence display                                   | Phase 4 (H28-40)   |
| 48h Sprint Integration          | Interface drift between 3 parallel agents                    | Freeze contracts before sprint; 30-min integration checks at phase boundaries     | Cross-cutting      |
| Collaborative Filtering Removal | Callers depend on service return shape                       | Stub with empty values, remove later                                              | Phase 2 (H8-16)    |
| Taobao Ke API                   | Rate limits, data freshness delays, OAuth token management   | Dual-source backup (JD Union); polling strategy with exponential backoff          | Long-term Phase B+ |
| Chinese Market Monetization     | Users unwilling to pay for AI fashion advice                 | Content-product monetization (reports, capsule wardrobe) over experience upgrades | Long-term Phase E  |

---

## Chinese Market Specific Pitfalls

### Pitfall 18: Taobao Ke API Instability and Enterprise Qualification Dependency

**What goes wrong:** The fusion plan identifies Taobao Ke + JD Union as the product data sources. Taobao Ke (Taobao Affiliate) API has documented limitations: strict rate limits, data freshness delays (not real-time), incomplete product fields, OAuth token expiration, and policy changes without notice. More critically, full API access requires enterprise business license registration, which takes 1-2 weeks and requires a Chinese business entity.

**Prevention:** Start the enterprise registration process in Long-term Phase A (parallel with compliance work). For the 48-hour sprint, mock data is the correct approach. For long-term, implement dual-source synchronization with fallback: if Taobao Ke API returns errors, fall back to JD Union data. Monitor data freshness with a SyncLog table and alert when staleness exceeds thresholds.

**Phase:** Long-term Phase B (product data sync). Registration should begin in Phase A.

---

### Pitfall 19: Chinese Users' Low Willingness to Pay for AI Fashion Advice

**What goes wrong:** The fusion plan projects 3-5% paid conversion and 2-4 yuan/month ARPU in Stage 1. Industry data suggests this is optimistic for a standalone AI fashion app in China. Users have free access to fashion content on Xiaohongshu (Little Red Book), Douyin (TikTok), and WeChat fashion accounts. The perceived value of AI styling advice is low when human influencers provide similar content for free.

**Prevention:** The fusion plan's strategy of "content-product monetization" (reports, capsule wardrobe plans) is correct and should be the primary monetization path. Experience upgrades (more AI conversations, more try-ons) are unlikely to convert Chinese users. The key differentiator must be tangible outputs: shareable color season reports, actionable capsule wardrobe plans with purchase links, and AI-generated outfit images that users can save and share. E-commerce commission (8-12% from Taobao Ke) is likely the dominant revenue stream, not subscription fees.

**Phase:** Long-term Phase E (monetization). Product design decisions from Phase 3 onward should optimize for commerce conversion, not subscription conversion.

**Sources:**

- BAAI Hub: "AI Smart Wardrobe Tool" interview ([hub.baai.ac.cn](https://hub.baai.ac.cn/view/49827))
- Sina Finance: "AI Stylist Fu Xiaoshi" case study ([finance.sina.com.cn](https://finance.sina.com.cn/jjxw/2026-04-08/doc-inhtttaq1718426.shtml))

---

### Pitfall 20: Cross-Border Data Transfer for Overseas AI APIs

**What goes wrong:** XUNO uses GLM API, potentially DeepSeek, and other cloud-based AI services. If any of these APIs process user data (photos, body measurements, chat conversations) on servers outside mainland China, this constitutes a cross-border data transfer under PIPL Article 38, requiring a security assessment by the Cyberspace Administration of China (CAC).

**Prevention:** Verify the data residency of every AI API endpoint. GLM (Zhipu AI) is a Chinese company and likely processes data in mainland China. DeepSeek is also Chinese. But if any fallback uses overseas APIs (OpenAI, Anthropic), the data transfer assessment is required. Document the data flow for each API and confirm residency before launch.

**Phase:** Long-term Phase A (compliance audit).

---

## Sources

### HIGH Confidence (Official documentation, peer-reviewed research)

- GB/T 45574-2025 Standard analysis via Morgan Lewis ([morganlewis.com](https://www.morganlewis.com/pubs/2025/09/chinas-new-standard-on-sensitive-personal-information-goes-into-effect-november-1))
- FashionCLIP paper (Nature Scientific Reports) ([nature.com](https://www.nature.com/articles/s41598-022-23052-9))
- GradREC / FashionCLIP embedding analysis (ACL ECNLP 2022) ([aclanthology.org](https://aclanthology.org/2022.ecnlp-1.22.pdf))
- ViBA-Net body-shape-aware embeddings (WACV 2024) ([openaccess.thecvf.com](https://openaccess.thecvf.com/content/WACV2024/papers/Pang_Learning_Visual_Body-Shape-Aware_Embeddings_for_Fashion_Compatibility_WACV_2024_paper.pdf))
- XUNO_FUSION_PLAN.md and PROJECT.md (project documentation)

### MEDIUM Confidence (Industry analysis, multiple sources agree)

- Wearfits: Virtual try-on trust gap analysis ([wearfits.com](https://wearfits.com/articles/gen-ai-virtual-try-on-trust))
- The Interline: VTO adoption barriers ([theinterline.com](https://www.theinterline.com/2026/03/23/virtual-try-on-hasnt-met-the-bar-for-consumer-adoption-can-ai-push-it-over/))
- Algonomy: Fashion recommendation failures ([algonomy.com](https://algonomy.com/blogs/traditional-recommendations-fail-in-fashion-and-ai-stylists-fix-it/))
- Stylitics: Product data mistakes ([stylitics.com](https://stylitics.com/resources/blog/product-data-mistakes-fashion-ecommerce/))
- Technical debt research (ScienceDirect, MDPI) ([sciencedirect.com](https://www.sciencedirect.com/science/article/pii/S0164121225003887))
- FAccT 2025: Gender bias in AI fashion descriptions ([facctconference.org](https://facctconference.org/static/docs/facct2025-206archivalpdfs/facct2025-final1425-acmpaginated.pdf))

### LOW Confidence (Single source or training data)

- Taobao Ke API specific limitations (general knowledge, not verified against current API docs)
- Chinese market monetization projections (based on limited industry reports)
- React Native navigation state migration patterns (general knowledge, project-specific verification needed)
