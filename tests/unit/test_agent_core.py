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




class TestAgentStreamingInterface(unittest.TestCase):
    """Test suite for Agent.ask_stream method"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.memory = Memory()

    def test_ask_stream_simple_message(self):
        """Test streaming with simple message"""
        class StreamingModel(ModelProvider):
            def __init__(self):
                super().__init__(name="streaming")
            
            def stream_complete(self, _messages, _tools=None):
                yield {"delta": "Hello"}
                yield {"delta": " world"}
                yield {"done": True, "content": "Hello world", "tool_calls": []}

        agent = Agent(model=StreamingModel(), tools=self.registry, memory=self.memory)
        
        chunks = list(agent.ask_stream("Test"))
        
        self.assertGreater(len(chunks), 0)
        # Should contain delta chunks
        delta_chunks = [c for c in chunks if "delta" in c]
        self.assertGreater(len(delta_chunks), 0)

    def test_ask_stream_with_tool_calls(self):
        """Test streaming with tool calls"""
        call_count = [0]
        
        def mock_tool(_args):
            call_count[0] += 1
            return {"result": "tool output"}

        self.registry.register(ToolSpec(
            name="test_tool",
            description="Test tool",
            fn=mock_tool
        ))

        class StreamingModel(ModelProvider):
            def __init__(self):
                super().__init__(name="streaming")
                self.call_num = 0
            
            def stream_complete(self, _messages, _tools=None):
                self.call_num += 1
                if self.call_num == 1:
                    yield {"done": True, "content": "", "tool_calls": [{"name": "test_tool", "arguments": {}}]}
                else:
                    yield {"delta": "Done"}
                    yield {"done": True, "content": "Done", "tool_calls": []}

        agent = Agent(model=StreamingModel(), tools=self.registry, memory=self.memory)
        
        chunks = list(agent.ask_stream("Use tool"))
        
        # Should have tool_result chunks
        tool_chunks = [c for c in chunks if "tool_result" in c]
        self.assertGreater(len(tool_chunks), 0)
        self.assertTrue(call_count[0] > 0)

    def test_ask_stream_adds_system_prompt_once(self):
        """Test that streaming adds system prompt only once"""
        class StreamingModel(ModelProvider):
            def __init__(self):
                super().__init__(name="streaming")
            
            def stream_complete(self, _messages, _tools=None):
                yield {"done": True, "content": "Response", "tool_calls": []}

        config = AgentConfig(system_prompt="Test system")
        agent = Agent(model=StreamingModel(), tools=self.registry, memory=self.memory, config=config)
        
        list(agent.ask_stream("First"))
        list(agent.ask_stream("Second"))
        
        messages = self.memory.as_list()
        system_messages = [m for m in messages if m["role"] == "system"]
        self.assertEqual(len(system_messages), 1)

    def test_ask_stream_respects_max_steps(self):
        """Test that streaming respects max_steps"""
        class StreamingModel(ModelProvider):
            def __init__(self):
                super().__init__(name="streaming")
            
            def stream_complete(self, _messages, _tools=None):
                yield {"done": True, "content": "", "tool_calls": [{"name": "test_tool", "arguments": {}}]}

        def mock_tool(_args):
            return {"result": "output"}
        
        self.registry.register(ToolSpec(name="test_tool", description="Test", fn=mock_tool))
        
        config = AgentConfig(max_steps=2)
        agent = Agent(model=StreamingModel(), tools=self.registry, memory=self.memory, config=config)
        
        chunks = list(agent.ask_stream("Test"))
        
        # Should stop after max_steps
        tool_chunks = [c for c in chunks if "tool_result" in c]
        self.assertLessEqual(len(tool_chunks), 2)


class TestAgentParallelToolExecution(unittest.TestCase):
    """Test suite for parallel tool execution"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.memory = Memory()
        self.execution_order = []

    def test_parallel_tools_execute_concurrently(self):
        """Test that parallel-safe tools execute concurrently"""
        import time
        
        def slow_tool_1(_args):
            time.sleep(0.01)
            self.execution_order.append("tool1")
            return {"result": "1"}
        
        def slow_tool_2(_args):
            time.sleep(0.01)
            self.execution_order.append("tool2")
            return {"result": "2"}
        
        self.registry.register(ToolSpec(
            name="tool1",
            description="Tool 1",
            fn=slow_tool_1,
            parallel_safe=True
        ))
        self.registry.register(ToolSpec(
            name="tool2",
            description="Tool 2",
            fn=slow_tool_2,
            parallel_safe=True
        ))
        
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "tool1", "arguments": {}},
                    {"name": "tool2", "arguments": {}}
                ]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        
        config = AgentConfig(allow_parallel_tools=True)
        agent = Agent(model=model, tools=self.registry, memory=self.memory, config=config)
        
        start = time.time()
        agent.ask("Test")
        duration = time.time() - start
        
        # Should complete in ~0.01s if parallel, ~0.02s if sequential
        self.assertLess(duration, 0.03)

    def test_non_parallel_safe_tools_execute_sequentially(self):
        """Test that non-parallel-safe tools execute sequentially"""
        call_order = []
        
        def tool_1(_args):
            call_order.append(1)
            return {"result": "1"}
        
        def tool_2(_args):
            call_order.append(2)
            return {"result": "2"}
        
        self.registry.register(ToolSpec(
            name="tool1",
            description="Tool 1",
            fn=tool_1,
            parallel_safe=False
        ))
        self.registry.register(ToolSpec(
            name="tool2",
            description="Tool 2",
            fn=tool_2,
            parallel_safe=False
        ))
        
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "tool1", "arguments": {}},
                    {"name": "tool2", "arguments": {}}
                ]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        
        config = AgentConfig(allow_parallel_tools=True)
        agent = Agent(model=model, tools=self.registry, memory=self.memory, config=config)
        
        agent.ask("Test")
        
        # Both should have been called
        self.assertEqual(len(call_order), 2)

    def test_parallel_tools_disabled_config(self):
        """Test that parallel execution is disabled when configured"""
        def tool_fn(_args):
            return {"result": "ok"}
        
        self.registry.register(ToolSpec(
            name="tool1",
            description="Tool 1",
            fn=tool_fn,
            parallel_safe=True
        ))
        self.registry.register(ToolSpec(
            name="tool2",
            description="Tool 2",
            fn=tool_fn,
            parallel_safe=True
        ))
        
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "tool1", "arguments": {}},
                    {"name": "tool2", "arguments": {}}
                ]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        
        config = AgentConfig(allow_parallel_tools=False)
        agent = Agent(model=model, tools=self.registry, memory=self.memory, config=config)
        
        # Should not raise, executes sequentially
        result = agent.ask("Test")
        self.assertEqual(result, "Done")


