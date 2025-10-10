#\!/usr/bin/env python3
"""Unit tests for generate-api.py"""
import unittest
import tempfile
import shutil
import os
import json
from pathlib import Path
import sys

sys.path.insert(0, os.path.dirname(__file__))
from generate_api import APIGenerator

class TestAPIGenerator(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.generator = APIGenerator(self.test_dir)
        self.generator.api_dir.mkdir(exist_ok=True)
        self.generator.metadata_dir.mkdir(exist_ok=True)
    
    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def test_load_metadata_empty_directory(self):
        result = self.generator.load_metadata()
        self.assertEqual(result, [])
    
    def test_generate_tools_index_structure(self):
        metadata = [{"slug": "tool1", "name": "Tool 1", "type": "IDE"}]
        result = self.generator.generate_tools_index(metadata)
        self.assertIn('version', result)
        self.assertEqual(result['count'], 1)
    
    def test_generate_by_type_groups_correctly(self):
        metadata = [
            {"slug": "ide1", "name": "IDE 1", "type": "IDE Plugin"},
            {"slug": "cli1", "name": "CLI 1", "type": "CLI Tool"}
        ]
        result = self.generator.generate_by_type(metadata)
        self.assertIn('IDE Plugin', result['types'])
        self.assertIn('CLI Tool', result['types'])

if __name__ == '__main__':
    unittest.main()