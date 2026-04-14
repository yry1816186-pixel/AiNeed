# Algorithm Modules Reference

This document describes the 7 upgraded algorithm modules in AiNeed, their
inputs/outputs, mathematical foundations, key parameters, and integration points.

---

## Module 1: Virtual Try-On Pipeline

**Files**: `ml/services/virtual_tryon_service.py`, `tryon_preprocessor.py`,
`tryon_prompt_engine.py`, `tryon_postprocessor.py`

**Purpose**: Three-stage pipeline for AI-powered virtual clothing try-on.

### Pipeline Stages

| Stage | Component | Description |
|-------|-----------|-------------|
| 1 | TryonPreprocessor | Analyzes person/garment images, extracts keypoints, lighting, garment features |
| 2 | TryonPromptEngine | Generates dynamic prompt from preprocessing results |
| 3 | TryonPostprocessor | Validates result quality (proportion, color, face preservation) |

### Input

```python
person_image: str   # Base64-encoded person photo
garment_image: str  # Base64-encoded garment photo
category: Literal["upper_body", "lower_body", "dress", "full_body"]
prompt: Optional[str]  # User-provided prompt override
```

### Output

```python
{
    "success": bool,
    "result_url": str,          # URL to generated image
    "provider": str,            # "doubao-seedream" or "glm"
    "prompt_used": str,         # The actual prompt sent to API
    "preprocessing_applied": bool,
    "quality_metrics": {        # From postprocessor
        "proportion_score": float,
        "color_score": float,
        "color_delta_e": float,  # CIEDE2000 distance
        "face_ssim": float,       # Structural similarity
        "overall_score": float,   # 0.3*proportion + 0.3*color + 0.4*face
        "overall_passed": bool,   # overall_score >= 0.7
    }
}
```

### Key Algorithms

- **Body region segmentation**: MediaPipe 33 keypoints, convex hull + dilation
- **Skin tone extraction**: CIELAB L*/a*/b* sampling from face region
- **Garment color extraction**: K-means (k=3) in CIELAB space
- **Color consistency**: CIEDE2000 DeltaE between original and result garment
- **Face preservation**: SSIM (Structural Similarity Index) on face crops

### Integration

- Called via `POST /api/v1/virtual-tryon/generate`
- Falls back: Doubao Seedream -> GLM -> error

---

## Module 2: Color Season Analysis (12-Season)

**File**: `ml/services/color_season_analyzer.py`

**Purpose**: Classify user skin tone into one of 12 seasonal color types using
CIELAB color space and ITA (Individual Typology Angle).

### Input

```python
face_image: str  # Path or base64 of face photo
```

### Output

```python
ColorSeasonResult {
    season: TwelveSeason,       # e.g. SPRING_WARM_LIGHT_CLEAR
    parent_season: str,         # "spring", "summer", "autumn", "winter"
    tone: ToneType,             # WARM, COOL, NEUTRAL
    depth: DepthType,           # LIGHT, DEEP
    chroma: ChromaType,         # CLEAR, MUTED
    confidence: float,          # 0.0 - 1.0
    skin_lab: Tuple[float,float,float],  # Average CIELAB (L*, a*, b*)
    palette: Dict[str, List[ColorSwatch]],  # {suitable: [...], avoid: [...]}
}
```

### Key Algorithms

**ITA (Individual Typology Angle)**:
```
ITA = arctan((L* - 50) / b*) * (180 / pi)
```
- ITA > 55: Very Light | 41-55: Light | 30-41: Intermediate | 19-30: Tan | 10-19: Brown | < 10: Dark

**12-Season Classification**:
| Tone | Depth | Chroma | Season |
|------|-------|--------|--------|
| WARM | LIGHT | CLEAR | Spring Warm Light Clear |
| WARM | LIGHT | MUTED | Soft Spring |
| WARM | DEEP | CLEAR | Deep Spring |
| WARM | DEEP | MUTED | Autumn Warm Deep Muted |
| COOL | LIGHT | MUTED | Summer Cool Light Muted |
| COOL | LIGHT | CLEAR | Light Summer |
| COOL | DEEP | MUTED | Soft Summer |
| COOL | DEEP | CLEAR | Winter Cool Deep Clear |
| NEUTRAL | * | * | Grouped with WARM (default) |

**Face Mesh Regions**: MediaPipe 468 landmarks for forehead, cheeks, nose bridge, chin.

### Integration

- Result stored as `userProfile.colorSeason`
- Consumed by `cold-start.service.ts` for color-season filtering
- Consumed by `recommendations.service.ts` for personalized palette