class TestAgentToolArgumentHandling(unittest.TestCase):
    """Test suite for tool argument handling"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.memory = Memory()
        self.received_args = None

        def capture_tool(args):
            self.received_args = args
            return {"result": "captured"}

        self.registry.register(ToolSpec(
            name="capture",
            description="Capture args",
            fn=capture_tool
        ))

    def test_ask_parses_json_string_arguments(self):
        """Test that JSON string arguments are parsed"""
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "capture", "arguments": '{"key": "value"}'}
                ]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        
        agent = Agent(model=model, tools=self.registry, memory=self.memory)
        agent.ask("Test")
        
        self.assertEqual(self.received_args, {"key": "value"})

    def test_ask_handles_invalid_json_string(self):
        """Test that invalid JSON string is wrapped"""
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "capture", "arguments": 'not valid json'}
                ]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        
        agent = Agent(model=model, tools=self.registry, memory=self.memory)
        agent.ask("Test")
        
        self.assertEqual(self.received_args, {"input": "not valid json"})

    def test_ask_handles_none_arguments(self):
        """Test that None arguments become empty dict"""
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "capture", "arguments": None}
                ]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        
        agent = Agent(model=model, tools=self.registry, memory=self.memory)
        agent.ask("Test")
        
        self.assertEqual(self.received_args, {})

    def test_ask_wraps_non_dict_arguments(self):
        """Test that non-dict arguments are wrapped in input key"""
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "capture", "arguments": ["list", "value"]}
                ]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        
        agent = Agent(model=model, tools=self.registry, memory=self.memory)
        agent.ask("Test")
        
        self.assertEqual(self.received_args, {"input": ["list", "value"]})

    def test_ask_passes_dict_arguments_directly(self):
        """Test that dict arguments are passed directly"""
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "capture", "arguments": {"a": 1, "b": 2}}
                ]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        
        agent = Agent(model=model, tools=self.registry, memory=self.memory)
        agent.ask("Test")
        
        self.assertEqual(self.received_args, {"a": 1, "b": 2})


class TestAgentMessageFormatting(unittest.TestCase):
    """Test suite for message formatting with tool_name"""

    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.memory = Memory()

    def test_ask_includes_tool_name_in_messages(self):
        """Test that tool messages include tool_name field"""
        def test_tool(_args):
            return {"result": "ok"}
        
        self.registry.register(ToolSpec(
            name="test_tool",
            description="Test",
            fn=test_tool
        ))
        
        model = MockModel([
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [{"name": "test_tool", "arguments": {}}]
            },
            {"role": "assistant", "content": "Done", "tool_calls": []}
        ])
        
        agent = Agent(model=model, tools=self.registry, memory=self.memory)
        agent.ask("Test")
        
        # Check that model received messages with name field
        messages_with_name = [m for m in model.last_messages if m.name is not None]
        self.assertGreater(len(messages_with_name), 0)
if __name__ == '__main__':
    unittest.main()