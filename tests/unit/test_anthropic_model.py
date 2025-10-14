"""
Comprehensive Unit Tests for agent/models/anthropic.py
Tests AnthropicModel implementation
"""

import unittest
import sys
import os
from unittest.mock import MagicMock, patch

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.anthropic import AnthropicModel
from agent.models.base import ModelMessage


class TestAnthropicModel(unittest.TestCase):
    """Test suite for AnthropicModel"""
    
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
    
    def test_init_reads_api_key_from_env(self):
        """Test that API key is read from environment"""
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'}):
            model = AnthropicModel()
            self.assertEqual(model.api_key, 'test-key')
    
    def test_format_messages_user_assistant(self):
        """Test formatting user and assistant messages"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="user", content="Hello"),
            ModelMessage(role="assistant", content="Hi there"),
        ]
        formatted = model._format_messages(messages)
        self.assertEqual(len(formatted), 2)
        self.assertEqual(formatted[0]['role'], 'user')
        self.assertEqual(formatted[0]['content'], 'Hello')
    
    def test_format_messages_extracts_system(self):
        """Test that system messages are extracted separately"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="You are helpful"),
            ModelMessage(role="user", content="Hello"),
        ]
        formatted = model._format_messages(messages)
        self.assertEqual(len(formatted), 1)  # Only user message
        self.assertEqual(model._system_text, "You are helpful")
    
    def test_format_messages_multiple_system(self):
        """Test multiple system messages are concatenated"""
        model = AnthropicModel()
        messages = [
            ModelMessage(role="system", content="Part 1"),
            ModelMessage(role="system", content="Part 2"),
            ModelMessage(role="user", content="Hello"),
        ]
        model._format_messages(messages)
        self.assertEqual(model._system_text, "Part 1\n\nPart 2")
    
    def test_format_messages_no_system(self):
        """Test formatting with no system messages"""
        model = AnthropicModel()
        messages = [ModelMessage(role="user", content="Hello")]
        model._format_messages(messages)
        self.assertIsNone(model._system_text)
    
    @patch('agent.models.anthropic.Anthropic')
    def test_complete_success(self, mock_anthropic_class):
        """Test successful completion"""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        # Mock response
        mock_content_block = MagicMock()
        mock_content_block.type = "text"
        mock_content_block.text = "Hello from Claude"
        
        mock_message = MagicMock()
        mock_message.content = [mock_content_block]
        
        mock_client.messages.create.return_value = mock_message
        
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'}):
            model = AnthropicModel()
            messages = [ModelMessage(role="user", content="Hi")]
            result = model.complete(messages)
        
        self.assertEqual(result['role'], 'assistant')
        self.assertEqual(result['content'], 'Hello from Claude')
        self.assertEqual(result['tool_calls'], [])
    
    def test_complete_raises_without_anthropic_library(self):
        """Test that complete raises error when anthropic not installed"""
        with patch('agent.models.anthropic.Anthropic', None):
            model = AnthropicModel()
            messages = [ModelMessage(role="user", content="Hi")]
            with self.assertRaises(RuntimeError) as ctx:
                model.complete(messages)
            self.assertIn("anthropic package not installed", str(ctx.exception))
    
    def test_complete_raises_without_api_key(self):
        """Test that complete raises error when API key not set"""
        with patch.dict(os.environ, {}, clear=True):
            model = AnthropicModel()
            messages = [ModelMessage(role="user", content="Hi")]
            with self.assertRaises(RuntimeError) as ctx:
                model.complete(messages)
            self.assertIn("ANTHROPIC_API_KEY not set", str(ctx.exception))
    
    @patch('agent.models.anthropic.Anthropic')
    def test_stream_complete_yields_deltas(self, mock_anthropic_class):
        """Test streaming completion yields deltas"""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        # Mock stream events
        mock_delta1 = MagicMock()
        mock_delta1.type = "content_block_delta"
        mock_delta1.delta.text = "Hello"
        
        mock_delta2 = MagicMock()
        mock_delta2.type = "content_block_delta"
        mock_delta2.delta.text = " world"
        
        mock_stop = MagicMock()
        mock_stop.type = "message_stop"
        
        mock_stream = MagicMock()
        mock_stream.__enter__ = MagicMock(return_value=mock_stream)
        mock_stream.__exit__ = MagicMock(return_value=None)
        mock_stream.__iter__ = lambda _: iter([mock_delta1, mock_delta2, mock_stop])
        
        # Final message
        mock_content = MagicMock()
        mock_content.type = "text"
        mock_content.text = "Hello world"
        mock_final = MagicMock()
        mock_final.content = [mock_content]
        mock_stream.get_final_message.return_value = mock_final
        
        mock_client.messages.stream.return_value = mock_stream
        
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'}):
            model = AnthropicModel()
            messages = [ModelMessage(role="user", content="Hi")]
            chunks = list(model.stream_complete(messages))
        
        self.assertGreater(len(chunks), 0)
        # Should have delta chunks
        delta_chunks = [c for c in chunks if 'delta' in c]
        self.assertGreater(len(delta_chunks), 0)
        # Should have done chunk
        done_chunks = [c for c in chunks if c.get('done')]
        self.assertEqual(len(done_chunks), 1)
    
    def test_stream_complete_raises_without_anthropic_library(self):
        """Test streaming raises error when anthropic not installed"""
        with patch('agent.models.anthropic.Anthropic', None):
            model = AnthropicModel()
            messages = [ModelMessage(role="user", content="Hi")]
            gen = model.stream_complete(messages)
            with self.assertRaises(RuntimeError) as ctx:
                next(gen)
            self.assertIn("anthropic package not installed", str(ctx.exception))
            

if __name__ == '__main__':
    unittest.main()