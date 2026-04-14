# XunO Algorithm Fusion & Innovation Plan

## Constraints
- No GPU server; local RTX 4060 (8GB VRAM) only for optional inference
- API subscriptions (GLM, Doubao Seedream) for image generation
- All algorithmic improvements must run on CPU or local GPU inference
- Competition evaluation: technical judges will read actual code

---

## Module 1: Virtual Try-On Pipeline Enhancement

### Current State (virtual_tryon_service.py, 255 lines)
- Pure API proxy: formats prompt -> calls Doubao Seedream -> polls result
- Zero preprocessing of person/garment images
- Zero postprocessing/quality validation of results
- No body segmentation, no geometric alignment, no lighting analysis

### Upgrade: Three-Stage Algorithm Pipeline

#### Stage 1: Preprocessing (before API call)
**File**: `ml/services/tryon_preprocessor.py` (NEW)

1. **Body Region Segmentation** (using existing MediaPipe from body_analyzer.py)
   - Extract 33 body keypoints from person image
   - Generate inpainting mask based on garment category:
     - `upper_body`: torso region (shoulders to waist)
     - `lower_body`: waist to ankles
     - `dress`: full body below shoulders
     - `full_body`: full body
   - Mask generation: convex hull of relevant keypoints + dilation

2. **Geometric Alignment Analysis**
   - Calculate person pose angle from shoulder/hip keypoints
   - Calculate garment aspect ratio vs body region aspect ratio
   - Determine optimal scale factor for garment placement
   - Output: alignment metadata (angle, scale, offset) fed to API prompt

3. **Lighting & Skin Tone Extraction**
   - Sample skin pixels from exposed face/hand regions (reuse color_season_analyzer.py logic)
   - Compute average brightness (L channel from CIELAB)
   - Compute color temperature (warm/cool from a,b channels)
   - Output: lighting parameters included in API prompt for consistency

4. **Garment Feature Extraction**
   - Extract dominant colors from garment image (k-means on CIELAB, k=3)
   - Classify garment type (formal/casual/sporty/etc) via texture analysis
   - Detect patterns (solid/striped/floral/printed) via frequency analysis

**Algorithm contribution**: MediaPipe keypoint geometry + CIELAB lighting analysis + k-means color extraction + texture frequency analysis

#### Stage 2: Intelligent Prompt Engineering (replace hardcoded prompt)
**File**: `ml/services/tryon_prompt_engine.py` (NEW)

Instead of hardcoded `"穿着这件{category_desc}的人物照片..."`:
- Generate dynamic prompt incorporating:
  - Lighting condition: "自然光/暖色调室内光/冷色调"
  - Skin tone: "暖黄调肌肤/冷白调肌肤"
  - Garment features: "带有细条纹图案的深蓝色西装外套"
  - Pose description: "微微侧身/正面站立/半身构图"
  - Quality keywords: "4K真实感, 面部细节保留, 自然褶皱"

**Algorithm contribution**: Feature-driven prompt generation vs hardcoded template

#### Stage 3: Postprocessing & Quality Validation (after API response)
**File**: `ml/services/tryon_postprocessor.py` (NEW)

1. **Proportion Preservation Check**
   - Re-extract keypoints from result image
   - Compare shoulder width, body height ratios with original
   - Flag if deformation > 10% threshold

2. **Color Consistency Verification**
   - Extract dominant colors from garment region in result
   - Compare CIEDE2000 distance with original garment colors
   - Flag if color shift > threshold (DeltaE > 15)

3. **Face Preservation Score**
   - Compare face region pixels between original and result
   - Use SSIM (Structural Similarity Index) on face crop
   - Flag if SSIM < 0.85

4. **Overall Quality Score**
   - Weighted combination: proportion(0.3) + color(0.3) + face(0.4)
   - If score < 0.7, trigger retry with adjusted parameters

**Algorithm contribution**: CIEDE2000 color verification + SSIM face preservation + geometric proportion check

### Integration Point
Modify `virtual_tryon_service.py`:
```python
async def generate_tryon(self, person_image, garment_image, category, prompt):
    # NEW Stage 1: Preprocessing
    preprocess = await self.preprocessor.analyze(person_image, garment_image, category)

    # NEW Stage 2: Intelligent prompt
    enhanced_prompt = self.prompt_engine.generate(preprocess, category, prompt)

    # EXISTING: API call (unchanged)
    result = await self._call_doubao_seedream(person_image, garment_image, enhanced_prompt)

    # NEW Stage 3: Postprocessing
    quality = await self.postprocessor.validate(person_image, result, preprocess)
    result["quality_metrics"] = quality.to_dict()

    return result
```

