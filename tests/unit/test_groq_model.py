"""
Comprehensive Unit Tests for agent/models/groq.py
Tests GroqModel functionality and API interactions (OpenAI-compatible)
"""

import unittest
import sys
import os
from unittest.mock import patch, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.groq import GroqModel
from agent.models.base import ModelMessage


class TestGroqModelInitialization(unittest.TestCase):
    """Test suite for GroqModel initialization"""

    def test_init_default_model(self):
        """Test initialization with default model"""
        model = GroqModel()
        self.assertEqual(model.model, "llama-3.1-70b-versatile")
        self.assertEqual(model.name, "llama-3.1-70b-versatile")

    def test_init_custom_model(self):
        """Test initialization with custom model"""
        model = GroqModel(model="mixtral-8x7b-32768")
        self.assertEqual(model.model, "mixtral-8x7b-32768")
        self.assertEqual(model.name, "mixtral-8x7b-32768")

    @patch.dict(os.environ, {'GROQ_API_KEY': 'test-groq-key-789'})
    def test_init_loads_api_key_from_env(self):
        """Test initialization loads API key from environment"""
        model = GroqModel()
        self.assertEqual(model.api_key, 'test-groq-key-789')

    @patch.dict(os.environ, {}, clear=True)
    def test_init_no_api_key(self):
        """Test initialization without API key"""
        model = GroqModel()
        self.assertIsNone(model.api_key)


class TestGroqModelFormatMessages(unittest.TestCase):
    """Test suite for GroqModel message formatting"""

    def test_format_simple_user_message(self):
        """Test formatting a simple user message"""
        model = GroqModel()
        messages = [ModelMessage(role="user", content="Hello")]

        formatted = model._format_messages(messages)

        self.assertEqual(len(formatted), 1)
        self.assertEqual(formatted[0]["role"], "user")
        self.assertEqual(formatted[0]["content"], "Hello")

    def test_format_multiple_messages(self):
        """Test formatting multiple messages preserves roles and content"""
        model = GroqModel()
        messages = [
            ModelMessage(role="system", content="You are helpful"),
            ModelMessage(role="user", content="Hi"),
            ModelMessage(role="assistant", content="Hello!"),
        ]

        formatted = model._format_messages(messages)

        self.assertEqual(len(formatted), 3)
        self.assertEqual(formatted[0]["role"], "system")
        self.assertEqual(formatted[1]["role"], "user")
        self.assertEqual(formatted[2]["role"], "assistant")

    def test_format_preserves_content(self):
        """Test that message content is preserved exactly"""
        model = GroqModel()
        messages = [ModelMessage(role="user", content="Hello\nWorld!")]

        formatted = model._format_messages(messages)

        self.assertEqual(formatted[0]["content"], "Hello\nWorld!")


class TestGroqModelComplete(unittest.TestCase):
    """Test suite for GroqModel.complete method"""

    @patch('agent.models.groq.groq_pkg', None)
    def test_complete_raises_without_library(self):
        """Test that RuntimeError is raised when groq is not available"""
        model = GroqModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)

        self.assertIn("groq package not installed", str(context.exception))

    @patch('agent.models.groq.groq_pkg')
    @patch.dict(os.environ, {}, clear=True)
    def test_complete_raises_without_api_key(self, _mock_groq_pkg):
        """Test that RuntimeError is raised when API key is not set"""
        model = GroqModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)

        self.assertIn("GROQ_API_KEY not set", str(context.exception))

    @patch('agent.models.groq.groq_pkg')
    @patch.dict(os.environ, {'GROQ_API_KEY': 'test-key'})
    def test_complete_simple_message(self, mock_groq_pkg):
        """Test completing with a simple message"""
        mock_client = Mock()
        mock_groq_pkg.Groq.return_value = mock_client

        mock_choice = Mock()
        mock_choice.message.content = "Hello from Groq!"
        mock_response = Mock()
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        model = GroqModel()
        messages = [ModelMessage(role="user", content="Hi")]
        result = model.complete(messages)

        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Hello from Groq!")
        self.assertEqual(result["tool_calls"], [])

    @patch('agent.models.groq.groq_pkg')
    @patch.dict(os.environ, {'GROQ_API_KEY': 'test-key'})
    def test_complete_creates_client_with_api_key(self, mock_groq_pkg):
        """Test that Groq client is created with the API key"""
        mock_client = Mock()
        mock_groq_pkg.Groq.return_value = mock_client

        mock_choice = Mock()
        mock_choice.message.content = "Response"
        mock_response = Mock()
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        model = GroqModel()
        messages = [ModelMessage(role="user", content="Test")]
        model.complete(messages)

        mock_groq_pkg.Groq.assert_called_once_with(api_key='test-key')

    @patch('agent.models.groq.groq_pkg')
    @patch.dict(os.environ, {'GROQ_API_KEY': 'test-key'})
    def test_complete_passes_correct_model(self, mock_groq_pkg):
        """Test that the correct model is passed to the API"""
        mock_client = Mock()
        mock_groq_pkg.Groq.return_value = mock_client

        mock_choice = Mock()
        mock_choice.message.content = "Response"
        mock_response = Mock()
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        model = GroqModel(model="mixtral-8x7b-32768")
        messages = [ModelMessage(role="user", content="Test")]
        model.complete(messages)

        call_kwargs = mock_client.chat.completions.create.call_args[1]
        self.assertEqual(call_kwargs["model"], "mixtral-8x7b-32768")

    @patch('agent.models.groq.groq_pkg')
    @patch.dict(os.environ, {'GROQ_API_KEY': 'test-key'})
    def test_complete_handles_none_content(self, mock_groq_pkg):
        """Test completing when message content is None"""
        mock_client = Mock()
        mock_groq_pkg.Groq.return_value = mock_client

        mock_choice = Mock()
        mock_choice.message.content = None
        mock_response = Mock()
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        model = GroqModel()
        messages = [ModelMessage(role="user", content="Hi")]
        result = model.complete(messages)

        self.assertEqual(result["content"], "")

    @patch('agent.models.groq.groq_pkg')
    @patch.dict(os.environ, {'GROQ_API_KEY': 'test-key'})
    def test_complete_tool_call_extraction(self, mock_groq_pkg):
        """Test that tool calls are returned in the result (always empty list in current impl)"""
        mock_client = Mock()
        mock_groq_pkg.Groq.return_value = mock_client

        mock_choice = Mock()
        mock_choice.message.content = "I'll call a tool"
        mock_response = Mock()
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        model = GroqModel()
        messages = [ModelMessage(role="user", content="Search for something")]
        result = model.complete(messages)

        self.assertIn("tool_calls", result)
        self.assertIsInstance(result["tool_calls"], list)


