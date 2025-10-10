#\!/usr/bin/env python3
"""Unit tests for compare-versions.py"""
import unittest
import tempfile
import shutil
import os
from pathlib import Path
import sys

sys.path.insert(0, os.path.dirname(__file__))
from compare_versions import VersionComparer

class TestVersionComparer(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.comparer = VersionComparer(self.test_dir)
    
    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def test_find_versions_empty_directory(self):
        result = self.comparer.find_versions("NonExistentTool")
        self.assertEqual(result, [])
    
    def test_compare_files_identical_files(self):
        file1 = Path(self.test_dir) / "file1.txt"
        file2 = Path(self.test_dir) / "file2.txt"
        content = "Line 1\nLine 2\nLine 3"
        file1.write_text(content)
        file2.write_text(content)
        diff = self.comparer.compare_files(file1, file2)
        self.assertIsInstance(diff, list)
    
    def test_calculate_similarity_identical_strings(self):
        file1 = Path(self.test_dir) / "file1.txt"
        file2 = Path(self.test_dir) / "file2.txt"
        content = "This is test content"
        file1.write_text(content)
        file2.write_text(content)
        similarity = self.comparer.calculate_similarity(file1, file2)
        self.assertEqual(similarity, 1.0)

if __name__ == '__main__':
    unittest.main()