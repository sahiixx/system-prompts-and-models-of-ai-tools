"""
Comprehensive unit tests for agent/models/ollama.py
Tests OllamaModel implementation with various scenarios
"""

import pytest
import os
from unittest.mock import patch, Mock, MagicMock
from pathlib import Path
import sys

# Add agent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from agent.models.ollama import OllamaModel
from agent.models.base import ModelMessage


class TestOllamaModelInitialization:
    """Test suite for OllamaModel initialization"""
    
    def test_default_initialization(self):
        """Test OllamaModel initializes with default values"""
        model = OllamaModel()
        assert model.name == "llama3.1"
        assert model.model == "llama3.1"
        assert model.base_url == "http://localhost:11434"
    
    def test_custom_model_name(self):
        """Test OllamaModel with custom model name"""
        model = OllamaModel(model="llama2")
        assert model.name == "llama2"
        assert model.model == "llama2"
    
    def test_custom_base_url(self):
        """Test OllamaModel with custom base URL"""
        custom_url = "http://custom-host:8080"
        model = OllamaModel(base_url=custom_url)
        assert model.base_url == custom_url
    
    def test_base_url_from_environment(self):
        """Test OllamaModel reads base URL from environment variable"""
        with patch.dict(os.environ, {"OLLAMA_BASE_URL": "http://env-host:9090"}):
            model = OllamaModel()
            assert model.base_url == "http://env-host:9090"
    
    def test_base_url_priority(self):
        """Test that constructor argument takes priority over environment variable"""
        with patch.dict(os.environ, {"OLLAMA_BASE_URL": "http://env-host:9090"}):
            model = OllamaModel(base_url="http://override:7070")
            assert model.base_url == "http://override:7070"


