"""
Comprehensive unit tests for updates to agent/core/agent.py
Tests system prompt injection and argument normalization
"""

import pytest
import sys
import json
from pathlib import Path
from unittest.mock import Mock, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from agent.core.agent import Agent, AgentConfig
from agent.core.memory import Memory
from agent.core.tool_registry import ToolRegistry, ToolSpec
from agent.models.base import ModelProvider, ModelMessage


class MockModel(ModelProvider):
    """Mock model for testing"""
    def __init__(self):
        super().__init__(name="mock")
        self.call_count = 0
        self.received_messages = []
    
    def complete(self, messages, _tools=None):
        self.call_count += 1
        self.received_messages = list(messages)
        return {
            "role": "assistant",
            "content": "Mock response",
            "tool_calls": []
        }


class TestAgentSystemPrompt:
    """Test suite for system prompt functionality"""
    
    def test_system_prompt_injected_on_first_ask(self):
        """Test that system prompt is injected on first user message"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        config = AgentConfig(system_prompt="You are a helpful assistant")
        agent = Agent(model=model, tools=registry, memory=memory, config=config)
        
        agent.ask("Hello")
        
        # Check that system message was added
        messages = memory.as_list()
        assert len(messages) >= 2
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "You are a helpful assistant"
        assert messages[1]["role"] == "user"
        assert messages[1]["content"] == "Hello"
    
    def test_system_prompt_not_duplicated(self):
        """Test that system prompt is only added once"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        config = AgentConfig(system_prompt="You are helpful")
        agent = Agent(model=model, tools=registry, memory=memory, config=config)
        
        agent.ask("First message")
        agent.ask("Second message")
        agent.ask("Third message")
        
        # Count system messages
        messages = memory.as_list()
        system_count = sum(1 for m in messages if m["role"] == "system")
        assert system_count == 1
    
    def test_no_system_prompt_when_none(self):
        """Test that no system prompt is added when config is None"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        config = AgentConfig(system_prompt=None)
        agent = Agent(model=model, tools=registry, memory=memory, config=config)
        
        agent.ask("Hello")
        
        messages = memory.as_list()
        system_messages = [m for m in messages if m["role"] == "system"]
        assert len(system_messages) == 0
    
    def test_custom_system_prompt(self):
        """Test custom system prompt is used"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        custom_prompt = "You are a specialized coding assistant"
        config = AgentConfig(system_prompt=custom_prompt)
        agent = Agent(model=model, tools=registry, memory=memory, config=config)
        
        agent.ask("Write code")
        
        messages = memory.as_list()
        assert messages[0]["content"] == custom_prompt
    
    def test_default_system_prompt(self):
        """Test default system prompt from AgentConfig"""
        config = AgentConfig()
        assert config.system_prompt is not None
        assert "helpful" in config.system_prompt.lower() or "assistant" in config.system_prompt.lower()
    
    def test_system_prompt_passed_to_model(self):
        """Test that system prompt is passed to model"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        config = AgentConfig(system_prompt="Test prompt")
        agent = Agent(model=model, tools=registry, memory=memory, config=config)
        
        agent.ask("Hello")
        
        # Check model received system message
        assert len(model.received_messages) >= 2
        assert model.received_messages[0].role == "system"
        assert model.received_messages[0].content == "Test prompt"


class TestAgentArgumentNormalization:
    """Test suite for tool argument normalization"""
    
    def test_string_arguments_parsed_as_json(self):
        """Test that string arguments are parsed as JSON"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        # Add a test tool
        called_with = []
        def test_tool(args):
            called_with.append(args)
            return {"result": "ok"}
        
        registry.register(ToolSpec(
            name="test_tool",
            description="Test",
            parameters={},
            fn=test_tool
        ))
        
        # Mock model returns tool call with string arguments
        model.complete = lambda _messages, _tools: {
            "role": "assistant",
            "content": "",
            "tool_calls": [{
                "name": "test_tool",
                "arguments": '{"key": "value"}'
            }]
        }
        
        agent = Agent(model=model, tools=registry, memory=memory)
        agent.ask("Test")
        
        # Check that string was parsed
        assert len(called_with) == 1
        assert called_with[0] == {"key": "value"}
    
    def test_invalid_json_string_wrapped_as_input(self):
        """Test that invalid JSON strings are wrapped as input"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        called_with = []
        def test_tool(args):
            called_with.append(args)
            return {"result": "ok"}
        
        registry.register(ToolSpec(
            name="test_tool",
            description="Test",
            parameters={},
            fn=test_tool
        ))
        
        # Mock model returns tool call with non-JSON string
        model.complete = lambda _messages, _tools: {
            "role": "assistant",
            "content": "",
            "tool_calls": [{
                "name": "test_tool",
                "arguments": "not valid json"
            }]
        }
        
        agent = Agent(model=model, tools=registry, memory=memory)
        agent.ask("Test")
        
        # Check that string was wrapped
        assert len(called_with) == 1
        assert called_with[0] == {"input": "not valid json"}
    
    def test_none_arguments_converted_to_empty_dict(self):
        """Test that None arguments become empty dict"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        called_with = []
        def test_tool(args):
            called_with.append(args)
            return {"result": "ok"}
        
        registry.register(ToolSpec(
            name="test_tool",
            description="Test",
            parameters={},
            fn=test_tool
        ))
        
        # Mock model returns tool call with None arguments
        model.complete = lambda _messages, _tools: {
            "role": "assistant",
            "content": "",
            "tool_calls": [{
                "name": "test_tool",
                "arguments": None
            }]
        }
        
        agent = Agent(model=model, tools=registry, memory=memory)
        agent.ask("Test")
        
        # Check that None became {}
        assert len(called_with) == 1
        assert called_with[0] == {}
    
    def test_non_dict_arguments_wrapped_as_input(self):
        """Test that non-dict arguments are wrapped as input"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        called_with = []
        def test_tool(args):
            called_with.append(args)
            return {"result": "ok"}
        
        registry.register(ToolSpec(
            name="test_tool",
            description="Test",
            parameters={},
            fn=test_tool
        ))
        
        # Mock model returns tool call with list arguments
        model.complete = lambda _messages, _tools: {
            "role": "assistant",
            "content": "",
            "tool_calls": [{
                "name": "test_tool",
                "arguments": [1, 2, 3]
            }]
        }
        
        agent = Agent(model=model, tools=registry, memory=memory)
        agent.ask("Test")
        
        # Check that list was wrapped
        assert len(called_with) == 1
        assert called_with[0] == {"input": [1, 2, 3]}
    
    def test_dict_arguments_passed_directly(self):
        """Test that dict arguments are passed directly"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        called_with = []
        def test_tool(args):
            called_with.append(args)
            return {"result": "ok"}
        
        registry.register(ToolSpec(
            name="test_tool",
            description="Test",
            parameters={},
            fn=test_tool
        ))
        
        # Mock model returns tool call with dict arguments
        model.complete = lambda _messages, _tools: {
            "role": "assistant",
            "content": "",
            "tool_calls": [{
                "name": "test_tool",
                "arguments": {"param1": "value1", "param2": "value2"}
            }]
        }
        
        agent = Agent(model=model, tools=registry, memory=memory)
        agent.ask("Test")
        
        # Check that dict was passed directly
        assert len(called_with) == 1
        assert called_with[0] == {"param1": "value1", "param2": "value2"}


