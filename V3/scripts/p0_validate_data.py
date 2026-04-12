#!/usr/bin/env python3
"""AiNeed V3 - Phase 0: Data Validation Script

Validates all JSON data files in the project:
  - Checks JSON format correctness
  - Validates field completeness and types
  - Generates statistics report: total count / category distribution / confidence distribution
  - Outputs validation report to stdout and data/processed/validation_report.json
"""

import argparse
import json
import logging
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
KG_DIR = DATA_DIR / "knowledge-graph"
REPORT_FILE = PROCESSED_DIR / "validation_report.json"

VALID_CATEGORIES = {"color_harmony", "body_type", "occasion", "style_mix", "seasonal"}
REQUIRED_RULE_FIELDS = ["id", "category", "condition", "recommendation", "confidence", "source"]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@dataclass
class FileResult:
    file: str
    valid: bool = True
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    stats: dict[str, Any] = field(default_factory=dict)


def load_json_safe(path: Path) -> tuple[Any, str | None]:
    if not path.exists():
        return None, f"File not found: {path}"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f), None
    except json.JSONDecodeError as e:
        return None, f"JSON parse error: {e}"
    except OSError as e:
        return None, f"IO error: {e}"


def validate_fashion_rules(data: Any, file_name: str) -> FileResult:
    result = FileResult(file=file_name)

    if not isinstance(data, list):
        result.errors.append("Root must be a JSON array")
        result.valid = False
        return result

    rules = data
    result.stats["total"] = len(rules)

    if len(rules) == 0:
        result.warnings.append("No rules found (empty array)")
        return result

    category_counter: Counter = Counter()
    confidence_values: list[float] = []
    id_set: set[str] = set()
    duplicate_ids: list[str] = []

    for i, rule in enumerate(rules):
        if not isinstance(rule, dict):
            result.errors.append(f"Rule {i}: must be a JSON object")
            result.valid = False
            continue

        for fld in REQUIRED_RULE_FIELDS:
            if fld not in rule:
                result.errors.append(f"Rule {i}: missing required field '{fld}'")
                result.valid = False

        rule_id = rule.get("id")
        if rule_id is not None:
            if rule_id in id_set:
                duplicate_ids.append(str(rule_id))
            id_set.add(str(rule_id))

        cat = rule.get("category")
        if cat is not None:
            category_counter[cat] += 1
            if cat not in VALID_CATEGORIES:
                result.warnings.append(f"Rule {i}: unknown category '{cat}'")

        conf = rule.get("confidence")
        if conf is not None:
            if not isinstance(conf, (int, float)):
                result.errors.append(f"Rule {i}: confidence must be a number, got {type(conf).__name__}")
                result.valid = False
            elif conf < 0 or conf > 1:
                result.errors.append(f"Rule {i}: confidence {conf} out of range [0, 1]")
                result.valid = False
            else:
                confidence_values.append(float(conf))

        cond = rule.get("condition")
        if cond is not None and not isinstance(cond, dict):
            result.errors.append(f"Rule {i}: condition must be a JSON object")
            result.valid = False

        rec = rule.get("recommendation")
        if rec is not None and not isinstance(rec, str):
            result.errors.append(f"Rule {i}: recommendation must be a string")
            result.valid = False

        src = rule.get("source")
        if src is not None and not isinstance(src, str):
            result.errors.append(f"Rule {i}: source must be a string")
            result.valid = False

    result.stats["category_distribution"] = dict(category_counter)
    result.stats["unique_categories"] = len(category_counter)

    if confidence_values:
        result.stats["confidence"] = {
            "min": round(min(confidence_values), 3),
            "max": round(max(confidence_values), 3),
            "mean": round(sum(confidence_values) / len(confidence_values), 3),
            "count": len(confidence_values),
        }

        buckets = {"<0.7": 0, "0.7-0.8": 0, "0.8-0.9": 0, "0.9-1.0": 0}
        for c in confidence_values:
            if c < 0.7:
                buckets["<0.7"] += 1
            elif c < 0.8:
                buckets["0.7-0.8"] += 1
            elif c < 0.9:
                buckets["0.8-0.9"] += 1
            else:
                buckets["0.9-1.0"] += 1
        result.stats["confidence_distribution"] = buckets

    if duplicate_ids:
        result.warnings.append(f"Found {len(duplicate_ids)} duplicate IDs: {duplicate_ids[:10]}")

    if len(rules) < 100:
        result.warnings.append(f"Only {len(rules)} rules, recommended minimum is 100")

    return result


