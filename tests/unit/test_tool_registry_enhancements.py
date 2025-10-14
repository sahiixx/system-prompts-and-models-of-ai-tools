"""
Unit Tests for agent/core/tool_registry.py new methods
Tests for _validate() and get_spec() methods
"""

import unittest
import sys
import os

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.tool_registry import ToolRegistry, ToolSpec


class TestToolRegistryGetSpec(unittest.TestCase):
    """Test suite for ToolRegistry.get_spec()"""
    
    def test_get_spec_existing_tool(self):
        """Test getting spec for existing tool"""
        registry = ToolRegistry()
        
        def mock_fn(_args):
            return {"result": "ok"}
        
        spec = ToolSpec(name="test_tool", description="Test", fn=mock_fn)
        registry.register(spec)
        
        retrieved = registry.get_spec("test_tool")
        
        self.assertEqual(retrieved.name, "test_tool")
        self.assertEqual(retrieved.description, "Test")
    
    def test_get_spec_nonexistent_tool(self):
        """Test getting spec for non-existent tool raises KeyError"""
        registry = ToolRegistry()
        
        with self.assertRaises(KeyError) as context:
            registry.get_spec("nonexistent")
        
        self.assertIn("Unknown tool", str(context.exception))


class TestToolRegistryValidate(unittest.TestCase):
    """Test suite for ToolRegistry._validate()"""
    
    def test_validate_with_no_parameters(self):
        """Test validation when tool has no parameter schema"""
        registry = ToolRegistry()
        
        def mock_fn(_args):
            return {"result": "ok"}
        
        spec = ToolSpec(name="test_tool", description="Test", fn=mock_fn, parameters=None)
        registry.register(spec)
        
        # Should return None (no error)
        error = registry._validate("test_tool", {"any": "arg"})
        self.assertIsNone(error)
    
    def test_validate_with_dict_parameters(self):
        """Test validation when parameters is a dict (flexible schema)"""
        registry = ToolRegistry()
        
        def mock_fn(_args):
            return {"result": "ok"}
        
        spec = ToolSpec(
            name="test_tool",
            description="Test",
            fn=mock_fn,
            parameters={"type": "object", "properties": {"key": "string"}}
        )
        registry.register(spec)
        
        # Dict parameters allow flexible validation
        error = registry._validate("test_tool", {"key": "value"})
        self.assertIsNone(error)


class TestToolRegistryCallWithValidation(unittest.TestCase):
    """Test suite for ToolRegistry.call() with validation"""
    
    def test_call_returns_error_on_validation_failure(self):
        """Test that call returns error dict when validation fails"""
        registry = ToolRegistry()
        
        def mock_fn(_args):
            return {"result": "ok"}
        
        # Create tool with non-dict, non-None parameters to trigger validation
        
        spec = ToolSpec(
            name="test_tool",
            description="Test",
            fn=mock_fn,
            parameters="simple_string_schema"  # Non-dict, non-None triggers validation
        )
        registry.register(spec)
        
        # This should trigger validation error
        result = registry.call("test_tool", {"unexpected_key": "value"})
        
        # Should return error dict
        self.assertIn("error", result)


if __name__ == '__main__':
    unittest.main()