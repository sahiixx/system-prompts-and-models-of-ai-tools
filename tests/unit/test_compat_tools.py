"""
Comprehensive Unit Tests for agent/tools/compat.py
Tests CompatTools class and all its tool implementations
"""

import unittest
import sys
import os
import tempfile
import shutil
import subprocess
from unittest.mock import patch, MagicMock, mock_open, call

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.tools.compat import CompatTools
from agent.core.tool_registry import ToolRegistry, ToolSpec


class TestCompatToolsInitialization(unittest.TestCase):
    """Test suite for CompatTools initialization"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat = CompatTools(self.registry)

    def test_initialization(self):
        """Test CompatTools initializes with registry"""
        self.assertIsNotNone(self.compat)
        self.assertEqual(self.compat.registry, self.registry)

    def test_register_all_registers_tools(self):
        """Test register_all registers all expected tools"""
        self.compat.register_all()
        
        expected_tools = [
            "view", "grep-search", "save-file", "str-replace-editor",
            "remove-files", "open-browser", "web-search",
            "codebase-retrieval", "git-commit-retrieval"
        ]
        
        for tool_name in expected_tools:
            tool = self.registry.get(tool_name)
            self.assertIsNotNone(tool, f"Tool '{tool_name}' should be registered")
            self.assertIsInstance(tool, ToolSpec)

    def test_registered_tools_have_descriptions(self):
        """Test all registered tools have descriptions"""
        self.compat.register_all()
        
        for tool_name in ["view", "grep-search", "save-file"]:
            tool = self.registry.get(tool_name)
            self.assertTrue(len(tool.description) > 0)

    def test_registered_tools_have_parameters(self):
        """Test all registered tools have parameter definitions"""
        self.compat.register_all()
        
        for tool_name in ["view", "grep-search", "save-file"]:
            tool = self.registry.get(tool_name)
            self.assertIsNotNone(tool.parameters)
            self.assertIsInstance(tool.parameters, dict)


class TestViewTool(unittest.TestCase):
    """Test suite for _view tool"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat = CompatTools(self.registry)
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up test fixtures"""
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_view_missing_type_parameter(self):
        """Test view returns error when type parameter missing"""
        result = self.compat._view({"path": "/some/path"})
        self.assertIn("error", result)
        self.assertIn("required", result["error"])

    def test_view_missing_path_parameter(self):
        """Test view returns error when path parameter missing"""
        result = self.compat._view({"type": "file"})
        self.assertIn("error", result)
        self.assertIn("required", result["error"])

    def test_view_directory_success(self):
        """Test view lists directory contents"""
        # Create test files
        os.makedirs(os.path.join(self.test_dir, "subdir"))
        open(os.path.join(self.test_dir, "file1.txt"), "w").close()
        open(os.path.join(self.test_dir, "file2.txt"), "w").close()
        
        result = self.compat._view({
            "type": "directory",
            "path": self.test_dir
        })
        
        self.assertIn("entries", result)
        self.assertIn("file1.txt", result["entries"])
        self.assertIn("file2.txt", result["entries"])
        self.assertIn("subdir", result["entries"])

    def test_view_directory_not_found(self):
        """Test view handles non-existent directory"""
        result = self.compat._view({
            "type": "directory",
            "path": "/nonexistent/directory"
        })
        
        self.assertIn("error", result)
        self.assertIn("not found", result["error"])

    def test_view_directory_limits_entries(self):
        """Test view limits directory entries to 200"""
        # Create many files
        for i in range(250):
            open(os.path.join(self.test_dir, f"file{i}.txt"), "w").close()
        
        result = self.compat._view({
            "type": "directory",
            "path": self.test_dir
        })
        
        self.assertIn("entries", result)
        self.assertLessEqual(len(result["entries"]), 200)

    def test_view_file_success(self):
        """Test view reads file content"""
        test_file = os.path.join(self.test_dir, "test.txt")
        with open(test_file, "w") as f:
            f.write("Hello, World!\nLine 2\nLine 3")
        
        result = self.compat._view({
            "type": "file",
            "path": test_file
        })
        
        self.assertIn("content", result)
        self.assertIn("Hello, World!", result["content"])
        self.assertIn("Line 2", result["content"])

    def test_view_file_not_found(self):
        """Test view handles non-existent file"""
        result = self.compat._view({
            "type": "file",
            "path": "/nonexistent/file.txt"
        })
        
        self.assertIn("error", result)
        self.assertIn("not found", result["error"])

    def test_view_file_with_view_range(self):
        """Test view with line range"""
        test_file = os.path.join(self.test_dir, "test.txt")
        with open(test_file, "w") as f:
            f.write("Line 1\nLine 2\nLine 3\nLine 4\nLine 5")
        
        result = self.compat._view({
            "type": "file",
            "path": test_file,
            "view_range": [2, 4]
        })
        
        self.assertIn("content", result)
        self.assertIn("Line 2", result["content"])
        self.assertIn("Line 3", result["content"])
        self.assertIn("Line 4", result["content"])
        self.assertNotIn("Line 1", result["content"])
        self.assertNotIn("Line 5", result["content"])

    def test_view_file_with_regex_search(self):
        """Test view with regex search"""
        test_file = os.path.join(self.test_dir, "test.txt")
        with open(test_file, "w") as f:
            f.write("Hello World\nGoodbye World\nHello Again")
        
        result = self.compat._view({
            "type": "file",
            "path": test_file,
            "search_query_regex": r"Hello"
        })
        
        self.assertIn("matches", result)
        self.assertEqual(len(result["matches"]), 2)
        self.assertIn("Hello", result["matches"][0])

    def test_view_file_with_case_insensitive_regex(self):
        """Test view with case-insensitive regex"""
        test_file = os.path.join(self.test_dir, "test.txt")
        with open(test_file, "w") as f:
            f.write("Hello WORLD\nhello world")
        
        result = self.compat._view({
            "type": "file",
            "path": test_file,
            "search_query_regex": r"hello",
            "case_sensitive": False
        })
        
        self.assertIn("matches", result)
        self.assertEqual(len(result["matches"]), 2)

    def test_view_file_with_case_sensitive_regex(self):
        """Test view with case-sensitive regex"""
        test_file = os.path.join(self.test_dir, "test.txt")
        with open(test_file, "w") as f:
            f.write("Hello WORLD\nhello world")
        
        result = self.compat._view({
            "type": "file",
            "path": test_file,
            "search_query_regex": r"hello",
            "case_sensitive": True
        })
        
        self.assertIn("matches", result)
        self.assertEqual(len(result["matches"]), 1)

    def test_view_file_limits_regex_matches(self):
        """Test view limits regex matches to 200"""
        test_file = os.path.join(self.test_dir, "test.txt")
        with open(test_file, "w") as f:
            f.write("test " * 300)
        
        result = self.compat._view({
            "type": "file",
            "path": test_file,
            "search_query_regex": r"test"
        })
        
        self.assertIn("matches", result)
        self.assertLessEqual(len(result["matches"]), 200)

    def test_view_file_with_unicode(self):
        """Test view handles unicode content"""
        test_file = os.path.join(self.test_dir, "unicode.txt")
        with open(test_file, "w", encoding="utf-8") as f:
            f.write("Hello 世界 🌍")
        
        result = self.compat._view({
            "type": "file",
            "path": test_file
        })
        
        self.assertIn("content", result)
        self.assertIn("世界", result["content"])


class TestGrepSearchTool(unittest.TestCase):
    """Test suite for _grep_search tool"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat = CompatTools(self.registry)
        self.test_dir = tempfile.mkdtemp()
        self.original_dir = os.getcwd()
        os.chdir(self.test_dir)

    def tearDown(self):
        """Clean up test fixtures"""
        os.chdir(self.original_dir)
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_grep_search_missing_query(self):
        """Test grep-search returns error when query missing"""
        result = self.compat._grep_search({})
        self.assertIn("error", result)
        self.assertIn("required", result["error"])

    def test_grep_search_empty_query(self):
        """Test grep-search handles empty query"""
        result = self.compat._grep_search({"query": ""})
        self.assertIn("error", result)

    def test_grep_search_basic(self):
        """Test basic grep search"""
        # Create test files
        with open("test1.txt", "w") as f:
            f.write("This is a test file\nwith multiple lines")
        with open("test2.txt", "w") as f:
            f.write("Another test file\nno matches here")
        
        result = self.compat._grep_search({"query": "test"})
        
        self.assertIn("results", result)
        self.assertIsInstance(result["results"], list)
        self.assertGreater(len(result["results"]), 0)

    def test_grep_search_case_sensitive(self):
        """Test grep search with case sensitivity"""
        with open("test.txt", "w") as f:
            f.write("Test TEST test")
        
        result_insensitive = self.compat._grep_search({
            "query": "test",
            "case_sensitive": False
        })
        
        result_sensitive = self.compat._grep_search({
            "query": "test",
            "case_sensitive": True
        })
        
        self.assertIn("results", result_insensitive)
        self.assertIn("results", result_sensitive)

    def test_grep_search_excludes_git_directory(self):
        """Test grep search excludes .git directories"""
        os.makedirs(".git/objects", exist_ok=True)
        with open(".git/objects/test", "w") as f:
            f.write("should not match this")
        with open("regular.txt", "w") as f:
            f.write("should match this")
        
        result = self.compat._grep_search({"query": "match"})
        
        self.assertIn("results", result)
        # Should only find in regular.txt, not in .git
        for res in result["results"]:
            self.assertNotIn(".git", res["file"])

    def test_grep_search_limits_results(self):
        """Test grep search limits results to 200"""
        # Create file with many matches
        with open("many_matches.txt", "w") as f:
            for i in range(300):
                f.write(f"match line {i}\n")
        
        result = self.compat._grep_search({"query": "match"})
        
        self.assertIn("results", result)
        self.assertLessEqual(len(result["results"]), 200)

    def test_grep_search_includes_context(self):
        """Test grep search includes context around matches"""
        with open("context.txt", "w") as f:
            f.write("x" * 100 + "MATCH" + "y" * 100)
        
        result = self.compat._grep_search({"query": "MATCH"})
        
        self.assertIn("results", result)
        if len(result["results"]) > 0:
            self.assertIn("context", result["results"][0])
            self.assertIn("MATCH", result["results"][0]["match"])

    def test_grep_search_handles_binary_files(self):
        """Test grep search handles binary files gracefully"""
        with open("binary.dat", "wb") as f:
            f.write(b'\x00\x01\x02\x03')
        
        # Should not crash
        result = self.compat._grep_search({"query": "test"})
        self.assertIn("results", result)

    def test_grep_search_regex_pattern(self):
        """Test grep search with regex pattern"""
        with open("regex_test.txt", "w") as f:
            f.write("abc123\ndef456\nghi789")
        
        result = self.compat._grep_search({"query": r"\d+"})
        
        self.assertIn("results", result)
        self.assertGreater(len(result["results"]), 0)


