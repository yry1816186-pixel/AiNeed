"""
RED tests for Phase 6 Plan 1: FashionCLIP cleanup and 10-profile bias audit.

These tests MUST FAIL before implementation begins (TDD RED gate).
After implementation, all tests should pass (TDD GREEN gate).
"""

import ast
import os
import re
import sys
from pathlib import Path

import pytest

ML_ROOT = Path(__file__).parent.parent.parent


class TestBiasAudit10Profiles:
    def test_profiles_has_10_entries(self):
        from ml.scripts.bias_audit import PROFILES

        assert len(PROFILES) == 10, f"Expected 10 profiles, got {len(PROFILES)}"

    def test_new_profiles_present(self):
        from ml.scripts.bias_audit import PROFILES

        expected_new = ["creative_youth", "plus_size_warm", "mature_elegant", "tall_athletic", "petite_romantic"]
        for name in expected_new:
            assert name in PROFILES, f"Missing profile: {name}"

    def test_each_profile_has_required_fields(self):
        from ml.scripts.bias_audit import PROFILES

        required = {"bodyType", "styleExpression", "primaryScenarios"}
        for name, profile in PROFILES.items():
            missing = required - set(profile.keys())
            assert not missing, f"Profile '{name}' missing fields: {missing}"


class TestNoFashionCLIPRemnants:
    ACTIVE_EXTENSIONS = {".py"}
    SKIP_DIRS = {"__pycache__", ".git", "node_modules", "__tests__", "archive", "benchmarks"}

    def _get_active_py_files(self):
        for root, dirs, files in os.walk(ML_ROOT):
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]
            for f in files:
                if Path(f).suffix in self.ACTIVE_EXTENSIONS:
                    yield Path(root) / f

    def test_no_fashion_clip_imports_or_references(self):
        forbidden = re.compile(r"\bfashion_clip\b", re.IGNORECASE)
        violations = []
        for fpath in self._get_active_py_files():
            try:
                content = fpath.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                content = fpath.read_text(encoding="utf-8", errors="ignore")
            for i, line in enumerate(content.splitlines(), 1):
                if forbidden.search(line):
                    violations.append(f"{fpath.relative_to(ML_ROOT)}:{i}: {line.strip()}")
        assert not violations, f"Found fashion_clip references:\n" + "\n".join(violations)

    def test_paths_get_fashion_clip_path_docstring_references_siglip(self):
        from ml.config.paths import ModelPaths

        docstring = ModelPaths.get_fashion_clip_path.__doc__ or ""
        assert "FashionSigLIP" in docstring or "SigLIP" in docstring, (
            f"get_fashion_clip_path docstring should reference FashionSigLIP, got: {docstring}"
        )


class TestFashionKnowledgeRAGModelType:
    def test_embedding_service_uses_fashion_siglip(self):
        content = (ML_ROOT / "services" / "recommender" / "fashion_knowledge_rag.py").read_text(encoding="utf-8")
        assert 'model_type="fashion_siglip"' in content, (
            'fashion_knowledge_rag.py should use model_type="fashion_siglip"'
        )
        assert 'model_type="fashion_clip"' not in content, (
            'fashion_knowledge_rag.py should NOT contain model_type="fashion_clip"'
        )
