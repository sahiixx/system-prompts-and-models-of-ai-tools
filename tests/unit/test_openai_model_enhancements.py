"""
Comprehensive Unit Tests for agent/models/openai.py streaming enhancements
Tests OpenAIModel.stream_complete method
"""

import unittest
import sys
import os
from unittest.mock import patch, MagicMock, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.openai import OpenAIModel
from agent.models.base import ModelMessage


class TestOpenAIModelStreamComplete(unittest.TestCase):
    """Test suite for OpenAIModel.stream_complete method"""
    
    @patch('agent.models.openai.openai', None)
    def test_stream_complete_raises_without_openai_library(self):
        """Test that RuntimeError is raised when openai is not available"""
        model = OpenAIModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            list(model.stream_complete(messages))
        
        self.assertIn("openai package not installed", str(context.exception))
    
    @patch('agent.models.openai.openai')
    @patch.dict(os.environ, {}, clear=True)
    def test_stream_complete_raises_without_api_key(self, _mock_openai_module):
        """Test that RuntimeError is raised when API key is not set"""
        model = OpenAIModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            list(model.stream_complete(messages))
        
        self.assertIn("OPENAI_API_KEY not set", str(context.exception))
    
    @patch('agent.models.openai.openai')
    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'})
    def test_stream_complete_yields_content_deltas(self, mock_openai_module):
        """Test streaming yields content delta chunks"""
        mock_client = Mock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        # Create mock events
        mock_event1 = Mock()
        mock_event1.type = "content.delta"
        mock_event1.delta = Mock()
        mock_event1.delta.content = "Hello"
        
        mock_event2 = Mock()
        mock_event2.type = "content.delta"
        mock_event2.delta = Mock()
        mock_event2.delta.content = " world"
        
        mock_event3 = Mock()
        mock_event3.type = "message.complete"
        mock_event3.message = Mock()
        mock_event3.message.content = "Hello world"
        mock_event3.message.tool_calls = None
        
        mock_stream = Mock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_event1, mock_event2, mock_event3]))
        
        mock_client.chat.completions.stream.return_value = mock_stream
        
        model = OpenAIModel()
        messages = [ModelMessage(role="user", content="Test")]
        chunks = list(model.stream_complete(messages))
        
        # Should have delta chunks and done chunk
        delta_chunks = [c for c in chunks if "delta" in c]
        done_chunks = [c for c in chunks if c.get("done")]
        
        self.assertEqual(len(delta_chunks), 2)
        self.assertEqual(delta_chunks[0]["delta"], "Hello")
        self.assertEqual(delta_chunks[1]["delta"], " world")
        
        self.assertEqual(len(done_chunks), 1)
        self.assertEqual(done_chunks[0]["content"], "Hello world")
    
    @patch('agent.models.openai.openai')
    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'})
    def test_stream_complete_with_tool_calls(self, mock_openai_module):
        """Test streaming with tool calls in final message"""
        mock_client = Mock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        mock_tool_call = Mock()
        mock_tool_call.function.name = "test_tool"
        mock_tool_call.function.arguments = '{"key": "value"}'
        
        mock_event = Mock()
        mock_event.type = "message.complete"
        mock_event.message = Mock()
        mock_event.message.content = "Using tool"
        mock_event.message.tool_calls = [mock_tool_call]
        
        mock_stream = Mock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_event]))
        
        mock_client.chat.completions.stream.return_value = mock_stream
        
        model = OpenAIModel()
        messages = [ModelMessage(role="user", content="Test")]
        chunks = list(model.stream_complete(messages))
        
        done_chunks = [c for c in chunks if c.get("done")]
        self.assertEqual(len(done_chunks), 1)
        self.assertEqual(len(done_chunks[0]["tool_calls"]), 1)
        self.assertEqual(done_chunks[0]["tool_calls"][0]["name"], "test_tool")
    
    @patch('agent.models.openai.openai')
    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'})
    def test_stream_complete_skips_empty_deltas(self, mock_openai_module):
        """Test streaming skips empty content deltas"""
        mock_client = Mock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        mock_event1 = Mock()
        mock_event1.type = "content.delta"
        mock_event1.delta = Mock()
        mock_event1.delta.content = None  # Empty/None delta
        
        mock_event2 = Mock()
        mock_event2.type = "content.delta"
        mock_event2.delta = Mock()
        mock_event2.delta.content = "Content"
        
        mock_event3 = Mock()
        mock_event3.type = "message.complete"
        mock_event3.message = Mock()
        mock_event3.message.content = "Content"
        mock_event3.message.tool_calls = None
        
        mock_stream = Mock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_event1, mock_event2, mock_event3]))
        
        mock_client.chat.completions.stream.return_value = mock_stream
        
        model = OpenAIModel()
        messages = [ModelMessage(role="user", content="Test")]
        chunks = list(model.stream_complete(messages))
        
        delta_chunks = [c for c in chunks if "delta" in c]
        self.assertEqual(len(delta_chunks), 1)
        self.assertEqual(delta_chunks[0]["delta"], "Content")
    
    @patch('agent.models.openai.openai')
    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'})
    def test_stream_complete_with_tools_parameter(self, mock_openai_module):
        """Test streaming passes tools parameter correctly"""
        mock_client = Mock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        mock_event = Mock()
        mock_event.type = "message.complete"
        mock_event.message = Mock()
        mock_event.message.content = "Response"
        mock_event.message.tool_calls = None
        
        mock_stream = Mock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_event]))
        
        mock_client.chat.completions.stream.return_value = mock_stream
        
        model = OpenAIModel(model="gpt-4")
        messages = [ModelMessage(role="user", content="Test")]
        tools = [{"type": "function", "function": {"name": "test"}}]
        
        list(model.stream_complete(messages, tools=tools))
        
        # Verify stream was called with tools
        call_kwargs = mock_client.chat.completions.stream.call_args[1]
        self.assertEqual(call_kwargs["model"], "gpt-4")
        self.assertEqual(call_kwargs["tools"], tools)


if __name__ == '__main__':
    unittest.main()