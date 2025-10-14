"""
Comprehensive Unit Tests for agent/models/anthropic.py
Tests AnthropicModel functionality and API interactions
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
    def test_init_loads_api_key_from_env(self):
        """Test initialization loads API key from environment"""
        model = AnthropicModel()
        self.assertEqual(model.api_key, 'test-key-123')
    
    @patch.dict(os.environ, {}, clear=True)
    def test_init_no_api_key(self):
        """Test initialization without API key"""
        model = AnthropicModel()
        self.assertIsNone(model.api_key)


class TestAnthropicModelFormatMessages(unittest.TestCase):
    """Test suite for AnthropicModel message formatting"""
    
    def test_format_messages_simple_user_message(self):
        """Test formatting simple user message"""
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Hello")]
        
        formatted = model._format_messages(messages)
        
        self.assertEqual(len(formatted), 1)
        self.assertEqual(formatted[0]["role"], "user")
        self.assertEqual(formatted[0]["content"], "Hello")
    
    def test_format_messages_with_system(self):
        """Test formatting messages with system prompt"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="You are helpful"),
            ModelMessage(role="user", content="Hello")
        ]
        
        formatted = model._format_messages(messages)
        
        # System should be extracted
        self.assertEqual(len(formatted), 1)
        self.assertEqual(formatted[0]["role"], "user")
        self.assertEqual(model._system_text, "You are helpful")
    
    def test_format_messages_multiple_system_messages(self):
        """Test formatting multiple system messages"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="Part 1"),
            ModelMessage(role="system", content="Part 2"),
            ModelMessage(role="user", content="Hello")
        ]
        
        model._format_messages(messages)
        
        # Multiple system messages should be joined
        self.assertEqual(model._system_text, "Part 1\n\nPart 2")
    
    def test_format_messages_filters_non_user_assistant(self):
        """Test that non-user/assistant messages are filtered"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="user", content="Hello"),
            ModelMessage(role="tool", content="Tool result"),
            ModelMessage(role="assistant", content="Response")
        ]
        
        formatted = model._format_messages(messages)
        
        # Only user and assistant should remain
        self.assertEqual(len(formatted), 2)
        roles = [m["role"] for m in formatted]
        self.assertEqual(roles, ["user", "assistant"])


class TestAnthropicModelComplete(unittest.TestCase):
    """Test suite for AnthropicModel.complete method"""
    
    @patch('agent.models.anthropic.Anthropic', None)
    def test_complete_raises_without_anthropic_library(self):
        """Test that RuntimeError is raised when anthropic is not available"""
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)
        
        self.assertIn("anthropic package not installed", str(context.exception))
    
    @patch('agent.models.anthropic.Anthropic')
    @patch.dict(os.environ, {}, clear=True)
    def test_complete_raises_without_api_key(self, _mock_anthropic_class):
        """Test that RuntimeError is raised when API key is not set"""
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)
        
        self.assertIn("ANTHROPIC_API_KEY not set", str(context.exception))
    
    @patch('agent.models.anthropic.Anthropic')
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    def test_complete_simple_message(self, mock_anthropic_class):
        """Test completing with a simple message"""
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
    
    @patch('agent.models.anthropic.Anthropic')
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    def test_complete_makes_correct_api_call(self, mock_anthropic_class):
        """Test that correct API call is made"""
        mock_client = Mock()
        mock_anthropic_class.return_value = mock_client
        
        mock_content_block = Mock()
        mock_content_block.type = "text"
        mock_content_block.text = "Response"
        
        mock_message = Mock()
        mock_message.content = [mock_content_block]
        
        mock_client.messages.create.return_value = mock_message
        
        model = AnthropicModel(model="claude-3-opus-20240229")
        messages = [
            ModelMessage(role="system", content="Be helpful"),
            ModelMessage(role="user", content="Test message")
        ]
        model.complete(messages)
        
        mock_client.messages.create.assert_called_once()
        call_kwargs = mock_client.messages.create.call_args[1]
        
        self.assertEqual(call_kwargs['model'], "claude-3-opus-20240229")
        self.assertEqual(call_kwargs['max_tokens'], 1024)
        self.assertEqual(call_kwargs['system'], "Be helpful")
        self.assertEqual(len(call_kwargs['messages']), 1)
        self.assertEqual(call_kwargs['messages'][0]['content'], "Test message")
    
    @patch('agent.models.anthropic.Anthropic')
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    def test_complete_multiple_content_blocks(self, mock_anthropic_class):
        """Test completing with multiple content blocks"""
        mock_client = Mock()
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
        messages = [ModelMessage(role="user", content="Test")]
        result = model.complete(messages)
        
        self.assertEqual(result["content"], "Part 1 Part 2")