class TestOllamaModelComplete:
    """Test suite for OllamaModel.complete() method"""
    
    @pytest.fixture
    def mock_requests(self):
        """Mock requests module"""
        with patch('agent.models.ollama.requests') as mock_req:
            yield mock_req
    
    def test_complete_basic_success(self, mock_requests):
        """Test successful completion with basic message"""
        # Setup mock response
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": {"content": "Hello, how can I help you?"}
        }
        mock_requests.post.return_value = mock_response
        
        model = OllamaModel()
        messages = [ModelMessage(role="user", content="Hello")]
        
        result = model.complete(messages)
        
        assert result["role"] == "assistant"
        assert result["content"] == "Hello, how can I help you?"
        assert result["tool_calls"] == []
        
        # Verify API call
        mock_requests.post.assert_called_once()
        call_args = mock_requests.post.call_args
        assert call_args[0][0] == "http://localhost:11434/api/chat"
        assert call_args[1]["json"]["model"] == "llama3.1"
        assert call_args[1]["json"]["stream"] is False
    
    def test_complete_multiple_messages(self, mock_requests):
        """Test completion with multiple messages in conversation"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": {"content": "The answer is 42"}
        }
        mock_requests.post.return_value = mock_response
        
        model = OllamaModel()
        messages = [
            ModelMessage(role="system", content="You are helpful"),
            ModelMessage(role="user", content="What is the answer?"),
            ModelMessage(role="assistant", content="Let me think..."),
            ModelMessage(role="user", content="Please answer"),
        ]
        
        result = model.complete(messages)
        
        assert result["content"] == "The answer is 42"
        
        # Verify formatted messages
        call_args = mock_requests.post.call_args
        formatted_messages = call_args[1]["json"]["messages"]
        assert len(formatted_messages) == 4
        assert formatted_messages[0]["role"] == "system"
        assert formatted_messages[1]["role"] == "user"
        assert formatted_messages[2]["role"] == "assistant"
        assert formatted_messages[3]["role"] == "user"
    
    def test_complete_role_normalization(self, mock_requests):
        """Test that non-standard roles are normalized to 'user'"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": {"content": "Response"}
        }
        mock_requests.post.return_value = mock_response
        
        model = OllamaModel()
        messages = [
            ModelMessage(role="tool", content="Tool result"),
            ModelMessage(role="function", content="Function result"),
        ]
        
        model.complete(messages)
        
        # Verify roles are normalized
        call_args = mock_requests.post.call_args
        formatted_messages = call_args[1]["json"]["messages"]
        assert formatted_messages[0]["role"] == "user"
        assert formatted_messages[1]["role"] == "user"
    
    def test_complete_with_tools_parameter(self, mock_requests):
        """Test completion with tools parameter (though Ollama ignores it)"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": {"content": "Tool response"}
        }
        mock_requests.post.return_value = mock_response
        
        model = OllamaModel()
        messages = [ModelMessage(role="user", content="Use tool")]
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Get weather",
                    "parameters": {}
                }
            }
        ]
        
        result = model.complete(messages, tools=tools)
        
        # Ollama returns no tool calls
        assert result["tool_calls"] == []
    
    def test_complete_empty_content(self, mock_requests):
        """Test completion when response has no content"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": {}
        }
        mock_requests.post.return_value = mock_response
        
        model = OllamaModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        result = model.complete(messages)
        
        assert result["content"] == ""
    
    def test_complete_custom_timeout(self, mock_requests):
        """Test that timeout is properly set"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "message": {"content": "Response"}
        }
        mock_requests.post.return_value = mock_response
        
        model = OllamaModel()
        messages = [ModelMessage(role="user", content="Test")]
        
        model.complete(messages)
        
        call_args = mock_requests.post.call_args
        assert call_args[1]["timeout"] == 60


class TestOllamaModelErrors:
    """Test suite for OllamaModel error handling"""
    
    def test_complete_without_requests_package(self):
        """Test error when requests package is not installed"""
        with patch('agent.models.ollama.requests', None):
            model = OllamaModel()
            messages = [ModelMessage(role="user", content="Test")]
            
            with pytest.raises(RuntimeError, match="requests package not installed"):
                model.complete(messages)
    
    def test_complete_http_error(self):
        """Test handling of HTTP errors from Ollama API"""
        with patch('agent.models.ollama.requests') as mock_requests:
            mock_response = Mock()
            mock_response.raise_for_status.side_effect = Exception("HTTP 500 Error")
            mock_requests.post.return_value = mock_response
            
            model = OllamaModel()
            messages = [ModelMessage(role="user", content="Test")]
            
            with pytest.raises(Exception, match="HTTP 500 Error"):
                model.complete(messages)
    
    def test_complete_connection_error(self):
        """Test handling of connection errors"""
        with patch('agent.models.ollama.requests') as mock_requests:
            mock_requests.post.side_effect = ConnectionError("Cannot connect to Ollama")
            
            model = OllamaModel()
            messages = [ModelMessage(role="user", content="Test")]
            
            with pytest.raises(ConnectionError, match="Cannot connect to Ollama"):
                model.complete(messages)
    
    def test_complete_invalid_json_response(self):
        """Test handling of invalid JSON in response"""
        with patch('agent.models.ollama.requests') as mock_requests:
            mock_response = Mock()
            mock_response.json.side_effect = ValueError("Invalid JSON")
            mock_requests.post.return_value = mock_response
            
            model = OllamaModel()
            messages = [ModelMessage(role="user", content="Test")]
            
            with pytest.raises(ValueError, match="Invalid JSON"):
                model.complete(messages)


class TestOllamaModelIntegration:
    """Integration-style tests for OllamaModel"""
    
    def test_complete_preserves_message_content(self):
        """Test that message content is properly preserved"""
        with patch('agent.models.ollama.requests') as mock_requests:
            mock_response = Mock()
            mock_response.json.return_value = {
                "message": {"content": "Echoed content"}
            }
            mock_requests.post.return_value = mock_response
            
            model = OllamaModel(model="custom-model")
            messages = [
                ModelMessage(role="user", content="Special chars: 你好 🎉 <>&"),
            ]
            
            model.complete(messages)
            
            call_args = mock_requests.post.call_args
            formatted = call_args[1]["json"]["messages"]
            assert formatted[0]["content"] == "Special chars: 你好 🎉 <>&"
    
    def test_complete_with_custom_base_url(self):
        """Test completion uses custom base URL"""
        with patch('agent.models.ollama.requests') as mock_requests:
            mock_response = Mock()
            mock_response.json.return_value = {
                "message": {"content": "Response"}
            }
            mock_requests.post.return_value = mock_response
            
            custom_url = "http://custom:8888"
            model = OllamaModel(base_url=custom_url)
            messages = [ModelMessage(role="user", content="Test")]
            
            model.complete(messages)
            
            call_args = mock_requests.post.call_args
            assert call_args[0][0] == f"{custom_url}/api/chat"
    
    def test_empty_messages_list(self):
        """Test completion with empty messages list"""
        with patch('agent.models.ollama.requests') as mock_requests:
            mock_response = Mock()
            mock_response.json.return_value = {
                "message": {"content": "Empty response"}
            }
            mock_requests.post.return_value = mock_response
            
            model = OllamaModel()
            messages = []
            
            result = model.complete(messages)
            
            assert result["content"] == "Empty response"
            call_args = mock_requests.post.call_args
            assert call_args[1]["json"]["messages"] == []