---

## Module 2: Color Season Analysis Upgrade (4-season -> 12-season)

### Current State (color_season_analyzer.py, 429 lines)
- Uses HSL color space (not perceptually uniform)
- Only 4 seasons (Spring/Summer/Autumn/Winter)
- Simple threshold: hue < 45 = warm, hue > 180 = cool, lightness < 55 = deep
- Hardcoded palettes (static data)

### Existing Asset (discovered in codebase!)
- `color-matching.service.ts` already has full CIELAB + DeltaE2000 implementation
- `ciede2000.ts` has complete CIEDE2000 distance function

### Upgrade Plan

**File**: `ml/services/color_season_analyzer.py` (MODIFY)

1. **Replace HSL with CIELAB**
   - RGB -> CIELAB conversion (use existing code from color-matching.service.ts or cv2.cvtColor)
   - Compute ITA (Individual Typology Angle): `ITA = arctan((L* - 50) / b*) * (180/pi)`
   - ITA provides scientifically validated skin tone classification
   - Reference: derm-ita PyPI package

2. **Upgrade to 12-Season System**
   - 3 dimensions: Hue (warm/cool), Value (light/dark), Chroma (clear/muted)
   - 4 seasons x 3 sub-types:
     - Spring: Warm+Light+Clear, Warm+Light+Muted (Soft Spring), Warm+Deep+Clear (Deep Spring)
     - Summer: Cool+Light+Muted, Cool+Light+Clear (Light Summer), Cool+Deep+Muted (Soft Summer)
     - Autumn: Warm+Deep+Muted, Warm+Deep+Clear, Warm+Light+Muted (Soft Autumn)
     - Winter: Cool+Deep+Clear, Cool+Light+Clear (Light Winter), Cool+Deep+Muted (Deep Winter)
   - Use CIELAB a* axis for warm/cool (positive = warm, negative = cool)
   - Use CIELAB L* for light/dark
   - Use CIELAB C* (chroma = sqrt(a*^2 + b*^2)) for clear/muted

3. **Use Pre-trained Model for Face Region Segmentation**
   - Integrate MediaPipe Face Mesh (468 landmarks) for precise facial region extraction
   - Replace fixed _SAMPLING_REGIONS with landmark-based regions:
     - Forehead: landmarks 10, 108, 337, 151
     - Left cheek: landmarks 116, 117, 118, 119
     - Right cheek: landmarks 345, 346, 347, 348
     - Nose bridge: landmarks 6, 197, 195, 5
     - Chin: landmarks 152, 148, 377, 148

4. **Dynamic Palette Generation**
   - Replace hardcoded _SEASON_PALETTES with CIEDE2000-based palette selection
   - For each season, compute color wheel position in CIELAB
   - Select harmonious colors using quantitative CIEDE2000 distance (< 20 = harmonious)
   - Use existing `findHarmoniousColors()` from ciede2000.ts as reference

### Integration
- Backend `color-matching.service.ts` already has CIELAB/DeltaE2000
- Python `color_season_analyzer.py` adds ITA + 12-season + MediaPipe face mesh
- Results feed into `recommendations.service.ts` via existing `colorSeason` profile field

---

## Module 3: Outfit Compatibility Scoring Upgrade

### Current State (gnn-compatibility.service.ts, 554 lines)
- `computeCrossAttentionScore()` = `0.4*embedding + 0.25*category + 0.2*style + 0.15*color`
- `computeGNNScore()` = cosine similarity + neighbor count bonus
- No actual GNN, no learned parameters
- `computeColorCompatibility()` = string matching on color names

### Upgrade: Type-Aware Compatibility Scoring

**File**: `apps/backend/src/modules/recommendations/services/gnn-compatibility.service.ts` (MODIFY)

1. **Type-Aware Embedding Projections**
   - Add per-category projection matrices (type-specific linear transforms)
   - `projectedEmbedding = embedding @ categoryProjectionMatrix[category]`
   - Initialize projections as identity, allow learning via feedback
   - Reference: "Learning Type-Aware Embeddings for Fashion Compatibility" (UIUC)
   - Implementation: 8 category projection matrices of size 64x64 (tiny)

