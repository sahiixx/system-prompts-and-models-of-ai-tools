"""
Unit Tests for agent/core/agent.py streaming functionality
Tests for ask_stream() method
"""

import unittest
import sys
import os
from unittest.mock import Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.agent import Agent, AgentConfig
from agent.core.memory import Memory
from agent.core.tool_registry import ToolRegistry, ToolSpec
from agent.models.base import ModelMessage, ModelProvider


class MockStreamingModel(ModelProvider):
    """Mock model that supports streaming"""
    
    def __init__(self, stream_chunks=None):
        super().__init__(name="mock-streaming")
        self.stream_chunks = stream_chunks or []
        self.call_count = 0
    
    def complete(self, _messages, _tools=None):
        return {"role": "assistant", "content": "Non-streaming response", "tool_calls": []}
    
    def stream_complete(self, _messages, _tools=None):
        """Yield stream chunks"""
        for chunk in self.stream_chunks:
            yield chunk


class TestAgentAskStream(unittest.TestCase):
    """Test suite for Agent.ask_stream()"""
    
    def test_ask_stream_yields_deltas(self):
        """Test that ask_stream yields delta chunks"""
        model = MockStreamingModel([
            {"delta": "Hello"},
            {"delta": " world"},
            {"done": True, "content": "Hello world", "tool_calls": []}
        ])
        
        registry = ToolRegistry()
        memory = Memory()
        agent = Agent(model=model, tools=registry, memory=memory)
        
        chunks = list(agent.ask_stream("Test message"))
        
        # Should yield all chunks
        self.assertGreaterEqual(len(chunks), 3)
        self.assertEqual(chunks[0]["delta"], "Hello")
        self.assertEqual(chunks[1]["delta"], " world")
    
    def test_ask_stream_adds_system_prompt_once(self):
        """Test that ask_stream adds system prompt only once"""
        model = MockStreamingModel([
            {"delta": "Response", "done": True, "content": "Response", "tool_calls": []}
        ])
        
        registry = ToolRegistry()
        memory = Memory()
        config = AgentConfig(system_prompt="Test prompt")
        agent = Agent(model=model, tools=registry, memory=memory, config=config)
        
        list(agent.ask_stream("First message"))
        list(agent.ask_stream("Second message"))
        
        messages = memory.as_list()
        system_messages = [m for m in messages if m["role"] == "system"]
        self.assertEqual(len(system_messages), 1)
    
    def test_ask_stream_with_tool_calls(self):
        """Test ask_stream with tool invocation"""
        tool_called = False
        
        def mock_tool(_args):
            nonlocal tool_called
            tool_called = True
            return {"result": "tool output"}
        
        registry = ToolRegistry()
        registry.register(ToolSpec(name="test_tool", description="Test", fn=mock_tool))
        
        model = MockStreamingModel([
            {
                "delta": "",
                "done": True,
                "content": "",
                "tool_calls": [{"name": "test_tool", "arguments": {}}]
            },
            {"delta": "Done", "done": True, "content": "Done", "tool_calls": []}
        ])
        
        memory = Memory()
        agent = Agent(model=model, tools=registry, memory=memory)
        
        chunks = list(agent.ask_stream("Use tool"))
        
        # Tool should have been called
        self.assertTrue(tool_called)
        
        # Should yield tool_result chunks
        tool_results = [c for c in chunks if "tool_result" in c]
        self.assertGreater(len(tool_results), 0)


if __name__ == '__main__':
    unittest.main()