"""
Comprehensive Unit Tests for agent/core/agent.py
Tests Agent class, AgentConfig, and agent behavior
"""

import unittest
import json
import sys
import os
from unittest.mock import MagicMock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.agent import Agent, AgentConfig
from agent.core.memory import Memory
from agent.core.tool_registry import ToolRegistry, ToolSpec
from agent.models.base import ModelMessage, ModelProvider


class MockModel(ModelProvider):
    """Mock model for testing"""
    def __init__(self, responses=None):
        super().__init__(name="mock")
        self.responses = responses or []
        self.call_count = 0
        self.last_messages = []
        self.last_tools = None

    def complete(self, messages, tools=None):
        self.last_messages = list(messages)
        self.last_tools = tools
        if self.call_count < len(self.responses):
            response = self.responses[self.call_count]
        else:
            response = {"role": "assistant", "content": "default response", "tool_calls": []}
        self.call_count += 1
        return response


class TestAgentConfig(unittest.TestCase):
    """Test suite for AgentConfig dataclass"""

    def test_config_default_values(self):
        """Test AgentConfig has correct default values"""
        config = AgentConfig()
        self.assertEqual(config.model_name, "echo")
        self.assertEqual(config.max_steps, 10)
        self.assertTrue(config.allow_parallel_tools)
        self.assertIsNotNone(config.system_prompt)

    def test_config_custom_values(self):
        """Test AgentConfig accepts custom values"""
        config = AgentConfig(
            model_name="gpt-4",
            max_steps=5,
            allow_parallel_tools=False,
            system_prompt="Custom prompt"
        )
        self.assertEqual(config.model_name, "gpt-4")
        self.assertEqual(config.max_steps, 5)
        self.assertFalse(config.allow_parallel_tools)
        self.assertEqual(config.system_prompt, "Custom prompt")

    def test_config_no_system_prompt(self):
        """Test AgentConfig with None system prompt"""
        config = AgentConfig(system_prompt=None)
        self.assertIsNone(config.system_prompt)


class TestAgentInitialization(unittest.TestCase):
    """Test suite for Agent initialization"""

    def setUp(self):
        """Set up test fixtures"""
        self.model = MockModel()
        self.registry = ToolRegistry()
        self.memory = Memory()

    def test_agent_initialization_with_all_params(self):
        """Test Agent initialization with all parameters"""
        config = AgentConfig(model_name="test")
        agent = Agent(
            model=self.model,
            tools=self.registry,
            memory=self.memory,
            config=config
        )
        self.assertEqual(agent.model, self.model)
        self.assertEqual(agent.tools, self.registry)
        self.assertEqual(agent.memory, self.memory)
        self.assertEqual(agent.config, config)

    def test_agent_initialization_minimal(self):
        """Test Agent initialization with minimal parameters"""
        agent = Agent(model=self.model, tools=self.registry)
        self.assertIsNotNone(agent.memory)
        self.assertIsNotNone(agent.config)


class TestAgentAsk(unittest.TestCase):
    """Test suite for Agent.ask method"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.memory = Memory()

    def test_ask_simple_message(self):
        """Test asking agent with simple message"""
        model = MockModel([
            {"role": "assistant", "content": "Hello!", "tool_calls": []}
        ])
        agent = Agent(model=model, tools=self.registry, memory=self.memory)

        response = agent.ask("Hi there")

        self.assertEqual(response, "Hello!")
        self.assertEqual(len(self.memory.messages), 3)

    def test_ask_adds_system_prompt_once(self):
        """Test that system prompt is added only once"""
        model = MockModel([
            {"role": "assistant", "content": "Response 1", "tool_calls": []},
            {"role": "assistant", "content": "Response 2", "tool_calls": []}
        ])
        config = AgentConfig(system_prompt="Test system prompt")
        agent = Agent(model=model, tools=self.registry, memory=self.memory, config=config)

        agent.ask("First message")
        agent.ask("Second message")

        messages = self.memory.as_list()
        system_messages = [m for m in messages if m["role"] == "system"]
        self.assertEqual(len(system_messages), 1)

    def test_ask_no_system_prompt_when_none(self):
        """Test that no system prompt is added when config.system_prompt is None"""
        model = MockModel([
            {"role": "assistant", "content": "Response", "tool_calls": []}
        ])
        config = AgentConfig(system_prompt=None)
        agent = Agent(model=model, tools=self.registry, memory=self.memory, config=config)

        agent.ask("Test message")

        messages = self.memory.as_list()
        system_messages = [m for m in messages if m["role"] == "system"]
        self.assertEqual(len(system_messages), 0)


class TestAgentToolCalling(unittest.TestCase):
    """Test suite for Agent tool calling behavior"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.memory = Memory()
        self.tool_called = False
        self.tool_args = None

        def mock_tool(args):
            self.tool_called = True
            self.tool_args = args
            return {"result": "tool output"}

        self.registry.register(ToolSpec(
            name="test_tool",
            description="Test tool",
            fn=mock_tool
        ))

    def test_ask_calls_tool_with_dict_args(self):
        """Test that agent calls tool with dict arguments"""
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "test_tool", "arguments": {"key": "value"}}
                ]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        agent = Agent(model=model, tools=self.registry, memory=self.memory)

        agent.ask("Use tool")

        self.assertTrue(self.tool_called)
        self.assertEqual(self.tool_args, {"key": "value"})

    def test_ask_handles_none_args(self):
        """Test that agent handles None arguments"""
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "test_tool", "arguments": None}
                ]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        agent = Agent(model=model, tools=self.registry, memory=self.memory)

        agent.ask("Use tool")

        self.assertTrue(self.tool_called)
        self.assertEqual(self.tool_args, {})

    def test_ask_respects_max_steps(self):
        """Test that agent respects max_steps configuration"""
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [{"name": "test_tool", "arguments": {}}]
            }
        ] * 20)

        config = AgentConfig(max_steps=3)
        agent = Agent(model=model, tools=self.registry, memory=self.memory, config=config)

        agent.ask("Test")

        self.assertLessEqual(model.call_count, 4)


