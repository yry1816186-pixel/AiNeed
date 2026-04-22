# Stack Research

**Domain:** AI Fashion Decision Platform (brownfield, React Native + NestJS monorepo)
**Researched:** 2026-04-22
**Confidence:** HIGH (base stack verified against existing codebase; new components verified via Context7 + official docs)

---

## Executive Summary

This is a brownfield project with established base stack (NestJS 11, React Native 0.76.8, Prisma 5, FastAPI, PostgreSQL/Redis/Qdrant). Research focuses on six NEW technology capabilities needed for the milestone: FashionCLIP vector embeddings, SASRec sequential recommendation, 4-tab navigation restructuring, AI Stylist single-screen UX, gender-optional profiling, and the recommendation pipeline. Each recommendation is scoped to what must be ADDED, not what already exists.

---

## Recommended Stack (New Components Only)

### 1. FashionCLIP Vector Embedding Service

| Technology                    | Version                    | Purpose                                                         | Why                                                                                                                                                                                                                                | Confidence                        |
| ----------------------------- | -------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `patrickjohncyh/fashion-clip` | latest HuggingFace         | Fashion-domain CLIP model for image+text embeddings             | Fine-tuned on 700K+ fashion (image, text) pairs. Outperforms generic CLIP on fashion retrieval, zero-shot classification, and product similarity. Loaded via `transformers` CLIPModel already in deps.                             | HIGH -- Context7 verified         |
| `onnxruntime`                 | >=1.16.0 (already in deps) | ONNX inference for FashionCLIP in production                    | Already in `pyproject.toml`. Use `optimum-cli export onnx` to export CLIP vision/text encoders to ONNX, then serve via ONNX Runtime for 25%+ CPU speedup over PyTorch. No new dependency needed.                                   | HIGH -- already installed         |
| `optimum[onnxruntime]`        | >=1.20.0 (NEW)             | Export FashionCLIP from HuggingFace to ONNX format              | Official HuggingFace tool for model-to-ONNX conversion. Supports CLIP architecture natively. `optimum-cli export onnx -m patrickjohncyh/fashion-clip --framework pt ./models/fashion-clip-onnx`. One-time export, not runtime dep. | HIGH -- official HuggingFace tool |
| `qdrant-client`               | >=1.7.0 (already in deps)  | Vector storage and similarity search for FashionCLIP embeddings | Already installed in both `pyproject.toml` and NestJS (`@qdrant/js-client-rest`). FashionCLIP produces 512-dim vectors -- store in Qdrant with payload filters (category, occasion, season, priceBand).                            | HIGH -- already installed         |

**Serving architecture:**

```
FastAPI lifespan event:
  -> Load ONNX FashionCLIP vision encoder (onnxruntime.InferenceSession)
  -> Load ONNX FashionCLIP text encoder (onnxruntime.InferenceSession)
  -> Ready for /embed/image and /embed/text endpoints

Embedding pipeline:
  1. Image -> preprocess (224x224, normalize) -> ONNX vision encoder -> 512-dim vector
  2. Text -> tokenize (CLIPProcessor) -> ONNX text encoder -> 512-dim vector
  3. L2 normalize -> upsert to Qdrant with metadata payload
```