def validate_color_theory(data: Any, file_name: str) -> FileResult:
    result = FileResult(file=file_name)

    if not isinstance(data, dict):
        result.errors.append("Root must be a JSON object")
        result.valid = False
        return result

    fst = data.get("four_season_theory")
    if not fst or not isinstance(fst, dict):
        result.errors.append("Missing or invalid 'four_season_theory'")
        result.valid = False
    else:
        types = fst.get("types", [])
        if not isinstance(types, list):
            result.errors.append("four_season_theory.types must be an array")
            result.valid = False
        else:
            result.stats["season_types"] = len(types)
            for i, t in enumerate(types):
                if not isinstance(t, dict):
                    result.errors.append(f"Season type {i}: must be an object")
                    result.valid = False
                    continue
                for fld in ["suitableColors", "unsuitableColors"]:
                    if fld not in t:
                        result.errors.append(f"Season type {i}: missing '{fld}'")
                        result.valid = False
                    elif not isinstance(t[fld], list):
                        result.errors.append(f"Season type {i}: '{fld}' must be an array")
                        result.valid = False

    cs = data.get("classic_schemes")
    if not cs:
        result.errors.append("Missing 'classic_schemes'")
        result.valid = False
    else:
        schemes = ["complementary", "analogous", "triadic", "split_complementary"]
        found = [s for s in schemes if s in cs]
        result.stats["color_schemes"] = len(found)
        for s in schemes:
            if s not in cs:
                result.warnings.append(f"classic_schemes.{s} is missing")

    taboos = data.get("color_taboos")
    if not taboos:
        result.errors.append("Missing 'color_taboos'")
        result.valid = False
    elif not isinstance(taboos.get("rules"), list):
        result.errors.append("color_taboos.rules must be an array")
        result.valid = False
    else:
        result.stats["taboo_rules"] = len(taboos["rules"])

    return result


def validate_body_type_guide(data: Any, file_name: str) -> FileResult:
    result = FileResult(file=file_name)

    if not isinstance(data, dict):
        result.errors.append("Root must be a JSON object")
        result.valid = False
        return result

    body_types = data.get("body_types")
    if not isinstance(body_types, list):
        result.errors.append("Missing or invalid 'body_types' array")
        result.valid = False
        return result

    result.stats["body_types"] = len(body_types)
    required_fields = ["id", "name", "suitableItems", "avoidItems", "tips"]

    for i, bt in enumerate(body_types):
        if not isinstance(bt, dict):
            result.errors.append(f"Body type {i}: must be an object")
            result.valid = False
            continue
        for fld in required_fields:
            if fld not in bt:
                result.errors.append(f"Body type {i}: missing '{fld}'")
                result.valid = False

    return result


def validate_occasion_guide(data: Any, file_name: str) -> FileResult:
    result = FileResult(file=file_name)

    if not isinstance(data, dict):
        result.errors.append("Root must be a JSON object")
        result.valid = False
        return result

    occasions = data.get("occasions")
    if not isinstance(occasions, list):
        result.errors.append("Missing or invalid 'occasions' array")
        result.valid = False
        return result

    result.stats["occasions"] = len(occasions)
    required_fields = ["id", "name", "recommendedStyles", "recommendedItems", "avoidItems", "tips"]

    for i, occ in enumerate(occasions):
        if not isinstance(occ, dict):
            result.errors.append(f"Occasion {i}: must be an object")
            result.valid = False
            continue
        for fld in required_fields:
            if fld not in occ:
                result.errors.append(f"Occasion {i}: missing '{fld}'")
                result.valid = False

    return result


def validate_style_taxonomy(data: Any, file_name: str) -> FileResult:
    result = FileResult(file=file_name)

    if not isinstance(data, dict):
        result.errors.append("Root must be a JSON object")
        result.valid = False
        return result

    styles = data.get("styles")
    if not isinstance(styles, list):
        result.errors.append("Missing or invalid 'styles' array")
        result.valid = False
        return result

    result.stats["styles"] = len(styles)
    required_fields = ["id", "name", "keyItems", "representativeBrands", "colorPreferences", "suitableFor"]

    for i, s in enumerate(styles):
        if not isinstance(s, dict):
            result.errors.append(f"Style {i}: must be an object")
            result.valid = False
            continue
        for fld in required_fields:
            if fld not in s:
                result.errors.append(f"Style {i}: missing '{fld}'")
                result.valid = False

    return result


def validate_generic_json(path: Path) -> FileResult:
    result = FileResult(file=path.name)
    data, err = load_json_safe(path)
    if err:
        result.errors.append(err)
        result.valid = False
        return result

    if isinstance(data, list):
        result.stats["type"] = "array"
        result.stats["count"] = len(data)
    elif isinstance(data, dict):
        result.stats["type"] = "object"
        result.stats["keys"] = list(data.keys())[:20]
    else:
        result.stats["type"] = type(data).__name__

    return result


def validate_processed_rules(path: Path) -> FileResult:
    result = FileResult(file=path.name)
    data, err = load_json_safe(path)
    if err:
        result.errors.append(err)
        result.valid = False
        return result
    return validate_fashion_rules(data, path.name)