2. **Upgrade computeColorCompatibility()**
   - Replace string matching with CIEDE2000 distance
   - Use existing `ciede2000.ts` module
   - Convert color names to CIELAB via existing `color-matching.service.ts`
   - Score = max(0, 1 - deltaE/50)
   - Handle neutral colors (low chroma) as always-compatible

3. **Proper Cross-Category Compatibility**
   - Different weight combinations per category pair:
     - top-bottom: higher weight on color + style
     - top-footwear: lower weight on color, higher on style
     - accessory-any: minimal influence on overall score
   - Learnable weights via `learning-to-rank.service.ts` feedback

4. **Outfit-Level Scoring (not just pairwise)**
   - For outfit with N items, compute all pairwise scores
   - Aggregate: min(pairwise scores) * 0.4 + avg(pairwise scores) * 0.6
   - Diversity bonus: penalize if all items are same color/style
   - Reference: OutfitTransformer's outfit token concept

### Integration
- Type-aware projections initialized in constructor
- `computeCompatibility()` uses projected embeddings instead of raw
- Color scoring delegates to existing CIEDE2000 module
- Feedback loop via existing `learning-to-rank.service.ts`

---

## Module 4: SASRec Service Completion

### Current State (sasrec_service.py, 177 lines)
- Implements self-attention, causal mask, position encoding, BPR loss in NumPy
- Missing: layer normalization, dropout, multi-head attention, residual connections

### Upgrade

**File**: `ml/services/sasrec_service.py` (MODIFY)

1. **Add Layer Normalization**
   ```python
   def _layer_norm(self, x, eps=1e-12):
       mean = np.mean(x, axis=-1, keepdims=True)
       std = np.std(x, axis=-1, keepdims=True)
       return (x - mean) / (std + eps)
   ```

2. **Add Residual Connections**
   ```python
   def _attention(self, seq_embeddings):
       attended = self._scaled_dot_product_attention(seq_embeddings)
       x = self._layer_norm(seq_embeddings + attended)  # residual + layernorm
       return x
   ```

3. **Add Feed-Forward Network**
   ```python
   def _ffn(self, x, hidden_dim=None):
       if hidden_dim is None:
           hidden_dim = self.dim * 4
       W1 = np.random.randn(self.dim, hidden_dim) * 0.01
       W2 = np.random.randn(hidden_dim, self.dim) * 0.01
       hidden = np.maximum(0, x @ W1)  # ReLU
       output = hidden @ W2
       return self._layer_norm(x + output)  # residual + layernorm
   ```

4. **Multi-Head Attention**
   ```python
   def _multi_head_attention(self, x, num_heads=4):
       head_dim = self.dim // num_heads
       heads = [self._scaled_dot_product_attention(x) for _ in range(num_heads)]
       concatenated = np.concatenate(heads, axis=-1)
       return concatenated
   ```

5. **Dropout (training only)**
   ```python
   def _dropout(self, x, rate=0.1, training=True):
       if not training:
           return x
       mask = np.random.binomial(1, 1 - rate, x.shape) / (1 - rate)
       return x * mask
   ```

---

## Module 5: Size Recommendation Algorithm

### Current State (size-recommendation.service.ts, 289 lines)
- Hardcoded size chart (XS-XXL with fixed ranges)
- Binary range matching (in range or not, no interpolation)
- Score: 3 points for chest/waist match, 2 for hip, 1 for height

### Upgrade: Interpolation + Weighted Distance + Fit Preference

**File**: `apps/backend/src/modules/size-recommendation/size-recommendation.service.ts` (MODIFY)

1. **Gaussian Distance Scoring** (replace binary matching)
   ```typescript
   gaussianScore(measurement: number, min: number, max: number, sigma: number): number {
     const center = (min + max) / 2;
     const range = (max - min) / 2;
     if (measurement >= min && measurement <= max) return 1.0;
     const distance = measurement < min ? min - measurement : measurement - max;
     return Math.exp(-(distance * distance) / (2 * sigma * sigma));
   }
   ```
   - sigma = range * 0.5 (allows gradual falloff outside range)
   - No more binary 0/3 scoring

2. **Weighted Multi-Dimensional Distance**
   - Bust: weight 3.0, sigma 4cm
   - Waist: weight 2.5, sigma 3cm
   - Hip: weight 2.5, sigma 4cm
   - Height: weight 1.0, sigma 6cm
   - Final score = weighted average of all dimensions

