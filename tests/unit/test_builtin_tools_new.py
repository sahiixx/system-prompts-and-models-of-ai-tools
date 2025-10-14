"""
Comprehensive Unit Tests for new tools in agent/tools/builtin.py
Tests math.calc, web.get, and web.search tools
"""

import unittest
import sys
import os
from unittest.mock import patch, MagicMock, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.tools.builtin import BuiltinTools
from agent.core.tool_registry import ToolRegistry


class TestMathCalcTool(unittest.TestCase):
    """Test suite for math.calc tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.tools = BuiltinTools(self.registry)
        self.tools.register_all()
    
    def test_math_calc_simple_addition(self):
        """Test simple addition"""
        result = self.registry.call("math.calc", {"expression": "2 + 3"})
        self.assertEqual(result["result"], 5)
    
    def test_math_calc_simple_subtraction(self):
        """Test simple subtraction"""
        result = self.registry.call("math.calc", {"expression": "10 - 3"})
        self.assertEqual(result["result"], 7)
    
    def test_math_calc_simple_multiplication(self):
        """Test simple multiplication"""
        result = self.registry.call("math.calc", {"expression": "4 * 5"})
        self.assertEqual(result["result"], 20)
    
    def test_math_calc_simple_division(self):
        """Test simple division"""
        result = self.registry.call("math.calc", {"expression": "15 / 3"})
        self.assertEqual(result["result"], 5.0)
    
    def test_math_calc_power(self):
        """Test power operation"""
        result = self.registry.call("math.calc", {"expression": "2 ** 3"})
        self.assertEqual(result["result"], 8)
    
    def test_math_calc_complex_expression(self):
        """Test complex expression with precedence"""
        result = self.registry.call("math.calc", {"expression": "2 * (3 + 4) / 5"})
        self.assertAlmostEqual(result["result"], 2.8, places=5)
    
    def test_math_calc_empty_expression(self):
        """Test empty expression returns error"""
        result = self.registry.call("math.calc", {"expression": ""})
        self.assertIn("error", result)
        self.assertEqual(result["error"], "expression is required")
    
    def test_math_calc_invalid_syntax(self):
        """Test invalid expression syntax"""
        result = self.registry.call("math.calc", {"expression": "2 ++ 3"})
        self.assertIn("error", result)
    
    def test_math_calc_division_by_zero_error(self):
        """Test division by zero handling"""
        result = self.registry.call("math.calc", {"expression": "5 / 0"})
        self.assertIn("error", result)



class TestWebGetTool(unittest.TestCase):
    """Test suite for web.get tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.tools = BuiltinTools(self.registry)
        self.tools.register_all()
    
    @patch('agent.tools.builtin._http_fetch')
    def test_web_get_simple_request(self, mock_fetch):
        """Test simple GET request"""
        mock_fetch.return_value = {
            "status": 200,
            "body": "Success",
            "headers": {}
        }
        
        result = self.registry.call("web.get", {"url": "https://example.com"})
        
        self.assertEqual(result["status"], 200)
        self.assertEqual(result["body"], "Success")
        mock_fetch.assert_called_once()
    
    def test_web_get_missing_url(self):
        """Test error when URL is missing"""
        result = self.registry.call("web.get", {})
        self.assertIn("error", result)
        self.assertEqual(result["error"], "url is required")