class TestSaveFileTool(unittest.TestCase):
    """Test suite for _save_file tool"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat = CompatTools(self.registry)
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up test fixtures"""
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_save_file_missing_path(self):
        """Test save-file returns error when path missing"""
        result = self.compat._save_file({"file_content": "test"})
        self.assertIn("error", result)
        self.assertIn("required", result["error"])

    def test_save_file_basic(self):
        """Test basic file save"""
        file_path = os.path.join(self.test_dir, "new_file.txt")
        result = self.compat._save_file({
            "path": file_path,
            "file_content": "Hello, World!"
        })
        
        self.assertIn("ok", result)
        self.assertTrue(result["ok"])
        self.assertTrue(os.path.exists(file_path))
        
        with open(file_path, "r") as f:
            content = f.read()
        self.assertEqual(content, "Hello, World!\n")

    def test_save_file_creates_directories(self):
        """Test save-file creates parent directories"""
        file_path = os.path.join(self.test_dir, "sub", "dir", "file.txt")
        result = self.compat._save_file({
            "path": file_path,
            "file_content": "content"
        })
        
        self.assertTrue(result["ok"])
        self.assertTrue(os.path.exists(file_path))

    def test_save_file_existing_file_error(self):
        """Test save-file returns error when file exists"""
        file_path = os.path.join(self.test_dir, "existing.txt")
        open(file_path, "w").close()
        
        result = self.compat._save_file({
            "path": file_path,
            "file_content": "new content"
        })
        
        self.assertIn("error", result)
        self.assertIn("exists", result["error"])

    def test_save_file_with_newline(self):
        """Test save-file adds trailing newline by default"""
        file_path = os.path.join(self.test_dir, "newline.txt")
        self.compat._save_file({
            "path": file_path,
            "file_content": "no newline",
            "add_last_line_newline": True
        })
        
        with open(file_path, "r") as f:
            content = f.read()
        self.assertTrue(content.endswith("\n"))

    def test_save_file_without_newline(self):
        """Test save-file without adding newline"""
        file_path = os.path.join(self.test_dir, "no_newline.txt")
        self.compat._save_file({
            "path": file_path,
            "file_content": "content\n",
            "add_last_line_newline": False
        })
        
        with open(file_path, "r") as f:
            content = f.read()
        self.assertEqual(content, "content\n")

    def test_save_file_empty_content(self):
        """Test save-file with empty content"""
        file_path = os.path.join(self.test_dir, "empty.txt")
        result = self.compat._save_file({
            "path": file_path,
            "file_content": ""
        })
        
        self.assertTrue(result["ok"])
        self.assertTrue(os.path.exists(file_path))

    def test_save_file_unicode_content(self):
        """Test save-file with unicode content"""
        file_path = os.path.join(self.test_dir, "unicode.txt")
        result = self.compat._save_file({
            "path": file_path,
            "file_content": "Hello 世界 🌍"
        })
        
        self.assertTrue(result["ok"])
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("世界", content)

    def test_save_file_returns_byte_count(self):
        """Test save-file returns byte count"""
        file_path = os.path.join(self.test_dir, "counted.txt")
        content = "test content"
        result = self.compat._save_file({
            "path": file_path,
            "file_content": content
        })
        
        self.assertIn("bytes", result)
        self.assertGreater(result["bytes"], 0)


