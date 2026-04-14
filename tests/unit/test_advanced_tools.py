"""
Comprehensive Unit Tests for agent/tools/advanced.py
Tests AdvancedTools: vector store, code sandbox, and memory functionality
"""

import unittest
import sys
import os
from unittest.mock import patch, Mock, MagicMock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.tool_registry import ToolRegistry
from agent.tools.advanced import AdvancedTools, _vector_collections, _memory_store


class TestAdvancedToolsRegistration(unittest.TestCase):
    """Test suite for AdvancedTools registration"""

    def setUp(self):
        self.registry = ToolRegistry()
        AdvancedTools(self.registry).register_all()

    def test_all_tools_registered(self):
        """Test that all 6 tools are registered correctly"""
        specs = self.registry.list_specs()
        names = [s["name"] for s in specs]

        expected = [
            "vector_store.add",
            "vector_store.query",
            "code_sandbox.run",
            "memory.store",
            "memory.recall",
            "memory.list",
        ]
        for name in expected:
            self.assertIn(name, names)

    def test_tool_count(self):
        """Test the correct number of tools are registered"""
        specs = self.registry.list_specs()
        self.assertEqual(len(specs), 6)

    def test_tools_have_descriptions(self):
        """Test all tools have non-empty descriptions"""
        specs = self.registry.list_specs()
        for spec in specs:
            self.assertTrue(spec["description"], f"Tool {spec['name']} has no description")


class TestVectorStoreAdd(unittest.TestCase):
    """Test suite for vector_store.add tool"""

    def setUp(self):
        self.registry = ToolRegistry()
        AdvancedTools(self.registry).register_all()
        # Clear global state
        _vector_collections.clear()

    def tearDown(self):
        _vector_collections.clear()

    def test_add_document(self):
        """Test adding a document to the vector store"""
        result = self.registry.call("vector_store.add", {
            "collection": "test_col",
            "text": "Hello world",
        })

        self.assertTrue(result.get("ok"))
        self.assertEqual(result["collection"], "test_col")
        self.assertEqual(result["size"], 1)

    def test_add_document_default_collection(self):
        """Test adding a document to default collection"""
        result = self.registry.call("vector_store.add", {
            "text": "Hello world",
        })

        self.assertTrue(result.get("ok"))
        self.assertEqual(result["collection"], "default")

    def test_add_empty_text_error(self):
        """Test that adding empty text returns an error"""
        result = self.registry.call("vector_store.add", {
            "collection": "test_col",
            "text": "",
        })

        self.assertIn("error", result)
        self.assertIn("text is required", result["error"])

    def test_add_with_metadata(self):
        """Test adding a document with metadata"""
        result = self.registry.call("vector_store.add", {
            "collection": "test_col",
            "text": "Test document",
            "metadata": {"source": "unit_test", "id": 1},
        })

        self.assertTrue(result.get("ok"))
        self.assertEqual(result["size"], 1)

    def test_add_multiple_documents(self):
        """Test adding multiple documents increments size"""
        self.registry.call("vector_store.add", {
            "collection": "test_col", "text": "Document 1"
        })
        result = self.registry.call("vector_store.add", {
            "collection": "test_col", "text": "Document 2"
        })

        self.assertEqual(result["size"], 2)