---

## Module 3: Outfit Compatibility Scoring

**File**: `apps/backend/src/modules/recommendations/services/gnn-compatibility.service.ts`

**Purpose**: Score pairwise and outfit-level clothing compatibility using
type-aware embeddings and CIEDE2000 color distance.

### Input

```typescript
computeCompatibility(sourceId: string, targetId: string): CompatibilityResult
```

### Output

```typescript
CompatibilityResult {
    score: number,          // 0.0 - 1.0
    reasons: string[],      // Human-readable explanation
    breakdown: {
        gnnScore: number,           // Embedding similarity + neighbor bonus
        hypergraphScore: number,    // Common hyperedge weight
        crossAttentionScore: number // Weighted category/style/color/embedding
    }
}
```

### Key Algorithms

**CIEDE2000 Color Scoring**:
```
score = max(0, 1 - deltaE / 50)
```
- deltaE < 10: very harmonious (score ~0.9)
- deltaE 10-25: complementary (score 0.6-0.8)
- deltaE > 50: clashing (score < 0.3)
- Neutral colors (low chroma): always compatible (0.85)

**Cross-Category Weights**:
| Pair | Embedding | Category | Style | Color |
|------|-----------|----------|-------|-------|
| tops-bottoms | 0.35 | 0.15 | 0.25 | 0.25 |
| tops-footwear | 0.40 | 0.15 | 0.30 | 0.15 |
| accessories-any | 0.40 | 0.10 | 0.25-0.30 | 0.20-0.25 |

**Outfit-Level Score**:
```
outfit_score = min(pairwise) * 0.4 + avg(pairwise) * 0.6
diversity = min(1, sqrt(variance) * 5)
```

### Integration

- Used by `recommendations.controller.ts`
- Color names mapped to CIELAB via `ciede2000.ts` -> `rgbToLab()`

---

## Module 4: SASRec Sequential Recommendation

**File**: `ml/services/sasrec_service.py`

**Purpose**: Self-Attentive Sequential Recommendation using transformer
architecture in pure NumPy.

### Input

```python
# Predict
user_sequence: List[SequenceItem]  # [{item_id: str}]
exclude_items: List[str]
top_k: int = 10

# Train
user_sequences: List[List[str]]
epochs: int  # 1-100
learning_rate: float  # 0.0-1.0
```

### Output

```python
PredictResponse {
    recommendations: List[{item_id: str, score: float}]
}
```

### Key Algorithms

**Architecture**: Multi-block transformer with:
- Positional encoding (sinusoidal)
- Multi-head self-attention (4 heads, causal mask)
- Layer normalization (eps=1e-5)
- Feed-forward network (dim -> 4*dim -> dim, ReLU)
- Residual connections
- Dropout (0.1, training only)

**BPR Loss** (Bayesian Personalized Ranking):
```
loss = -log(sigmoid(pos_score - neg_score))
```

**Initialization**: Xavier/Glorot
```
scale = sqrt(2 / (fan_in + fan_out))
W = randn(fan_in, fan_out) * scale
```

**Score clipping**: dot products clipped to [-20, 20] for numerical stability.

### Integration

- Separate FastAPI service on port 8100
- Backend calls via `sasrec-client.service.ts`

---

## Module 5: Size Recommendation

**File**: `apps/backend/src/modules/size-recommendation/size-recommendation.service.ts`

**Purpose**: Recommend clothing size using Gaussian distance scoring with
fit preference and brand offset.

### Input

```typescript
getRecommendation(userId: string, itemId: string): RecommendationResult | null
```

### Output

```typescript
RecommendationResult {
    recommendedSize: string,   // "M", "L", etc.
    confidence: "high" | "medium" | "low",
    reasons: string[],
    betweenSizes?: string,    // "M-L" if close
    scores?: Array<{size: string, score: number}>
}
```

### Key Algorithms

**Gaussian Distance Scoring**:
```
score = 1.0                                    if min <= m <= max
score = exp(-(distance^2) / (2 * sigma^2))     otherwise
```

| Dimension | Weight | Sigma |
|-----------|--------|-------|
| Bust      | 3.0    | 4 cm  |
| Waist    | 2.5    | 3 cm  |
| Hip      | 2.5    | 4 cm  |
| Height   | 1.0    | 6 cm  |

**Fit Preference Offset**: tight = -2cm, regular = 0cm, loose = +2cm

**Brand Offset**: Computed from order history vs return history
```
offset = size_index(kept) - size_index(returned)
```

**Confidence**: high (>=0.85), medium (>=0.6), low (<0.6)

