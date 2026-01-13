#\!/usr/bin/env python3
"""Unit tests for generate-metadata.py"""
import unittest
import tempfile
import shutil
import os
from pathlib import Path
import sys

sys.path.insert(0, os.path.dirname(__file__))
from generate_metadata import MetadataGenerator

class TestMetadataGenerator(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.generator = MetadataGenerator(self.test_dir)
    
    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def test_constructor_creates_metadata_dir(self):
        self.assertTrue(self.generator.metadata_dir.exists())
    
    def test_slugify_converts_to_lowercase(self):
        result = self.generator.slugify("Test Tool Name")
        self.assertEqual(result, "test-tool-name")
    
    def test_slugify_removes_special_characters(self):
        result = self.generator.slugify("Test@Tool#Name\!")
        self.assertEqual(result, "testtoolname")
    
    def test_detect_tool_type_cli(self):
        result = self.generator.detect_tool_type("CLI Tool Name", [])
        self.assertEqual(result, "CLI Tool")
    
    def test_analyze_prompt_file_detects_patterns(self):
        temp_file = Path(self.test_dir) / "test.txt"
        content = "Execute in parallel. Use sub-agent. Verify output."
        temp_file.write_text(content)
        result = self.generator.analyze_prompt_file(temp_file)
        self.assertIn('patterns', result)

if __name__ == '__main__':
    unittest.main()