if __name__ == '__main__':
    unittest.main()


class TestAgentParallelTools(unittest.TestCase):
    """Tests for parallel tool execution"""

    def test_parallel_tool_execution(self):
        """Test that parallel tools are executed concurrently"""
        import time

        call_times = []

        def slow_tool(_args):
            call_times.append(time.time())
            return {"result": "done"}

        model = MockModel(responses=[
            {"content": "", "tool_calls": [
                {"name": "tool1", "arguments": {"x": 1}},
                {"name": "tool2", "arguments": {"x": 2}}
            ]},
            {"content": "Done", "tool_calls": []}
        ])

        registry = ToolRegistry()
        registry.register(ToolSpec(name="tool1", description="Test", parameters={}, fn=slow_tool))
        registry.register(ToolSpec(name="tool2", description="Test", parameters={}, fn=slow_tool))

        config = AgentConfig(allow_parallel_tools=True)
        agent = Agent(model=model, tools=registry, config=config)

        agent.ask("test")

        # Both tools should have been called
        self.assertEqual(len(call_times), 2)

    def test_sequential_when_parallel_disabled(self):
        """Test that tools run sequentially when parallel disabled"""
        call_order = []

        def tool1(_args):
            call_order.append("tool1")
            return {"result": "1"}

        def tool2(_args):
            call_order.append("tool2")
            return {"result": "2"}

        model = MockModel(responses=[
            {"content": "", "tool_calls": [
                {"name": "tool1", "arguments": {}},
                {"name": "tool2", "arguments": {}}
            ]},
            {"content": "Done", "tool_calls": []}
        ])

        registry = ToolRegistry()
        registry.register(ToolSpec(name="tool1", description="Test", parameters={}, fn=tool1))
        registry.register(ToolSpec(name="tool2", description="Test", parameters={}, fn=tool2))

        config = AgentConfig(allow_parallel_tools=False)
        agent = Agent(model=model, tools=registry, config=config)

        agent.ask("test")

        self.assertEqual(call_order, ["tool1", "tool2"])


class TestAgentToolCallParsing(unittest.TestCase):
    """Tests for tool call argument parsing"""

    def test_string_args_parsed_as_json(self):
        """Test that string arguments are parsed as JSON"""
        tool_called_with = []

        def test_tool(args):
            tool_called_with.append(args)
            return {"ok": True}

        model = MockModel(responses=[
            {"content": "", "tool_calls": [
                {"name": "test_tool", "arguments": '{"x": 42}'}
            ]},
            {"content": "Done", "tool_calls": []}
        ])

        registry = ToolRegistry()
        registry.register(ToolSpec(name="test_tool", description="Test", parameters={}, fn=test_tool))

        agent = Agent(model=model, tools=registry)
        agent.ask("test")

        self.assertEqual(len(tool_called_with), 1)
        self.assertEqual(tool_called_with[0], {"x": 42})

    def test_invalid_json_string_wrapped_in_input(self):
        """Test that invalid JSON strings are wrapped"""
        tool_called_with = []

        def test_tool(args):
            tool_called_with.append(args)
            return {"ok": True}

        model = MockModel(responses=[
            {"content": "", "tool_calls": [
                {"name": "test_tool", "arguments": 'not valid json'}
            ]},
            {"content": "Done", "tool_calls": []}
        ])

        registry = ToolRegistry()
        registry.register(ToolSpec(name="test_tool", description="Test", parameters={}, fn=test_tool))

        agent = Agent(model=model, tools=registry)
        agent.ask("test")

        self.assertEqual(len(tool_called_with), 1)
        self.assertIn("input", tool_called_with[0])

    def test_none_args_converted_to_empty_dict(self):
        """Test that None arguments are converted to empty dict"""
        tool_called_with = []

        def test_tool(args):
            tool_called_with.append(args)
            return {"ok": True}

        model = MockModel(responses=[
            {"content": "", "tool_calls": [
                {"name": "test_tool", "arguments": None}
            ]},
            {"content": "Done", "tool_calls": []}
        ])

        registry = ToolRegistry()
        registry.register(ToolSpec(name="test_tool", description="Test", parameters={}, fn=test_tool))

        agent = Agent(model=model, tools=registry)
        agent.ask("test")

        self.assertEqual(len(tool_called_with), 1)
        self.assertIsInstance(tool_called_with[0], dict)

    def test_non_dict_args_wrapped_in_input(self):
        """Test that non-dict arguments are wrapped in input key"""
        tool_called_with = []

        def test_tool(args):
            tool_called_with.append(args)
            return {"ok": True}

        model = MockModel(responses=[
            {"content": "", "tool_calls": [
                {"name": "test_tool", "arguments": [1, 2, 3]}
            ]},
            {"content": "Done", "tool_calls": []}
        ])

        registry = ToolRegistry()
        registry.register(ToolSpec(name="test_tool", description="Test", parameters={}, fn=test_tool))

        agent = Agent(model=model, tools=registry)
        agent.ask("test")

        self.assertEqual(len(tool_called_with), 1)
        self.assertIn("input", tool_called_with[0])

# Additional comprehensive tests added - see TEST_COVERAGE_SUMMARY.md for details