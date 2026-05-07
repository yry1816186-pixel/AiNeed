# Coordination Model Feature Specification v1.1

**Author:** XunO ML Team  
**Date:** 2026-05-07  
**Status:** Verified — features derived from data, not random  

---

## Overview

The CoordinationModel uses three groups of auxiliary features:

| Group | Dims | Source | Status |
|-------|------|--------|--------|
| `item_a_aux` | 16 | `extract_item_aux(category_name)` | Fixed (was all-zero) |
| `item_b_aux` | 16 | `extract_item_aux(category_name)` | Fixed (was all-zero) |
| `pair_aux` | 16 | `extract_pair_aux_from_rule()` | Fixed (was ignored by model) |

All features are in [0.0, 1.0] range.

---

## Item-Level Auxiliary Features (16 dims per item)

Extracted from category name using expert-curated garment property tables in `ml/features/feature_extractor.py::CATEGORY_PROPERTIES`.

### Dimension Map

| Dim | Name | Type | Range | Description |
|-----|------|------|-------|-------------|
| 0 | `formality` | float | 0.0-1.0 | Casual→Formal. 0.05=hoodie, 0.9=blazer |
| 1 | `warmth` | float | 0.0-1.0 | Light→Warm. 0.05=tank_top, 1.0=coat |
| 2 | `coverage` | float | 0.0-1.0 | Body coverage. 0.25=crop_top, 1.0=coat |
| 3 | `structure` | float | 0.0-1.0 | Drapey→Structured. 0.1=leggings, 0.95=blazer |
| 4 | `garment_class` | float | 0.0-1.0 | 0.0=top, 0.33=outer, 0.66=pants, 1.0=skirt |
| 5 | `length` | float | 0.0-1.0 | Short/crop→Long/full. 0.1=crop_top, 1.0=maxi |
| 6 | `has_collar` | binary | 0.0/1.0 | 1.0 for blazer, coat, shirt, blouse |
| 7 | `has_sleeves` | float | 0.0-1.0 | 0.0=none (vest), 0.4=short, 1.0=full (coat) |
| 8 | `versatility` | float | 0.0-1.0 | Niche→Goes-with-everything. 0.95=jeans |
| 9 | `statement` | float | 0.0-1.0 | Basic→Standout piece. 0.1=joggers, 0.8=coat |
| 10 | `season_spring` | float | 0.0-1.0 | Spring suitability |
| 11 | `season_summer` | float | 0.0-1.0 | Summer suitability |
| 12 | `season_autumn` | float | 0.0-1.0 | Autumn suitability |
| 13 | `season_winter` | float | 0.0-1.0 | Winter suitability |
| 14 | `layer_position` | float | 0.0-1.0 | 0.0=base layer, 0.5=mid, 1.0=outer |
| 15 | `group_encoded` | float | 0.0-1.0 | Category group as normalized index |

### Category Groups

| Group | Members | group_encoded |
|-------|---------|---------------|
| 0: top_basic | t_shirt, tank_top, crop_top | 0.00 |
| 1: top_shirt | shirt, blouse | 0.125 |
| 2: knit | sweater, hoodie, cardigan | 0.25 |
| 3: outer | blazer, jacket, coat, vest | 0.375 |
| 4: pants_casual | jeans, shorts, joggers, leggings | 0.50 |
| 5: pants_formal | trousers, wide_leg_pants, culottes | 0.625 |
| 6: skirt_short | skirt_mini | 0.75 |
| 7: skirt_mid | skirt_midi | 0.875 |
| 8: skirt_long | skirt_maxi | 1.0 |

### Example Values

