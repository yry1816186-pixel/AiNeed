# DATA_VALIDATION.md — Schema Mapping, Validation Rules, Enum References

## CSV-to-DB Schema Mapping

| CSV column (train.csv) | Prisma Field (ClothingItem) | Transformation                                             | Notes                            |
| ---------------------- | --------------------------- | ---------------------------------------------------------- | -------------------------------- |
| id                     | sourceId                    | Preserved as-is                                            | Unique per source                |
| gender                 | gender                      | Boys→KIDS, Girls→KIDS, Men→MEN, Women→WOMEN, Unisex→UNISEX | Others map to UNISEX             |
| masterCategory         | category                    | Mapped to ClothingCategory enum                            | See category map below           |
| subCategory            | subcategory                 | Mapped to ClothingSubCategory                              | See category map below           |
| articleType            | (metadata only)             | Stored in attributes JSON                                  | Not used for routing             |
| baseColour             | colors[]                    | Single string → array(deterministic title-case)            | E.g. "Navy Blue" → ["Navy Blue"] |
| season                 | (metadata only)             | Stored in attributes JSON                                  | Not a direct DB column           |
| year                   | year                        | Int → nullable Int                                         | Preserved                        |
| usage                  | (metadata only)             | Stored in attributes JSON                                  | Casual/Formal/Ethnic etc.        |
| productDisplayName     | name                        | Truncated to 200 chars                                     | Primary display name             |

## Category Mapping (CSV → DB)

| CSV masterCategory | ClothingCategory enum                  |
| ------------------ | -------------------------------------- |
| Apparel            | TOPS (default; refined by subCategory) |
| Accessories        | ACCESSORIES                            |
| Footwear           | FOOTWEAR                               |
| Personal Care      | ACCESSORIES                            |
| Free Items         | ACCESSORIES                            |
| Sporting Goods     | ACTIVEWEAR                             |
| Home               | (quarantined — non-fashion)            |

| CSV subCategory          | Mapped subcategory |
| ------------------------ | ------------------ |
| Topwear                  | tops               |
| Bottomwear               | bottoms            |
| Innerwear                | tops               |
| Loungewear and Nightwear | tops               |
| Apparel Set              | tops               |
| Dress                    | dresses            |
| Saree                    | dresses            |
| Shoes                    | footwear           |
| Flip Flops               | footwear           |
| Sandal                   | footwear           |
| Socks                    | accessories        |
| Watches                  | accessories        |
| Bags                     | accessories        |
| Belts                    | accessories        |
| Wallets                  | accessories        |
| Jewellery                | accessories        |
| Headwear                 | accessories        |
| Sunglasses               | accessories        |
| Eyewear                  | accessories        |
| Fragrance                | accessories        |
| Makeup                   | accessories        |
| Hair                     | accessories        |

## Gender Mapping

| CSV value | DB Gender enum |
| --------- | -------------- |
| Men       | MEN            |
| Women     | WOMEN          |
| Boys      | KIDS           |
| Girls     | KIDS           |
| Unisex    | UNISEX         |
| any other | UNISEX         |

## Color Normalization

Colors are title-cased and stored as single-element arrays:

- "Navy Blue" → ["Navy Blue"]
- "black" → ["Black"]
- "Off White" → ["Off White"]
- Empty/NULL → ["Unknown"]

## Validation Rules

### Row-level

- id must be present and non-empty → missing id → quarantined
- productDisplayName must be non-empty → quarantined
- masterCategory must be in known set → quarantined
- baseColour may be empty → maps to "Unknown"

### Output Validation

- Each imported product must have exactly one sourceId
- source must be "FASHION_DATASET"
- price must be null or marked priceMissingInSource
- No fabricated SKUs, brands, stock levels, or supplier IDs

## Quarantine Strategy

Invalid rows are written to `error_log.json` with:

- Row index
- Original data
- Error reason
- Timestamp
  Never silently dropped.

## Determinism Guarantee

- Same input CSV → same output JSON every run
- Python `sorted()` for any iteration ordering
- Category mapping uses deterministic dict lookup
- No random or time-based values in output
- SHA256 of output can be verified between runs