class TestVectorStoreQuery(unittest.TestCase):
    """Test suite for vector_store.query tool"""

    def setUp(self):
        self.registry = ToolRegistry()
        AdvancedTools(self.registry).register_all()
        _vector_collections.clear()

    def tearDown(self):
        _vector_collections.clear()

    def test_query_returns_relevant_results(self):
        """Test querying returns results ranked by similarity"""
        self.registry.call("vector_store.add", {
            "collection": "docs", "text": "python programming language"
        })
        self.registry.call("vector_store.add", {
            "collection": "docs", "text": "java programming language"
        })
        self.registry.call("vector_store.add", {
            "collection": "docs", "text": "cooking recipes"
        })

        result = self.registry.call("vector_store.query", {
            "collection": "docs",
            "query": "python programming",
        })

        self.assertIn("results", result)
        results = result["results"]
        self.assertTrue(len(results) > 0)
        # First result should be the python doc (highest similarity)
        self.assertIn("python", results[0]["text"])

    def test_query_empty_collection(self):
        """Test querying an empty collection"""
        result = self.registry.call("vector_store.query", {
            "collection": "nonexistent",
            "query": "test",
        })

        self.assertIn("results", result)
        self.assertEqual(result["results"], [])
        self.assertIn("empty", result.get("message", ""))

    def test_query_top_k_limiting(self):
        """Test that top_k limits the number of results"""
        for i in range(10):
            self.registry.call("vector_store.add", {
                "collection": "docs", "text": f"document number {i} about testing"
            })

        result = self.registry.call("vector_store.query", {
            "collection": "docs",
            "query": "testing document",
            "top_k": 3,
        })

        self.assertLessEqual(len(result["results"]), 3)

    def test_query_empty_query_error(self):
        """Test that querying with empty query returns an error"""
        result = self.registry.call("vector_store.query", {
            "collection": "docs",
            "query": "",
        })

        self.assertIn("error", result)

    def test_query_default_collection(self):
        """Test querying default collection"""
        self.registry.call("vector_store.add", {"text": "hello world"})
        result = self.registry.call("vector_store.query", {"query": "hello"})

        self.assertIn("results", result)
        self.assertTrue(len(result["results"]) > 0)


