"""
Comprehensive Unit Tests for agent/models/echo.py
Tests EchoModel class - a simple echo model for testing
"""

import unittest
import sys
import os

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.echo import EchoModel
from agent.models.base import ModelMessage


class TestEchoModelInitialization(unittest.TestCase):
    """Test suite for EchoModel initialization"""
    
    def test_echo_model_init(self):
        """Test EchoModel initializes with correct name"""
        model = EchoModel()
        self.assertEqual(model.name, "echo")
    
    def test_echo_model_is_model_provider(self):
        """Test that EchoModel is a ModelProvider"""
        from agent.models.base import ModelProvider
        model = EchoModel()
        self.assertIsInstance(model, ModelProvider)


class TestEchoModelComplete(unittest.TestCase):
    """Test suite for EchoModel.complete method"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.model = EchoModel()
    
    def test_complete_with_user_message(self):
        """Test complete echoes user message"""
        messages = [
            ModelMessage(role="user", content="Hello world")
        ]
        
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertIn("Echo: Hello world", result["content"])
        self.assertEqual(result["tool_calls"], [])
    
    def test_complete_with_multiple_user_messages(self):
        """Test complete echoes last user message"""
        messages = [
            ModelMessage(role="user", content="First message"),
            ModelMessage(role="assistant", content="Response"),
            ModelMessage(role="user", content="Second message")
        ]
        
        result = self.model.complete(messages)
        
        self.assertIn("Echo: Second message", result["content"])
    
    def test_complete_with_no_user_message(self):
        """Test complete with no user messages"""
        messages = [
            ModelMessage(role="system", content="You are helpful"),
            ModelMessage(role="assistant", content="Hi")
        ]
        
        result = self.model.complete(messages)
        
        self.assertEqual(result["content"], "Echo: (no user message)")
    
    def test_complete_with_empty_messages(self):
        """Test complete with empty message list"""
        messages = []
        
        result = self.model.complete(messages)
        
        self.assertEqual(result["content"], "Echo: (no user message)")
    
    def test_complete_with_system_message(self):
        """Test complete ignores system messages"""
        messages = [
            ModelMessage(role="system", content="System prompt"),
            ModelMessage(role="user", content="User query")
        ]
        
        result = self.model.complete(messages)
        
        self.assertIn("Echo: User query", result["content"])
        self.assertNotIn("System prompt", result["content"])
    
    def test_complete_with_tool_messages(self):
        """Test complete ignores tool messages"""
        messages = [
            ModelMessage(role="user", content="Calculate 2+2"),
            ModelMessage(role="tool", content='{"result": 4}', name="calc"),
            ModelMessage(role="user", content="What is the answer?")
        ]
        
        result = self.model.complete(messages)
        
        self.assertIn("Echo: What is the answer?", result["content"])
    
    def test_complete_with_tools_parameter(self):
        """Test complete accepts but ignores tools parameter"""
        messages = [ModelMessage(role="user", content="Test")]
        tools = [{"type": "function", "function": {"name": "test_tool"}}]
        
        result = self.model.complete(messages, tools=tools)
        
        self.assertIn("Echo: Test", result["content"])
        self.assertEqual(result["tool_calls"], [])
    
    def test_complete_always_returns_empty_tool_calls(self):
        """Test that complete never returns tool calls"""
        messages = [ModelMessage(role="user", content="Use a tool")]
        
        result = self.model.complete(messages)
        
        self.assertIsInstance(result["tool_calls"], list)
        self.assertEqual(len(result["tool_calls"]), 0)
    
    def test_complete_result_structure(self):
        """Test complete returns correct result structure"""
        messages = [ModelMessage(role="user", content="Test")]
        
        result = self.model.complete(messages)
        
        self.assertIn("role", result)
        self.assertIn("content", result)
        self.assertIn("tool_calls", result)
        self.assertEqual(result["role"], "assistant")
    
    def test_complete_with_empty_user_content(self):
        """Test complete with empty user message content"""
        messages = [ModelMessage(role="user", content="")]
        
        result = self.model.complete(messages)
        
        self.assertEqual(result["content"], "Echo: ")
    
    def test_complete_with_whitespace_content(self):
        """Test complete with whitespace user message"""
        messages = [ModelMessage(role="user", content="   ")]
        
        result = self.model.complete(messages)
        
        self.assertIn("Echo:    ", result["content"])
    
    def test_complete_with_multiline_content(self):
        """Test complete with multiline user message"""
        messages = [ModelMessage(role="user", content="Line 1\nLine 2\nLine 3")]
        
        result = self.model.complete(messages)
        
        self.assertIn("Line 1", result["content"])
        self.assertIn("Line 2", result["content"])
        self.assertIn("Line 3", result["content"])
    
    def test_complete_with_special_characters(self):
        """Test complete with special characters in message"""
        messages = [ModelMessage(role="user", content="Test <>&\"'")]
        
        result = self.model.complete(messages)
        
        self.assertIn("Echo: Test <>&\"'", result["content"])
    
    def test_complete_with_unicode_content(self):
        """Test complete with unicode characters"""
        messages = [ModelMessage(role="user", content="Hello 世界 🌍")]
        
        result = self.model.complete(messages)
        
        self.assertIn("Hello 世界 🌍", result["content"])
    
    def test_complete_message_iteration(self):
        """Test that complete iterates through all messages"""
        messages = [
            ModelMessage(role="user", content="First"),
            ModelMessage(role="assistant", content="Response"),
            ModelMessage(role="user", content="Second"),
            ModelMessage(role="assistant", content="Another"),
            ModelMessage(role="user", content="Third")
        ]
        
        result = self.model.complete(messages)
        
        # Should echo the last user message
        self.assertIn("Echo: Third", result["content"])


class TestEchoModelEdgeCases(unittest.TestCase):
    """Test suite for EchoModel edge cases"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.model = EchoModel()
    
    def test_complete_with_generator_messages(self):
        """Test complete with messages as generator"""
        def message_generator():
            yield ModelMessage(role="user", content="Generated message")
        
        result = self.model.complete(message_generator())
        
        self.assertIn("Echo: Generated message", result["content"])
    
    def test_complete_preserves_assistant_role(self):
        """Test that result always has assistant role"""
        messages = [ModelMessage(role="user", content="Test")]
        
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
    
    def test_complete_idempotent(self):
        """Test that calling complete multiple times gives same result"""
        messages = [ModelMessage(role="user", content="Idempotent test")]
        
        result1 = self.model.complete(messages)
        result2 = self.model.complete(messages)
        
        self.assertEqual(result1["content"], result2["content"])
    
    def test_complete_with_very_long_message(self):
        """Test complete with very long user message"""
        long_content = "A" * 10000
        messages = [ModelMessage(role="user", content=long_content)]
        
        result = self.model.complete(messages)
        
        self.assertIn(long_content, result["content"])


if __name__ == '__main__':
    unittest.main()