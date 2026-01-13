"""
Comprehensive Unit Tests for agent/models/base.py
Tests ModelMessage, ModelProvider base class and default stream_complete
"""

import unittest
import sys
import os

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.base import ModelMessage, ModelProvider


class TestModelMessage(unittest.TestCase):
    """Test suite for ModelMessage dataclass"""
    
    def test_model_message_creation(self):
        """Test creating ModelMessage"""
        msg = ModelMessage(role="user", content="Hello")
        
        self.assertEqual(msg.role, "user")
        self.assertEqual(msg.content, "Hello")
        self.assertIsNone(msg.name)
    
    def test_model_message_with_name(self):
        """Test creating ModelMessage with name field"""
        msg = ModelMessage(role="tool", content="Result", name="test_tool")
        
        self.assertEqual(msg.role, "tool")
        self.assertEqual(msg.content, "Result")
        self.assertEqual(msg.name, "test_tool")
    
    def test_model_message_default_name(self):
        """Test that name defaults to None"""
        msg = ModelMessage(role="user", content="Test")
        
        self.assertIsNone(msg.name)


class TestModelProvider(unittest.TestCase):
    """Test suite for ModelProvider base class"""
    
    def test_model_provider_initialization(self):
        """Test ModelProvider initialization"""
        provider = ModelProvider(name="test")
        
        self.assertEqual(provider.name, "test")
    
    def test_complete_not_implemented(self):
        """Test that complete raises NotImplementedError"""
        provider = ModelProvider(name="test")
        
        with self.assertRaises(NotImplementedError):
            provider.complete([ModelMessage(role="user", content="Test")])
    
    def test_stream_complete_fallback_to_complete(self):
        """Test that stream_complete falls back to complete"""
        
        class TestProvider(ModelProvider):
            def complete(self, _messages, _tools=None):
                return {"role": "assistant", "content": "Response", "tool_calls": []}
        
        provider = TestProvider(name="test")
        messages = [ModelMessage(role="user", content="Test")]
        
        chunks = list(provider.stream_complete(messages))
        
        # Should yield delta and done chunks
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["delta"], "Response")
        self.assertTrue(chunks[1]["done"])
        self.assertEqual(chunks[1]["content"], "Response")
    
    def test_stream_complete_handles_empty_content(self):
        """Test that stream_complete handles empty content"""
        
        class TestProvider(ModelProvider):
            def complete(self, _messages, _tools=None):
                return {"role": "assistant", "content": "", "tool_calls": []}
        
        provider = TestProvider(name="test")
        messages = [ModelMessage(role="user", content="Test")]
        
        chunks = list(provider.stream_complete(messages))
        
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["delta"], "")
        self.assertTrue(chunks[1]["done"])
    
    def test_stream_complete_passes_tools(self):
        """Test that stream_complete passes tools parameter"""
        
        class TestProvider(ModelProvider):
            def __init__(self, name):
                super().__init__(name)
                self.received_tools = None
            
            def complete(self, _messages, tools=None):
                self.received_tools = tools
                return {"role": "assistant", "content": "Response", "tool_calls": []}
        
        provider = TestProvider(name="test")
        messages = [ModelMessage(role="user", content="Test")]
        tools = [{"type": "function", "function": {"name": "test"}}]
        
        list(provider.stream_complete(messages, tools=tools))
        
        self.assertEqual(provider.received_tools, tools)
    
    def test_stream_complete_includes_tool_calls(self):
        """Test that stream_complete includes tool_calls in done chunk"""
        
        class TestProvider(ModelProvider):
            def complete(self, _messages, _tools=None):
                return {
                    "role": "assistant",
                    "content": "Using tool",
                    "tool_calls": [{"name": "test_tool", "arguments": {}}]
                }
        
        provider = TestProvider(name="test")
        messages = [ModelMessage(role="user", content="Test")]
        
        chunks = list(provider.stream_complete(messages))
        
        done_chunk = chunks[1]
        self.assertTrue(done_chunk["done"])
        self.assertEqual(len(done_chunk["tool_calls"]), 1)
        self.assertEqual(done_chunk["tool_calls"][0]["name"], "test_tool")


if __name__ == '__main__':
    unittest.main()