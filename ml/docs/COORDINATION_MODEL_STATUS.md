# Coordination Model — Honest Status Report

**Date:** 2026-05-07  
**Audit Source:** P0 all-zero auxiliary vectors remediation  
**Author:** ML Worker Agent (DeepSeek V4 Pro)

---

## Executive Summary

The coordination model was deployed with a critical P0 bug: all `item_a_aux` and `item_b_aux` vectors were `[0.0]*16` across all 120 samples (train/val/test). This means the model's auxiliary feature pathway (16 dims concatenated to the 128-dim category embedding) contributed **zero signal** — only bias terms propagated. Training on this data would produce **arbitrary weights** for the FC layers that process aux features, as no useful gradient signal reaches them.

The model also **ignored `pair_aux`** entirely, despite the data containing meaningful pair-level features (style multi-hot + season encoding + compatibility scores).

**P0 fix applied.** See `COORDINATION_FEATURE_SPEC.md` for the corrected feature specification.

---

## What Was Fixed

### 1. Item-Level Aux Features (P0)
- **Before:** 120/120 samples had `item_a_aux=[0]*16`, `item_b_aux=[0]*16`
- **After:** All samples now have real 16-dim vectors derived from category names via `ml/features/feature_extractor.py::extract_item_aux()`
- **Method:** Expert-curated `CATEGORY_PROPERTIES` table maps 22 clothing categories to 14 semantic properties (formality, warmth, coverage, structure, garment class, length, collar, sleeves, versatility, statement level, 4-season suitability, layer position) + 1 group encoding + 1 reserved

### 2. Pair-Level Aux Features Wired to Model
- **Before:** Model's `forward()` accepted only item-level aux; `pair_aux` in data was unused
- **After:** Model's `forward()` accepts optional `pair_aux` parameter; output head expanded from 384→400 dims

### 3. Data Generator Fixed
- `generate_coordination_training_data.py` now imports and uses `extract_item_aux()` and `extract_pair_aux_from_rule()` when creating samples

### 4. Validation Infrastructure
- `ml/features/validate_data.py`: Pre-training data quality checker
  - `--fix` flag auto-repairs all-zero aux vectors
  - `--strict` flag for CI failure mode
- Model-level validation: `forward(..., validate_aux=True)` logs warnings

### 5. Feature Documentation
- `COORDINATION_FEATURE_SPEC.md`: Complete dimension-level spec for all 48 aux features

---

## What Remains Blocked

### No Saved Model Checkpoint
- **Status:** `coordination_model.pt` does not exist
- **Impact:** Service starts with randomly initialized weights
- **Fix requires:** Real training run (see below)

### Arbitrary Weights in Aux Pathway
- **Status:** Any model trained before this fix has arbitrary weights in the FC layers that process the 16-dim aux vector
- **Impact:** Those layers would misbehave even with corrected input features
- **Fix requires:** Full retraining from scratch

### Limited Feature Richness
- **Status:** Features derived from category name only (no color, fabric, pattern, gender, occasion, fit data)
- **Impact:** Model cannot learn:
  - Color harmony rules (navy+beige OK, red+green risky)
  - Fabric compatibility (silk+denim clash)
  - Pattern density matching
  - Fit/silhouette balancing
- **Fix requires:** Add per-item metadata fields to training data

### Missing Rich Metadata Fields
The following fields are absent from all training samples and are needed for full feature extraction:
- `item_a_color`, `item_b_color`
- `item_a_season`, `item_b_season`
- `item_a_fabric_type`, `item_b_fabric_type`
- `item_a_pattern`, `item_b_pattern`
- `item_a_occasion`, `item_b_occasion`
- `item_a_gender`, `item_b_gender`
- `item_a_fit_type`, `item_b_fit_type`
- `item_a_formality_level`, `item_b_formality_level`

---

## What a Real Training Run Requires

### Minimum Requirements
1. **Regenerate training data** with real aux features:
   ```bash
   python -m ml.scripts.generate_coordination_training_data
   ```
   (Generator now fixed to populate real features)