class TestGroqModelStreamComplete(unittest.TestCase):
    """Test suite for GroqModel.stream_complete method"""

    @patch('agent.models.groq.groq_pkg', None)
    def test_stream_complete_raises_without_library(self):
        """Test that RuntimeError is raised when groq is not available"""
        model = GroqModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError):
            list(model.stream_complete(messages))

    @patch('agent.models.groq.groq_pkg')
    @patch.dict(os.environ, {}, clear=True)
    def test_stream_complete_raises_without_api_key(self, _mock_groq_pkg):
        """Test that RuntimeError is raised when API key is not set"""
        model = GroqModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError):
            list(model.stream_complete(messages))

    @patch('agent.models.groq.groq_pkg')
    @patch.dict(os.environ, {'GROQ_API_KEY': 'test-key'})
    def test_stream_complete_yields_deltas(self, mock_groq_pkg):
        """Test streaming yields delta chunks"""
        mock_client = Mock()
        mock_groq_pkg.Groq.return_value = mock_client

        chunk1 = Mock()
        chunk1.choices = [Mock()]
        chunk1.choices[0].delta.content = "Hello"

        chunk2 = Mock()
        chunk2.choices = [Mock()]
        chunk2.choices[0].delta.content = " world"

        mock_client.chat.completions.create.return_value = iter([chunk1, chunk2])

        model = GroqModel()
        messages = [ModelMessage(role="user", content="Test")]
        chunks = list(model.stream_complete(messages))

        delta_chunks = [c for c in chunks if "delta" in c]
        done_chunks = [c for c in chunks if c.get("done")]

        self.assertEqual(len(delta_chunks), 2)
        self.assertEqual(delta_chunks[0]["delta"], "Hello")
        self.assertEqual(delta_chunks[1]["delta"], " world")

        self.assertEqual(len(done_chunks), 1)
        self.assertEqual(done_chunks[0]["content"], "Hello world")
        self.assertEqual(done_chunks[0]["role"], "assistant")
        self.assertEqual(done_chunks[0]["tool_calls"], [])

    @patch('agent.models.groq.groq_pkg')
    @patch.dict(os.environ, {'GROQ_API_KEY': 'test-key'})
    def test_stream_complete_skips_empty_deltas(self, mock_groq_pkg):
        """Test streaming skips empty delta content"""
        mock_client = Mock()
        mock_groq_pkg.Groq.return_value = mock_client

        chunk1 = Mock()
        chunk1.choices = [Mock()]
        chunk1.choices[0].delta.content = ""

        chunk2 = Mock()
        chunk2.choices = [Mock()]
        chunk2.choices[0].delta.content = None

        chunk3 = Mock()
        chunk3.choices = [Mock()]
        chunk3.choices[0].delta.content = "Result"

        mock_client.chat.completions.create.return_value = iter([chunk1, chunk2, chunk3])

        model = GroqModel()
        messages = [ModelMessage(role="user", content="Test")]
        chunks = list(model.stream_complete(messages))

        delta_chunks = [c for c in chunks if "delta" in c]
        self.assertEqual(len(delta_chunks), 1)
        self.assertEqual(delta_chunks[0]["delta"], "Result")

    @patch('agent.models.groq.groq_pkg')
    @patch.dict(os.environ, {'GROQ_API_KEY': 'test-key'})
    def test_stream_complete_passes_stream_flag(self, mock_groq_pkg):
        """Test that completions.create is called with stream=True"""
        mock_client = Mock()
        mock_groq_pkg.Groq.return_value = mock_client
        mock_client.chat.completions.create.return_value = iter([])

        model = GroqModel()
        messages = [ModelMessage(role="user", content="Test")]
        list(model.stream_complete(messages))

        call_kwargs = mock_client.chat.completions.create.call_args[1]
        self.assertTrue(call_kwargs.get("stream"))


if __name__ == '__main__':
    unittest.main()