class TestModelMessageWithName:
    """Test suite for ModelMessage name parameter"""
    
    def test_model_message_includes_tool_name(self):
        """Test that tool results include tool name in ModelMessage"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        def test_tool(_args):
            return {"result": "tool output"}
        
        registry.register(ToolSpec(
            name="test_tool",
            description="Test",
            parameters={},
            fn=test_tool
        ))
        
        # Mock model returns tool call
        call_count = [0]
        def mock_complete(messages, _tools):
            call_count[0] += 1
            if call_count[0] == 1:
                # First call: return tool call
                return {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [{
                        "name": "test_tool",
                        "arguments": {}
                    }]
                }
            else:
                # Second call: return final response
                # Check that tool message has name
                for msg in messages:
                    if msg.role == "tool":
                        assert msg.name == "test_tool"
                return {
                    "role": "assistant",
                    "content": "Final response",
                    "tool_calls": []
                }
        
        model.complete = mock_complete
        
        agent = Agent(model=model, tools=registry, memory=memory)
        agent.ask("Test")
        
        # Verify model was called twice
        assert call_count[0] == 2
    
    def test_user_messages_have_no_name(self):
        """Test that user messages don't have name field"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        agent = Agent(model=model, tools=registry, memory=memory)
        agent.ask("Hello")
        
        # Check model received message without name
        user_messages = [m for m in model.received_messages if m.role == "user"]
        assert len(user_messages) > 0
        # Name should be None for user messages
        assert user_messages[0].name is None


class TestAgentMaxSteps:
    """Test suite for max_steps configuration"""
    
    def test_max_steps_limits_tool_iterations(self):
        """Test that max_steps limits number of tool call iterations"""
        model = MockModel()
        registry = ToolRegistry()
        memory = Memory()
        
        def test_tool(_args):
            return {"result": "output"}
        
        registry.register(ToolSpec(
            name="test_tool",
            description="Test",
            parameters={},
            fn=test_tool
        ))
        
        # Mock model always returns tool calls
        model.complete = lambda _messages, _tools: {
            "role": "assistant",
            "content": "",
            "tool_calls": [{"name": "test_tool", "arguments": {}}]
        }
        
        config = AgentConfig(max_steps=3)
        agent = Agent(model=model, tools=registry, memory=memory, config=config)
        
        agent.ask("Test")
        
        # Model should be called max_steps + 1 times (initial + 3 retries)
        assert model.call_count == 4