class TestCodeSandboxRun(unittest.TestCase):
    """Test suite for code_sandbox.run tool"""

    def setUp(self):
        self.registry = ToolRegistry()
        AdvancedTools(self.registry).register_all()

    @patch('agent.tools.advanced.subprocess.run')
    @patch('agent.tools.advanced.tempfile.mkstemp')
    @patch('agent.tools.advanced.os.fdopen')
    @patch('agent.tools.advanced.os.unlink')
    def test_python_execution(self, mock_unlink, mock_fdopen, mock_mkstemp, mock_run):
        """Test Python code execution"""
        mock_mkstemp.return_value = (5, "/fake/tmp/code.py")
        mock_fdopen.return_value.__enter__ = Mock()
        mock_fdopen.return_value.__exit__ = Mock(return_value=False)

        mock_proc = Mock()
        mock_proc.returncode = 0
        mock_proc.stdout = "Hello World\n"
        mock_proc.stderr = ""
        mock_run.return_value = mock_proc

        result = self.registry.call("code_sandbox.run", {
            "language": "python",
            "code": "print('Hello World')",
        })

        self.assertEqual(result["exit_code"], 0)
        self.assertEqual(result["stdout"], "Hello World\n")
        self.assertEqual(result["stderr"], "")

    @patch('agent.tools.advanced.subprocess.run')
    @patch('agent.tools.advanced.tempfile.mkstemp')
    @patch('agent.tools.advanced.os.fdopen')
    @patch('agent.tools.advanced.os.unlink')
    def test_javascript_execution(self, mock_unlink, mock_fdopen, mock_mkstemp, mock_run):
        """Test JavaScript code execution"""
        mock_mkstemp.return_value = (5, "/fake/tmp/code.js")
        mock_fdopen.return_value.__enter__ = Mock()
        mock_fdopen.return_value.__exit__ = Mock(return_value=False)

        mock_proc = Mock()
        mock_proc.returncode = 0
        mock_proc.stdout = "42\n"
        mock_proc.stderr = ""
        mock_run.return_value = mock_proc

        result = self.registry.call("code_sandbox.run", {
            "language": "javascript",
            "code": "console.log(42)",
        })

        self.assertEqual(result["exit_code"], 0)

    @patch('agent.tools.advanced.subprocess.run')
    @patch('agent.tools.advanced.tempfile.mkstemp')
    @patch('agent.tools.advanced.os.fdopen')
    @patch('agent.tools.advanced.os.unlink')
    def test_bash_execution(self, mock_unlink, mock_fdopen, mock_mkstemp, mock_run):
        """Test Bash code execution"""
        mock_mkstemp.return_value = (5, "/fake/tmp/code.sh")
        mock_fdopen.return_value.__enter__ = Mock()
        mock_fdopen.return_value.__exit__ = Mock(return_value=False)

        mock_proc = Mock()
        mock_proc.returncode = 0
        mock_proc.stdout = "hello\n"
        mock_proc.stderr = ""
        mock_run.return_value = mock_proc

        result = self.registry.call("code_sandbox.run", {
            "language": "bash",
            "code": "echo hello",
        })

        self.assertEqual(result["exit_code"], 0)

    @patch('agent.tools.advanced.subprocess.run')
    @patch('agent.tools.advanced.tempfile.mkstemp')
    @patch('agent.tools.advanced.os.fdopen')
    @patch('agent.tools.advanced.os.unlink')
    def test_timeout(self, mock_unlink, mock_fdopen, mock_mkstemp, mock_run):
        """Test code execution timeout"""
        mock_mkstemp.return_value = (5, "/fake/tmp/code.py")
        mock_fdopen.return_value.__enter__ = Mock()
        mock_fdopen.return_value.__exit__ = Mock(return_value=False)

        import subprocess
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="python", timeout=5)

        result = self.registry.call("code_sandbox.run", {
            "language": "python",
            "code": "while True: pass",
            "timeout_seconds": 5,
        })

        self.assertIn("error", result)
        self.assertIn("timed out", result["error"])

    def test_unsupported_language(self):
        """Test unsupported language error"""
        result = self.registry.call("code_sandbox.run", {
            "language": "rust",
            "code": "fn main() {}",
        })

        self.assertIn("error", result)
        self.assertIn("unsupported language", result["error"])
        self.assertIn("rust", result["error"])

    @patch('agent.tools.advanced.subprocess.run')
    @patch('agent.tools.advanced.tempfile.mkstemp')
    @patch('agent.tools.advanced.os.fdopen')
    @patch('agent.tools.advanced.os.unlink')
    def test_error_capture(self, mock_unlink, mock_fdopen, mock_mkstemp, mock_run):
        """Test that stderr is captured on error"""
        mock_mkstemp.return_value = (5, "/fake/tmp/code.py")
        mock_fdopen.return_value.__enter__ = Mock()
        mock_fdopen.return_value.__exit__ = Mock(return_value=False)

        mock_proc = Mock()
        mock_proc.returncode = 1
        mock_proc.stdout = ""
        mock_proc.stderr = "NameError: name 'x' is not defined"
        mock_run.return_value = mock_proc

        result = self.registry.call("code_sandbox.run", {
            "language": "python",
            "code": "print(x)",
        })

        self.assertEqual(result["exit_code"], 1)
        self.assertIn("NameError", result["stderr"])

    def test_empty_code_error(self):
        """Test that empty code returns an error"""
        result = self.registry.call("code_sandbox.run", {
            "language": "python",
            "code": "",
        })

        self.assertIn("error", result)
        self.assertIn("code is required", result["error"])

    @patch('agent.tools.advanced.subprocess.run')
    @patch('agent.tools.advanced.tempfile.mkstemp')
    @patch('agent.tools.advanced.os.fdopen')
    @patch('agent.tools.advanced.os.unlink')
    def test_runtime_not_found(self, mock_unlink, mock_fdopen, mock_mkstemp, mock_run):
        """Test handling of missing runtime"""
        mock_mkstemp.return_value = (5, "/fake/tmp/code.js")
        mock_fdopen.return_value.__enter__ = Mock()
        mock_fdopen.return_value.__exit__ = Mock(return_value=False)
        mock_run.side_effect = FileNotFoundError("node not found")

        result = self.registry.call("code_sandbox.run", {
            "language": "javascript",
            "code": "console.log(1)",
        })

        self.assertIn("error", result)
        self.assertIn("runtime not found", result["error"])