def scan_processed_dir() -> list[FileResult]:
    results = []
    if not PROCESSED_DIR.exists():
        return results

    for path in sorted(PROCESSED_DIR.glob("*.json")):
        if path.name == "validation_report.json":
            continue
        if path.name == "fashion_rules.json":
            results.append(validate_processed_rules(path))
        else:
            results.append(validate_generic_json(path))

    return results


def scan_knowledge_graph_dir() -> list[FileResult]:
    results = []
    if not KG_DIR.exists():
        return results

    validators = {
        "fashion-rules.json": lambda d, f: validate_fashion_rules(d, f),
        "color-theory.json": lambda d, f: validate_color_theory(d, f),
        "body-type-guide.json": lambda d, f: validate_body_type_guide(d, f),
        "occasion-guide.json": lambda d, f: validate_occasion_guide(d, f),
        "style-taxonomy.json": lambda d, f: validate_style_taxonomy(d, f),
    }

    for path in sorted(KG_DIR.glob("*.json")):
        if path.name in validators:
            data, err = load_json_safe(path)
            if err:
                r = FileResult(file=path.name)
                r.errors.append(err)
                r.valid = False
                results.append(r)
            else:
                results.append(validators[path.name](data, path.name))
        else:
            results.append(validate_generic_json(path))

    return results


def scan_raw_dir() -> list[FileResult]:
    results = []
    if not RAW_DIR.exists():
        return results

    for path in sorted(RAW_DIR.rglob("*.json")):
        if path.name.startswith("."):
            continue
        results.append(validate_generic_json(path))

    for path in sorted(RAW_DIR.rglob("*.jsonl")):
        if path.name.startswith("."):
            continue
        result = FileResult(file=str(path.relative_to(RAW_DIR)))
        try:
            count = 0
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        json.loads(line)
                        count += 1
            result.stats["type"] = "jsonl"
            result.stats["valid_lines"] = count
        except json.JSONDecodeError as e:
            result.errors.append(f"Invalid JSONL at line: {e}")
            result.valid = False
        results.append(result)

    return results


def print_report(all_results: list[FileResult]) -> None:
    print("\n" + "=" * 60)
    print("  AiNeed V3 - Data Validation Report")
    print("=" * 60)

    for r in all_results:
        icon = "PASS" if r.valid else "FAIL"
        print(f"\n  [{icon}] {r.file}")

        for k, v in r.stats.items():
            if isinstance(v, dict):
                print(f"    {k}:")
                for sk, sv in v.items():
                    print(f"      {sk}: {sv}")
            else:
                print(f"    {k}: {v}")

        for err in r.errors:
            print(f"    ERROR: {err}")
        for w in r.warnings:
            print(f"    WARN:  {w}")

    print("\n" + "-" * 60)
    total_errors = sum(len(r.errors) for r in all_results)
    total_warnings = sum(len(r.warnings) for r in all_results)
    all_valid = all(r.valid for r in all_results)

    print(f"  Files validated: {len(all_results)}")
    print(f"  Total errors:    {total_errors}")
    print(f"  Total warnings:  {total_warnings}")
    print(f"  Overall result:  {'ALL PASS' if all_valid else 'HAS ERRORS'}")
    print("=" * 60 + "\n")


def save_report(all_results: list[FileResult]) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    report = {
        "summary": {
            "files_validated": len(all_results),
            "total_errors": sum(len(r.errors) for r in all_results),
            "total_warnings": sum(len(r.warnings) for r in all_results),
            "all_valid": all(r.valid for r in all_results),
        },
        "files": [
            {
                "file": r.file,
                "valid": r.valid,
                "errors": r.errors,
                "warnings": r.warnings,
                "stats": r.stats,
            }
            for r in all_results
        ],
    }

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    logger.info("Validation report saved to: %s", REPORT_FILE)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate AiNeed V3 data files")
    parser.add_argument(
        "--scope", choices=["all", "kg", "processed", "raw"], default="all",
        help="Validation scope (default: all)",
    )
    parser.add_argument(
        "--no-save", action="store_true",
        help="Do not save validation report to file",
    )
    args = parser.parse_args()

    logger.info("=== AiNeed V3 - Data Validation ===")
    logger.info("Project root: %s", PROJECT_ROOT)

    all_results: list[FileResult] = []

    if args.scope in ("all", "kg"):
        logger.info("Validating knowledge-graph data...")
        all_results.extend(scan_knowledge_graph_dir())

    if args.scope in ("all", "processed"):
        logger.info("Validating processed data...")
        all_results.extend(scan_processed_dir())

    if args.scope in ("all", "raw"):
        logger.info("Validating raw data (JSON/JSONL only)...")
        all_results.extend(scan_raw_dir())

    print_report(all_results)

    if not args.no_save:
        save_report(all_results)

    if not all(r.valid for r in all_results):
        sys.exit(1)


if __name__ == "__main__":
    main()