class TestStrReplaceEditorTool(unittest.TestCase):
    """Test suite for _str_replace_editor tool"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat = CompatTools(self.registry)
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up test fixtures"""
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_str_replace_missing_command(self):
        """Test str-replace-editor error when command missing"""
        result = self.compat._str_replace_editor({"path": "test.txt"})
        self.assertIn("error", result)

    def test_str_replace_missing_path(self):
        """Test str-replace-editor error when path missing"""
        result = self.compat._str_replace_editor({"command": "str_replace"})
        self.assertIn("error", result)

    def test_str_replace_file_not_found(self):
        """Test str-replace-editor error when file doesn't exist"""
        result = self.compat._str_replace_editor({
            "command": "str_replace",
            "path": "/nonexistent/file.txt"
        })
        self.assertIn("error", result)
        self.assertIn("not found", result["error"])

    def test_str_replace_basic(self):
        """Test basic string replace"""
        file_path = os.path.join(self.test_dir, "replace.txt")
        with open(file_path, "w") as f:
            f.write("Hello World\nGoodbye World\n")
        
        result = self.compat._str_replace_editor({
            "command": "str_replace",
            "path": file_path,
            "old_str_1": "World",
            "new_str_1": "Python",
            "old_str_start_line_number_1": 1,
            "old_str_end_line_number_1": 1
        })
        
        self.assertIn("ok", result)
        self.assertTrue(result["ok"])
        
        with open(file_path, "r") as f:
            content = f.read()
        self.assertIn("Python", content)

    def test_str_replace_not_found(self):
        """Test str-replace when old_str not found"""
        file_path = os.path.join(self.test_dir, "replace.txt")
        with open(file_path, "w") as f:
            f.write("Hello World\n")
        
        result = self.compat._str_replace_editor({
            "command": "str_replace",
            "path": file_path,
            "old_str_1": "NotFound",
            "new_str_1": "Replacement",
            "old_str_start_line_number_1": 1,
            "old_str_end_line_number_1": 1
        })
        
        self.assertIn("error", result)
        self.assertIn("not found", result["error"])

    def test_insert_at_beginning(self):
        """Test insert at beginning of file"""
        file_path = os.path.join(self.test_dir, "insert.txt")
        with open(file_path, "w") as f:
            f.write("Line 1\nLine 2\n")
        
        result = self.compat._str_replace_editor({
            "command": "insert",
            "path": file_path,
            "insert_line_1": 0,
            "new_str_1": "New First Line\n"
        })
        
        self.assertTrue(result["ok"])
        with open(file_path, "r") as f:
            content = f.read()
        self.assertTrue(content.startswith("New First Line"))

    def test_insert_after_line(self):
        """Test insert after specific line"""
        file_path = os.path.join(self.test_dir, "insert.txt")
        with open(file_path, "w") as f:
            f.write("Line 1\nLine 2\nLine 3\n")
        
        result = self.compat._str_replace_editor({
            "command": "insert",
            "path": file_path,
            "insert_line_1": 1,
            "new_str_1": "Inserted Line\n"
        })
        
        self.assertTrue(result["ok"])
        with open(file_path, "r") as f:
            lines = f.readlines()
        self.assertIn("Inserted Line", lines[1])

    def test_str_replace_multiline(self):
        """Test replace spanning multiple lines"""
        file_path = os.path.join(self.test_dir, "multiline.txt")
        with open(file_path, "w") as f:
            f.write("Line 1\nLine 2\nLine 3\nLine 4\n")
        
        result = self.compat._str_replace_editor({
            "command": "str_replace",
            "path": file_path,
            "old_str_1": "Line 2\nLine 3",
            "new_str_1": "Modified Lines",
            "old_str_start_line_number_1": 2,
            "old_str_end_line_number_1": 3
        })
        
        self.assertTrue(result["ok"])