class TestWebSearchTool(unittest.TestCase):
    """Test suite for web.search tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.tools = BuiltinTools(self.registry)
        self.tools.register_all()
    
    def test_web_search_with_query(self):
        """Test web search with query string"""
        result = self.registry.call("web.search", {"query": "python programming"})
        self.assertIn("results", result)
        self.assertEqual(len(result["results"]), 5)
        
        for r in result["results"]:
            self.assertIn("title", r)
            self.assertIn("url", r)
            self.assertIn("snippet", r)
    
    def test_web_search_custom_num_results(self):
        """Test web search with custom number of results"""
        result = self.registry.call("web.search", {
            "query": "test query",
            "num_results": 3
        })
        self.assertEqual(len(result["results"]), 3)
    
    def test_web_search_large_num_results(self):
        """Test web search limits to max 10 results"""
        result = self.registry.call("web.search", {
            "query": "test",
            "num_results": 100
        })
        self.assertEqual(len(result["results"]), 10)



class TestPythonEvalTool(unittest.TestCase):
    """Test suite for python.eval tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.tools = BuiltinTools(self.registry)
        self.tools.register_all()
    
    def test_python_eval_simple_expression(self):
        """Test evaluating simple Python expression"""
        result = self.registry.call("python.eval", {"expr": "2 + 3"})
        self.assertEqual(result["result"], 5)
    
    def test_python_eval_string_operations(self):
        """Test evaluating string operations"""
        result = self.registry.call("python.eval", {"expr": "'hello' + ' world'"})
        self.assertEqual(result["result"], "hello world")
    
    def test_python_eval_list_operations(self):
        """Test evaluating list operations"""
        result = self.registry.call("python.eval", {"expr": "[1, 2, 3] + [4, 5]"})
        self.assertEqual(result["result"], [1, 2, 3, 4, 5])
    
    def test_python_eval_uses_len_builtin(self):
        """Test that len builtin is available"""
        result = self.registry.call("python.eval", {"expr": "len([1, 2, 3])"})
        self.assertEqual(result["result"], 3)
    
    def test_python_eval_uses_sum_builtin(self):
        """Test that sum builtin is available"""
        result = self.registry.call("python.eval", {"expr": "sum([1, 2, 3, 4])"})
        self.assertEqual(result["result"], 10)
    
    def test_python_eval_uses_min_builtin(self):
        """Test that min builtin is available"""
        result = self.registry.call("python.eval", {"expr": "min([5, 2, 8, 1])"})
        self.assertEqual(result["result"], 1)
    
    def test_python_eval_uses_max_builtin(self):
        """Test that max builtin is available"""
        result = self.registry.call("python.eval", {"expr": "max([5, 2, 8, 1])"})
        self.assertEqual(result["result"], 8)
    
    def test_python_eval_empty_expression(self):
        """Test error when expression is empty"""
        result = self.registry.call("python.eval", {"expr": ""})
        self.assertIn("error", result)
        self.assertEqual(result["error"], "expr is required")
    
    def test_python_eval_invalid_syntax(self):
        """Test error on invalid Python syntax"""
        result = self.registry.call("python.eval", {"expr": "2 +"})
        self.assertIn("error", result)
    
    def test_python_eval_restricted_builtins(self):
        """Test that dangerous builtins are not available"""
        result = self.registry.call("python.eval", {"expr": "open('/etc/passwd')"})
        self.assertIn("error", result)
    
    def test_python_eval_no_import(self):
        """Test that import is not available"""
        result = self.registry.call("python.eval", {"expr": "import os"})
        self.assertIn("error", result)
    
    def test_python_eval_no_exec(self):
        """Test that exec is not available"""
        result = self.registry.call("python.eval", {"expr": "exec('print(1)')"})
        self.assertIn("error", result)
    
    def test_python_eval_no_eval(self):
        """Test that nested eval is not available"""
        result = self.registry.call("python.eval", {"expr": "eval('1+1')"})
        self.assertIn("error", result)


class TestHttpFetchTool(unittest.TestCase):
    """Test suite for http.fetch tool"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.tools = BuiltinTools(self.registry)
        self.tools.register_all()
    
    @patch('agent.tools.builtin._http_fetch')
    def test_http_fetch_get_request(self, mock_fetch):
        """Test HTTP GET request"""
        mock_fetch.return_value = {
            "status": 200,
            "body": "Success",
            "headers": {"Content-Type": "text/html"}
        }
        
        result = self.registry.call("http.fetch", {
            "url": "https://example.com",
            "method": "GET"
        })
        
        self.assertEqual(result["status"], 200)
        self.assertEqual(result["body"], "Success")
        mock_fetch.assert_called_once()
    
    @patch('agent.tools.builtin._http_fetch')
    def test_http_fetch_post_request(self, mock_fetch):
        """Test HTTP POST request with body"""
        mock_fetch.return_value = {
            "status": 201,
            "body": "Created",
            "headers": {}
        }
        
        result = self.registry.call("http.fetch", {
            "url": "https://api.example.com/data",
            "method": "POST",
            "body": '{"key": "value"}',
            "headers": {"Content-Type": "application/json"}
        })
        
        self.assertEqual(result["status"], 201)
        call_kwargs = mock_fetch.call_args[1]
        self.assertEqual(call_kwargs['method'], "POST")
        self.assertEqual(call_kwargs['body'], '{"key": "value"}')
    
    def test_http_fetch_missing_url(self):
        """Test error when URL is missing"""
        result = self.registry.call("http.fetch", {})
        self.assertIn("error", result)
        self.assertEqual(result["error"], "url is required")
    
    @patch('agent.tools.builtin._http_fetch')
    def test_http_fetch_custom_timeout(self, mock_fetch):
        """Test HTTP fetch with custom timeout"""
        mock_fetch.return_value = {"status": 200, "body": "OK", "headers": {}}
        
        self.registry.call("http.fetch", {
            "url": "https://example.com",
            "timeout_ms": 5000
        })
        
        call_kwargs = mock_fetch.call_args[1]
        self.assertEqual(call_kwargs['timeout'], 5000)
if __name__ == '__main__':
    unittest.main()