"""
Comprehensive unit tests for new tools in agent/tools/builtin.py
Tests math.calc, web.get, and web.search tools
"""

import pytest
import sys
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, Mock

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from agent.tools.builtin import BuiltinTools
from agent.core.tool_registry import ToolRegistry


class TestMathCalcTool:
    """Test suite for math.calc tool"""
    
    @pytest.fixture
    def tools(self):
        """Create BuiltinTools instance"""
        registry = ToolRegistry()
        builtin = BuiltinTools(registry)
        builtin.register_all()
        return registry
    
    def test_basic_addition(self, tools):
        """Test basic addition"""
        result = tools.call("math.calc", {"expression": "2 + 3"})
        assert result == {"result": 5}
    
    def test_basic_subtraction(self, tools):
        """Test basic subtraction"""
        result = tools.call("math.calc", {"expression": "10 - 7"})
        assert result == {"result": 3}
    
    def test_basic_multiplication(self, tools):
        """Test basic multiplication"""
        result = tools.call("math.calc", {"expression": "4 * 5"})
        assert result == {"result": 20}
    
    def test_basic_division(self, tools):
        """Test basic division"""
        result = tools.call("math.calc", {"expression": "20 / 4"})
        assert result == {"result": 5.0}
    
    def test_floor_division(self, tools):
        """Test floor division"""
        result = tools.call("math.calc", {"expression": "7 // 2"})
        assert result == {"result": 3}
    
    def test_modulo(self, tools):
        """Test modulo operation"""
        result = tools.call("math.calc", {"expression": "10 % 3"})
        assert result == {"result": 1}
    
    def test_power(self, tools):
        """Test power operation"""
        result = tools.call("math.calc", {"expression": "2 ** 3"})
        assert result == {"result": 8}
    
    def test_negative_number(self, tools):
        """Test unary minus"""
        result = tools.call("math.calc", {"expression": "-5"})
        assert result == {"result": -5}
    
    def test_complex_expression(self, tools):
        """Test complex arithmetic expression"""
        result = tools.call("math.calc", {"expression": "2*(3+4)/5"})
        assert result == {"result": 2.8}
    
    def test_nested_operations(self, tools):
        """Test nested operations with parentheses"""
        result = tools.call("math.calc", {"expression": "((10 + 5) * 2) - 3"})
        assert result == {"result": 27}
    
    def test_floating_point(self, tools):
        """Test floating point calculations"""
        result = tools.call("math.calc", {"expression": "3.14 * 2"})
        assert pytest.approx(result["result"]) == 6.28
    
    def test_division_by_float(self, tools):
        """Test division resulting in float"""
        result = tools.call("math.calc", {"expression": "5 / 2"})
        assert result == {"result": 2.5}
    
    def test_expression_with_spaces(self, tools):
        """Test expression with various spacing"""
        result = tools.call("math.calc", {"expression": "  10   +   20  "})
        assert result == {"result": 30}
    
    def test_order_of_operations(self, tools):
        """Test order of operations (PEMDAS)"""
        result = tools.call("math.calc", {"expression": "2 + 3 * 4"})
        assert result == {"result": 14}
    
    def test_empty_expression(self, tools):
        """Test empty expression returns error"""
        result = tools.call("math.calc", {"expression": ""})
        assert "error" in result
        assert result["error"] == "expression is required"
    
    def test_missing_expression_key(self, tools):
        """Test missing expression key"""
        result = tools.call("math.calc", {})
        assert "error" in result
    
    def test_whitespace_only_expression(self, tools):
        """Test whitespace-only expression"""
        result = tools.call("math.calc", {"expression": "   "})
        assert "error" in result
    
    def test_invalid_syntax(self, tools):
        """Test invalid mathematical syntax"""
        result = tools.call("math.calc", {"expression": "2 +"})
        assert "error" in result
    
    def test_unsupported_operation(self, tools):
        """Test unsupported operations like function calls"""
        result = tools.call("math.calc", {"expression": "abs(-5)"})
        assert "error" in result
    
    def test_variable_names_rejected(self, tools):
        """Test that variable names are rejected"""
        result = tools.call("math.calc", {"expression": "x + 5"})
        assert "error" in result
    
    def test_string_concatenation_rejected(self, tools):
        """Test that string operations are rejected"""
        result = tools.call("math.calc", {"expression": "'hello' + 'world'"})
        assert "error" in result
    
    def test_division_by_zero(self, tools):
        """Test division by zero returns error"""
        result = tools.call("math.calc", {"expression": "10 / 0"})
        assert "error" in result
    
    def test_large_numbers(self, tools):
        """Test calculations with large numbers"""
        result = tools.call("math.calc", {"expression": "999999 * 888888"})
        assert result == {"result": 999999 * 888888}
    
    def test_negative_result(self, tools):
        """Test expression resulting in negative number"""
        result = tools.call("math.calc", {"expression": "5 - 10"})
        assert result == {"result": -5}


