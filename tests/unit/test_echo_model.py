"""
Comprehensive Unit Tests for agent/models/echo.py
Tests EchoModel class and its behavior
"""

import unittest
import sys
import os

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.echo import EchoModel
from agent.models.base import ModelMessage


class TestEchoModel(unittest.TestCase):
    """Test suite for EchoModel"""

    def setUp(self):
        """Set up test fixtures"""
        self.model = EchoModel()

    def test_initialization(self):
        """Test EchoModel initializes correctly"""
        self.assertEqual(self.model.name, "echo")
        self.assertIsNotNone(self.model)

    def test_complete_with_single_user_message(self):
        """Test complete returns echoed user message"""
        messages = [
            ModelMessage(role="user", content="Hello, world!")
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Echo: Hello, world!")
        self.assertEqual(result["tool_calls"], [])

    def test_complete_with_multiple_messages(self):
        """Test complete echoes the last user message"""
        messages = [
            ModelMessage(role="user", content="First message"),
            ModelMessage(role="assistant", content="Response"),
            ModelMessage(role="user", content="Second message")
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Echo: Second message")
        self.assertEqual(result["tool_calls"], [])

    def test_complete_with_no_user_messages(self):
        """Test complete handles no user messages gracefully"""
        messages = [
            ModelMessage(role="assistant", content="Only assistant message")
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Echo: (no user message)")
        self.assertEqual(result["tool_calls"], [])

    def test_complete_with_empty_messages(self):
        """Test complete with empty message list"""
        messages = []
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Echo: (no user message)")
        self.assertEqual(result["tool_calls"], [])

    def test_complete_with_tools_parameter(self):
        """Test complete accepts tools parameter (even though not used)"""
        messages = [
            ModelMessage(role="user", content="Test with tools")
        ]
        tools = [
            {"name": "test_tool", "description": "A test tool"}
        ]
        result = self.model.complete(messages, tools=tools)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Echo: Test with tools")
        self.assertEqual(result["tool_calls"], [])

    def test_complete_with_empty_user_content(self):
        """Test complete with empty user message content"""
        messages = [
            ModelMessage(role="user", content="")
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Echo: ")
        self.assertEqual(result["tool_calls"], [])

    def test_complete_with_multiline_content(self):
        """Test complete with multiline user message"""
        multiline_message = """Line 1
Line 2
Line 3"""
        messages = [
            ModelMessage(role="user", content=multiline_message)
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], f"Echo: {multiline_message}")
        self.assertEqual(result["tool_calls"], [])

    def test_complete_with_special_characters(self):
        """Test complete with special characters in message"""
        special_content = "Special: !@#$%^&*(){}[]|\\:;\"'<>,.?/~`"
        messages = [
            ModelMessage(role="user", content=special_content)
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], f"Echo: {special_content}")
        self.assertEqual(result["tool_calls"], [])

    def test_complete_with_unicode_characters(self):
        """Test complete with unicode characters"""
        unicode_content = "Hello 世界 🌍 مرحبا"
        messages = [
            ModelMessage(role="user", content=unicode_content)
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], f"Echo: {unicode_content}")
        self.assertEqual(result["tool_calls"], [])

    def test_complete_preserves_whitespace(self):
        """Test complete preserves whitespace in content"""
        content_with_whitespace = "  Content with   spaces  "
        messages = [
            ModelMessage(role="user", content=content_with_whitespace)
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], f"Echo: {content_with_whitespace}")

    def test_complete_with_mixed_roles(self):
        """Test complete filters correctly with mixed roles"""
        messages = [
            ModelMessage(role="system", content="System message"),
            ModelMessage(role="user", content="First user"),
            ModelMessage(role="assistant", content="Assistant response"),
            ModelMessage(role="user", content="Last user message")
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["content"], "Echo: Last user message")

    def test_complete_always_returns_empty_tool_calls(self):
        """Test complete always returns empty tool_calls list"""
        messages = [
            ModelMessage(role="user", content="Any message")
        ]
        result = self.model.complete(messages)
        
        self.assertIsInstance(result["tool_calls"], list)
        self.assertEqual(len(result["tool_calls"]), 0)

    def test_complete_with_none_tools(self):
        """Test complete explicitly with None tools parameter"""
        messages = [
            ModelMessage(role="user", content="Test message")
        ]
        result = self.model.complete(messages, tools=None)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Echo: Test message")

    def test_complete_with_very_long_message(self):
        """Test complete with very long user message"""
        long_message = "A" * 10000
        messages = [
            ModelMessage(role="user", content=long_message)
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], f"Echo: {long_message}")

    def test_complete_returns_dict(self):
        """Test complete returns a dictionary"""
        messages = [
            ModelMessage(role="user", content="Test")
        ]
        result = self.model.complete(messages)
        
        self.assertIsInstance(result, dict)
        self.assertIn("role", result)
        self.assertIn("content", result)
        self.assertIn("tool_calls", result)

    def test_multiple_calls_independent(self):
        """Test multiple calls to complete are independent"""
        messages1 = [ModelMessage(role="user", content="First call")]
        messages2 = [ModelMessage(role="user", content="Second call")]
        
        result1 = self.model.complete(messages1)
        result2 = self.model.complete(messages2)
        
        self.assertEqual(result1["content"], "Echo: First call")
        self.assertEqual(result2["content"], "Echo: Second call")

    def test_complete_with_only_system_messages(self):
        """Test complete with only system messages"""
        messages = [
            ModelMessage(role="system", content="System 1"),
            ModelMessage(role="system", content="System 2")
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["content"], "Echo: (no user message)")


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
        self.assertEqual(result["content"], "Echo: Generated message")

    def test_name_property(self):
        """Test model name property"""
        self.assertEqual(self.model.name, "echo")

    def test_inherits_from_model_provider(self):
        """Test EchoModel inherits from ModelProvider"""
        from agent.models.base import ModelProvider
        self.assertIsInstance(self.model, ModelProvider)

    def test_complete_with_whitespace_only_message(self):
        """Test complete with whitespace-only message"""
        messages = [
            ModelMessage(role="user", content="   \n\t   ")
        ]
        result = self.model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertIn("Echo:", result["content"])


if __name__ == '__main__':
    unittest.main()