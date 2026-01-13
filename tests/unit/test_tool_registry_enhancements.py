"""
Comprehensive Unit Tests for agent/core/tool_registry.py enhancements
Tests _validate and get_spec methods
"""

import unittest
import sys
import os

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.tool_registry import ToolRegistry, ToolSpec


class TestToolRegistryValidation(unittest.TestCase):
    """Test suite for ToolRegistry._validate method"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        
        def simple_tool(_args):
            return {"result": "ok"}
        
        self.registry.register(ToolSpec(
            name="test_tool",
            description="Test tool",
            parameters={"param1": "string", "param2": "int"},
            fn=simple_tool
        ))
    
    def test_validate_valid_parameters(self):
        """Test validation passes for valid parameters"""
        result = self.registry._validate("test_tool", {"param1": "value", "param2": 123})
        
        self.assertIsNone(result)
    
    def test_validate_subset_of_parameters(self):
        """Test validation passes for subset of parameters"""
        result = self.registry._validate("test_tool", {"param1": "value"})
        
        self.assertIsNone(result)
    
    def test_validate_empty_parameters(self):
        """Test validation passes for empty parameters"""
        result = self.registry._validate("test_tool", {})
        
        self.assertIsNone(result)
    
    def test_validate_tool_without_parameters_spec(self):
        """Test validation passes when tool has no parameters spec"""
        def no_param_tool(_args):
            return {"result": "ok"}
        
        self.registry.register(ToolSpec(
            name="no_params",
            description="No params",
            fn=no_param_tool
        ))
        
        result = self.registry._validate("no_params", {"any": "value"})
        
        # Should pass since no parameters spec
        self.assertIsNone(result)


class TestToolRegistryGetSpec(unittest.TestCase):
    """Test suite for ToolRegistry.get_spec method"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        
        def test_tool(_args):
            return {"result": "ok"}
        
        self.spec = ToolSpec(
            name="test_tool",
            description="Test tool",
            parameters={"key": "value"},
            fn=test_tool,
            parallel_safe=False
        )
        
        self.registry.register(self.spec)
    
    def test_get_spec_returns_correct_spec(self):
        """Test get_spec returns the correct tool spec"""
        spec = self.registry.get_spec("test_tool")
        
        self.assertEqual(spec.name, "test_tool")
        self.assertEqual(spec.description, "Test tool")
        self.assertEqual(spec.parameters, {"key": "value"})
        self.assertFalse(spec.parallel_safe)
    
    def test_get_spec_raises_for_unknown_tool(self):
        """Test get_spec raises KeyError for unknown tool"""
        with self.assertRaises(KeyError) as context:
            self.registry.get_spec("unknown_tool")
        
        self.assertIn("Unknown tool: unknown_tool", str(context.exception))
    
    def test_get_spec_returns_same_object(self):
        """Test get_spec returns the same spec object"""
        spec1 = self.registry.get_spec("test_tool")
        spec2 = self.registry.get_spec("test_tool")
        
        self.assertIs(spec1, spec2)


class TestToolRegistryCallWithValidation(unittest.TestCase):
    """Test suite for ToolRegistry.call with validation"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.call_count = 0
        
        def counting_tool(_args):
            self.call_count += 1
            return {"result": self.call_count}
        
        self.registry.register(ToolSpec(
            name="counter",
            description="Counter tool",
            parameters={"increment": "int"},
            fn=counting_tool
        ))
    
    def test_call_executes_tool_on_valid_args(self):
        """Test call executes tool when arguments are valid"""
        result = self.registry.call("counter", {"increment": 1})
        
        self.assertEqual(result["result"], 1)
        self.assertEqual(self.call_count, 1)
    
    def test_call_executes_tool_with_empty_args(self):
        """Test call executes tool with empty arguments"""
        result = self.registry.call("counter", {})
        
        self.assertEqual(result["result"], 1)
    
    def test_call_raises_for_unknown_tool(self):
        """Test call raises KeyError for unknown tool"""
        with self.assertRaises(KeyError) as context:
            self.registry.call("unknown", {})
        
        self.assertIn("Unknown tool: unknown", str(context.exception))


class TestToolRegistryParallelSafe(unittest.TestCase):
    """Test suite for parallel_safe attribute in ToolRegistry"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        
        def parallel_tool(_args):
            return {"result": "parallel"}
        
        def sequential_tool(_args):
            return {"result": "sequential"}
        
        self.registry.register(ToolSpec(
            name="parallel",
            description="Parallel safe",
            fn=parallel_tool,
            parallel_safe=True
        ))
        
        self.registry.register(ToolSpec(
            name="sequential",
            description="Not parallel safe",
            fn=sequential_tool,
            parallel_safe=False
        ))
    
    def test_parallel_safe_in_list_specs(self):
        """Test that parallel_safe is included in list_specs"""
        specs = self.registry.list_specs()
        
        spec_dict = {s["name"]: s for s in specs}
        
        self.assertTrue(spec_dict["parallel"]["parallel_safe"])
        self.assertFalse(spec_dict["sequential"]["parallel_safe"])
    
    def test_parallel_safe_default_true(self):
        """Test that parallel_safe defaults to True"""
        def default_tool(_args):
            return {"result": "default"}
        
        self.registry.register(ToolSpec(
            name="default",
            description="Default",
            fn=default_tool
        ))
        
        spec = self.registry.get_spec("default")
        self.assertTrue(spec.parallel_safe)


if __name__ == '__main__':
    unittest.main()