### Integration

- Reads `userProfile` from Prisma (bust, waist, hip, height)
- Reads order/return history for brand offset

---

## Module 6: Cold Start Recommendation

**File**: `apps/backend/src/modules/recommendations/services/cold-start.service.ts`

**Purpose**: Generate recommendations for new users with no behavior history,
using KG traversal, color season filtering, and body type mapping.

### Input

```typescript
handleNewUser(userId: string, profile?: UserProfile): ColdStartStrategy
```

### Output

```typescript
ColdStartStrategy {
    type: "demographic" | "content" | "popularity" | "survey" | "hybrid",
    confidence: number,
    recommendations: ColdStartRecommendation[]
}
```

### Key Algorithms

**Hybrid Strategy Weights**:
| Source | Weight |
|--------|--------|
| Popularity | 30% |
| Survey preferences | 25% |
| Color season (CIEDE2000) | 25% |
| Body type mapping | 15% |
| Demographic rules | 5% |

**Color Season Filtering**: Items filtered by CIEDE2000 distance to
seasonal palette:
- deltaE < 20: very harmonious
- deltaE 20-40: acceptable
- deltaE > 40: excluded

**Body Type Mapping**:
| Body Type | Suitable Styles | Avoid |
|-----------|-----------------|-------|
| rectangle | casual, streetwear, minimalist | form-fitting |
| hourglass | elegant, classic, feminine | oversized |
| triangle | casual, elegant, classic | tight-bottoms |
| inverted_triangle | casual, sporty, streetwear | shoulder-pads |
| oval | classic, casual, smart-casual | crop-tops |

### Integration

- Uses `knowledge-graph.service.ts` for KG traversal (planned)
- Uses `ciede2000.ts` for color season filtering
- Reads `userProfile` for bodyType, colorSeason

---

## Module 7: Hybrid Search (RRF)

**File**: `apps/backend/src/modules/search/search.service.ts`

**Purpose**: Hybrid search combining text, vector, and popularity signals
using Reciprocal Rank Fusion.

### Input

```typescript
hybridSearch(query: string, options?: {
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    page?: number,
    limit?: number
}): PaginatedSearchResult
```

### Key Algorithms

**Reciprocal Rank Fusion (RRF)**:
```
RRF_score = sum(weight_i / (k + rank_i)) for each ranking i
k = 60  (standard RRF constant)
```

**Weight Distribution**:
| Signal | Weight | Source |
|--------|--------|--------|
| Text | 40% | Prisma `contains` search |
| Vector | 40% | Qdrant semantic search |
| Popularity | 20% | `(viewCount * 0.5 + likeCount) / 1000` |

**Vector Search**: Query embedding from ML service `/embed/text`,
then Qdrant similarity search with minScore=0.3.

**Candidate Expansion**: `candidateLimit = limit * 3` for broader fusion pool.

### Integration

- Depends on `QdrantService` for vector search
- Depends on ML service for text embeddings
- Falls back to text-only if Qdrant unavailable

---

## Shared: CIEDE2000 Implementation

**TypeScript**: `apps/backend/src/modules/recommendations/services/ciede2000.ts`
**Python**: `ml/services/tryon_preprocessor.py`, `ml/services/color_season_analyzer.py`

**Formula** (CIE 142-2001):

```
DeltaE00 = sqrt(
    (dL / (kL * SL))^2
    + (dC / (kC * SC))^2
    + (dH / (kH * SH))^2
    + RT * (dC / (kC * SC)) * (dH / (kH * SH))
)
```

Where: kL = kC = kH = 1 (reference conditions), and SL, SC, SH incorporate
the CIEDE2000 weighting functions with G factor for chroma, T factor for hue,
and RT rotation term.

**sRGB to CIELAB conversion**: Uses IEC 61966-2-1 standard linearization:
```
linear = ((c + 0.055) / 1.055) ^ 2.4   if c > 0.04045
linear = c / 12.92                      otherwise
```

---

## Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `GLM_API_KEY` | intelligent_stylist, visual_outfit, tryon | GLM/Zhipu AI API key |
| `ZHIPU_API_KEY` | intelligent_stylist | Zhipu AI API key (fallback) |
| `DOUBAO_SEEDREAM_API_KEY` | virtual_tryon | Doubao image generation key |
| `DOUBAO_SEEDREAM_API_URL` | virtual_tryon | Seedream API endpoint |
| `ML_SERVICE_URL` | search, sasrec-client | Python ML service URL (default :8001) |
| `QDRANT_URL` | qdrant.service | Qdrant vector DB URL |