# SEED_AND_FIXTURE_STRATEGY.md

## Data Purpose Classification

### Production Data (DS-001)

- HuggingFace fashion-dataset train.csv (44,424 rows)
- Used as research reference, NOT as live commercial catalog
- Imported via import-fashion-dataset.py → import-fashion-data.ts → Prisma
- All items marked with source="FASHION_DATASET"
- Prices, stock, SKUs all null — research data only

### Demo Data (DS-002)

- 106 hand-crafted products in mock_products.json
- For UI demonstration, screenshots, presentations
- Marked with source="DEMO" flag
- Filtered out in production API paths
- Demo products have realistic-looking prices for UI but are clearly labeled

### Seed Data

- Database seed files at apps/backend/prisma/seeds/
- 20 seed files for development and testing
- Categories: users, clothing, community, recommendations, ecommerce, fashion-rules, feature-flags, profiles, quiz-questions, brands, notifications, etc.
- Deterministic seeding: use faker with fixed seed where possible
- Test users: always @example.com or @test.com domain
- Seed data is development-only, never in production

### Test Fixtures (DS-004, DS-006)

- Golden recommendations: 288 outfits (6 body types × 4 scenarios × 4 styles × 3 variations)
- Coordination training: 120 samples (96 train, 12 val, 12 test)
- Test fixtures are deterministic and reproducible
- Never mixed with production data
- Body measurement ranges are realistic but synthetic

### Synthetic Data (DS-003)

- 5,000 Chinese fashion entries (AI-generated)
- Used for ML model training and evaluation
- Clearly labeled as AI-generated
- Provenance: generation script, model, and parameters documented

### Production Reference Data (DS-005)

- 7 fashion rule files in ml/data/fashion_rules/
- Expert-curated fashion domain knowledge
- Used by styling AI but not user-facing as data
- Treated as production configuration

## Deterministic Seeding

- All seed scripts use faker.js with configurable seed
- Test environments use fixed seed for reproducibility
- Development seeds accept --seed argument for repeatability
- Randomization only in development mode

## Mock/Demo Flag

All items carry a `isMock` or `isDemo` boolean (or equivalent) in their metadata:

- Production endpoints filter: `WHERE (metadata->>'isMock') IS NULL OR (metadata->>'isMock') != 'true'`
- Demo mode must be explicitly enabled via environment variable `ENABLE_DEMO_MODE=true`
- Demo mode disabled by default in production builds
