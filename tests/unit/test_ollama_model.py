"""
Comprehensive Unit Tests for agent/models/ollama.py
Tests OllamaModel functionality and HTTP interactions
"""

import unittest
import sys
import os
from unittest.mock import patch, MagicMock, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.models.ollama import OllamaModel
from agent.models.base import ModelMessage


class TestOllamaModelInitialization(unittest.TestCase):
    """Test suite for OllamaModel initialization"""
    
    def test_init_default_model(self):
        """Test initialization with default model"""
        model = OllamaModel()
        self.assertEqual(model.model, "llama3.1")
        self.assertEqual(model.name, "llama3.1")
    
    def test_init_custom_model(self):
        """Test initialization with custom model"""
        model = OllamaModel(model="llama2")
        self.assertEqual(model.model, "llama2")
        self.assertEqual(model.name, "llama2")
    
    def test_init_default_base_url(self):
        """Test initialization with default base URL"""
        model = OllamaModel()
        self.assertEqual(model.base_url, "http://localhost:11434")
    
    def test_init_custom_base_url(self):
        """Test initialization with custom base URL"""
        model = OllamaModel(base_url="http://custom:8080")
        self.assertEqual(model.base_url, "http://custom:8080")
    
    @patch.dict(os.environ, {'OLLAMA_BASE_URL': 'http://env-url:9999'})
    def test_init_base_url_from_env(self):
        """Test initialization with base URL from environment"""
        model = OllamaModel()
        self.assertEqual(model.base_url, "http://env-url:9999")
    
    @patch.dict(os.environ, {'OLLAMA_BASE_URL': 'http://env-url:9999'})
    def test_init_base_url_explicit_overrides_env(self):
        """Test that explicit base URL overrides environment"""
        model = OllamaModel(base_url="http://explicit:7777")
        self.assertEqual(model.base_url, "http://explicit:7777")


class TestOllamaModelComplete(unittest.TestCase):
    """Test suite for OllamaModel.complete method"""
    
    @patch('agent.models.ollama.requests')
    def test_complete_simple_message(self, mock_requests):
        """Test completing with a simple message"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": {"content": "Hello, world!"}
        }
        mock_requests.post.return_value = mock_response
        
        model = OllamaModel()
        messages = [ModelMessage(role="user", content="Hi")]
        result = model.complete(messages)
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Hello, world!")
        self.assertEqual(result["tool_calls"], [])
    
    @patch('agent.models.ollama.requests')
    def test_complete_makes_correct_http_request(self, mock_requests):
        """Test that correct HTTP request is made"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": {"content": "Response"}
        }
        mock_requests.post.return_value = mock_response
        
        model = OllamaModel(model="llama2")
        messages = [
            ModelMessage(role="user", content="Test message")
        ]
        model.complete(messages)
        
        mock_requests.post.assert_called_once()
        call_args = mock_requests.post.call_args
        
        # Check URL
        self.assertEqual(call_args[0][0], "http://localhost:11434/api/chat")
        
        # Check payload
        payload = call_args[1]['json']
        self.assertEqual(payload['model'], "llama2")
        self.assertEqual(payload['stream'], False)
        self.assertEqual(len(payload['messages']), 1)
        self.assertEqual(payload['messages'][0]['role'], "user")
        self.assertEqual(payload['messages'][0]['content'], "Test message")
        
        # Check timeout
        self.assertEqual(call_args[1]['timeout'], 60)
    
    @patch('agent.models.ollama.requests')
    def test_complete_with_system_message(self, mock_requests):
        """Test completing with system message"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": {"content": "Response"}
        }
        mock_requests.post.return_value = mock_response
        
        model = OllamaModel()
        messages = [
            ModelMessage(role="system", content="You are helpful"),
            ModelMessage(role="user", content="Help me")
        ]
        model.complete(messages)
        
        payload = mock_requests.post.call_args[1]['json']
        self.assertEqual(len(payload['messages']), 2)
        self.assertEqual(payload['messages'][0]['role'], "system")
        self.assertEqual(payload['messages'][1]['role'], "user")
    
    @patch('agent.models.ollama.requests')
    def test_complete_with_tool_role_converts_to_user(self, mock_requests):
        """Test that tool role is converted to user"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": {"content": "Response"}
        }
        mock_requests.post.return_value = mock_response
        
        model = OllamaModel()
        messages = [
            ModelMessage(role="tool", content="Tool result")
        ]
        model.complete(messages)
        
        payload = mock_requests.post.call_args[1]['json']
        self.assertEqual(payload['messages'][0]['role'], "user")
        self.assertEqual(payload['messages'][0]['content'], "Tool result")
    
    @patch('agent.models.ollama.requests', None)
    def test_complete_raises_without_requests_library(self):
        """Test that RuntimeError is raised when requests is not available"""
        model = OllamaModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        with self.assertRaises(RuntimeError) as context:
            model.complete(messages)
        
        self.assertIn("requests package not installed", str(context.exception))


if __name__ == '__main__':
    unittest.main()