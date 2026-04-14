"""
Comprehensive Unit Tests for scripts/generate_comparison.py
Tests YAML profile loading and comparison table generation
"""

import unittest
import sys
import os
import json
from pathlib import Path
from unittest.mock import patch, Mock

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from scripts.generate_comparison import (
    load_profiles,
    format_bool,
    format_number,
    format_price,
    generate_foundation_model_table,
    generate_coding_tool_table,
    generate_benchmark_table,
    generate_markdown,
    generate_json,
)

# Repo root for locating profiles
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROFILES_DIR = REPO_ROOT / "profiles"


class TestProfilesDirectory(unittest.TestCase):
    """Test suite for profiles directory validation"""

    def test_profiles_directory_exists(self):
        """Test that profiles/ directory exists"""
        self.assertTrue(PROFILES_DIR.is_dir(), f"profiles/ not found at {PROFILES_DIR}")

    def test_profiles_contain_yaml_files(self):
        """Test that profiles/ contains YAML files"""
        yaml_files = list(PROFILES_DIR.glob("*.yaml"))
        self.assertTrue(len(yaml_files) > 0, "No YAML files found in profiles/")

    def test_each_yaml_profile_loads_correctly(self):
        """Test that each YAML profile loads without errors"""
        import yaml

        for filepath in sorted(PROFILES_DIR.glob("*.yaml")):
            with open(filepath, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            self.assertIsNotNone(data, f"YAML file is empty: {filepath.name}")
            self.assertIsInstance(data, dict, f"YAML file is not a dict: {filepath.name}")

    def test_profiles_have_required_fields(self):
        """Test that YAML profiles have name and type fields"""
        import yaml

        for filepath in sorted(PROFILES_DIR.glob("*.yaml")):
            with open(filepath, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            if data:
                self.assertIn("name", data, f"Missing 'name' in {filepath.name}")
                self.assertIn("type", data, f"Missing 'type' in {filepath.name}")


class TestLoadProfiles(unittest.TestCase):
    """Test suite for load_profiles function"""

    def test_load_profiles_returns_list(self):
        """Test that load_profiles returns a list"""
        profiles = load_profiles(PROFILES_DIR)
        self.assertIsInstance(profiles, list)

    def test_load_profiles_not_empty(self):
        """Test that load_profiles returns non-empty list"""
        profiles = load_profiles(PROFILES_DIR)
        self.assertTrue(len(profiles) > 0)

    def test_load_profiles_returns_dicts(self):
        """Test that each profile is a dict"""
        profiles = load_profiles(PROFILES_DIR)
        for profile in profiles:
            self.assertIsInstance(profile, dict)

    def test_load_profiles_nonexistent_dir(self):
        """Test loading from a nonexistent directory"""
        profiles = load_profiles(Path("/nonexistent/path"))
        self.assertEqual(profiles, [])


class TestFormatHelpers(unittest.TestCase):
    """Test suite for formatting helper functions"""

    def test_format_bool_true(self):
        """Test format_bool with True"""
        self.assertEqual(format_bool(True), "✅")

    def test_format_bool_false(self):
        """Test format_bool with False"""
        self.assertEqual(format_bool(False), "❌")

    def test_format_number_int(self):
        """Test format_number with integer"""
        self.assertEqual(format_number(1000), "1,000")

    def test_format_number_large_int(self):
        """Test format_number with large integer"""
        self.assertEqual(format_number(200000), "200,000")

    def test_format_number_float_whole(self):
        """Test format_number with float that is whole"""
        self.assertEqual(format_number(1000.0), "1,000")

    def test_format_number_float_decimal(self):
        """Test format_number with float"""
        self.assertEqual(format_number(3.14), "3.14")

    def test_format_number_string(self):
        """Test format_number with string input"""
        self.assertEqual(format_number("N/A"), "N/A")

    def test_format_price_zero(self):
        """Test format_price with zero"""
        self.assertEqual(format_price(0), "Free")

    def test_format_price_float(self):
        """Test format_price with float"""
        self.assertEqual(format_price(3.0), "$3.00")

    def test_format_price_small(self):
        """Test format_price with small value"""
        self.assertEqual(format_price(0.50), "$0.50")

    def test_format_price_string(self):
        """Test format_price with string"""
        self.assertEqual(format_price("Contact"), "Contact")


class TestGenerateFoundationModelTable(unittest.TestCase):
    """Test suite for generate_foundation_model_table"""

    def test_generates_markdown_table(self):
        """Test that a valid Markdown table is generated"""
        models = [
            {
                "name": "TestModel",
                "provider": "TestProvider",
                "context_window": 128000,
                "capabilities": {
                    "vision": True,
                    "audio": False,
                    "function_calling": True,
                    "code_generation": True,
                    "reasoning": True,
                },
                "pricing": {
                    "input_per_1m_tokens": 3.0,
                    "output_per_1m_tokens": 15.0,
                },
                "open_source": False,
            }
        ]

        table = generate_foundation_model_table(models)

        self.assertIn("TestModel", table)
        self.assertIn("TestProvider", table)
        self.assertIn("|", table)
        lines = table.strip().split("\n")
        self.assertTrue(len(lines) >= 3)  # header + separator + at least 1 row

    def test_empty_models_generates_header_only(self):
        """Test that empty model list generates header only"""
        table = generate_foundation_model_table([])

        lines = table.strip().split("\n")
        self.assertEqual(len(lines), 2)  # header + separator


class TestGenerateCodingToolTable(unittest.TestCase):
    """Test suite for generate_coding_tool_table"""

    def test_generates_markdown_table(self):
        """Test that a valid Markdown table is generated"""
        tools = [
            {
                "name": "TestTool",
                "provider": "TestProvider",
                "capabilities": {
                    "code_generation": True,
                    "code_completion": True,
                    "chat_interface": True,
                    "agent_mode": False,
                    "multi_file_editing": True,
                    "test_generation": False,
                },
                "pricing": {
                    "free_tier": True,
                    "pro_monthly": 20,
                },
                "models_used": ["GPT-4", "Claude"],
            }
        ]

        table = generate_coding_tool_table(tools)

        self.assertIn("TestTool", table)
        self.assertIn("GPT-4, Claude", table)


class TestGenerateBenchmarkTable(unittest.TestCase):
    """Test suite for generate_benchmark_table"""

    def test_generates_benchmark_rows(self):
        """Test that benchmark data creates rows"""
        models = [
            {
                "name": "TestModel",
                "benchmarks": {
                    "mmlu": 90.5,
                    "humaneval": 85.0,
                    "math": 70.0,
                    "arena_elo": 1250,
                },
            }
        ]

        table = generate_benchmark_table(models)

        self.assertIn("TestModel", table)
        self.assertIn("90.5", table)

    def test_skips_models_without_benchmarks(self):
        """Test that models without benchmarks are skipped"""
        models = [
            {"name": "NoBenchModel"},
            {"name": "WithBench", "benchmarks": {"mmlu": 80}},
        ]

        table = generate_benchmark_table(models)

        self.assertNotIn("NoBenchModel", table)
        self.assertIn("WithBench", table)


class TestGenerateMarkdown(unittest.TestCase):
    """Test suite for generate_markdown"""

    def test_generates_full_document(self):
        """Test that generate_markdown creates a full document"""
        foundation = [
            {
                "name": "Model1",
                "provider": "P1",
                "context_window": 8000,
                "capabilities": {},
                "pricing": {},
                "open_source": False,
            }
        ]
        tools = [
            {
                "name": "Tool1",
                "provider": "P1",
                "capabilities": {},
                "pricing": {},
            }
        ]

        md = generate_markdown(foundation, tools)

        self.assertIn("# AI Tools Comparison Tables", md)
        self.assertIn("## Foundation Models Comparison", md)
        self.assertIn("## AI Coding Tools Comparison", md)
        self.assertIn("## Benchmark Scores", md)
        self.assertIn("Auto-generated", md)


class TestGenerateJson(unittest.TestCase):
    """Test suite for generate_json"""

    def test_json_has_correct_structure(self):
        """Test that generated JSON has correct structure"""
        foundation = [{"name": "M1"}]
        tools = [{"name": "T1"}]

        data = generate_json(foundation, tools)

        self.assertIn("generated_by", data)
        self.assertIn("foundation_models", data)
        self.assertIn("coding_tools", data)
        self.assertEqual(data["generated_by"], "scripts/generate_comparison.py")

    def test_json_contains_model_data(self):
        """Test that JSON contains the model data"""
        foundation = [{"name": "TestModel", "provider": "TP"}]
        tools = []

        data = generate_json(foundation, tools)

        self.assertEqual(len(data["foundation_models"]), 1)
        self.assertEqual(data["foundation_models"][0]["name"], "TestModel")

    def test_json_contains_tool_data(self):
        """Test that JSON contains the tool data"""
        foundation = []
        tools = [{"name": "TestTool"}]

        data = generate_json(foundation, tools)

        self.assertEqual(len(data["coding_tools"]), 1)
        self.assertEqual(data["coding_tools"][0]["name"], "TestTool")

    def test_json_is_serializable(self):
        """Test that the generated JSON can be serialized"""
        foundation = [{"name": "M", "capabilities": {"vision": True}}]
        tools = [{"name": "T", "pricing": {"free_tier": True}}]

        data = generate_json(foundation, tools)

        serialized = json.dumps(data)
        self.assertIsInstance(serialized, str)
        parsed = json.loads(serialized)
        self.assertEqual(parsed["foundation_models"][0]["name"], "M")

    def test_json_empty_inputs(self):
        """Test JSON generation with empty inputs"""
        data = generate_json([], [])

        self.assertEqual(data["foundation_models"], [])
        self.assertEqual(data["coding_tools"], [])
        self.assertIn("generated_by", data)


class TestScriptIntegration(unittest.TestCase):
    """Integration tests for the script using real profiles"""

    def test_load_and_categorize_profiles(self):
        """Test loading and categorizing profiles from profiles/"""
        profiles = load_profiles(PROFILES_DIR)
        self.assertTrue(len(profiles) > 0)

        foundation_models = [p for p in profiles if p.get("type") == "foundation_model"]
        coding_tools = [p for p in profiles if p.get("type") == "ai_coding_tool"]

        # At least one type should have entries
        self.assertTrue(
            len(foundation_models) > 0 or len(coding_tools) > 0,
            "No profiles categorized as foundation_model or ai_coding_tool",
        )

    def test_generate_markdown_from_real_profiles(self):
        """Test Markdown generation from real profiles"""
        profiles = load_profiles(PROFILES_DIR)
        foundation_models = [p for p in profiles if p.get("type") == "foundation_model"]
        # Only include coding tools that have string models_used (skip malformed)
        coding_tools = []
        for p in profiles:
            if p.get("type") == "ai_coding_tool":
                models_used = p.get("models_used", [])
                if all(isinstance(m, str) for m in models_used):
                    coding_tools.append(p)

        md = generate_markdown(foundation_models, coding_tools)

        self.assertIn("# AI Tools Comparison Tables", md)
        self.assertIn("|", md)

    def test_generate_json_from_real_profiles(self):
        """Test JSON generation from real profiles"""
        profiles = load_profiles(PROFILES_DIR)
        foundation_models = [p for p in profiles if p.get("type") == "foundation_model"]
        coding_tools = [p for p in profiles if p.get("type") == "ai_coding_tool"]

        data = generate_json(foundation_models, coding_tools)

        self.assertIn("generated_by", data)
        self.assertIsInstance(data["foundation_models"], list)
        self.assertIsInstance(data["coding_tools"], list)


if __name__ == '__main__':
    unittest.main()
