"""
Comprehensive Unit Tests for agent/models/gemini.py
Tests GeminiModel functionality and API interactions
"""

import unittest
import sys
import os
from unittest.mock import patch, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.gemini import GeminiModel
from agent.models.base import ModelMessage


class TestGeminiModelInitialization(unittest.TestCase):
    """Test suite for GeminiModel initialization"""

    def test_init_default_model(self):
        """Test initialization with default model"""
        model = GeminiModel()
        self.assertEqual(model.model, "gemini-1.5-pro")
        self.assertEqual(model.name, "gemini-1.5-pro")

    def test_init_custom_model(self):
        """Test initialization with custom model"""
        model = GeminiModel(model="gemini-1.5-flash")
        self.assertEqual(model.model, "gemini-1.5-flash")
        self.assertEqual(model.name, "gemini-1.5-flash")

    @patch.dict(os.environ, {'GOOGLE_API_KEY': 'test-google-key-123'})
    def test_init_loads_api_key_from_env(self):
        """Test initialization loads API key from environment"""
        model = GeminiModel()
        self.assertEqual(model.api_key, 'test-google-key-123')

    @patch.dict(os.environ, {}, clear=True)
    def test_init_no_api_key(self):
        """Test initialization without API key"""
        model = GeminiModel()
        self.assertIsNone(model.api_key)


class TestGeminiModelFormatContents(unittest.TestCase):
    """Test suite for GeminiModel message formatting"""

    def test_format_simple_user_message(self):
        """Test formatting a simple user message"""
        model = GeminiModel()
        messages = [ModelMessage(role="user", content="Hello")]

        contents = model._format_contents(messages)

        self.assertEqual(len(contents), 1)
        self.assertEqual(contents[0]["role"], "user")
        self.assertEqual(contents[0]["parts"], [{"text": "Hello"}])

    def test_format_assistant_message_becomes_model_role(self):
        """Test that assistant messages are converted to 'model' role"""
        model = GeminiModel()
        messages = [
            ModelMessage(role="user", content="Hi"),
            ModelMessage(role="assistant", content="Hello!"),
        ]

        contents = model._format_contents(messages)

        self.assertEqual(len(contents), 2)
        self.assertEqual(contents[0]["role"], "user")
        self.assertEqual(contents[1]["role"], "model")
        self.assertEqual(contents[1]["parts"], [{"text": "Hello!"}])

    def test_format_system_message_prepended_to_first_user_message(self):
        """Test that system messages are prepended to the first user message"""
        model = GeminiModel()
        messages = [
            ModelMessage(role="system", content="You are helpful"),
            ModelMessage(role="user", content="Hello"),
        ]

        contents = model._format_contents(messages)

        self.assertEqual(len(contents), 1)
        self.assertEqual(contents[0]["role"], "user")
        self.assertIn("You are helpful", contents[0]["parts"][0]["text"])
        self.assertIn("Hello", contents[0]["parts"][0]["text"])

    def test_format_multiple_system_messages_joined(self):
        """Test that multiple system messages are joined and prepended"""
        model = GeminiModel()
        messages = [
            ModelMessage(role="system", content="Rule 1"),
            ModelMessage(role="system", content="Rule 2"),
            ModelMessage(role="user", content="Hello"),
        ]

        contents = model._format_contents(messages)

        self.assertEqual(len(contents), 1)
        text = contents[0]["parts"][0]["text"]
        self.assertIn("Rule 1", text)
        self.assertIn("Rule 2", text)
        self.assertIn("Hello", text)

    def test_format_conversation_with_system(self):
        """Test formatting a full conversation"""
        model = GeminiModel()
        messages = [
            ModelMessage(role="system", content="Be concise"),
            ModelMessage(role="user", content="What is 2+2?"),
            ModelMessage(role="assistant", content="4"),
            ModelMessage(role="user", content="Thanks"),
        ]

        contents = model._format_contents(messages)

        self.assertEqual(len(contents), 3)
        self.assertEqual(contents[0]["role"], "user")
        self.assertIn("Be concise", contents[0]["parts"][0]["text"])
        self.assertEqual(contents[1]["role"], "model")
        self.assertEqual(contents[2]["role"], "user")