class TestAnthropicModelStreamComplete(unittest.TestCase):
    """Test suite for AnthropicModel.stream_complete method"""
    
    @patch('agent.models.anthropic.Anthropic', None)
    def test_stream_complete_raises_without_anthropic_library(self):
        """Test that RuntimeError is raised when anthropic is not available"""
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            list(model.stream_complete(messages))
        
        self.assertIn("anthropic package not installed", str(context.exception))
    
    @patch('agent.models.anthropic.Anthropic')
    @patch.dict(os.environ, {}, clear=True)
    def test_stream_complete_raises_without_api_key(self, _mock_anthropic_class):
        """Test that RuntimeError is raised when API key is not set"""
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            list(model.stream_complete(messages))
        
        self.assertIn("ANTHROPIC_API_KEY not set", str(context.exception))
    
    @patch('agent.models.anthropic.Anthropic')
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    def test_stream_complete_yields_deltas(self, mock_anthropic_class):
        """Test streaming yields delta chunks"""
        mock_client = Mock()
        mock_anthropic_class.return_value = mock_client
        
        # Create mock events
        mock_event1 = Mock()
        mock_event1.type = "content_block_delta"
        mock_event1.delta = Mock()
        mock_event1.delta.text = "Hello"
        
        mock_event2 = Mock()
        mock_event2.type = "content_block_delta"
        mock_event2.delta = Mock()
        mock_event2.delta.text = " world"
        
        mock_event3 = Mock()
        mock_event3.type = "message_stop"
        
        mock_stream = Mock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_event1, mock_event2, mock_event3]))
        
        mock_final_block = Mock()
        mock_final_block.type = "text"
        mock_final_block.text = "Hello world"
        
        mock_final_message = Mock()
        mock_final_message.content = [mock_final_block]
        
        mock_stream.get_final_message.return_value = mock_final_message
        
        mock_client.messages.stream.return_value = mock_stream
        
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Test")]
        chunks = list(model.stream_complete(messages))
        
        # Should have delta chunks and final done chunk
        delta_chunks = [c for c in chunks if "delta" in c]
        done_chunks = [c for c in chunks if c.get("done")]
        
        self.assertEqual(len(delta_chunks), 2)
        self.assertEqual(delta_chunks[0]["delta"], "Hello")
        self.assertEqual(delta_chunks[1]["delta"], " world")
        
        self.assertEqual(len(done_chunks), 1)
        self.assertEqual(done_chunks[0]["content"], "Hello world")
        self.assertEqual(done_chunks[0]["tool_calls"], [])
    
    @patch('agent.models.anthropic.Anthropic')
    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    def test_stream_complete_skips_empty_deltas(self, mock_anthropic_class):
        """Test streaming skips empty delta text"""
        mock_client = Mock()
        mock_anthropic_class.return_value = mock_client
        
        mock_event1 = Mock()
        mock_event1.type = "content_block_delta"
        mock_event1.delta = Mock()
        mock_event1.delta.text = ""  # Empty delta
        
        mock_event2 = Mock()
        mock_event2.type = "content_block_delta"
        mock_event2.delta = Mock()
        mock_event2.delta.text = "Content"
        
        mock_event3 = Mock()
        mock_event3.type = "message_stop"
        
        mock_stream = Mock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_event1, mock_event2, mock_event3]))
        
        mock_final_block = Mock()
        mock_final_block.type = "text"
        mock_final_block.text = "Content"
        
        mock_final_message = Mock()
        mock_final_message.content = [mock_final_block]
        
        mock_stream.get_final_message.return_value = mock_final_message
        
        mock_client.messages.stream.return_value = mock_stream
        
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Test")]
        chunks = list(model.stream_complete(messages))
        
        # Should only yield non-empty delta
        delta_chunks = [c for c in chunks if "delta" in c]
        self.assertEqual(len(delta_chunks), 1)
        self.assertEqual(delta_chunks[0]["delta"], "Content")


if __name__ == '__main__':
    unittest.main()