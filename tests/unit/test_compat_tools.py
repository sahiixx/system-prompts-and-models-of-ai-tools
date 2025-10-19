"""
Comprehensive Unit Tests for agent/tools/compat.py
Tests CompatTools class and all compatibility tool implementations
"""

import unittest
import sys
import os
import tempfile
import shutil
from unittest.mock import patch, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.tools.compat import CompatTools
from agent.core.tool_registry import ToolRegistry


class TestCompatToolsInitialization(unittest.TestCase):
    """Test suite for CompatTools initialization"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat_tools = CompatTools(self.registry)
    
    def test_compat_tools_init(self):
        """Test CompatTools initializes with registry"""
        self.assertIsNotNone(self.compat_tools.registry)
        self.assertEqual(self.compat_tools.registry, self.registry)
    
    def test_register_all_tools(self):
        """Test that register_all registers expected tools"""
        self.compat_tools.register_all()
        
        expected_tools = [
            "view", "grep-search", "save-file", "str-replace-editor",
            "remove-files", "open-browser", "web-search",
            "codebase-retrieval", "git-commit-retrieval"
        ]
        
        registered = [spec["name"] for spec in self.registry.list_specs()]
        
        for tool in expected_tools:
            self.assertIn(tool, registered, f"Tool '{tool}' not registered")


class TestViewTool(unittest.TestCase):
    """Test suite for 'view' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat_tools = CompatTools(self.registry)
        self.compat_tools.register_all()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_view_directory(self):
        """Test viewing a directory"""
        os.makedirs(os.path.join(self.temp_dir, "subdir"))
        open(os.path.join(self.temp_dir, "file1.txt"), 'w').close()
        open(os.path.join(self.temp_dir, "file2.txt"), 'w').close()
        
        result = self.registry.call("view", {
            "type": "directory",
            "path": self.temp_dir
        })
        
        self.assertIn("entries", result)
        self.assertIn("file1.txt", result["entries"])
        self.assertIn("file2.txt", result["entries"])
        self.assertIn("subdir", result["entries"])
    
    def test_view_file(self):
        """Test viewing a file"""
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("Line 1\nLine 2\nLine 3\n")
        
        result = self.registry.call("view", {
            "type": "file",
            "path": test_file
        })
        
        self.assertIn("content", result)
        self.assertIn("Line 1", result["content"])
    
    def test_view_file_with_range(self):
        """Test viewing file with line range"""
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("Line 1\nLine 2\nLine 3\nLine 4\n")
        
        result = self.registry.call("view", {
            "type": "file",
            "path": test_file,
            "view_range": [2, 3]
        })
        
        self.assertIn("content", result)
        self.assertIn("Line 2", result["content"])
        self.assertIn("Line 3", result["content"])
    
    def test_view_missing_params(self):
        """Test view without required parameters"""
        result = self.registry.call("view", {"path": self.temp_dir})
        self.assertIn("error", result)


class TestSaveFileTool(unittest.TestCase):
    """Test suite for 'save-file' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat_tools = CompatTools(self.registry)
        self.compat_tools.register_all()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_save_file_new_file(self):
        """Test saving a new file"""
        test_file = os.path.join(self.temp_dir, "new_file.txt")
        content = "This is test content"
        
        result = self.registry.call("save-file", {
            "path": test_file,
            "file_content": content
        })
        
        self.assertIn("ok", result)
        self.assertTrue(result["ok"])
        self.assertTrue(os.path.exists(test_file))
    
    def test_save_file_with_newline(self):
        """Test saving file with automatic newline"""
        test_file = os.path.join(self.temp_dir, "newline.txt")
        
        result = self.registry.call("save-file", {
            "path": test_file,
            "file_content": "No newline",
            "add_last_line_newline": True
        })
        
        self.assertTrue(result["ok"])
        with open(test_file, 'r') as f:
            self.assertTrue(f.read().endswith("\n"))
    
    def test_save_file_creates_directories(self):
        """Test that save-file creates parent directories"""
        nested = os.path.join(self.temp_dir, "a", "b", "c", "file.txt")
        
        result = self.registry.call("save-file", {
            "path": nested,
            "file_content": "nested"
        })
        
        self.assertTrue(result["ok"])
        self.assertTrue(os.path.exists(nested))
    
    def test_save_file_existing_file_error(self):
        """Test that save-file returns error if file exists"""
        test_file = os.path.join(self.temp_dir, "exists.txt")
        with open(test_file, 'w') as f:
            f.write("existing")
        
        result = self.registry.call("save-file", {
            "path": test_file,
            "file_content": "new"
        })
        
        self.assertIn("error", result)


class TestStrReplaceEditorTool(unittest.TestCase):
    """Test suite for 'str-replace-editor' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat_tools = CompatTools(self.registry)
        self.compat_tools.register_all()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_str_replace_simple(self):
        """Test simple string replacement"""
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("Hello world\n")
        
        result = self.registry.call("str-replace-editor", {
            "command": "str_replace",
            "path": test_file,
            "old_str_1": "world",
            "new_str_1": "universe",
            "old_str_start_line_number_1": 1,
            "old_str_end_line_number_1": 1
        })
        
        self.assertIn("ok", result)
        with open(test_file, 'r') as f:
            self.assertIn("universe", f.read())
    
    def test_str_replace_insert(self):
        """Test insert command"""
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("Line 1\nLine 2\n")
        
        result = self.registry.call("str-replace-editor", {
            "command": "insert",
            "path": test_file,
            "insert_line_1": 1,
            "new_str_1": "Inserted\n"
        })
        
        self.assertIn("ok", result)


