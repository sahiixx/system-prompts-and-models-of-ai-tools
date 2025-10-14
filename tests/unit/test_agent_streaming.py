"""
Comprehensive Unit Tests for Agent streaming functionality
Tests ask_stream method in agent/core/agent.py
"""

import unittest
import sys
import os
from unittest.mock import MagicMock, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.agent import Agent, AgentConfig
from agent.core.memory import Memory
from agent.core.tool_registry import ToolRegistry, ToolSpec
from agent.models.base import ModelMessage, ModelProvider


class MockStreamingModel(ModelProvider):
    """Mock model that supports streaming"""
    def __init__(self, stream_responses=None):
        super().__init__(name="mock_stream")
        self.stream_responses = stream_responses or []
        self.call_count = 0

    def complete(self, messages, tools=None):
        del messages, tools
        return {"role": "assistant", "content": "non-streaming response", "tool_calls": []}
    
    def stream_complete(self, messages, tools=None):
        del messages, tools
        if self.call_count < len(self.stream_responses):
            response = self.stream_responses[self.call_count]
        else:
            response = [{"delta": "default"}, {"done": True, "content": "default", "tool_calls": []}]
        self.call_count += 1
        for chunk in response:
            yield chunk


class TestAgentAskStream(unittest.TestCase):
    """Test suite for Agent.ask_stream method"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.registry = ToolRegistry()
        self.memory = Memory()
    
    def test_ask_stream_simple_response(self):
        """Test streaming a simple response"""
        model = MockStreamingModel([
            [
                {"delta": "Hello "},
                {"delta": "world"},
                {"done": True, "content": "Hello world", "tool_calls": []}
            ]
        ])
        agent = Agent(model=model, tools=self.registry, memory=self.memory)
        
        chunks = list(agent.ask_stream("Hi"))
        
        # Should have 3 chunks
        self.assertGreaterEqual(len(chunks), 3)
        self.assertEqual(chunks[0]["delta"], "Hello ")
        self.assertEqual(chunks[1]["delta"], "world")
        self.assertTrue(chunks[2]["done"])
    
    def test_ask_stream_adds_system_prompt_once(self):
        """Test that system prompt is added only once during streaming"""
        model = MockStreamingModel([
            [{"done": True, "content": "Response 1", "tool_calls": []}],
            [{"done": True, "content": "Response 2", "tool_calls": []}]
        ])
        config = AgentConfig(system_prompt="Be helpful")
        agent = Agent(model=model, tools=self.registry, memory=self.memory, config=config)
        
        list(agent.ask_stream("First"))
        list(agent.ask_stream("Second"))
        
        messages = self.memory.as_list()
        system_messages = [m for m in messages if m["role"] == "system"]
        self.assertEqual(len(system_messages), 1)
    
    def test_ask_stream_no_system_prompt_when_none(self):
        """Test that no system prompt is added when config.system_prompt is None"""
        model = MockStreamingModel([[{"done": True, "content": "Response", "tool_calls": []}]])
        config = AgentConfig(system_prompt=None)
        agent = Agent(model=model, tools=self.registry, memory=self.memory, config=config)
        
        list(agent.ask_stream("Test"))
        
        messages = self.memory.as_list()
        system_messages = [m for m in messages if m["role"] == "system"]
        self.assertEqual(len(system_messages), 0)
    
    def test_ask_stream_with_tool_calls(self):
        """Test streaming with tool calls"""
        def test_tool(_args):
            return {"result": "tool output"}
        
        self.registry.register(ToolSpec(
            name="test_tool",
            description="Test",
            fn=test_tool
        ))
        
        model = MockStreamingModel([
            [
                {"delta": "Calling tool"},
                {"done": True, "content": "Calling tool", "tool_calls": [
                    {"name": "test_tool", "arguments": {}}
                ]}
            ],
            [
                {"delta": "Done"},
                {"done": True, "content": "Done", "tool_calls": []}
            ]
        ])
        agent = Agent(model=model, tools=self.registry, memory=self.memory)
        
        chunks = list(agent.ask_stream("Use tool"))
        
        # Should have tool_result chunks
        tool_chunks = [c for c in chunks if "tool_result" in c]
        self.assertGreater(len(tool_chunks), 0)
        self.assertEqual(tool_chunks[0]["tool_result"]["name"], "test_tool")
    
    def test_ask_stream_respects_max_steps(self):
        """Test that streaming respects max_steps"""
        def endless_tool(_args):
            return {"result": "loop"}
        
        self.registry.register(ToolSpec(name="loop_tool", description="Loops", fn=endless_tool))
        
        model = MockStreamingModel([
            [{"done": True, "content": "Loop", "tool_calls": [{"name": "loop_tool", "arguments": {}}]}]
        ] * 20)
        
        config = AgentConfig(max_steps=3)
        agent = Agent(model=model, tools=self.registry, memory=self.memory, config=config)
        
        list(agent.ask_stream("Loop"))
        
        # Should stop after max_steps
        self.assertLessEqual(model.call_count, 4)
    
    def test_ask_stream_yields_tool_results(self):
        """Test that tool results are yielded during streaming"""
        def calc_tool(_args):
            return {"result": 42}
        
        self.registry.register(ToolSpec(name="calc", description="Calc", fn=calc_tool))
        
        model = MockStreamingModel([
            [{"done": True, "content": "", "tool_calls": [{"name": "calc", "arguments": {}}]}],
            [{"delta": "Result: 42"}, {"done": True, "content": "Result: 42", "tool_calls": []}]
        ])
        agent = Agent(model=model, tools=self.registry, memory=self.memory)
        
        chunks = list(agent.ask_stream("Calculate"))
        
        tool_chunks = [c for c in chunks if "tool_result" in c]
        self.assertEqual(len(tool_chunks), 1)
        self.assertEqual(tool_chunks[0]["tool_result"]["result"]["result"], 42)


class TestStreamingIntegration(unittest.TestCase):
    """Integration tests for streaming functionality"""
    
    def test_full_streaming_conversation(self):
        """Test a full streaming conversation with tools"""
        registry = ToolRegistry()
        memory = Memory()
        
        def add_tool(args):
            a = args.get("a", 0)
            b = args.get("b", 0)
            return {"sum": a + b}
        
        registry.register(ToolSpec(name="add", description="Add numbers", fn=add_tool))
        
        model = MockStreamingModel([
            [
                {"delta": "I'll "},
                {"delta": "add "},
                {"delta": "them"},
                {"done": True, "content": "I'll add them", "tool_calls": [
                    {"name": "add", "arguments": {"a": 5, "b": 3}}
                ]}
            ],
            [
                {"delta": "The sum is 8"},
                {"done": True, "content": "The sum is 8", "tool_calls": []}
            ]
        ])
        
        agent = Agent(model=model, tools=registry, memory=memory)
        chunks = list(agent.ask_stream("What is 5 + 3?"))
        
        # Verify we got deltas and tool results
        deltas = [c.get("delta") for c in chunks if "delta" in c]
        tool_results = [c for c in chunks if "tool_result" in c]
        
        self.assertGreater(len(deltas), 0)
        self.assertEqual(len(tool_results), 1)
        self.assertEqual(tool_results[0]["tool_result"]["result"]["sum"], 8)


if __name__ == '__main__':
    unittest.main()