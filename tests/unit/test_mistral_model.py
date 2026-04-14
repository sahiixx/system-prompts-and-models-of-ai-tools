"""
Comprehensive Unit Tests for agent/models/mistral.py
Tests MistralModel functionality and API interactions
"""

import unittest
import sys
import os
from unittest.mock import patch, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.mistral import MistralModel
from agent.models.base import ModelMessage


class TestMistralModelInitialization(unittest.TestCase):
    """Test suite for MistralModel initialization"""

    def test_init_default_model(self):
        """Test initialization with default model"""
        model = MistralModel()
        self.assertEqual(model.model, "mistral-large-latest")
        self.assertEqual(model.name, "mistral-large-latest")

    def test_init_custom_model(self):
        """Test initialization with custom model"""
        model = MistralModel(model="mistral-medium-latest")
        self.assertEqual(model.model, "mistral-medium-latest")
        self.assertEqual(model.name, "mistral-medium-latest")

    @patch.dict(os.environ, {'MISTRAL_API_KEY': 'test-mistral-key-456'})
    def test_init_loads_api_key_from_env(self):
        """Test initialization loads API key from environment"""
        model = MistralModel()
        self.assertEqual(model.api_key, 'test-mistral-key-456')

    @patch.dict(os.environ, {}, clear=True)
    def test_init_no_api_key(self):
        """Test initialization without API key"""
        model = MistralModel()
        self.assertIsNone(model.api_key)


class TestMistralModelFormatMessages(unittest.TestCase):
    """Test suite for MistralModel message formatting"""

    def test_format_simple_user_message(self):
        """Test formatting a simple user message"""
        model = MistralModel()
        messages = [ModelMessage(role="user", content="Hello")]

        formatted = model._format_messages(messages)

        self.assertEqual(len(formatted), 1)
        self.assertEqual(formatted[0]["role"], "user")
        self.assertEqual(formatted[0]["content"], "Hello")

    def test_format_multiple_messages(self):
        """Test formatting multiple messages preserves roles and content"""
        model = MistralModel()
        messages = [
            ModelMessage(role="system", content="You are helpful"),
            ModelMessage(role="user", content="Hi"),
            ModelMessage(role="assistant", content="Hello!"),
        ]

        formatted = model._format_messages(messages)

        self.assertEqual(len(formatted), 3)
        self.assertEqual(formatted[0]["role"], "system")
        self.assertEqual(formatted[0]["content"], "You are helpful")
        self.assertEqual(formatted[1]["role"], "user")
        self.assertEqual(formatted[2]["role"], "assistant")

    def test_format_preserves_all_roles(self):
        """Test that all message roles are preserved as-is"""
        model = MistralModel()
        messages = [
            ModelMessage(role="system", content="System"),
            ModelMessage(role="user", content="User"),
            ModelMessage(role="assistant", content="Assistant"),
        ]

        formatted = model._format_messages(messages)

        roles = [m["role"] for m in formatted]
        self.assertEqual(roles, ["system", "user", "assistant"])


class TestMistralModelComplete(unittest.TestCase):
    """Test suite for MistralModel.complete method"""

    @patch('agent.models.mistral.Mistral', None)
    def test_complete_raises_without_library(self):
        """Test that RuntimeError is raised when mistralai is not available"""
        model = MistralModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)

        self.assertIn("mistralai package not installed", str(context.exception))

    @patch('agent.models.mistral.Mistral')
    @patch.dict(os.environ, {}, clear=True)
    def test_complete_raises_without_api_key(self, _mock_mistral_class):
        """Test that RuntimeError is raised when API key is not set"""
        model = MistralModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)

        self.assertIn("MISTRAL_API_KEY not set", str(context.exception))

    @patch('agent.models.mistral.Mistral')
    @patch.dict(os.environ, {'MISTRAL_API_KEY': 'test-key'})
    def test_complete_simple_message(self, mock_mistral_class):
        """Test completing with a simple message"""
        mock_client = Mock()
        mock_mistral_class.return_value = mock_client

        mock_choice = Mock()
        mock_choice.message.content = "Hello from Mistral!"
        mock_response = Mock()
        mock_response.choices = [mock_choice]
        mock_client.chat.complete.return_value = mock_response

        model = MistralModel()
        messages = [ModelMessage(role="user", content="Hi")]
        result = model.complete(messages)

        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Hello from Mistral!")
        self.assertEqual(result["tool_calls"], [])

    @patch('agent.models.mistral.Mistral')
    @patch.dict(os.environ, {'MISTRAL_API_KEY': 'test-key'})
    def test_complete_creates_client_with_api_key(self, mock_mistral_class):
        """Test that Mistral client is created with the API key"""
        mock_client = Mock()
        mock_mistral_class.return_value = mock_client

        mock_choice = Mock()
        mock_choice.message.content = "Response"
        mock_response = Mock()
        mock_response.choices = [mock_choice]
        mock_client.chat.complete.return_value = mock_response

        model = MistralModel()
        messages = [ModelMessage(role="user", content="Test")]
        model.complete(messages)

        mock_mistral_class.assert_called_once_with(api_key='test-key')

    @patch('agent.models.mistral.Mistral')
    @patch.dict(os.environ, {'MISTRAL_API_KEY': 'test-key'})
    def test_complete_passes_correct_model_and_messages(self, mock_mistral_class):
        """Test that correct model and formatted messages are passed"""
        mock_client = Mock()
        mock_mistral_class.return_value = mock_client

        mock_choice = Mock()
        mock_choice.message.content = "Response"
        mock_response = Mock()
        mock_response.choices = [mock_choice]
        mock_client.chat.complete.return_value = mock_response

        model = MistralModel(model="mistral-medium-latest")
        messages = [
            ModelMessage(role="system", content="Be concise"),
            ModelMessage(role="user", content="Hello"),
        ]
        model.complete(messages)

        call_kwargs = mock_client.chat.complete.call_args[1]
        self.assertEqual(call_kwargs["model"], "mistral-medium-latest")
        self.assertEqual(len(call_kwargs["messages"]), 2)
        self.assertEqual(call_kwargs["messages"][0]["role"], "system")
        self.assertEqual(call_kwargs["messages"][1]["role"], "user")

    @patch('agent.models.mistral.Mistral')
    @patch.dict(os.environ, {'MISTRAL_API_KEY': 'test-key'})
    def test_complete_handles_none_content(self, mock_mistral_class):
        """Test completing when message content is None"""
        mock_client = Mock()
        mock_mistral_class.return_value = mock_client

        mock_choice = Mock()
        mock_choice.message.content = None
        mock_response = Mock()
        mock_response.choices = [mock_choice]
        mock_client.chat.complete.return_value = mock_response

        model = MistralModel()
        messages = [ModelMessage(role="user", content="Hi")]
        result = model.complete(messages)

        self.assertEqual(result["content"], "")


