# DATASET_REGISTRY.md — Data Inventory & Classification

## Registry

| ID     | Name                        | Path                                     | Size        | Rows   | Source                                                   | License                   | Classification       | Checksum |
| ------ | --------------------------- | ---------------------------------------- | ----------- | ------ | -------------------------------------------------------- | ------------------------- | -------------------- | -------- |
| DS-001 | HuggingFace Fashion Dataset | data/datasets/fashion-dataset/train.csv  | 4.4 MB      | 44,424 | https://huggingface.co/datasets/nreimers/fashion-dataset | Open source (MIT-style)   | RESEARCH_DATA        | TBD      |
| DS-002 | Mock Products               | ml/data/mock_products.json               | 27 KB       | 106    | Hand-crafted (project)                                   | Proprietary               | DEMO_ONLY            | TBD      |
| DS-003 | Chinese Fashion Corpus      | ml/data/chinese_fashion/annotations.json | 3.2 MB      | 5,000  | AI-generated (project)                                   | Proprietary               | SYNTHETIC            | TBD      |
| DS-004 | Golden Recommendations      | ml/data/golden_recommendations.json      | 112 KB      | 288    | Generated (project)                                      | Proprietary               | TEST_FIXTURE         | TBD      |
| DS-005 | Fashion Rules               | ml/data/fashion_rules/ (7 files)         | ~8.5K lines | N/A    | Expert-curated (project)                                 | Proprietary               | PRODUCTION_REFERENCE | TBD      |
| DS-006 | Coordination Training       | ml/data/coordination_training/ (3 files) | ~30 KB      | 120    | Generated (project)                                      | Proprietary               | TRAINING_DATA        | TBD      |
| DS-007 | DeepFashion2                | data/raw/DeepFashion2/                   | —           | —      | https://github.com/switchablenorms/DeepFashion2          | Research (non-commercial) | BLOCKED              | —        |
| DS-008 | Styles CSV                  | data/raw/styles.csv                      | —           | —      | Unknown                                                  | UNKNOWN                   | BLOCKED              | —        |
| DS-009 | Fashion Dataset Full        | data/raw/fashion-dataset-full/           | —           | —      | HuggingFace                                              | Unknown                   | BLOCKED              | —        |
| DS-010 | Outfit Items                | data/raw/outfititems/                    | —           | —      | Polyvore-Outfits (academic)                              | Research                  | BLOCKED              | —        |
| DS-011 | New Data Fashion            | data/raw/new-data-fashion/               | —           | —      | Unknown                                                  | UNKNOWN                   | BLOCKED              | —        |

## Usage Classification

- **PRODUCTION_REFERENCE**: Trusted static data suitable for production use (fashion rules, color palettes, etc.)
- **RESEARCH_DATA**: Real-world data from public sources, useful for research/development, not verified for production accuracy
- **TRAINING_DATA**: Generated/synthetic data used for model training
- **TEST_FIXTURE**: Deterministic test data for CI/CD validation
- **DEMO_ONLY**: Data for demonstration purposes only, must not be used in production paths
- **SYNTHETIC**: AI-generated data, clearly labeled as synthetic
- **SEED**: Database seed data for development environments
- **BLOCKED**: Cannot use without license verification, download authorization, or external dependency

## Separation Guarantees

- Production paths filter out DEMO_ONLY and SYNTHETIC data by default
- Test fixtures are deterministic (seeded PRNG) and never mixed with production data
- All synthetic data is clearly labeled with generation provenance
- Blocked datasets require explicit human approval before download or use
