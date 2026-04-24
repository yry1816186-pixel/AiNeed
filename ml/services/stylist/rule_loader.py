"""
Fashion Rule Loader

Load and filter fashion rules from JSON files in ml/data/fashion_rules/.
Supports filtering by body_type, occasion, and color_season.
"""

import json
import logging
from glob import glob
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class FashionRuleLoader:
    """Load and filter fashion rules from JSON files.

    Rules are loaded at instantiation from all .json files in the rules directory.
    Each file becomes a category keyed by its stem (e.g., "body_type_rules").

    Filtering:
    - Rules with a matching field value are included
    - Rules where the field is absent/None are always included (universal rules)
    - Rules where the field value doesn't match are excluded
    """

    def __init__(self, rules_dir: str = "ml/data/fashion_rules"):
        self._rules = self._load_all_rules(rules_dir)
        logger.info(
            "Loaded %d rule categories (%d total rules) from %s",
            len(self._rules),
            sum(len(v) for v in self._rules.values()),
            rules_dir,
        )

    def _load_all_rules(self, rules_dir: str) -> Dict[str, List[Dict]]:
        """Load all JSON files from the rules directory."""
        rules: Dict[str, List[Dict]] = {}

        # Handle chinese_occasion_rules.json which is a dict with "occasions" key
        for filepath in sorted(glob(f"{rules_dir}/*.json")):
            category = Path(filepath).stem
            try:
                with open(filepath, encoding="utf-8") as f:
                    data = json.load(f)

                # Some files wrap rules in a structure
                if isinstance(data, dict):
                    # chinese_occasion_rules: {"meta": ..., "occasions": [...]}
                    if "occasions" in data:
                        rules[category] = data["occasions"]
                    elif "rules" in data:
                        rules[category] = data["rules"]
                    else:
                        # Try to extract list values from dict
                        for key, value in data.items():
                            if isinstance(value, list):
                                rules[category] = value
                                break
                        else:
                            # No list found, store empty
                            rules[category] = []
                elif isinstance(data, list):
                    rules[category] = data
                else:
                    logger.warning("Unexpected format in %s: %s", filepath, type(data))
                    rules[category] = []

            except (json.JSONDecodeError, OSError) as e:
                logger.error("Failed to load %s: %s", filepath, e)
                rules[category] = []

        return rules

    def get_filtered_rules(
        self,
        body_type: Optional[str] = None,
        occasion: Optional[str] = None,
        color_season: Optional[str] = None,
    ) -> List[Dict]:
        """Filter rules by criteria. Rules without a matching field are always included."""
        matched: List[Dict] = []
        for _category, rule_list in self._rules.items():
            for rule in rule_list:
                if body_type and rule.get("body_type") and rule.get("body_type") != body_type:
                    continue
                if occasion and rule.get("occasion") and rule.get("occasion") != occasion:
                    continue
                if color_season and rule.get("color_season") and rule.get("color_season") != color_season:
                    continue
                matched.append(rule)
        return matched

    def get_category(self, category_name: str) -> List[Dict]:
        """Get all rules for a specific category."""
        return self._rules.get(category_name, [])

    def get_all_rules(self) -> Dict[str, List[Dict]]:
        """Get all rules organized by category."""
        return self._rules