class TestMemoryStore(unittest.TestCase):
    """Test suite for memory.store tool"""

    def setUp(self):
        self.registry = ToolRegistry()
        AdvancedTools(self.registry).register_all()
        _memory_store.clear()

    def tearDown(self):
        _memory_store.clear()

    def test_store_key_value(self):
        """Test storing a key-value pair"""
        result = self.registry.call("memory.store", {
            "key": "test_key",
            "value": "test_value",
        })

        self.assertTrue(result.get("ok"))
        self.assertEqual(result["key"], "test_key")
        self.assertEqual(result["namespace"], "default")

    def test_store_with_namespace(self):
        """Test storing with a custom namespace"""
        result = self.registry.call("memory.store", {
            "key": "mykey",
            "value": "myvalue",
            "namespace": "custom_ns",
        })

        self.assertTrue(result.get("ok"))
        self.assertEqual(result["namespace"], "custom_ns")

    def test_store_empty_key_error(self):
        """Test that empty key returns an error"""
        result = self.registry.call("memory.store", {
            "key": "",
            "value": "test",
        })

        self.assertIn("error", result)
        self.assertIn("key is required", result["error"])

    def test_store_overwrites_existing(self):
        """Test that storing with same key overwrites"""
        self.registry.call("memory.store", {"key": "k", "value": "v1"})
        self.registry.call("memory.store", {"key": "k", "value": "v2"})

        result = self.registry.call("memory.recall", {"key": "k"})
        self.assertEqual(result["value"], "v2")


class TestMemoryRecall(unittest.TestCase):
    """Test suite for memory.recall tool"""

    def setUp(self):
        self.registry = ToolRegistry()
        AdvancedTools(self.registry).register_all()
        _memory_store.clear()

    def tearDown(self):
        _memory_store.clear()

    def test_recall_existing_key(self):
        """Test recalling an existing key"""
        self.registry.call("memory.store", {"key": "greeting", "value": "hello"})

        result = self.registry.call("memory.recall", {"key": "greeting"})

        self.assertEqual(result["value"], "hello")
        self.assertEqual(result["key"], "greeting")
        self.assertEqual(result["namespace"], "default")

    def test_recall_missing_key_error(self):
        """Test that recalling a missing key returns an error"""
        result = self.registry.call("memory.recall", {"key": "nonexistent"})

        self.assertIn("error", result)
        self.assertIn("not found", result["error"])

    def test_recall_empty_key_error(self):
        """Test that recalling with empty key returns an error"""
        result = self.registry.call("memory.recall", {"key": ""})

        self.assertIn("error", result)

    def test_recall_with_namespace(self):
        """Test recalling from a specific namespace"""
        self.registry.call("memory.store", {
            "key": "k", "value": "v", "namespace": "ns1"
        })

        result = self.registry.call("memory.recall", {"key": "k", "namespace": "ns1"})
        self.assertEqual(result["value"], "v")

    def test_recall_wrong_namespace_error(self):
        """Test recalling from wrong namespace"""
        self.registry.call("memory.store", {
            "key": "k", "value": "v", "namespace": "ns1"
        })

        result = self.registry.call("memory.recall", {"key": "k", "namespace": "ns2"})
        self.assertIn("error", result)


class TestMemoryList(unittest.TestCase):
    """Test suite for memory.list tool"""

    def setUp(self):
        self.registry = ToolRegistry()
        AdvancedTools(self.registry).register_all()
        _memory_store.clear()

    def tearDown(self):
        _memory_store.clear()

    def test_list_keys(self):
        """Test listing keys in a namespace"""
        self.registry.call("memory.store", {"key": "a", "value": "1"})
        self.registry.call("memory.store", {"key": "b", "value": "2"})
        self.registry.call("memory.store", {"key": "c", "value": "3"})

        result = self.registry.call("memory.list", {})

        self.assertEqual(result["namespace"], "default")
        self.assertEqual(sorted(result["keys"]), ["a", "b", "c"])

    def test_list_empty_namespace(self):
        """Test listing keys in an empty namespace"""
        result = self.registry.call("memory.list", {"namespace": "empty_ns"})

        self.assertEqual(result["namespace"], "empty_ns")
        self.assertEqual(result["keys"], [])

    def test_list_specific_namespace(self):
        """Test listing keys for a specific namespace"""
        self.registry.call("memory.store", {
            "key": "x", "value": "1", "namespace": "myns"
        })
        self.registry.call("memory.store", {
            "key": "y", "value": "2", "namespace": "myns"
        })
        self.registry.call("memory.store", {
            "key": "z", "value": "3", "namespace": "other"
        })

        result = self.registry.call("memory.list", {"namespace": "myns"})

        self.assertEqual(sorted(result["keys"]), ["x", "y"])


if __name__ == '__main__':
    unittest.main()