class TestWebGetTool:
    """Test suite for web.get tool"""
    
    @pytest.fixture
    def tools(self):
        """Create BuiltinTools instance"""
        registry = ToolRegistry()
        builtin = BuiltinTools(registry)
        builtin.register_all()
        return registry
    
    @pytest.fixture
    def mock_urlopen(self):
        """Mock urllib.request.urlopen"""
        with patch('agent.tools.builtin.urllib.request.urlopen') as mock:
            yield mock
    
    def test_basic_get_request(self, tools, mock_urlopen):
        """Test basic GET request"""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.headers = {"Content-Type": "text/html"}
        mock_response.read.return_value = b"<html>Hello</html>"
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = tools.call("web.get", {"url": "https://example.com"})
        
        assert result["status"] == 200
        assert result["body"] == "<html>Hello</html>"
        assert "Content-Type" in result["headers"]
    
    def test_get_with_custom_headers(self, tools, mock_urlopen):
        """Test GET request with custom headers"""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.headers = {}
        mock_response.read.return_value = b"Response"
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        custom_headers = {
            "User-Agent": "TestBot/1.0",
            "Accept": "application/json"
        }
        result = tools.call("web.get", {
            "url": "https://api.example.com",
            "headers": custom_headers
        })
        
        assert result["status"] == 200
    
    def test_get_with_custom_timeout(self, tools, mock_urlopen):
        """Test GET request with custom timeout"""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.headers = {}
        mock_response.read.return_value = b"Response"
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = tools.call("web.get", {
            "url": "https://example.com",
            "timeout_ms": 5000
        })
        
        assert result["status"] == 200
        # Verify timeout was passed (5000ms = 5s)
        call_kwargs = mock_urlopen.call_args[1]
        assert call_kwargs["timeout"] == 5.0
    
    def test_get_missing_url(self, tools):
        """Test GET request without URL returns error"""
        result = tools.call("web.get", {})
        assert "error" in result
        assert result["error"] == "url is required"
    
    def test_get_empty_url(self, tools):
        """Test GET request with empty URL"""
        result = tools.call("web.get", {"url": ""})
        assert "error" in result
    
    def test_get_default_timeout(self, tools, mock_urlopen):
        """Test GET request uses default timeout"""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.headers = {}
        mock_response.read.return_value = b"Response"
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        tools.call("web.get", {"url": "https://example.com"})
        
        # Default timeout is 20000ms = 20s
        call_kwargs = mock_urlopen.call_args[1]
        assert call_kwargs["timeout"] == 20.0
    
    def test_get_unicode_content(self, tools, mock_urlopen):
        """Test GET request with Unicode content"""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.headers = {}
        mock_response.read.return_value = "Hello 世界 🌍".encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = tools.call("web.get", {"url": "https://example.com"})
        
        assert "Hello 世界 🌍" in result["body"]
    
    def test_get_empty_headers(self, tools, mock_urlopen):
        """Test GET request with empty headers dict"""
        mock_response = Mock()
        mock_response.status = 200
        mock_response.headers = {}
        mock_response.read.return_value = b"Response"
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        result = tools.call("web.get", {
            "url": "https://example.com",
            "headers": {}
        })
        
        assert result["status"] == 200