```
t_shirt:     [0.15, 0.20, 0.50, 0.30, 0.00, 0.50, 0.00, 0.40, 0.90, 0.10, 1.0, 1.0, 0.7, 0.3, 0.0, 0.0]
blazer:      [0.90, 0.40, 0.75, 0.95, 0.33, 0.50, 1.00, 1.00, 0.70, 0.70, 1.0, 0.3, 0.9, 0.5, 0.8, 0.375]
jeans:       [0.20, 0.40, 0.90, 0.70, 0.66, 1.00, 0.00, 0.00, 0.95, 0.20, 1.0, 0.9, 1.0, 0.8, 0.0, 0.5]
skirt_midi:  [0.50, 0.25, 0.65, 0.30, 1.00, 0.50, 0.00, 0.00, 0.70, 0.40, 1.0, 0.8, 0.9, 0.3, 0.0, 0.875]
```

---

## Pair-Level Auxiliary Features (16 dims)

Extracted from compatibility rule data. Used by the output head (concatenated with encoded+attended item representations).

### Dimension Map

| Dim | Name | Type | Description |
|-----|------|------|-------------|
| 0-9 | `style_hot` | multi-hot | 10 style flags: casual, smart_casual, business, formal, elegant, romantic, bohemian, streetwear, sporty, minimalist |
| 10 | `season_spring` | binary | Pair suitable for spring |
| 11 | `season_summer` | binary | Pair suitable for summer |
| 12 | `season_autumn` | binary | Pair suitable for autumn |
| 13 | `season_winter` | binary | Pair suitable for winter |
| 14 | `occasion_indicator` | float | len(occasions) / 5.0, formality proxy |
| 15 | `compatibility_score` | float | Raw score from rule data (0.0-1.0) |

---

## Data Requirements for Full Feature Extraction

Current features are derived from **category name only** — the training data does not contain per-item metadata. To unlock richer features, the following fields should be added to each sample:

| Field | Type | Example | Feature Benefit |
|-------|------|---------|-----------------|
| `item_a_color` | string | "navy" | Color harmony encoding |
| `item_b_color` | string | "beige" | Color compatibility in aux |
| `item_a_season` | string | "spring" | Per-item season suitability |
| `item_a_fabric` | string | "cotton" | Texture compatibility |
| `item_a_pattern` | string | "solid" | Pattern clash avoidance |
| `item_a_gender` | string | "unisex" | Gender-specific rules |
| `item_a_fit` | string | "regular" | Silhouette balancing |
| `item_a_occasion` | list | ["work","date"] | Per-item occasion encoding |

These fields would enable feature dimensions for:
- Color wheel distance (complementary, analogous, triadic)
- Fabric weight compatibility (light fabrics with light, heavy with heavy)
- Pattern density compatibility (solid+pattern OK, pattern+pattern risky)
- Gender congruence
- Fit silhouette matching (loose+loose, fitted+fitted, loose+fitted)

---

## Model Architecture Update (v1.1)

The model now accepts `pair_aux` as an input to `forward()`:

```python
def forward(self, item_a_category, item_b_category, item_a_aux, item_b_aux,
            pair_aux=None, validate_aux=False):
```

The output head expanded from 384→400 dims to accommodate the 16-dim pair_aux:
```
Old: concat(encoded_a:128, attended_a:128, attended_b:128) → FC(384, 1024) → ...
New: concat(encoded_a:128, attended_a:128, attended_b:128, pair_aux:16) → FC(400, 1024) → ...
```

Backward compatibility: `pair_aux=None` defaults to zeros (no-op).

---

## Validation

Run before training:
```bash
python -m ml.features.validate_data
python -m ml.features.validate_data --fix    # auto-repair all-zero vectors
python -m ml.features.validate_data --strict # fail CI on quality issues
```

The model also has built-in runtime validation:
```python
model(item_a, item_b, aux_a, aux_b, validate_aux=True)
```
Logs warnings when all-zero vectors pass through.

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2025-03 | Initial spec (item aux all zeros — P0 bug) |
| 1.1 | 2026-05 | Real item aux from CATEGORY_PROPERTIES; pair_aux wired to model; validation scripts |