class TestRemoveFilesTool(unittest.TestCase):
    """Test suite for _remove_files tool"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat = CompatTools(self.registry)
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up test fixtures"""
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_remove_files_empty_list(self):
        """Test remove-files with empty list"""
        result = self.compat._remove_files({})
        self.assertIn("removed", result)
        self.assertEqual(len(result["removed"]), 0)

    def test_remove_single_file(self):
        """Test removing a single file"""
        file_path = os.path.join(self.test_dir, "to_remove.txt")
        open(file_path, "w").close()
        
        result = self.compat._remove_files({
            "file_paths": [file_path]
        })
        
        self.assertIn("removed", result)
        self.assertIn(file_path, result["removed"])
        self.assertFalse(os.path.exists(file_path))

    def test_remove_multiple_files(self):
        """Test removing multiple files"""
        file1 = os.path.join(self.test_dir, "file1.txt")
        file2 = os.path.join(self.test_dir, "file2.txt")
        open(file1, "w").close()
        open(file2, "w").close()
        
        result = self.compat._remove_files({
            "file_paths": [file1, file2]
        })
        
        self.assertEqual(len(result["removed"]), 2)
        self.assertFalse(os.path.exists(file1))
        self.assertFalse(os.path.exists(file2))

    def test_remove_nonexistent_file(self):
        """Test removing nonexistent file doesn't error"""
        result = self.compat._remove_files({
            "file_paths": ["/nonexistent/file.txt"]
        })
        
        self.assertIn("removed", result)
        # Should not include nonexistent file in removed list

    def test_remove_directory(self):
        """Test removing empty directory"""
        dir_path = os.path.join(self.test_dir, "empty_dir")
        os.makedirs(dir_path)
        
        result = self.compat._remove_files({
            "file_paths": [dir_path]
        })
        
        self.assertIn("removed", result)