2. **Validate data quality:**
   ```bash
   python -m ml.features.validate_data --strict
   ```

3. **Train model:**
   ```bash
   curl -X POST http://localhost:8101/coordination/train \
     -H "Content-Type: application/json" \
     -d '{"epochs": 50, "learning_rate": 0.001, "batch_size": 64}'
   ```
   Or via direct Python:
   ```python
   from ml.services.stylist.coordination_service import _get_model, train_model
   model = _get_model()
   result = train_model(model, train_data, val_data)
   ```

4. **Verify checkpoint saved:**
   ```bash
   ls ml/models/saved/coordination_model.pt
   ```

### Recommended Improvements
- **Expand training data beyond 120 samples** — 96 train / 12 val / 12 test is extremely small for a ~10M parameter model
- **Add item-level metadata** to unlock richer aux features (see fields above)
- **Add data augmentation**: color variants, season variants, occasion variants for each pair
- **Consider transfer learning** from a fashion-domain pretrained encoder (FashionCLIP, FashionSigLIP) instead of training the embedding from scratch

### Hardware Requirements
- **Inference:** CPU (lightweight — ~10M params, single forward pass per pair)
- **Training:** GPU recommended for 50 epochs × 96 samples with 2048-dim FC layers. CPU is feasible but slow (estimated ~10 min/epoch on CPU)

---

## Model Architecture Summary (Post-Fix)

```
Input:
  item_a_category: (batch,) long      → Embedding(50, 128)
  item_b_category: (batch,) long      → Embedding(50, 128)  [shared weights]
  item_a_aux:      (batch, 16) float  → concat with emb
  item_b_aux:      (batch, 16) float  → concat with emb
  pair_aux:        (batch, 16) float  → concat at output head

Architecture:
  1. ItemEncoder (shared): emb_128 + aux_16 → FC(144→2048→2048→2048→128) + LayerNorm + ReLU + Dropout(0.1)
  2. CrossAttention × 2: MultiheadAttention(128, 4 heads) + FFN(128→512→128) + residuals
  3. OutputHead: concat(encoded_a:128, attended_a:128, attended_b:128, pair_aux:16) = 400
     → FC(400→1024→512→128→64→1) → Sigmoid

Parameters: ~10M (9.0-9.2M verified in range 8M-12M)
```

---

## Verification Checklist

- [x] All-zero item aux vectors fixed
- [x] pair_aux wired to model forward()
- [x] Data generator produces real features
- [x] Validation script catches all-zero vectors
- [x] Model tests pass (14/14)
- [x] Feature spec documented
- [ ] Model retrained with corrected data (BLOCKED — see above)
- [ ] Model checkpoint saved (BLOCKED — no training yet)
- [ ] Evaluation metrics computed (BLOCKED — no trained model)
- [ ] Rich item metadata added to training data (BLOCKED — data pipeline needs extension)

---

## Files Changed

| File | Change |
|------|--------|
| `ml/features/__init__.py` | **NEW** — Package init |
| `ml/features/feature_extractor.py` | **NEW** — Core feature extraction + validation |
| `ml/features/validate_data.py` | **NEW** — Pre-training data quality script |
| `ml/docs/COORDINATION_FEATURE_SPEC.md` | **NEW** — Feature dimension specification |
| `ml/docs/COORDINATION_MODEL_STATUS.md` | **NEW** — This document |
| `ml/models/coordination_model.py` | **MODIFIED** — Added pair_aux input, validation, expanded output head |
| `ml/scripts/generate_coordination_training_data.py` | **MODIFIED** — Uses real feature extraction instead of zeros |
| `ml/services/stylist/coordination_service.py` | **MODIFIED** — Uses feature extractor, passes pair_aux in training |
| `ml/data/coordination_training/train.json` | **FIXED** — Real aux features (backup: train.json.bak) |
| `ml/data/coordination_training/val.json` | **FIXED** — Real aux features (backup: val.json.bak) |
| `ml/data/coordination_training/test.json` | **FIXED** — Real aux features (backup: test.json.bak) |