**Critical note on quantization:** `optimum-cli` supports int8 quantization for CLIP, but community reports show significant vector drift between fp32 and int8 quantized outputs (HuggingFace discussion #164270). For fashion similarity where embedding quality directly affects recommendation accuracy, stick with fp32 ONNX. Do NOT quantize the embedding model.

### 2. SASRec Sequential Recommendation

| Technology                   | Version                     | Purpose                                                  | Why                                                                                                                                                                                                            | Confidence                        |
| ---------------------------- | --------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Custom SASRec implementation | 2.0.0 (already in codebase) | Sequential user behavior modeling                        | Already implemented at `ml/services/recommender/sasrec_service.py` with full NumPy + PyTorch backends, BPR loss, causal masking, multi-head attention. DO NOT replace with external library.                   | HIGH -- verified in codebase      |
| `torch`                      | >=2.0.0 (optional dep)      | PyTorch backend for SASRec training with proper backprop | Listed as optional in `requirements.txt`. When available, SASRecModel uses `_PyTorchSASRec` with `optimizer.zero_grad -> forward -> loss.backward -> optimizer.step`. For RTX 4060, this is the training path. | HIGH -- already designed for this |
| `onnxruntime`                | >=1.16.0 (already in deps)  | Future ONNX export for SASRec inference                  | SASRec ONNX export is explicitly deferred to "user count >1000" per PROJECT.md Out of Scope. Current PyTorch/NumPy inference is sufficient for demo. When needed: `torch.onnx.export(sasrec_model, ...)`.      | MEDIUM -- deferred, path verified |

**Training pipeline (existing code, needs data connection):**

```
1. NestJS behavior-sequences endpoint -> fetch user interaction sequences
2. SASRecModel.train_step(sequences, lr=0.001)
   - PyTorch path: proper backprop through transformer blocks
   - NumPy fallback: manual gradient computation through all weights
3. Model.save() -> JSON to ./models/sasrec/
4. Model.predict(user_sequence, top_k) -> scored candidates
```

**What NOT to do:**

- Do NOT use external SASRec libraries (pmixer/SASRec.pytorch, TorchRec). The custom implementation already has attribute-based cold-start embeddings, thread-safe training, and NumPy/PyTorch dual backend.
- Do NOT attempt ONNX export now. The project explicitly scopes this out.
- Do NOT add collaborative filtering or knowledge graph. These are explicitly cut per fusion plan section 5.1.

### 3. 4-Tab Navigation Restructuring (React Native)

| Technology                       | Version                     | Purpose                                                 | Why                                                                                                                                                                   | Confidence                |
| -------------------------------- | --------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `@react-navigation/bottom-tabs`  | ^6.6.0 (already installed)  | Bottom tab navigator for 4-tab structure                | Already in `package.json`. Current code uses 5 tabs (Home/Stylist/TryOn/Community/Profile) -- restructure to 4 (Today/Discover/Stylist/Me). No version change needed. | HIGH -- already installed |
| `@react-navigation/native-stack` | ^6.11.0 (already installed) | Stack navigator per tab for nested screens              | Already installed. Pattern: each tab wraps a Stack.Navigator so navigation state persists per tab.                                                                    | HIGH -- already installed |
| `react-native-screens`           | 4.4.0 (LOCKED)              | Native screen optimization                              | Locked dependency per PROJECT.md. Do NOT upgrade.                                                                                                                     | HIGH -- locked            |
| `react-native-reanimated`        | 3.16.7 (LOCKED)             | Animations for tab transitions and gesture interactions | Locked dependency. Do NOT upgrade.                                                                                                                                    | HIGH -- locked            |
| `react-native-svg`               | 15.8.0 (LOCKED)             | SVG icons for tab bar                                   | Locked dependency. Do NOT upgrade.                                                                                                                                    | HIGH -- locked            |

**Navigation architecture (one stack per tab):**

```
RootStack (createNativeStackNavigator)
  |-- Auth (AuthNavigator)
  |-- MainTabs (createBottomTabNavigator)
        |-- Today (TodayStackNavigator)
        |     |-- TodayScreen (home, scene card + outfits)
        |     |-- OutfitDetail
        |     |-- ItemDetail
        |     +-- InspirationFeed (community content, scoped to scene)
        |
        |-- Discover (DiscoverStackNavigator)
        |     |-- DiscoverScreen (cold-start recs OR wardrobe)
        |     |-- Search
        |     |-- CategoryBrowse
        |     |-- WardrobeList
        |     +-- GapRecommendations
        |
        |-- Stylist (StylistStackNavigator)
        |     |-- StylistScreen (single-screen chat + try-on actions)
        |     |-- OutfitPlanView
        |     +-- TryOnResult (embedded, not standalone tab)
        |
        +-- Me (ProfileStackNavigator)
              |-- ProfileScreen
              |-- ProfileEdit
              |-- Settings
              |-- Orders
              |-- Subscription
              +-- CommunityEntry (deep page, not tab)
```

**Critical constraint:** Do NOT use `@react-navigation/native-bottom-tabs` (the new Jan 2025 native wrapper). This project uses React Native 0.76.8 with locked dependencies (screens 4.4.0, reanimated 3.16.7). The native bottom tabs package requires `react-native-screens` >=4.6.0 and is still experimental. The standard `@react-navigation/bottom-tabs` v6 is battle-tested, well-documented, and works perfectly with the locked dependency versions.

### 4. AI Stylist Single-Screen Conversation UX

| Technology                  | Version                    | Purpose                                                    | Why                                                                                                                                  | Confidence                |
| --------------------------- | -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| `socket.io-client`          | ^4.7.0 (already installed) | WebSocket connection for real-time AI stylist chat         | Already in mobile deps. Backend has `@nestjs/platform-socket.io`. Use for streaming stylist responses.                               | HIGH -- already installed |
| `@gorhom/bottom-sheet`      | ^5.0.0 (already installed) | Bottom sheet for try-on result overlay within stylist chat | Perfect for embedding try-on results as an overlay in the single-screen stylist experience, avoiding the need for a separate screen. | HIGH -- already installed |
| `react-native-image-picker` | ^7.1.0 (already installed) | Photo capture for try-on within stylist flow               | User takes photo in stylist conversation -> triggers try-on action -> result appears in chat stream.                                 | HIGH -- already installed |
| `zustand`                   | ^5.0.5 (already installed) | State management for stylist conversation + try-on state   | Single store for active conversation, pending try-on actions, and recommendation context.                                            | HIGH -- already installed |
| `@shopify/flash-list`       | ^2.3.1 (already installed) | High-performance list for chat message rendering           | Handles long conversation histories without scroll jank. Critical for chat UX quality.                                               | HIGH -- already installed |

**UX pattern:**

```
StylistScreen (single screen)
  |-- FlashList (chat messages)
  |     |-- TextMessage (user / AI)
  |     |-- OutfitCard (generated outfit with items)
  |     |-- TryOnAction (button: "try this on")
  |     +-- TryOnResult (inline image + fit assessment)
  |
  |-- BottomSheet (try-on overlay when expanded)
  |     |-- Try-on image
  |     |-- Fit assessment
  |     +-- Alternative suggestions
  |
  +-- TextInput (message input with photo attachment)
```

### 5. Gender-Optional User Profiling (Cold Start)

| Technology               | Version         | Purpose                                                          | Why                                                                                                                                                                                                                                                                                                                      | Confidence                   |
| ------------------------ | --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Existing NestJS services | (in codebase)   | ColdStartService, ProfileCompletenessService, BodyMetricsService | These already exist in the backend. Restructure, do not replace. ColdStartService needs `demographicRules` rewrite (remove male/female buckets). BodyMetricsService needs continuous-function body fat estimation (replace gender-switched formulas). ProfileCompletenessService needs weight recalculation (gender 0%). | HIGH -- already in codebase  |
| FashionCLIP embeddings   | (see section 1) | Style seed extraction from onboarding image selection            | Onboarding Step 3 asks user to select 3 liked outfit images. Run FashionCLIP on these images -> extract style vectors as cold-start seeds. More accurate than text questionnaires.                                                                                                                                       | HIGH -- FashionCLIP verified |

### 6. Recommendation Pipeline (Rule -> Vector -> Explanation)

| Technology           | Version               | Purpose                                      | Why                                                                                                                                                                                                                                                                                                             | Confidence                  |
| -------------------- | --------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| JSON rule files      | (already in codebase) | Fashion rules engine (264+ structured rules) | `body_type_rules.json`, `color_season_rules.json`, `chinese_occasion_rules.json`, `fabric_rules.json`, `item_compatibility.json` already exist in ML service. The issue is `full_outfit_engine.py` has hardcoded simplifications instead of loading from these files. Fix the loader, do not replace the rules. | HIGH -- already in codebase |
| FashionCLIP + Qdrant | (see section 1)       | Vector retrieval layer                       | Score candidates with FashionCLIP visual similarity (weight: 0.30). Filter by payload (category, occasion, season, priceBand) via Qdrant filter conditions.                                                                                                                                                     | HIGH -- Qdrant verified     |
| SASRec               | (see section 2)       | Sequential behavior signal                   | Weight: 0.25 in the scoring blend. Captures user browsing/purchase patterns.                                                                                                                                                                                                                                    | HIGH -- already in codebase |
| LLM (GLM/Doubao)     | Cloud API             | Explanation generation                       | "Why this item?" natural language explanation. Use existing LLM API integration. Not a new dependency.                                                                                                                                                                                                          | HIGH -- existing API        |

---

## Supporting Libraries (New Additions Only)

| Library                | Version  | Purpose                                       | When to Use                                                                                                                |
| ---------------------- | -------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `optimum[onnxruntime]` | >=1.20.0 | FashionCLIP HuggingFace-to-ONNX export        | One-time export step, not a runtime dependency. Install in ML service venv.                                                |
| `torch`                | >=2.0.0  | SASRec training backend (proper backprop)     | Optional but recommended when training on RTX 4060. Already listed as optional in requirements.txt. Uncomment and install. |
| `torchvision`          | >=0.15.0 | Image preprocessing for SASRec/CLIP pipelines | Paired with torch. Optional dep, uncomment in requirements.txt.                                                            |

---

## Alternatives Considered

| Category              | Recommended                             | Alternative                                     | Why Not                                                                                                                                                   |
| --------------------- | --------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bottom tabs           | `@react-navigation/bottom-tabs` v6 (JS) | `@react-navigation/native-bottom-tabs` (native) | Requires react-native-screens >=4.6.0, which conflicts with locked 4.4.0. Still experimental. Not worth the dependency risk for this milestone.           |
| Bottom tabs           | `@react-navigation/bottom-tabs` v6      | React Navigation 8.0 alpha                      | Alpha quality. Native tabs by default but would require upgrading the entire navigation stack. Project constraints forbid upgrading locked deps.          |
| FashionCLIP serving   | PyTorch + FastAPI                       | ONNX Runtime + FastAPI                          | Use both: PyTorch for development/fine-tuning, ONNX for production serving. ONNX gives 25%+ latency improvement.                                          |
| FashionCLIP serving   | ONNX Runtime                            | TensorRT                                        | TensorRT requires CUDA-specific builds and adds complexity. ONNX Runtime with CUDA EP provides sufficient speedup on RTX 4060 without the build headache. |
| SASRec implementation | Custom (existing)                       | pmixer/SASRec.pytorch                           | Custom impl already has attribute-based cold start, dual backend, thread safety. External library would require re-implementing these features.           |
| SASRec implementation | Custom (existing)                       | TorchRec                                        | TorchRec is for distributed training at Meta scale. Grossly overengineered for <1000 DAU.                                                                 |
| Vector search         | Qdrant                                  | Milvus                                          | Qdrant already installed and integrated. Milvus adds operational complexity (etcd, MinIO dependencies) with no benefit at this scale.                     |
| Vector search         | Qdrant                                  | Pinecone                                        | Pinecone is SaaS-only, adds vendor dependency, and costs money. Qdrant runs locally on RTX 4060 dev machine.                                              |
| ONNX quantization     | None (fp32 only)                        | int8 quantization                               | Community reports significant vector drift in int8 CLIP models. Fashion similarity quality degrades noticeably. Not worth the memory savings.             |
| State management      | Zustand (existing)                      | Jotai, Redux Toolkit                            | Zustand already installed and working. No reason to introduce a second state management library.                                                          |
| Chat rendering        | FlashList (existing)                    | FlatList, ScrollView                            | FlashList is specifically designed for large lists with recycling. Chat with 100+ messages needs this. Already installed.                                 |

---

## What NOT to Use

| Avoid                                                   | Why                                                                                            | Use Instead                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `@react-navigation/native-bottom-tabs`                  | Requires react-native-screens >=4.6.0, conflicts with locked 4.4.0. Experimental (Jan 2025).   | `@react-navigation/bottom-tabs` v6 (already installed)           |
| React Navigation 8.x alpha                              | Alpha quality, would require full navigation stack rewrite                                     | React Navigation 6.x (already installed)                         |
| int8 ONNX quantization for FashionCLIP                  | Significant vector quality degradation for fashion similarity tasks                            | fp32 ONNX (larger files but accurate embeddings)                 |
| Collaborative filtering (CollaborativeFilteringService) | Pseudo-implementation, insufficient data density at <10K users. Explicitly cut in fusion plan. | SASRec sequential + FashionCLIP vector + rule engine             |
| Knowledge graph (KnowledgeGraphService)                 | Hardcoded in-memory graph, poor coverage. Explicitly cut in fusion plan.                       | JSON rule files + RAG for AI Stylist context                     |
| Community as a Tab                                      | Explicitly cut: "v1 does not have a community tab" per fusion plan                             | Inspiration layer embedded in Today/Discover                     |
| TryOn as a standalone Tab                               | Explicitly cut: "virtual try-on from independent tab to decision action"                       | Embed as action within Stylist conversation + Today outfit cards |
| Neo4j for graph operations                              | Already in backend deps but only used for knowledge graph (cut). Remove when convenient.       | Remove dependency; rule engine handles all logic                 |
| Feature Flag system                                     | Explicitly out of scope: "one-time refactor, no coexistence mechanism needed"                  | Direct code changes                                              |
| Deep Link routing migration                             | Out of scope for demo phase                                                                    | Handle when push notifications needed                            |

---

## Version Compatibility Matrix

| Package                        | Version            | Compatible With                             | Notes                                               |
| ------------------------------ | ------------------ | ------------------------------------------- | --------------------------------------------------- |
| react-native                   | 0.76.8             | react-native-screens 4.4.0                  | LOCKED: do not upgrade                              |
| react-native-screens           | 4.4.0              | @react-navigation/bottom-tabs ^6.6.0        | LOCKED: do not upgrade                              |
| react-native-reanimated        | 3.16.7             | react-native 0.76.8                         | LOCKED: do not upgrade                              |
| react-native-svg               | 15.8.0             | react-native 0.76.8                         | LOCKED: do not upgrade                              |
| @react-navigation/bottom-tabs  | ^6.6.0             | @react-navigation/native ^6.1.18            | Stable, no upgrade needed                           |
| @react-navigation/native-stack | ^6.11.0            | @react-navigation/native ^6.1.18            | Stable, no upgrade needed                           |
| transformers                   | >=4.30.0,<5.0.0    | patrickjohncyh/fashion-clip                 | CLIPModel and CLIPProcessor loaded via transformers |
| onnxruntime                    | >=1.16.0,<2.0.0    | FashionCLIP ONNX export                     | fp32 only, no quantization                          |
| optimum                        | >=1.20.0           | transformers >=4.30.0, onnxruntime >=1.16.0 | One-time export tool                                |
| qdrant-client                  | >=1.7.0,<2.0.0     | Python >=3.11                               | AsyncQdrantClient for FastAPI endpoints             |
| fastapi                        | >=0.100.0,<0.116.0 | Python >=3.11                               | Lifespan events for model loading                   |
| torch                          | >=2.0.0,<3.0.0     | SASRec PyTorch backend                      | Optional, for training on RTX 4060                  |
| zustand                        | ^5.0.5             | React 18.3.1                                | State management, already working                   |
| @shopify/flash-list            | ^2.3.1             | React 18.3.1, react-native 0.76.8           | Chat rendering performance                          |

---

## Installation (New Dependencies Only)

```bash
# ML service: ONNX export tool (one-time, not runtime)
cd ml
pip install "optimum[onnxruntime]>=1.20.0"

# ML service: PyTorch for SASRec training (uncomment in requirements.txt)
pip install "torch>=2.0.0,<3.0.0" "torchvision>=0.15.0,<1.0.0"

# FashionCLIP ONNX export (run once, outputs to ./models/fashion-clip-onnx/)
optimum-cli export onnx -m patrickjohncyh/fashion-clip --framework pt ./models/fashion-clip-onnx

# Mobile: NO new npm packages needed for navigation restructuring
# All required packages already installed:
# @react-navigation/bottom-tabs ^6.6.0
# @react-navigation/native-stack ^6.11.0
# @react-navigation/native ^6.1.18
# zustand ^5.0.5
# @gorhom/bottom-sheet ^5.0.0
# @shopify/flash-list ^2.3.1
```

---

## Stack Patterns by Variant

**If running on RTX 4060 dev machine (current setup):**

- Use ONNX Runtime with CUDA execution provider for FashionCLIP inference
- Use PyTorch with CUDA for SASRec training
- Use Qdrant in Docker (local mode)
- Cost: ~0 for compute, ~350 yuan/month for cloud LLM APIs at 1000 DAU

**If deploying to production server (no GPU):**

- Use ONNX Runtime with CPU execution provider for FashionCLIP (25% faster than PyTorch CPU)
- Use NumPy backend for SASRec inference (small model, CPU is fine)
- Use Qdrant Cloud or self-hosted with SSD
- Consider adding `onnxruntime-gpu` only if server has NVIDIA GPU

**If scaling beyond 1000 DAU:**

- Export SASRec to ONNX for inference optimization
- Add SASRec model warm-up and embedding table sync mechanism
- Consider Redis caching for FashionCLIP embedding results
- Consider FashionCLIP batch pre-computation for all catalog items

---

## Sources

- Context7: `patrickjohncyh/fashion-clip` -- FashionCLIP model loading, embedding generation, product retrieval (14 snippets)
- Context7: `onnxruntime_ai` -- ONNX Runtime Python InferenceSession, PyTorch export pipeline (5278 snippets)
- Context7: `reactnavigation` -- Bottom tabs + stack navigator nesting patterns, tab-per-stack architecture (2274 snippets)
- Context7: `qdrant/qdrant-client` -- AsyncQdrantClient, create_collection, upsert, search with filters (114 snippets)
- Context7: `fastapi_tiangolo` -- Lifespan events for ML model loading, async endpoints (7782 snippets)
- GitHub: `pmixer/SASRec.pytorch` -- PyTorch SASRec reference implementation
- HuggingFace: `optimum` ONNX export documentation -- CLIP model export pipeline
- HuggingFace discussion #89631 -- CLIP ONNX export with optimum-cli
- HuggingFace discussion #164270 -- Vector quality degradation with int8 quantization (warning)
- Marqo/marqo-fashionCLIP on HuggingFace -- Pre-exported ONNX FashionCLIP vision model
- React Navigation blog (Jan 2025) -- Native bottom tabs announcement
- ZDF streaming (ACM 2025) -- SASRec production deployment case study
- Codebase verification: `C:/AiNeed/ml/requirements.txt`, `C:/AiNeed/ml/pyproject.toml`, `C:/AiNeed/apps/mobile/package.json`, `C:/AiNeed/apps/backend/package.json`, `C:/AiNeed/ml/services/recommender/sasrec_service.py`, `C:/AiNeed/apps/mobile/src/navigation/RootNavigator.tsx`

---

_Stack research for: XUNO AI Fashion Decision Platform -- milestone-specific new capabilities_
_Researched: 2026-04-22_
