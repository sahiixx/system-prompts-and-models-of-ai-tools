"""
Comprehensive Unit Tests for CLI session path sanitization
Tests _safe_session_path function
"""

import unittest
import sys
import os
import tempfile
import shutil

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.cli import _safe_session_path


class TestSessionPath(unittest.TestCase):
    """Test suite for _safe_session_path"""
    
    def setUp(self):
        """Set up test directory"""
        self.original_cwd = os.getcwd()
        self.test_dir = tempfile.mkdtemp()
        os.chdir(self.test_dir)
    
    def tearDown(self):
        """Clean up test directory"""
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_none_input_returns_none(self):
        """Test that None input returns None"""
        result = _safe_session_path(None)
        self.assertIsNone(result)
    
    def test_empty_string_returns_none(self):
        """Test that empty string returns None"""
        result = _safe_session_path("")
        self.assertIsNone(result)
    
    def test_simple_filename(self):
        """Test simple filename is preserved"""
        result = _safe_session_path("session.json")
        self.assertIsNotNone(result)
        self.assertTrue(result.endswith("session.json"))
        self.assertIn(".agent_sessions", result)
    
    def test_path_traversal_blocked(self):
        """Test that path traversal attempts are blocked"""
        result = _safe_session_path("../../../etc/passwd")
        self.assertTrue(result.endswith("passwd"))
        self.assertIn(".agent_sessions", result)
        self.assertNotIn("..", result)
    
    def test_absolute_path_stripped(self):
        """Test that absolute paths are stripped to basename"""
        abs_path = os.path.join(tempfile.gettempdir(), "dangerous", "session.json")
        result = _safe_session_path(abs_path)
        self.assertTrue(result.endswith("session.json"))
        self.assertNotIn("dangerous", result)
    
    def test_forward_slash_causes_fallback(self):
        """Test that forward slashes cause fallback"""
        result = _safe_session_path("dir/file.json")
        self.assertTrue(result.endswith("session.json"))
    
    def test_backslash_causes_fallback(self):
        """Test that backslashes cause fallback"""
        result = _safe_session_path("dir\\file.json")
        self.assertTrue(result.endswith("session.json"))
    
    def test_invalid_characters_cause_fallback(self):
        """Test that invalid characters cause fallback"""
        result = _safe_session_path("file!@#$.json")
        self.assertTrue(result.endswith("session.json"))
    
    def test_creates_sessions_directory(self):
        """Test that .agent_sessions directory is created"""
        result = _safe_session_path("test.json")
        sessions_dir = os.path.dirname(result)
        self.assertTrue(os.path.exists(sessions_dir))
        self.assertTrue(os.path.isdir(sessions_dir))
    
    def test_alphanumeric_and_safe_chars_allowed(self):
        """Test that alphanumeric and safe characters are allowed"""
        result = _safe_session_path("my-session_01.json")
        self.assertTrue(result.endswith("my-session_01.json"))
    
    def test_result_is_absolute_path(self):
        """Test that result is an absolute path"""
        result = _safe_session_path("session.json")
        self.assertTrue(os.path.isabs(result))


if __name__ == '__main__':
    unittest.main()