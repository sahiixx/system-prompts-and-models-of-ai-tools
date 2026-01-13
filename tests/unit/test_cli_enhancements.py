"""
Unit Tests for agent/cli.py new features
Tests for _safe_session_path(), streaming, and session persistence
"""

import unittest
import sys
import os
import tempfile
import shutil

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.cli import _safe_session_path


class TestSafeSessionPath(unittest.TestCase):
    """Test suite for _safe_session_path() function"""
    
    def setUp(self):
        """Set up test environment"""
        self.original_cwd = os.getcwd()
        self.test_dir = tempfile.mkdtemp()
        os.chdir(self.test_dir)
    
    def tearDown(self):
        """Clean up test environment"""
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_safe_session_path_with_none(self):
        """Test that None input returns None"""
        result = _safe_session_path(None)
        self.assertIsNone(result)
    
    def test_safe_session_path_with_empty_string(self):
        """Test that empty string returns None"""
        result = _safe_session_path("")
        self.assertIsNone(result)
    
    def test_safe_session_path_creates_directory(self):
        """Test that the .agent_sessions directory is created"""
        _safe_session_path("test.json")
        
        sessions_dir = os.path.join(self.test_dir, ".agent_sessions")
        self.assertTrue(os.path.exists(sessions_dir))
        self.assertTrue(os.path.isdir(sessions_dir))
    
    def test_safe_session_path_returns_absolute_path(self):
        """Test that returned path is absolute"""
        result = _safe_session_path("test.json")
        
        self.assertTrue(os.path.isabs(result))
        self.assertIn(".agent_sessions", result)
        self.assertIn("test.json", result)
    
    def test_safe_session_path_prevents_path_traversal(self):
        """Test that path traversal attempts are sanitized"""
        result = _safe_session_path("../../../etc/passwd")
        
        # Should extract just the basename and use safe directory
        self.assertIn(".agent_sessions", result)
        self.assertIn("passwd", result)
        self.assertNotIn("..", result)
    
    def test_safe_session_path_handles_absolute_path(self):
        """Test that absolute path input is converted to safe basename"""
        result = _safe_session_path("/etc/shadow")
        
        # Should use only the basename in safe directory
        self.assertIn(".agent_sessions", result)
        self.assertIn("shadow", result)
        self.assertNotIn("/etc/", result)
    
    def test_safe_session_path_rejects_slashes(self):
        """Test that filenames with slashes are rejected"""
        result = _safe_session_path("foo/bar.json")
        
        # Should fallback to default name
        self.assertIn("session.json", result)
        self.assertNotIn("foo", result)
    
    def test_safe_session_path_rejects_invalid_chars(self):
        """Test that filenames with invalid characters use default"""
        result = _safe_session_path("test@#$.json")
        
        # Should fallback to default name
        self.assertIn("session.json", result)
    
    def test_safe_session_path_allows_valid_chars(self):
        """Test that valid characters are preserved"""
        result = _safe_session_path("my-test_session.json")
        
        self.assertIn("my-test_session.json", result)
        self.assertIn(".agent_sessions", result)
    
    def test_safe_session_path_multiple_calls_same_dir(self):
        """Test that multiple calls use the same directory"""
        result1 = _safe_session_path("session1.json")
        result2 = _safe_session_path("session2.json")
        
        dir1 = os.path.dirname(result1)
        dir2 = os.path.dirname(result2)
        
        self.assertEqual(dir1, dir2)
        self.assertTrue(os.path.exists(dir1))


if __name__ == '__main__':
    unittest.main()