class TestMistralModelStreamComplete(unittest.TestCase):
    """Test suite for MistralModel.stream_complete method"""

    @patch('agent.models.mistral.Mistral', None)
    def test_stream_complete_raises_without_library(self):
        """Test that RuntimeError is raised when mistralai is not available"""
        model = MistralModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError):
            list(model.stream_complete(messages))

    @patch('agent.models.mistral.Mistral')
    @patch.dict(os.environ, {}, clear=True)
    def test_stream_complete_raises_without_api_key(self, _mock_mistral_class):
        """Test that RuntimeError is raised when API key is not set"""
        model = MistralModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError):
            list(model.stream_complete(messages))

    @patch('agent.models.mistral.Mistral')
    @patch.dict(os.environ, {'MISTRAL_API_KEY': 'test-key'})
    def test_stream_complete_yields_deltas(self, mock_mistral_class):
        """Test streaming yields delta chunks"""
        mock_client = Mock()
        mock_mistral_class.return_value = mock_client

        event1 = Mock()
        event1.data.choices = [Mock()]
        event1.data.choices[0].delta.content = "Hello"

        event2 = Mock()
        event2.data.choices = [Mock()]
        event2.data.choices[0].delta.content = " world"

        mock_client.chat.stream.return_value = iter([event1, event2])

        model = MistralModel()
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

    @patch('agent.models.mistral.Mistral')
    @patch.dict(os.environ, {'MISTRAL_API_KEY': 'test-key'})
    def test_stream_complete_skips_empty_deltas(self, mock_mistral_class):
        """Test streaming skips empty delta content"""
        mock_client = Mock()
        mock_mistral_class.return_value = mock_client

        event1 = Mock()
        event1.data.choices = [Mock()]
        event1.data.choices[0].delta.content = ""

        event2 = Mock()
        event2.data.choices = [Mock()]
        event2.data.choices[0].delta.content = None

        event3 = Mock()
        event3.data.choices = [Mock()]
        event3.data.choices[0].delta.content = "Content"

        mock_client.chat.stream.return_value = iter([event1, event2, event3])

        model = MistralModel()
        messages = [ModelMessage(role="user", content="Test")]
        chunks = list(model.stream_complete(messages))

        delta_chunks = [c for c in chunks if "delta" in c]
        self.assertEqual(len(delta_chunks), 1)
        self.assertEqual(delta_chunks[0]["delta"], "Content")

    @patch('agent.models.mistral.Mistral')
    @patch.dict(os.environ, {'MISTRAL_API_KEY': 'test-key'})
    def test_stream_complete_calls_chat_stream(self, mock_mistral_class):
        """Test that client.chat.stream is called correctly"""
        mock_client = Mock()
        mock_mistral_class.return_value = mock_client
        mock_client.chat.stream.return_value = iter([])

        model = MistralModel(model="mistral-medium-latest")
        messages = [ModelMessage(role="user", content="Test")]
        list(model.stream_complete(messages))

        call_kwargs = mock_client.chat.stream.call_args[1]
        self.assertEqual(call_kwargs["model"], "mistral-medium-latest")


if __name__ == '__main__':
    unittest.main()
