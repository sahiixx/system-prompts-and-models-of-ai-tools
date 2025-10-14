"""
Comprehensive Unit Tests for agent/models/anthropic.py
Tests AnthropicModel functionality including initialization, message formatting, and streaming
"""

import unittest
import sys
import os
from unittest.mock import patch, MagicMock, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.anthropic import AnthropicModel
from agent.models.base import ModelMessage


class TestAnthropicModelInitialization(unittest.TestCase):
    """Test suite for AnthropicModel initialization"""
    
    def test_init_default_model(self):
        """Test initialization with default model"""
        model = AnthropicModel()
        self.assertEqual(model.model, "claude-3-5-sonnet-latest")
        self.assertEqual(model.name, "claude-3-5-sonnet-latest")
    
    def test_init_custom_model(self):
        """Test initialization with custom model"""
        model = AnthropicModel(model="claude-3-opus-20240229")
        self.assertEqual(model.model, "claude-3-opus-20240229")
        self.assertEqual(model.name, "claude-3-opus-20240229")
    
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key-123'})
    def test_init_api_key_from_env(self):
        """Test that API key is loaded from environment"""
        model = AnthropicModel()
        self.assertEqual(model.api_key, "test-key-123")
    
    @patch.dict(os.environ, {}, clear=True)
    def test_init_no_api_key(self):
        """Test initialization when no API key is set"""
        model = AnthropicModel()
        self.assertIsNone(model.api_key)


class TestAnthropicMessageFormatting(unittest.TestCase):
    """Test suite for _format_messages method"""
    
    def test_format_user_message(self):
        """Test formatting a simple user message"""
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Hello")]
        formatted = model._format_messages(messages)
        
        self.assertEqual(len(formatted), 1)
        self.assertEqual(formatted[0]["role"], "user")
        self.assertEqual(formatted[0]["content"], "Hello")
        self.assertIsNone(model._system_text)
    
    def test_format_system_message(self):
        """Test that system messages are extracted separately"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="You are helpful"),
            ModelMessage(role="user", content="Hello")
        ]
        formatted = model._format_messages(messages)
        
        self.assertEqual(len(formatted), 1)
        self.assertEqual(formatted[0]["role"], "user")
        self.assertEqual(model._system_text, "You are helpful")
    
    def test_format_multiple_system_messages(self):
        """Test that multiple system messages are joined"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="System 1"),
            ModelMessage(role="system", content="System 2"),
            ModelMessage(role="user", content="Hello")
        ]
        formatted = model._format_messages(messages)
        
        self.assertEqual(len(formatted), 1)
        self.assertEqual(model._system_text, "System 1\n\nSystem 2")
    
    def test_format_conversation(self):
        """Test formatting a multi-turn conversation"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="Be helpful"),
            ModelMessage(role="user", content="Hi"),
            ModelMessage(role="assistant", content="Hello!"),
            ModelMessage(role="user", content="How are you?")
        ]
        formatted = model._format_messages(messages)
        
        self.assertEqual(len(formatted), 3)
        self.assertEqual(formatted[0]["role"], "user")
        self.assertEqual(formatted[1]["role"], "assistant")
        self.assertEqual(formatted[2]["role"], "user")
        self.assertEqual(model._system_text, "Be helpful")
    
    def test_format_tool_role_filtered_out(self):
        """Test that tool role messages are filtered out"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="user", content="Use tool"),
            ModelMessage(role="tool", content="Tool result"),
            ModelMessage(role="assistant", content="Done")
        ]
        formatted = model._format_messages(messages)
        
        self.assertEqual(len(formatted), 2)
        self.assertEqual(formatted[0]["role"], "user")
        self.assertEqual(formatted[1]["role"], "assistant")


