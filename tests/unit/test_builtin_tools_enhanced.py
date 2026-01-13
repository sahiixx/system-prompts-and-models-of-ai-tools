"""
Enhanced Unit Tests for agent/tools/builtin.py
Tests shell, fs.read, and fs.write tools that were missing coverage
"""

import unittest
import sys
import os
import tempfile
import shutil
from unittest.mock import patch, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.tools.builtin import BuiltinTools
from agent.core.tool_registry import ToolRegistry


class TestShellTool(unittest.TestCase):
    """Test suite for 'shell' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.tools = BuiltinTools(self.registry)
        self.tools.register_all()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    @patch('agent.tools.builtin._run_shell')
    def test_shell_simple_command(self, mock_run_shell):
        """Test executing simple shell command"""
        from agent.tools.builtin import CommandResult
        mock_run_shell.return_value = CommandResult(
            code=0,
            stdout="hello world",
            stderr=""
        )
        
        result = self.registry.call("shell", {"command": "echo hello world"})
        
        self.assertEqual(result["code"], 0)
        self.assertEqual(result["stdout"], "hello world")
        self.assertEqual(result["stderr"], "")
    
    @patch('agent.tools.builtin._run_shell')
    def test_shell_command_with_error(self, mock_run_shell):
        """Test shell command that returns error"""
        from agent.tools.builtin import CommandResult
        mock_run_shell.return_value = CommandResult(
            code=1,
            stdout="",
            stderr="command not found"
        )
        
        result = self.registry.call("shell", {"command": "nonexistent_cmd"})
        
        self.assertEqual(result["code"], 1)
        self.assertIn("command not found", result["stderr"])
    
    @patch('agent.tools.builtin._run_shell')
    def test_shell_with_custom_timeout(self, mock_run_shell):
        """Test shell command with custom timeout"""
        from agent.tools.builtin import CommandResult
        mock_run_shell.return_value = CommandResult(code=0, stdout="ok", stderr="")
        
        self.registry.call("shell", {
            "command": "sleep 5",
            "timeout_ms": 10000
        })
        
        call_kwargs = mock_run_shell.call_args[1]
        self.assertEqual(call_kwargs['timeout'], 10000)
    
    @patch('agent.tools.builtin._run_shell')
    def test_shell_with_custom_cwd(self, mock_run_shell):
        """Test shell command with custom working directory"""
        from agent.tools.builtin import CommandResult
        mock_run_shell.return_value = CommandResult(code=0, stdout="", stderr="")
        
        self.registry.call("shell", {
            "command": "ls",
            "cwd": self.temp_dir
        })
        
        call_kwargs = mock_run_shell.call_args[1]
        self.assertEqual(call_kwargs['cwd'], self.temp_dir)
    
    def test_shell_missing_command(self):
        """Test shell tool without command parameter"""
        result = self.registry.call("shell", {})
        
        self.assertIn("error", result)
        self.assertEqual(result["error"], "command is required")
    
    def test_shell_empty_command(self):
        """Test shell tool with empty command"""
        result = self.registry.call("shell", {"command": ""})
        
        self.assertIn("error", result)
        self.assertEqual(result["error"], "command is required")
    
    @patch('agent.tools.builtin._run_shell')
    def test_shell_timeout_error(self, mock_run_shell):
        """Test shell command that times out"""
        from agent.tools.builtin import CommandResult
        mock_run_shell.return_value = CommandResult(
            code=124,
            stdout="partial output",
            stderr="TIMEOUT"
        )
        
        result = self.registry.call("shell", {
            "command": "sleep 100",
            "timeout_ms": 1000
        })
        
        self.assertEqual(result["code"], 124)
        self.assertIn("TIMEOUT", result["stderr"])


class TestFsReadTool(unittest.TestCase):
    """Test suite for 'fs.read' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.tools = BuiltinTools(self.registry)
        self.tools.register_all()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_fs_read_simple_file(self):
        """Test reading a simple text file"""
        test_file = os.path.join(self.temp_dir, "test.txt")
        content = "Hello, World!\nThis is a test file."
        with open(test_file, 'w') as f:
            f.write(content)
        
        result = self.registry.call("fs.read", {"path": test_file})
        
        self.assertIn("content", result)
        self.assertEqual(result["content"], content)
    
    def test_fs_read_with_offset(self):
        """Test reading file with offset"""
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("0123456789")
        
        result = self.registry.call("fs.read", {
            "path": test_file,
            "offset": 5
        })
        
        self.assertEqual(result["content"], "56789")
    
    def test_fs_read_with_limit(self):
        """Test reading file with limit"""
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("0123456789")
        
        result = self.registry.call("fs.read", {
            "path": test_file,
            "limit": 5
        })
        
        self.assertEqual(result["content"], "01234")
    
    def test_fs_read_with_offset_and_limit(self):
        """Test reading file with both offset and limit"""
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("0123456789")
        
        result = self.registry.call("fs.read", {
            "path": test_file,
            "offset": 3,
            "limit": 4
        })
        
        self.assertEqual(result["content"], "3456")
    
    def test_fs_read_nonexistent_file(self):
        """Test reading non-existent file"""
        result = self.registry.call("fs.read", {
            "path": "/nonexistent/file.txt"
        })
        
        self.assertIn("error", result)
        self.assertIn("file not found", result["error"])
    
    def test_fs_read_missing_path(self):
        """Test fs.read without path parameter"""
        result = self.registry.call("fs.read", {})
        
        self.assertIn("error", result)
        self.assertIn("file not found", result["error"])
    
    def test_fs_read_empty_file(self):
        """Test reading empty file"""
        test_file = os.path.join(self.temp_dir, "empty.txt")
        open(test_file, 'w').close()
        
        result = self.registry.call("fs.read", {"path": test_file})
        
        self.assertIn("content", result)
        self.assertEqual(result["content"], "")
    
    def test_fs_read_large_file_with_limit(self):
        """Test reading large file with limit"""
        test_file = os.path.join(self.temp_dir, "large.txt")
        large_content = "A" * 10000
        with open(test_file, 'w') as f:
            f.write(large_content)
        
        result = self.registry.call("fs.read", {
            "path": test_file,
            "limit": 100
        })
        
        self.assertEqual(len(result["content"]), 100)
        self.assertEqual(result["content"], "A" * 100)
    
    def test_fs_read_multiline_file(self):
        """Test reading multiline file"""
        test_file = os.path.join(self.temp_dir, "multiline.txt")
        content = "Line 1\nLine 2\nLine 3\n"
        with open(test_file, 'w') as f:
            f.write(content)
        
        result = self.registry.call("fs.read", {"path": test_file})
        
        self.assertEqual(result["content"], content)
        self.assertIn("\n", result["content"])
    
    def test_fs_read_unicode_content(self):
        """Test reading file with unicode content"""
        test_file = os.path.join(self.temp_dir, "unicode.txt")
        content = "Hello 世界 🌍"
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        result = self.registry.call("fs.read", {"path": test_file})
        
        self.assertIn("content", result)
        self.assertIn("世界", result["content"])


