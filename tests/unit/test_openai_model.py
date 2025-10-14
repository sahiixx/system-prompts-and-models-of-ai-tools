"""
Comprehensive Unit Tests for agent/models/openai.py - Extended Features
Tests OpenAI streaming and enhanced functionality
"""

import unittest
import sys
import os
from unittest.mock import MagicMock, patch, call

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.openai import OpenAIModel
from agent.models.base import ModelMessage


class TestOpenAIModelStreaming(unittest.TestCase):
    """Test suite for OpenAI model streaming"""
    
    def test_stream_complete_basic(self):
        """Test basic streaming completion"""
        with patch('agent.models.openai.openai') as mock_openai:
            mock_client = MagicMock()
            mock_openai.OpenAI.return_value = mock_client
            
            # Mock stream events
            mock_event1 = MagicMock()
            mock_event1.type = "content.delta"
            mock_event1.delta.content = "Hello"
            
            mock_event2 = MagicMock()
            mock_event2.type = "content.delta"
            mock_event2.delta.content = " world"
            
            mock_event3 = MagicMock()
            mock_event3.type = "message.complete"
            mock_message = MagicMock()
            mock_message.content = "Hello world"
            mock_message.tool_calls = None
            mock_event3.message = mock_message
            
            mock_stream = MagicMock()
            mock_stream.__enter__ = MagicMock(return_value=mock_stream)
            mock_stream.__exit__ = MagicMock(return_value=None)
            mock_stream.__iter__ = lambda: iter([mock_event1, mock_event2, mock_event3])
            
            mock_client.chat.completions.stream.return_value = mock_stream
            
            with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'}):
                model = OpenAIModel()
                messages = [ModelMessage(role="user", content="Hi")]
                chunks = list(model.stream_complete(messages))
            
            self.assertGreater(len(chunks), 0)
            # Should have delta chunks
            delta_chunks = [c for c in chunks if 'delta' in c]
            self.assertGreater(len(delta_chunks), 0)
            # Should have done chunk
            done_chunks = [c for c in chunks if c.get('done')]
            self.assertEqual(len(done_chunks), 1)
    
    def test_stream_complete_with_tool_calls(self):
        """Test streaming with tool calls"""
        with patch('agent.models.openai.openai') as mock_openai:
            mock_client = MagicMock()
            mock_openai.OpenAI.return_value = mock_client
            
            mock_event = MagicMock()
            mock_event.type = "message.complete"
            mock_message = MagicMock()
            mock_message.content = "Using tool"
            
            # Mock tool calls
            mock_tc = MagicMock()
            mock_tc.function.name = "test_tool"
            mock_tc.function.arguments = '{"x": 1}'
            mock_message.tool_calls = [mock_tc]
            mock_event.message = mock_message
            
            mock_stream = MagicMock()
            mock_stream.__enter__ = MagicMock(return_value=mock_stream)
            mock_stream.__exit__ = MagicMock(return_value=None)
            mock_stream.__iter__ = lambda: iter([mock_event])
            
            mock_client.chat.completions.stream.return_value = mock_stream
            
            with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'}):
                model = OpenAIModel()
                messages = [ModelMessage(role="user", content="Hi")]
                chunks = list(model.stream_complete(messages))
            
            done_chunk = next(c for c in chunks if c.get('done'))
            self.assertIn('tool_calls', done_chunk)
            self.assertEqual(len(done_chunk['tool_calls']), 1)
    
    def test_stream_complete_raises_without_openai(self):
        """Test that streaming raises error when openai not installed"""
        with patch('agent.models.openai.openai', None):
            model = OpenAIModel()
            messages = [ModelMessage(role="user", content="Hi")]
            gen = model.stream_complete(messages)
            with self.assertRaises(RuntimeError) as ctx:
                next(gen)
            self.assertIn("openai package not installed", str(ctx.exception))
    
    def test_stream_complete_raises_without_api_key(self):
        """Test streaming raises error when API key not set"""
        with patch.dict(os.environ, {}, clear=True):
            with patch('agent.models.openai.openai'):
                model = OpenAIModel()
                messages = [ModelMessage(role="user", content="Hi")]
                gen = model.stream_complete(messages)
                with self.assertRaises(RuntimeError) as ctx:
                    next(gen)
                self.assertIn("OPENAI_API_KEY not set", str(ctx.exception))
    
    def test_stream_complete_handles_message_with_name(self):
        """Test that streaming handles messages with name field"""
        with patch('agent.models.openai.openai') as mock_openai:
            mock_client = MagicMock()
            mock_openai.OpenAI.return_value = mock_client
            
            mock_event = MagicMock()
            mock_event.type = "message.complete"
            mock_message = MagicMock()
            mock_message.content = "Response"
            mock_message.tool_calls = None
            mock_event.message = mock_message
            
            mock_stream = MagicMock()
            mock_stream.__enter__ = MagicMock(return_value=mock_stream)
            mock_stream.__exit__ = MagicMock(return_value=None)
            mock_stream.__iter__ = lambda: iter([mock_event])
            
            mock_client.chat.completions.stream.return_value = mock_stream
            
            with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'}):
                model = OpenAIModel()
                messages = [
                    ModelMessage(role="tool", content="result", name="my_tool")
                ]
                list(model.stream_complete(messages))
            
            # Verify the formatted message was passed correctly
            call_args = mock_client.chat.completions.stream.call_args
            formatted_msgs = call_args[1]['messages']
            # Should have name field for tool message
            self.assertTrue(any('name' in msg for msg in formatted_msgs))


if __name__ == '__main__':
    unittest.main()