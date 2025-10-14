"""
Comprehensive Unit Tests for OpenAI streaming functionality
Tests stream_complete method in agent/models/openai.py
"""

import unittest
import sys
import os
from unittest.mock import patch, MagicMock, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.openai import OpenAIModel
from agent.models.base import ModelMessage


class TestOpenAIStreamComplete(unittest.TestCase):
    """Test suite for OpenAIModel.stream_complete method"""

    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'})
    @patch('agent.models.openai.openai')
    def test_stream_complete_yields_deltas(self, mock_openai_module):
        """Test that streaming yields content deltas"""
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client

        # Create mock events
        mock_event1 = Mock()
        mock_event1.type = "content.delta"
        mock_event1.delta = Mock()
        mock_event1.delta.content = "Hello "

        mock_event2 = Mock()
        mock_event2.type = "content.delta"
        mock_event2.delta = Mock()
        mock_event2.delta.content = "world!"

        mock_event3 = Mock()
        mock_event3.type = "message.complete"
        mock_event3.message = Mock()
        mock_event3.message.content = "Hello world!"
        mock_event3.message.tool_calls = None

        mock_stream = MagicMock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_event1, mock_event2, mock_event3]))

        mock_client.chat.completions.stream.return_value = mock_stream

        model = OpenAIModel()
        messages = [ModelMessage(role="user", content="Hi")]

        chunks = list(model.stream_complete(messages))

        self.assertEqual(len(chunks), 3)
        self.assertEqual(chunks[0]["delta"], "Hello ")
        self.assertEqual(chunks[1]["delta"], "world!")
        self.assertTrue(chunks[2]["done"])
        self.assertEqual(chunks[2]["content"], "Hello world!")

    @patch('agent.models.openai.openai', None)
    def test_stream_complete_raises_without_openai_library(self):
        """Test that RuntimeError is raised when openai is not available"""
        model = OpenAIModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError) as context:
            list(model.stream_complete(messages))

        self.assertIn("openai package not installed", str(context.exception))

    @patch('agent.models.openai.openai')
    def test_stream_complete_raises_without_api_key(self, _mock_openai_module):
        """Test that RuntimeError is raised when API key is not set"""
        model = OpenAIModel()
        model.api_key = None
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError) as context:
            list(model.stream_complete(messages))

        self.assertIn("OPENAI_API_KEY not set", str(context.exception))

    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'})
    @patch('agent.models.openai.openai')
    def test_stream_complete_with_tool_calls(self, mock_openai_module):
        """Test streaming with tool calls"""
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client

        mock_tool_call = Mock()
        mock_tool_call.function.name = "test_tool"
        mock_tool_call.function.arguments = '{"arg": "value"}'

        mock_complete_event = Mock()
        mock_complete_event.type = "message.complete"
        mock_complete_event.message = Mock()
        mock_complete_event.message.content = "Using tool"
        mock_complete_event.message.tool_calls = [mock_tool_call]

        mock_stream = MagicMock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_complete_event]))

        mock_client.chat.completions.stream.return_value = mock_stream

        model = OpenAIModel()
        messages = [ModelMessage(role="user", content="Use tool")]

        chunks = list(model.stream_complete(messages))

        final_chunk = chunks[-1]
        self.assertTrue(final_chunk["done"])
        self.assertEqual(len(final_chunk["tool_calls"]), 1)
        self.assertEqual(final_chunk["tool_calls"][0]["name"], "test_tool")

    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'})
    @patch('agent.models.openai.openai')
    def test_stream_complete_with_message_name(self, mock_openai_module):
        """Test that message name attribute is passed correctly"""
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client

        mock_event = Mock()
        mock_event.type = "message.complete"
        mock_event.message = Mock()
        mock_event.message.content = "Done"
        mock_event.message.tool_calls = None

        mock_stream = MagicMock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_event]))

        mock_client.chat.completions.stream.return_value = mock_stream

        model = OpenAIModel()
        messages = [
            ModelMessage(role="user", content="Hello"),
            ModelMessage(role="tool", content="Result", name="test_tool")
        ]

        list(model.stream_complete(messages))

        # Check that formatted messages include name
        call_kwargs = mock_client.chat.completions.stream.call_args[1]
        formatted = call_kwargs["messages"]
        self.assertEqual(formatted[1]["name"], "test_tool")

    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'})
    @patch('agent.models.openai.openai')
    def test_stream_complete_empty_delta(self, mock_openai_module):
        """Test that empty deltas are filtered out"""
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client

        mock_event1 = Mock()
        mock_event1.type = "content.delta"
        mock_event1.delta = Mock()
        mock_event1.delta.content = None  # Empty delta

        mock_event2 = Mock()
        mock_event2.type = "content.delta"
        mock_event2.delta = Mock()
        mock_event2.delta.content = ""  # Empty string

        mock_event3 = Mock()
        mock_event3.type = "content.delta"
        mock_event3.delta = Mock()
        mock_event3.delta.content = "Text"

        mock_event4 = Mock()
        mock_event4.type = "message.complete"
        mock_event4.message = Mock()
        mock_event4.message.content = "Text"
        mock_event4.message.tool_calls = None

        mock_stream = MagicMock()
        mock_stream.__enter__ = Mock(return_value=mock_stream)
        mock_stream.__exit__ = Mock(return_value=False)
        mock_stream.__iter__ = Mock(return_value=iter([mock_event1, mock_event2, mock_event3, mock_event4]))

        mock_client.chat.completions.stream.return_value = mock_stream

        model = OpenAIModel()
        messages = [ModelMessage(role="user", content="Hi")]

        chunks = list(model.stream_complete(messages))

        # Only non-empty deltas should be yielded
        delta_chunks = [c for c in chunks if "delta" in c]
        self.assertEqual(len(delta_chunks), 1)
        self.assertEqual(delta_chunks[0]["delta"], "Text")


if __name__ == '__main__':
    unittest.main()