class TestFsWriteTool(unittest.TestCase):
    """Test suite for 'fs.write' tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.tools = BuiltinTools(self.registry)
        self.tools.register_all()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_fs_write_new_file(self):
        """Test writing to a new file"""
        test_file = os.path.join(self.temp_dir, "new.txt")
        content = "Hello, World!"
        
        result = self.registry.call("fs.write", {
            "path": test_file,
            "content": content
        })
        
        self.assertIn("ok", result)
        self.assertTrue(result["ok"])
        self.assertEqual(result["bytes"], len(content))
        
        with open(test_file, 'r') as f:
            self.assertEqual(f.read(), content)
    
    def test_fs_write_overwrite_existing(self):
        """Test overwriting existing file"""
        test_file = os.path.join(self.temp_dir, "existing.txt")
        with open(test_file, 'w') as f:
            f.write("old content")
        
        new_content = "new content"
        result = self.registry.call("fs.write", {
            "path": test_file,
            "content": new_content
        })
        
        self.assertTrue(result["ok"])
        
        with open(test_file, 'r') as f:
            self.assertEqual(f.read(), new_content)
    
    def test_fs_write_empty_content(self):
        """Test writing empty content"""
        test_file = os.path.join(self.temp_dir, "empty.txt")
        
        result = self.registry.call("fs.write", {
            "path": test_file,
            "content": ""
        })
        
        self.assertTrue(result["ok"])
        self.assertEqual(result["bytes"], 0)
        
        with open(test_file, 'r') as f:
            self.assertEqual(f.read(), "")
    
    def test_fs_write_creates_directories(self):
        """Test that fs.write creates parent directories"""
        nested_file = os.path.join(self.temp_dir, "a", "b", "c", "file.txt")
        
        result = self.registry.call("fs.write", {
            "path": nested_file,
            "content": "nested content"
        })
        
        self.assertTrue(result["ok"])
        self.assertTrue(os.path.exists(nested_file))
    
    def test_fs_write_missing_path(self):
        """Test fs.write without path parameter"""
        result = self.registry.call("fs.write", {"content": "test"})
        
        self.assertIn("error", result)
        self.assertEqual(result["error"], "path is required")
    
    def test_fs_write_multiline_content(self):
        """Test writing multiline content"""
        test_file = os.path.join(self.temp_dir, "multiline.txt")
        content = "Line 1\nLine 2\nLine 3\n"
        
        result = self.registry.call("fs.write", {
            "path": test_file,
            "content": content
        })
        
        self.assertTrue(result["ok"])
        
        with open(test_file, 'r') as f:
            self.assertEqual(f.read(), content)
    
    def test_fs_write_unicode_content(self):
        """Test writing unicode content"""
        test_file = os.path.join(self.temp_dir, "unicode.txt")
        content = "Hello 世界 🌍"
        
        result = self.registry.call("fs.write", {
            "path": test_file,
            "content": content
        })
        
        self.assertTrue(result["ok"])
        
        with open(test_file, 'r', encoding='utf-8') as f:
            self.assertEqual(f.read(), content)
    
    def test_fs_write_large_content(self):
        """Test writing large content"""
        test_file = os.path.join(self.temp_dir, "large.txt")
        content = "A" * 100000
        
        result = self.registry.call("fs.write", {
            "path": test_file,
            "content": content
        })
        
        self.assertTrue(result["ok"])
        self.assertEqual(result["bytes"], 100000)
    
    def test_fs_write_special_characters(self):
        """Test writing content with special characters"""
        test_file = os.path.join(self.temp_dir, "special.txt")
        content = "Special: <>\"'&\n\t\r"
        
        result = self.registry.call("fs.write", {
            "path": test_file,
            "content": content
        })
        
        self.assertTrue(result["ok"])
        
        with open(test_file, 'r') as f:
            self.assertEqual(f.read(), content)


class TestBuiltinToolsRegistration(unittest.TestCase):
    """Test suite for BuiltinTools registration"""
    
    def test_all_tools_registered(self):
        """Test that all builtin tools are registered"""
        registry = ToolRegistry()
        tools = BuiltinTools(registry)
        tools.register_all()
        
        expected_tools = [
            "shell", "math.calc", "fs.read", "fs.write",
            "http.fetch", "web.get", "web.search", "python.eval"
        ]
        
        registered = [spec["name"] for spec in registry.list_specs()]
        
        for tool in expected_tools:
            self.assertIn(tool, registered, f"Tool '{tool}' not registered")
    
    def test_shell_tool_not_parallel_safe(self):
        """Test that shell tool is marked as not parallel safe"""
        registry = ToolRegistry()
        tools = BuiltinTools(registry)
        tools.register_all()
        
        spec = registry.get_spec("shell")
        self.assertFalse(spec.parallel_safe)
    
    def test_other_tools_parallel_safe(self):
        """Test that other tools are parallel safe by default"""
        registry = ToolRegistry()
        tools = BuiltinTools(registry)
        tools.register_all()
        
        for tool_name in ["math.calc", "fs.read", "web.search"]:
            spec = registry.get_spec(tool_name)
            self.assertTrue(spec.parallel_safe)


if __name__ == '__main__':
    unittest.main()