class TestGeminiModelComplete(unittest.TestCase):
    """Test suite for GeminiModel.complete method"""

    @patch('agent.models.gemini.genai', None)
    def test_complete_raises_without_library(self):
        """Test that RuntimeError is raised when google-generativeai is not available"""
        model = GeminiModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)

        self.assertIn("google-generativeai package not installed", str(context.exception))

    @patch('agent.models.gemini.genai')
    @patch.dict(os.environ, {}, clear=True)
    def test_complete_raises_without_api_key(self, _mock_genai):
        """Test that RuntimeError is raised when API key is not set"""
        model = GeminiModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)

        self.assertIn("GOOGLE_API_KEY not set", str(context.exception))

    @patch('agent.models.gemini.genai')
    @patch.dict(os.environ, {'GOOGLE_API_KEY': 'test-key'})
    def test_complete_simple_message(self, mock_genai):
        """Test completing with a simple message"""
        mock_model = Mock()
        mock_genai.GenerativeModel.return_value = mock_model

        mock_response = Mock()
        mock_response.text = "Hello, world!"
        mock_model.generate_content.return_value = mock_response

        model = GeminiModel()
        messages = [ModelMessage(role="user", content="Hi")]
        result = model.complete(messages)

        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Hello, world!")
        self.assertEqual(result["tool_calls"], [])

    @patch('agent.models.gemini.genai')
    @patch.dict(os.environ, {'GOOGLE_API_KEY': 'test-key'})
    def test_complete_configures_api_key(self, mock_genai):
        """Test that genai.configure is called with the API key"""
        mock_model = Mock()
        mock_genai.GenerativeModel.return_value = mock_model

        mock_response = Mock()
        mock_response.text = "Response"
        mock_model.generate_content.return_value = mock_response

        model = GeminiModel()
        messages = [ModelMessage(role="user", content="Test")]
        model.complete(messages)

        mock_genai.configure.assert_called_once_with(api_key='test-key')

    @patch('agent.models.gemini.genai')
    @patch.dict(os.environ, {'GOOGLE_API_KEY': 'test-key'})
    def test_complete_creates_correct_model(self, mock_genai):
        """Test that the correct model is created"""
        mock_model = Mock()
        mock_genai.GenerativeModel.return_value = mock_model

        mock_response = Mock()
        mock_response.text = "Response"
        mock_model.generate_content.return_value = mock_response

        model = GeminiModel(model="gemini-1.5-flash")
        messages = [ModelMessage(role="user", content="Test")]
        model.complete(messages)

        mock_genai.GenerativeModel.assert_called_once_with("gemini-1.5-flash")

    @patch('agent.models.gemini.genai')
    @patch.dict(os.environ, {'GOOGLE_API_KEY': 'test-key'})
    def test_complete_passes_formatted_contents(self, mock_genai):
        """Test that formatted contents are passed to generate_content"""
        mock_model = Mock()
        mock_genai.GenerativeModel.return_value = mock_model

        mock_response = Mock()
        mock_response.text = "Response"
        mock_model.generate_content.return_value = mock_response

        model = GeminiModel()
        messages = [
            ModelMessage(role="system", content="Be helpful"),
            ModelMessage(role="user", content="Hello"),
        ]
        model.complete(messages)

        call_args = mock_model.generate_content.call_args[0][0]
        self.assertEqual(len(call_args), 1)
        self.assertEqual(call_args[0]["role"], "user")
        self.assertIn("Be helpful", call_args[0]["parts"][0]["text"])

    @patch('agent.models.gemini.genai')
    @patch.dict(os.environ, {'GOOGLE_API_KEY': 'test-key'})
    def test_complete_handles_none_text(self, mock_genai):
        """Test completing when response.text is None"""
        mock_model = Mock()
        mock_genai.GenerativeModel.return_value = mock_model

        mock_response = Mock()
        mock_response.text = None
        mock_model.generate_content.return_value = mock_response

        model = GeminiModel()
        messages = [ModelMessage(role="user", content="Hi")]
        result = model.complete(messages)

        self.assertEqual(result["content"], "")


class TestGeminiModelStreamComplete(unittest.TestCase):
    """Test suite for GeminiModel.stream_complete method"""

    @patch('agent.models.gemini.genai', None)
    def test_stream_complete_raises_without_library(self):
        """Test that RuntimeError is raised when google-generativeai is not available"""
        model = GeminiModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError):
            list(model.stream_complete(messages))

    @patch('agent.models.gemini.genai')
    @patch.dict(os.environ, {}, clear=True)
    def test_stream_complete_raises_without_api_key(self, _mock_genai):
        """Test that RuntimeError is raised when API key is not set"""
        model = GeminiModel()
        messages = [ModelMessage(role="user", content="Test")]

        with self.assertRaises(RuntimeError):
            list(model.stream_complete(messages))

    @patch('agent.models.gemini.genai')
    @patch.dict(os.environ, {'GOOGLE_API_KEY': 'test-key'})
    def test_stream_complete_yields_deltas(self, mock_genai):
        """Test streaming yields delta chunks"""
        mock_model = Mock()
        mock_genai.GenerativeModel.return_value = mock_model

        chunk1 = Mock()
        chunk1.text = "Hello"
        chunk2 = Mock()
        chunk2.text = " world"

        mock_model.generate_content.return_value = iter([chunk1, chunk2])

        model = GeminiModel()
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

    @patch('agent.models.gemini.genai')
    @patch.dict(os.environ, {'GOOGLE_API_KEY': 'test-key'})
    def test_stream_complete_skips_empty_deltas(self, mock_genai):
        """Test streaming skips empty delta text"""
        mock_model = Mock()
        mock_genai.GenerativeModel.return_value = mock_model

        chunk1 = Mock()
        chunk1.text = ""
        chunk2 = Mock()
        chunk2.text = "Content"
        chunk3 = Mock()
        chunk3.text = None

        mock_model.generate_content.return_value = iter([chunk1, chunk2, chunk3])

        model = GeminiModel()
        messages = [ModelMessage(role="user", content="Test")]
        chunks = list(model.stream_complete(messages))

        delta_chunks = [c for c in chunks if "delta" in c]
        self.assertEqual(len(delta_chunks), 1)
        self.assertEqual(delta_chunks[0]["delta"], "Content")

    @patch('agent.models.gemini.genai')
    @patch.dict(os.environ, {'GOOGLE_API_KEY': 'test-key'})
    def test_stream_complete_calls_with_stream_flag(self, mock_genai):
        """Test that generate_content is called with stream=True"""
        mock_model = Mock()
        mock_genai.GenerativeModel.return_value = mock_model
        mock_model.generate_content.return_value = iter([])

        model = GeminiModel()
        messages = [ModelMessage(role="user", content="Test")]
        list(model.stream_complete(messages))

        call_kwargs = mock_model.generate_content.call_args
        self.assertTrue(call_kwargs[1].get("stream"))


if __name__ == '__main__':
    unittest.main()