class TestAnthropicComplete(unittest.TestCase):
    """Test suite for complete method"""
    
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    @patch('agent.models.anthropic.Anthropic')
    def test_complete_simple_message(self, mock_anthropic_class):
        """Test completing with a simple message"""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        mock_content_block = Mock()
        mock_content_block.type = "text"
        mock_content_block.text = "Hello back!"
        
        mock_message = Mock()
        mock_message.content = [mock_content_block]
        mock_client.messages.create.return_value = mock_message
        
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Hello")]
        result = model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Hello back!")
        self.assertEqual(result["tool_calls"], [])
    
    @patch('agent.models.anthropic.Anthropic', None)
    def test_complete_raises_without_anthropic_library(self):
        """Test that RuntimeError is raised when anthropic is not available"""
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)
        
        self.assertIn("anthropic package not installed", str(context.exception))
    
    @patch('agent.models.anthropic.Anthropic')
    def test_complete_raises_without_api_key(self, _mock_anthropic_class):
        """Test that RuntimeError is raised when API key is not set"""
        model = AnthropicModel()
        model.api_key = None
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)
        
        self.assertIn("ANTHROPIC_API_KEY not set", str(context.exception))
    
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    @patch('agent.models.anthropic.Anthropic')
    def test_complete_with_system_prompt(self, mock_anthropic_class):
        """Test that system prompt is passed correctly"""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        mock_content_block = Mock()
        mock_content_block.type = "text"
        mock_content_block.text = "Response"
        
        mock_message = Mock()
        mock_message.content = [mock_content_block]
        mock_client.messages.create.return_value = mock_message
        
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="Be concise"),
            ModelMessage(role="user", content="Hello")
        ]
        model.complete(messages)
        
        call_kwargs = mock_client.messages.create.call_args[1]
        self.assertEqual(call_kwargs["system"], "Be concise")
    
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    @patch('agent.models.anthropic.Anthropic')
    def test_complete_multiple_content_blocks(self, mock_anthropic_class):
        """Test handling multiple content blocks"""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        mock_block1 = Mock()
        mock_block1.type = "text"
        mock_block1.text = "Part 1 "
        
        mock_block2 = Mock()
        mock_block2.type = "text"
        mock_block2.text = "Part 2"
        
        mock_message = Mock()
        mock_message.content = [mock_block1, mock_block2]
        mock_client.messages.create.return_value = mock_message
        
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Hello")]
        result = model.complete(messages)
        
        self.assertEqual(result["content"], "Part 1 Part 2")


class TestAnthropicStreaming(unittest.TestCase):
    """Test suite for stream_complete method"""
    
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    @patch('agent.models.anthropic.Anthropic')
    def test_stream_complete_yields_deltas(self, mock_anthropic_class):
        """Test that streaming yields delta chunks"""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        # Create mock events
        mock_event1 = Mock()
        mock_event1.type = "content_block_delta"
        mock_event1.delta = Mock()
        mock_event1.delta.text = "Hello "
        
        mock_event2 = Mock()
        mock_event2.type = "content_block_delta"
        mock_event2.delta = Mock()
        mock_event2.delta.text = "world!"
        
        mock_event3 = Mock()
        mock_event3.type = "message_stop"
        
        mock_final_block = Mock()
        mock_final_block.type = "text"
        mock_final_block.text = "Hello world!"
        
        mock_final_message = Mock()
        mock_final_message.content = [mock_final_block]
        
        mock_stream = MagicMock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_event1, mock_event2, mock_event3]))
        mock_stream.get_final_message.return_value = mock_final_message
        
        mock_client.messages.stream.return_value = mock_stream
        
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Hi")]
        
        chunks = list(model.stream_complete(messages))
        
        self.assertEqual(len(chunks), 3)
        self.assertEqual(chunks[0]["delta"], "Hello ")
        self.assertEqual(chunks[1]["delta"], "world!")
        self.assertTrue(chunks[2]["done"])
        self.assertEqual(chunks[2]["content"], "Hello world!")
    
    @patch('agent.models.anthropic.Anthropic', None)
    def test_stream_complete_raises_without_anthropic_library(self):
        """Test that RuntimeError is raised when anthropic is not available"""
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            list(model.stream_complete(messages))
        
        self.assertIn("anthropic package not installed", str(context.exception))
    
    @patch('agent.models.anthropic.Anthropic')
    def test_stream_complete_raises_without_api_key(self, _mock_anthropic_class):
        """Test that RuntimeError is raised when API key is not set"""
        model = AnthropicModel()
        model.api_key = None
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            list(model.stream_complete(messages))
        
        self.assertIn("ANTHROPIC_API_KEY not set", str(context.exception))


if __name__ == '__main__':
    unittest.main()