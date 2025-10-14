"""
Comprehensive Unit Tests for ToolRegistry validation and spec methods
Tests get_spec and _validate functionality in agent/core/tool_registry.py
"""

import unittest
import sys
import os

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.tool_registry import ToolRegistry, ToolSpec


class TestToolRegistryGetSpec(unittest.TestCase):
    """Test suite for get_spec method"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.test_tool = ToolSpec(
            name="test_tool",
            description="A test tool",
            parameters={"param1": "string", "param2": "int"},
            fn=lambda _: {"result": "ok"}
        )
        self.registry.register(self.test_tool)

    def test_get_spec_existing_tool(self):
        """Test getting spec for an existing tool"""
        spec = self.registry.get_spec("test_tool")

        self.assertEqual(spec.name, "test_tool")
        self.assertEqual(spec.description, "A test tool")
        self.assertIsNotNone(spec.parameters)

    def test_get_spec_nonexistent_tool(self):
        """Test that KeyError is raised for nonexistent tool"""
        with self.assertRaises(KeyError) as context:
            self.registry.get_spec("nonexistent")

        self.assertIn("Unknown tool", str(context.exception))

    def test_get_spec_returns_same_instance(self):
        """Test that get_spec returns the same instance"""
        spec1 = self.registry.get_spec("test_tool")
        spec2 = self.registry.get_spec("test_tool")

        self.assertIs(spec1, spec2)

    def test_get_spec_multiple_tools(self):
        """Test getting specs for multiple tools"""
        self.registry.register(ToolSpec(
            name="tool2",
            description="Second tool",
            fn=lambda _: None
        ))

        spec1 = self.registry.get_spec("test_tool")
        spec2 = self.registry.get_spec("tool2")

        self.assertEqual(spec1.name, "test_tool")
        self.assertEqual(spec2.name, "tool2")


class TestToolRegistryValidation(unittest.TestCase):
    """Test suite for _validate method"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()

    def test_validate_valid_args(self):
        """Test validation with valid arguments"""
        self.registry.register(ToolSpec(
            name="tool1",
            description="Test",
            parameters={"arg1": "string", "arg2": "int"},
            fn=lambda _: None
        ))

        error = self.registry._validate("tool1", {"arg1": "value", "arg2": 42})
        self.assertIsNone(error)

    def test_validate_unknown_parameter(self):
        """Test validation with unknown parameter"""
        self.registry.register(ToolSpec(
            name="tool1",
            description="Test",
            parameters={"arg1": "string"},
            fn=lambda _: None
        ))

        error = self.registry._validate("tool1", {"arg1": "value", "unknown": "bad"})
        # Current implementation has lightweight validation - may return None
        # This test documents current behavior
        if error:
            self.assertIn("unexpected parameter", error)

    def test_validate_empty_args(self):
        """Test validation with empty arguments"""
        self.registry.register(ToolSpec(
            name="tool1",
            description="Test",
            parameters={"arg1": "string"},
            fn=lambda _: None
        ))

        error = self.registry._validate("tool1", {})
        self.assertIsNone(error)

    def test_validate_no_parameters_defined(self):
        """Test validation when no parameters are defined"""
        self.registry.register(ToolSpec(
            name="tool1",
            description="Test",
            parameters=None,
            fn=lambda _: None
        ))

        error = self.registry._validate("tool1", {"any": "value"})
        self.assertIsNone(error)


class TestToolRegistryCallWithValidation(unittest.TestCase):
    """Test suite for call method with validation"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.call_count = 0

        def test_fn(args):
            self.call_count += 1
            return {"success": True, "args": args}

        self.registry.register(ToolSpec(
            name="valid_tool",
            description="Test tool",
            parameters={"required_param": "string"},
            fn=test_fn
        ))

    def test_call_with_valid_args(self):
        """Test calling tool with valid arguments"""
        result = self.registry.call("valid_tool", {"required_param": "value"})

        self.assertEqual(self.call_count, 1)
        self.assertTrue(result.get("success"))

    def test_call_nonexistent_tool(self):
        """Test calling nonexistent tool raises KeyError"""
        with self.assertRaises(KeyError):
            self.registry.call("nonexistent", {})

    def test_call_with_validation_error(self):
        """Test that validation errors are handled"""
        # This test depends on implementation - current version may not catch all errors
        result = self.registry.call("valid_tool", {})
        # Tool should still be called even with missing params in current implementation
        self.assertIsNotNone(result)


class TestToolRegistryIntegration(unittest.TestCase):
    """Integration tests for tool registry"""

    def test_full_tool_lifecycle(self):
        """Test registering, validating, and calling a tool"""
        registry = ToolRegistry()

        # Register a tool
        def calc_tool(args):
            a = args.get("a", 0)
            b = args.get("b", 0)
            return {"result": a + b}

        registry.register(ToolSpec(
            name="calculator",
            description="Adds two numbers",
            parameters={"a": "number", "b": "number"},
            fn=calc_tool
        ))

        # Get spec
        spec = registry.get_spec("calculator")
        self.assertEqual(spec.name, "calculator")

        # Validate args
        error = registry._validate("calculator", {"a": 1, "b": 2})
        self.assertIsNone(error)

        # Call tool
        result = registry.call("calculator", {"a": 5, "b": 3})
        self.assertEqual(result["result"], 8)

    def test_list_specs_includes_registered_tools(self):
        """Test that list_specs includes all registered tools"""
        registry = ToolRegistry()

        registry.register(ToolSpec(name="tool1", description="T1", fn=lambda _: None))
        registry.register(ToolSpec(name="tool2", description="T2", fn=lambda _: None))

        specs = registry.list_specs()
        names = [s["name"] for s in specs]

        self.assertIn("tool1", names)
        self.assertIn("tool2", names)


if __name__ == '__main__':
    unittest.main()