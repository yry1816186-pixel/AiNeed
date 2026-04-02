# AiNeed

**AiNeed** is a lightweight CLI tool for gathering, organising, and tracking AI project requirements.

## Features

- Add requirements with title, description, priority, category and tags
- List and filter requirements by priority, category or tag
- Remove requirements by title
- Export requirements to JSON

## Installation

```bash
pip install -e .
```

## Quick start

```bash
# Add a requirement
aineed add "GPU cluster" "Need 8× A100 GPUs for model training" \
    --priority high --category infrastructure --tags gpu training

# List all requirements
aineed list

# Filter by priority
aineed list --priority high

# Export to a file
aineed export --output requirements.json

# Remove a requirement
aineed remove "GPU cluster"
```

## Development

```bash
pip install -e .
python -m pytest tests/ -v
```