class TestRemoveFilesTool(unittest.TestCase):
    """Test suite for 'remove-files' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat_tools = CompatTools(self.registry)
        self.compat_tools.register_all()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_remove_single_file(self):
        """Test removing a single file"""
        test_file = os.path.join(self.temp_dir, "remove.txt")
        with open(test_file, 'w') as f:
            f.write("test")
        
        result = self.registry.call("remove-files", {"file_paths": [test_file]})
        
        self.assertIn("removed", result)
        self.assertIn(test_file, result["removed"])
        self.assertFalse(os.path.exists(test_file))
    
    def test_remove_multiple_files(self):
        """Test removing multiple files"""
        files = []
        for i in range(3):
            f = os.path.join(self.temp_dir, f"file{i}.txt")
            with open(f, 'w') as fh:
                fh.write("test")
            files.append(f)
        
        result = self.registry.call("remove-files", {"file_paths": files})
        
        self.assertEqual(len(result["removed"]), 3)


class TestOpenBrowserTool(unittest.TestCase):
    """Test suite for 'open-browser' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat_tools = CompatTools(self.registry)
        self.compat_tools.register_all()
    
    @patch('agent.tools.compat.webbrowser.open')
    def test_open_browser_success(self, mock_open):
        """Test opening browser successfully"""
        mock_open.return_value = True
        
        result = self.registry.call("open-browser", {"url": "https://example.com"})
        
        self.assertIn("ok", result)
        self.assertTrue(result["ok"])
    
    def test_open_browser_missing_url(self):
        """Test open-browser without URL"""
        result = self.registry.call("open-browser", {})
        
        self.assertIn("error", result)


class TestWebSearchCompatTool(unittest.TestCase):
    """Test suite for compat 'web-search' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat_tools = CompatTools(self.registry)
        self.compat_tools.register_all()
    
    def test_web_search_default(self):
        """Test web search with defaults"""
        result = self.registry.call("web-search", {"query": "test"})
        
        self.assertIn("results", result)
        self.assertEqual(len(result["results"]), 5)
    
    def test_web_search_custom_count(self):
        """Test web search with custom result count"""
        result = self.registry.call("web-search", {"query": "test", "num_results": 3})
        
        self.assertEqual(len(result["results"]), 3)


class TestCodebaseRetrievalTool(unittest.TestCase):
    """Test suite for 'codebase-retrieval' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat_tools = CompatTools(self.registry)
        self.compat_tools.register_all()
    
    def test_codebase_retrieval_missing_request(self):
        """Test codebase retrieval without information_request"""
        result = self.registry.call("codebase-retrieval", {})
        
        self.assertIn("error", result)


class TestGitCommitRetrievalTool(unittest.TestCase):
    """Test suite for 'git-commit-retrieval' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat_tools = CompatTools(self.registry)
        self.compat_tools.register_all()
    
    def test_git_commit_missing_request(self):
        """Test git-commit-retrieval without request"""
        result = self.registry.call("git-commit-retrieval", {})
        
        self.assertIn("error", result)
    
    @patch('agent.tools.compat.subprocess.run')
    def test_git_commit_success(self, mock_run):
        """Test successful git commit retrieval"""
        mock_result = Mock()
        mock_result.stdout = "abc123 Initial\ndef456 Feature\n"
        mock_run.return_value = mock_result
        
        result = self.registry.call("git-commit-retrieval", {
            "information_request": "Initial"
        })
        
        self.assertIn("matches", result)


if __name__ == '__main__':
    unittest.main()