class TestOpenBrowserTool(unittest.TestCase):
    """Test suite for _open_browser tool"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat = CompatTools(self.registry)

    def test_open_browser_missing_url(self):
        """Test open-browser error when URL missing"""
        result = self.compat._open_browser({})
        self.assertIn("error", result)
        self.assertIn("required", result["error"])

    @patch('webbrowser.open')
    def test_open_browser_success(self, mock_browser_open):
        """Test open-browser with valid URL"""
        mock_browser_open.return_value = True
        
        result = self.compat._open_browser({
            "url": "https://example.com"
        })
        
        self.assertIn("ok", result)
        self.assertTrue(result["ok"])
        mock_browser_open.assert_called_once_with("https://example.com")

    @patch('webbrowser.open', side_effect=Exception("Browser error"))
    def test_open_browser_error(self, _mock_browser_open):
        """Test open-browser handles exceptions"""
        result = self.compat._open_browser({
            "url": "https://example.com"
        })
        
        self.assertIn("error", result)


class TestWebSearchTool(unittest.TestCase):
    """Test suite for _web_search tool"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat = CompatTools(self.registry)

    def test_web_search_basic(self):
        """Test basic web search"""
        result = self.compat._web_search({
            "query": "test query"
        })
        
        self.assertIn("results", result)
        self.assertIsInstance(result["results"], list)
        self.assertGreater(len(result["results"]), 0)

    def test_web_search_empty_query(self):
        """Test web search with empty query"""
        result = self.compat._web_search({
            "query": ""
        })
        
        self.assertIn("results", result)

    def test_web_search_num_results(self):
        """Test web search respects num_results parameter"""
        result = self.compat._web_search({
            "query": "test",
            "num_results": 3
        })
        
        self.assertIn("results", result)
        self.assertEqual(len(result["results"]), 3)

    def test_web_search_limits_results(self):
        """Test web search limits results to maximum"""
        result = self.compat._web_search({
            "query": "test",
            "num_results": 100
        })
        
        self.assertIn("results", result)
        self.assertLessEqual(len(result["results"]), 10)

    def test_web_search_result_structure(self):
        """Test web search results have expected structure"""
        result = self.compat._web_search({
            "query": "test query",
            "num_results": 1
        })
        
        self.assertIn("results", result)
        if len(result["results"]) > 0:
            item = result["results"][0]
            self.assertIn("title", item)
            self.assertIn("url", item)
            self.assertIn("snippet", item)