3. **Fit Preference Parameter**
   - User chooses: "tight" / "regular" / "loose"
   - Tight: shift measurement -2cm before matching
   - Regular: no shift
   - Loose: shift measurement +2cm before matching

4. **Brand-Specific Size Mapping**
   - Store brand size offsets in database
   - Each brand can have a systematic offset (runs large/small)
   - Learn from return data: `avg_returned_size - avg_kept_size` = brand offset

5. **Confidence Interval**
   - If all dimensions match within 1 sigma: HIGH
   - If any dimension is outside range but within 2 sigma: MEDIUM
   - If any dimension is outside 2 sigma: LOW
   - Include "between sizes" recommendation: "M-L 之间，建议 M（偏宽松）"

---

## Module 6: Cold Start Enhancement

### Current State (cold-start.service.ts, 628 lines)
- Demographic rules: age+gender -> style -> category (hardcoded)
- Deterministic scoring using string hash
- No use of knowledge graph or item features

### Upgrade: KG-Based Preference Propagation

**File**: `apps/backend/src/modules/recommendations/services/cold-start.service.ts` (MODIFY)

1. **Use Existing Knowledge Graph for Cold Start**
   - When user selects style preferences in onboarding:
     - Query KG for items connected to those styles
     - Follow edges to discover compatible items in other categories
     - Score based on edge weights and path distance
   - Leverage existing `knowledge-graph.service.ts`

2. **Color Season-Based Filtering**
   - After user completes color analysis:
     - Filter items by CIEDE2000 distance to user's color palette
     - Use existing `color-matching.service.ts`
   - This is already partially implemented but disconnected

3. **Body Type Preference Mapping**
   - Replace hardcoded demographic rules with body-type-specific scoring
   - Use existing `matching-theory.service.ts` body type recommendations
   - Connect body type -> suitable styles -> KG traversal -> item retrieval

---

## Module 7: Search System Activation

### Current State
- Qdrant client exists in `qdrant.service.ts` but unused by search flow
- `search.service.ts` uses Prisma `contains` text search
- No vector search, no hybrid search

### Upgrade

**File**: `apps/backend/src/modules/search/search.service.ts` (MODIFY)

1. **Activate Qdrant Vector Search**
   - On item creation: upsert FashionCLIP embedding to Qdrant
   - On search: query Qdrant with text embedding for semantic search
   - Combine with Prisma text search using Reciprocal Rank Fusion (RRF)
   ```
   RRF_score = sum(1 / (k + rank_i)) for each ranking
   k = 60 (standard RRF constant)
   ```

2. **Hybrid Search Score**
   - Text score (Prisma): 40% weight
   - Vector score (Qdrant): 40% weight
   - Popularity (viewCount): 20% weight

---

## Implementation Priority Order

| Priority | Module | Effort | Files to Create | Files to Modify |
|----------|--------|--------|-----------------|-----------------|
| P0-1 | Virtual Try-On Pipeline | 3-4 days | tryon_preprocessor.py, tryon_prompt_engine.py, tryon_postprocessor.py | virtual_tryon_service.py |
| P0-2 | Color 12-Season Upgrade | 2-3 days | - | color_season_analyzer.py |
| P0-3 | Compatibility Scoring | 2 days | - | gnn-compatibility.service.ts |
| P1-1 | SASRec Completion | 1 day | - | sasrec_service.py |
| P1-2 | Size Recommendation | 1-2 days | - | size-recommendation.service.ts |
| P1-3 | Cold Start KG | 1 day | - | cold-start.service.ts |
| P2-1 | Search Activation | 1 day | - | search.service.ts |

---

## What We Need From You

1. **CatVTON decision**: Do you want to try local GPU inference (RTX 4060, 8GB) for the virtual try-on demo? CatVTON can run on 8GB. This would be a huge differentiator but adds complexity.

2. **Polyvore dataset**: Download needed for training OutfitTransformer/NGNN compatibility models. Available at https://huggingface.co/datasets/mvasil/polyvore-outfits

3. **Anthropometric data**: Any public body measurement dataset for SVM size model training (CAESAR, NHANES)

4. **Execution order preference**: Start with P0-1 (Virtual Try-On Pipeline) or P0-2 (Color 12-Season)?
