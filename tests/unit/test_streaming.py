"""
Comprehensive Unit Tests for streaming functionality
Tests ask_stream in Agent and stream_complete in models
"""

import unittest
import sys
import os
from unittest.mock import MagicMock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.agent import Agent, AgentConfig
from agent.core.memory import Memory
from agent.core.tool_registry import ToolRegistry, ToolSpec
from agent.models.base import ModelMessage, ModelProvider


class StreamingMockModel(ModelProvider):
    """Mock model that supports streaming"""
    def __init__(self, stream_chunks=None):
        super().__init__(name="streaming-mock")
        self.stream_chunks = stream_chunks or [
            {"delta": "Hello"},
            {"delta": " world"},
            {"done": True, "content": "Hello world", "tool_calls": []}
        ]
    
    def complete(self, _messages, _tools=None):
        return {"content": "Hello world", "tool_calls": []}
    
    def stream_complete(self, _messages, _tools=None):
        for chunk in self.stream_chunks:
            yield chunk


class TestStreaming(unittest.TestCase):
    """Test suite for streaming functionality"""
    
    def test_ask_stream_basic(self):
        """Test basic streaming without tools"""
        model = StreamingMockModel()
        registry = ToolRegistry()
        agent = Agent(model=model, tools=registry)
        
        chunks = list(agent.ask_stream("Hello"))
        
        self.assertGreater(len(chunks), 0)
        # Should have delta chunks
        delta_chunks = [c for c in chunks if 'delta' in c]
        self.assertGreater(len(delta_chunks), 0)
    
    def test_ask_stream_adds_system_prompt(self):
        """Test that ask_stream adds system prompt"""
        model = StreamingMockModel()
        registry = ToolRegistry()
        config = AgentConfig(system_prompt="You are helpful")
        agent = Agent(model=model, tools=registry, config=config)
        
        list(agent.ask_stream("Hello"))
        
        messages = agent.memory.as_list()
        system_msgs = [m for m in messages if m['role'] == 'system']
        self.assertEqual(len(system_msgs), 1)
    
    def test_ask_stream_with_tool_calls(self):
        """Test streaming with tool calls"""
        model = StreamingMockModel(stream_chunks=[
            {"delta": "Calling tool"},
            {"done": True, "content": "Calling tool", "tool_calls": [
                {"name": "test_tool", "arguments": {"x": 1}}
            ]}
        ])
        registry = ToolRegistry()
        registry.register(ToolSpec(
            name="test_tool",
            description="Test",
            parameters={},
            fn=lambda _: {"result": "success"}
        ))
        agent = Agent(model=model, tools=registry)
        
        chunks = list(agent.ask_stream("Use tool"))
        
        # Should have tool_result chunks
        tool_chunks = [c for c in chunks if 'tool_result' in c]
        self.assertGreater(len(tool_chunks), 0)
    
    def test_base_model_stream_complete_fallback(self):
        """Test that base ModelProvider has fallback stream_complete"""
        class SimpleModel(ModelProvider):
            def __init__(self):
                super().__init__(name="simple")
            
            def complete(self, _messages, _tools=None):
                return {"content": "Response", "tool_calls": []}
        
        model = SimpleModel()
        messages = [ModelMessage(role="user", content="Hi")]
        chunks = list(model.stream_complete(messages))
        
        self.assertGreater(len(chunks), 0)
        # Should have delta and done
        self.assertTrue(any('delta' in c for c in chunks))
        self.assertTrue(any(c.get('done') for c in chunks))


if __name__ == '__main__':
    unittest.main()