class TestWebSearchTool:
    """Test suite for web.search tool"""
    
    @pytest.fixture
    def tools(self):
        """Create BuiltinTools instance"""
        registry = ToolRegistry()
        builtin = BuiltinTools(registry)
        builtin.register_all()
        return registry
    
    def test_basic_search(self, tools):
        """Test basic web search"""
        result = tools.call("web.search", {"query": "test query"})
        
        assert "results" in result
        assert isinstance(result["results"], list)
        assert len(result["results"]) == 5  # default num_results
    
    def test_search_with_custom_num_results(self, tools):
        """Test search with custom number of results"""
        result = tools.call("web.search", {
            "query": "test query",
            "num_results": 3
        })
        
        assert len(result["results"]) == 3
    
    def test_search_result_structure(self, tools):
        """Test that search results have proper structure"""
        result = tools.call("web.search", {"query": "python programming"})
        
        for i, item in enumerate(result["results"]):
            assert "title" in item
            assert "url" in item
            assert "snippet" in item
            assert item["title"] == f"Result {i+1}"
            assert item["url"] == "https://example.com"
            assert item["snippet"] == "python programming"
    
    def test_search_empty_query(self, tools):
        """Test search with empty query"""
        result = tools.call("web.search", {"query": ""})
        
        assert "results" in result
        assert len(result["results"]) == 5
    
    def test_search_no_query(self, tools):
        """Test search without query parameter"""
        result = tools.call("web.search", {})
        
        assert "results" in result
        assert result["results"][0]["snippet"] == ""
    
    def test_search_max_results_limit(self, tools):
        """Test search with results exceeding maximum"""
        result = tools.call("web.search", {
            "query": "test",
            "num_results": 20
        })
        
        # Should be capped at 10
        assert len(result["results"]) == 10
    
    def test_search_min_results_limit(self, tools):
        """Test search with zero results requested"""
        result = tools.call("web.search", {
            "query": "test",
            "num_results": 0
        })
        
        # Should return at least 1
        assert len(result["results"]) == 1
    
    def test_search_negative_num_results(self, tools):
        """Test search with negative number of results"""
        result = tools.call("web.search", {
            "query": "test",
            "num_results": -5
        })
        
        # Should return at least 1
        assert len(result["results"]) == 1
    
    def test_search_preserves_query_in_snippet(self, tools):
        """Test that query is preserved in snippet"""
        query = "artificial intelligence"
        result = tools.call("web.search", {"query": query})
        
        for item in result["results"]:
            assert item["snippet"] == query
    
    def test_search_default_num_results(self, tools):
        """Test search uses default of 5 results"""
        result = tools.call("web.search", {"query": "test"})
        
        assert len(result["results"]) == 5
    
    def test_search_special_characters_in_query(self, tools):
        """Test search with special characters in query"""
        query = "test & <query> with 'special' chars"
        result = tools.call("web.search", {"query": query})
        
        assert result["results"][0]["snippet"] == query
    
    def test_search_unicode_query(self, tools):
        """Test search with Unicode characters"""
        query = "你好世界 🌍"
        result = tools.call("web.search", {"query": query})
        
        assert result["results"][0]["snippet"] == query


class TestBuiltinToolsRegistration:
    """Test tool registration includes new tools"""
    
    def test_math_calc_registered(self):
        """Test math.calc tool is registered"""
        registry = ToolRegistry()
        builtin = BuiltinTools(registry)
        builtin.register_all()
        
        specs = registry.list_specs()
        tool_names = [spec["name"] for spec in specs]
        
        assert "math.calc" in tool_names
    
    def test_web_get_registered(self):
        """Test web.get tool is registered"""
        registry = ToolRegistry()
        builtin = BuiltinTools(registry)
        builtin.register_all()
        
        specs = registry.list_specs()
        tool_names = [spec["name"] for spec in specs]
        
        assert "web.get" in tool_names
    
    def test_web_search_registered(self):
        """Test web.search tool is registered"""
        registry = ToolRegistry()
        builtin = BuiltinTools(registry)
        builtin.register_all()
        
        specs = registry.list_specs()
        tool_names = [spec["name"] for spec in specs]
        
        assert "web.search" in tool_names
    
    def test_new_tools_have_descriptions(self):
        """Test new tools have descriptions"""
        registry = ToolRegistry()
        builtin = BuiltinTools(registry)
        builtin.register_all()
        
        specs = {spec["name"]: spec for spec in registry.list_specs()}
        
        assert len(specs["math.calc"]["description"]) > 0
        assert len(specs["web.get"]["description"]) > 0
        assert len(specs["web.search"]["description"]) > 0
    
    def test_new_tools_have_parameters(self):
        """Test new tools have parameter specifications"""
        registry = ToolRegistry()
        builtin = BuiltinTools(registry)
        builtin.register_all()
        
        specs = {spec["name"]: spec for spec in registry.list_specs()}
        
        assert "parameters" in specs["math.calc"]
        assert "expression" in specs["math.calc"]["parameters"]
        
        assert "parameters" in specs["web.get"]
        assert "url" in specs["web.get"]["parameters"]
        
        assert "parameters" in specs["web.search"]
        assert "query" in specs["web.search"]["parameters"]