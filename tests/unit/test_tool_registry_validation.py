"""
Comprehensive Unit Tests for tool registry validation
Tests _validate and get_spec methods
"""

import unittest
import sys
import os

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.tool_registry import ToolRegistry, ToolSpec


class TestToolRegistryValidation(unittest.TestCase):
    """Test suite for tool registry validation"""
    
    def test_get_spec_existing_tool(self):
        """Test getting spec for existing tool"""
        registry = ToolRegistry()
        spec = ToolSpec(
            name="test_tool",
            description="Test",
            parameters={"x": "int"},
            fn=lambda args: {"result": args["x"] * 2}
        )
        registry.register(spec)
        
        retrieved = registry.get_spec("test_tool")
        self.assertEqual(retrieved.name, "test_tool")
    
    def test_get_spec_nonexistent_tool(self):
        """Test getting spec for non-existent tool raises KeyError"""
        registry = ToolRegistry()
        
        with self.assertRaises(KeyError) as ctx:
            registry.get_spec("nonexistent")
        
        self.assertIn("Unknown tool", str(ctx.exception))
    
    def test_validate_with_no_parameters(self):
        """Test validation when tool has no parameters defined"""
        registry = ToolRegistry()
        spec = ToolSpec(
            name="test_tool",
            description="Test",
            parameters=None,
            fn=lambda _: {"ok": True}
        )
        registry.register(spec)
        
        # Should not raise error
        err = registry._validate("test_tool", {"any": "arg"})
        self.assertIsNone(err)
    
    def test_validate_with_valid_parameters(self):
        """Test validation with valid parameters"""
        registry = ToolRegistry()
        spec = ToolSpec(
            name="test_tool",
            description="Test",
            parameters={"x": "int", "y": "str"},
            fn=lambda _: {"ok": True}
        )
        registry.register(spec)
        
        # Should not raise error for valid params
        err = registry._validate("test_tool", {"x": 42, "y": "hello"})
        self.assertIsNone(err)
    
    def test_call_returns_error_on_validation_failure(self):
        """Test that call returns error dict on validation failure"""
        registry = ToolRegistry()
        spec = ToolSpec(
            name="test_tool",
            description="Test",
            parameters={"x": "int"},
            fn=lambda _: {"result": "success"}
        )
        registry.register(spec)
        
        # Call with unexpected parameter
        result = registry.call("test_tool", {"unexpected": "param"})
        
        # Should return error dict instead of raising
        self.assertIn("error", result)
    
    def test_call_executes_when_validation_passes(self):
        """Test that call executes function when validation passes"""
        registry = ToolRegistry()
        spec = ToolSpec(
            name="test_tool",
            description="Test",
            parameters={"x": "int"},
            fn=lambda args: {"result": args["x"] * 2}
        )
        registry.register(spec)
        
        result = registry.call("test_tool", {"x": 21})
        
        self.assertEqual(result["result"], 42)
    
    def test_call_still_raises_on_unknown_tool(self):
        """Test that call still raises KeyError for unknown tools"""
        registry = ToolRegistry()
        
        with self.assertRaises(KeyError):
            registry.call("nonexistent", {})


if __name__ == '__main__':
    unittest.main()