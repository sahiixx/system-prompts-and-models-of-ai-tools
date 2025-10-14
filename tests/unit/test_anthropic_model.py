"""
Comprehensive Unit Tests for agent/models/anthropic.py
Tests AnthropicModel functionality and streaming
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
        model = AnthropicModel(model="claude-3-opus")
        self.assertEqual(model.model, "claude-3-opus")
        self.assertEqual(model.name, "claude-3-opus")
    
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key-123'})
    def test_init_reads_api_key_from_env(self):
        """Test that API key is read from environment"""
        model = AnthropicModel()
        self.assertEqual(model.api_key, 'test-key-123')


class TestAnthropicModelFormatMessages(unittest.TestCase):
    """Test suite for AnthropicModel._format_messages"""
    
    def test_format_messages_separates_system(self):
        """Test that system messages are separated from conversation"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="You are helpful"),
            ModelMessage(role="user", content="Hello"),
            ModelMessage(role="assistant", content="Hi there")
        ]
        
        formatted = model._format_messages(messages)
        
        # System should be extracted
        self.assertEqual(len(formatted), 2)
        self.assertEqual(formatted[0]["role"], "user")
        self.assertEqual(formatted[1]["role"], "assistant")
        self.assertEqual(model._system_text, "You are helpful")
    
    def test_format_messages_multiple_system_prompts(self):
        """Test that multiple system messages are joined"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="First instruction"),
            ModelMessage(role="system", content="Second instruction"),
            ModelMessage(role="user", content="Hello")
        ]
        
        formatted = model._format_messages(messages)
        
        self.assertEqual(model._system_text, "First instruction\n\nSecond instruction")
        self.assertEqual(len(formatted), 1)
    
    def test_format_messages_no_system(self):
        """Test formatting with no system messages"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="user", content="Hello"),
            ModelMessage(role="assistant", content="Hi")
        ]
        
        formatted = model._format_messages(messages)
        
        self.assertIsNone(model._system_text)
        self.assertEqual(len(formatted), 2)


class TestAnthropicModelComplete(unittest.TestCase):
    """Test suite for AnthropicModel.complete"""
    
    @patch('agent.models.anthropic.Anthropic')
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    def test_complete_simple_message(self, mock_anthropic_class):
        """Test completing with a simple message"""
        # Mock the client and response
        mock_client = Mock()
        mock_anthropic_class.return_value = mock_client
        
        mock_content_block = Mock()
        mock_content_block.type = "text"
        mock_content_block.text = "Hello, world!"
        
        mock_message = Mock()
        mock_message.content = [mock_content_block]
        
        mock_client.messages.create.return_value = mock_message
        
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Hi")]
        result = model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Hello, world!")
        self.assertEqual(result["tool_calls"], [])
    
    @patch('agent.models.anthropic.Anthropic', None)
    def test_complete_raises_without_anthropic_library(self):
        """Test that RuntimeError is raised when anthropic is not available"""
        model = AnthropicModel()
        model.api_key = "test"
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)
        
        self.assertIn("anthropic package not installed", str(context.exception))
    
    @patch('agent.models.anthropic.Anthropic')
    def test_complete_raises_without_api_key(self, _mock_anthropic_class):
        """Test that RuntimeError is raised when API key is missing"""
        model = AnthropicModel()
        model.api_key = None
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)
        
        self.assertIn("ANTHROPIC_API_KEY not set", str(context.exception))
    
    @patch('agent.models.anthropic.Anthropic')
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    def test_complete_with_system_prompt(self, mock_anthropic_class):
        """Test that system prompt is passed correctly"""
        mock_client = Mock()
        mock_anthropic_class.return_value = mock_client
        
        mock_content_block = Mock()
        mock_content_block.type = "text"
        mock_content_block.text = "Response"
        
        mock_message = Mock()
        mock_message.content = [mock_content_block]
        
        mock_client.messages.create.return_value = mock_message
        
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="Be helpful"),
            ModelMessage(role="user", content="Help me")
        ]
        model.complete(messages)
        
        # Verify create was called with system parameter
        call_kwargs = mock_client.messages.create.call_args[1]
        self.assertEqual(call_kwargs['system'], "Be helpful")


class TestAnthropicModelStreamComplete(unittest.TestCase):
    """Test suite for AnthropicModel.stream_complete"""
    
    @patch('agent.models.anthropic.Anthropic')
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    def test_stream_complete_yields_deltas(self, mock_anthropic_class):
        """Test that streaming yields delta chunks"""
        mock_client = Mock()
        mock_anthropic_class.return_value = mock_client
        
        # Mock stream events
        mock_delta_event1 = Mock()
        mock_delta_event1.type = "content_block_delta"
        mock_delta_event1.delta = Mock()
        mock_delta_event1.delta.text = "Hello"
        
        mock_delta_event2 = Mock()
        mock_delta_event2.type = "content_block_delta"
        mock_delta_event2.delta = Mock()
        mock_delta_event2.delta.text = " world"
        
        mock_stop_event = Mock()
        mock_stop_event.type = "message_stop"
        
        # Mock final message
        mock_content_block = Mock()
        mock_content_block.type = "text"
        mock_content_block.text = "Hello world"
        
        mock_final_message = Mock()
        mock_final_message.content = [mock_content_block]
        
        # Mock stream context manager
        mock_stream = Mock()
        mock_stream.__enter__ = Mock(return_value=[mock_delta_event1, mock_delta_event2, mock_stop_event])
        mock_stream.__exit__ = Mock(return_value=None)
        mock_stream.get_final_message.return_value = mock_final_message
        
        mock_client.messages.stream.return_value = mock_stream
        
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Hi")]
        
        chunks = list(model.stream_complete(messages))
        
        # Should have 2 delta chunks and 1 done chunk
        self.assertEqual(len(chunks), 3)
        self.assertEqual(chunks[0]["delta"], "Hello")
        self.assertEqual(chunks[1]["delta"], " world")
        self.assertTrue(chunks[2]["done"])
        self.assertEqual(chunks[2]["content"], "Hello world")


if __name__ == '__main__':
    unittest.main()