class TestCodebaseRetrievalTool(unittest.TestCase):
    """Test suite for _codebase_retrieval tool"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat = CompatTools(self.registry)
        self.test_dir = tempfile.mkdtemp()
        self.original_dir = os.getcwd()
        os.chdir(self.test_dir)

    def tearDown(self):
        """Clean up test fixtures"""
        os.chdir(self.original_dir)
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_codebase_retrieval_missing_request(self):
        """Test codebase-retrieval error when request missing"""
        result = self.compat._codebase_retrieval({})
        self.assertIn("error", result)

    def test_codebase_retrieval_empty_request(self):
        """Test codebase-retrieval with empty request"""
        result = self.compat._codebase_retrieval({
            "information_request": ""
        })
        self.assertIn("error", result)

    def test_codebase_retrieval_finds_existing_file(self):
        """Test codebase-retrieval finds existing files"""
        test_file = "test_module.py"
        open(test_file, "w").close()
        
        result = self.compat._codebase_retrieval({
            "information_request": "looking for test_module.py"
        })
        
        self.assertIn("hints", result)
        found = any(h.get("file") == test_file for h in result["hints"])
        self.assertTrue(found)

    def test_codebase_retrieval_nonexistent_file(self):
        """Test codebase-retrieval with nonexistent file"""
        result = self.compat._codebase_retrieval({
            "information_request": "looking for nonexistent.py"
        })
        
        self.assertIn("hints", result)

    def test_codebase_retrieval_multiple_files(self):
        """Test codebase-retrieval with multiple file references"""
        open("file1.py", "w").close()
        open("file2.py", "w").close()
        
        result = self.compat._codebase_retrieval({
            "information_request": "need file1.py and file2.py"
        })
        
        self.assertIn("hints", result)


class TestGitCommitRetrievalTool(unittest.TestCase):
    """Test suite for _git_commit_retrieval tool"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.compat = CompatTools(self.registry)

    def test_git_commit_retrieval_missing_request(self):
        """Test git-commit-retrieval error when request missing"""
        result = self.compat._git_commit_retrieval({})
        self.assertIn("error", result)

    def test_git_commit_retrieval_empty_request(self):
        """Test git-commit-retrieval with empty request"""
        result = self.compat._git_commit_retrieval({
            "information_request": ""
        })
        self.assertIn("error", result)

    @patch('subprocess.run')
    def test_git_commit_retrieval_success(self, mock_run):
        """Test git-commit-retrieval with successful git command"""
        mock_run.return_value = MagicMock(
            stdout="abc123 First commit\ndef456 Second commit\n"
        )
        
        result = self.compat._git_commit_retrieval({
            "information_request": "first"
        })
        
        self.assertIn("matches", result)
        self.assertGreater(len(result["matches"]), 0)

    @patch('subprocess.run', side_effect=Exception("Git error"))
    def test_git_commit_retrieval_error(self, _mock_run):
        """Test git-commit-retrieval handles errors"""
        result = self.compat._git_commit_retrieval({
            "information_request": "test"
        })
        
        self.assertIn("error", result)

    @patch('subprocess.run')
    def test_git_commit_retrieval_limits_matches(self, mock_run):
        """Test git-commit-retrieval limits matches to 50"""
        # Create 100 fake commits
        commits = "\n".join([f"commit{i} Message {i}" for i in range(100)])
        mock_run.return_value = MagicMock(stdout=commits)
        
        result = self.compat._git_commit_retrieval({
            "information_request": "commit"
        })
        
        self.assertIn("matches", result)
        self.assertLessEqual(len(result["matches"]), 50)

    @patch('subprocess.run')
    def test_git_commit_retrieval_case_insensitive(self, mock_run):
        """Test git-commit-retrieval is case insensitive"""
        mock_run.return_value = MagicMock(
            stdout="abc123 Test Commit\n"
        )
        
        result = self.compat._git_commit_retrieval({
            "information_request": "TEST"
        })
        
        self.assertIn("matches", result)
        self.assertGreater(len(result["matches"]), 0)


if __name__ == '__main__':
    unittest.main()