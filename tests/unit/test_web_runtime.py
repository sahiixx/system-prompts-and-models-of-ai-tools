"""
Comprehensive Unit Tests for agent/runtime/web.py
Tests FastAPI web interface
"""

import unittest
import sys
import os
from unittest.mock import patch, MagicMock
import json

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    from fastapi.testclient import TestClient
    from agent.runtime.web import app
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False


@unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI not installed")
class TestWebRuntime(unittest.TestCase):
    """Test suite for web runtime"""
    
    def setUp(self):
        """Set up test client"""
        self.client = TestClient(app)
    
    def test_index_returns_html(self):
        """Test that index endpoint returns HTML"""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.headers.get("content-type", ""))
        self.assertIn("Execute Agent", response.text)
    
    @patch('agent.runtime.web.build_agent')
    def test_stream_endpoint_no_auth(self, mock_build):
        """Test stream endpoint without authentication"""
        mock_agent = MagicMock()
        mock_agent.ask_stream.return_value = [
            {"delta": "Hello"},
            {"done": True}
        ]
        mock_build.return_value = mock_agent
        
        # Without API key requirement
        with patch.dict(os.environ, {}, clear=True):
            response = self.client.get("/stream?q=test")
            self.assertEqual(response.status_code, 200)
    
    @patch('agent.runtime.web.build_agent')
    def test_stream_endpoint_with_valid_auth(self, mock_build):
        """Test stream endpoint with valid API key"""
        mock_agent = MagicMock()
        mock_agent.ask_stream.return_value = [{"delta": "Hello"}]
        mock_build.return_value = mock_agent
        
        with patch.dict(os.environ, {'AGENT_API_KEY': 'secret123'}):
            response = self.client.get(
                "/stream?q=test",
                headers={"x-api-key": "secret123"}
            )
            self.assertEqual(response.status_code, 200)
    
    @patch('agent.runtime.web.build_agent')
    def test_stream_endpoint_with_invalid_auth(self, _mock_build):
        """Test stream endpoint with invalid API key"""
        with patch.dict(os.environ, {'AGENT_API_KEY': 'secret123'}):
            response = self.client.get(
                "/stream?q=test",
                headers={"x-api-key": "wrong-key"}
            )
            self.assertEqual(response.status_code, 401)
    
    @patch('agent.runtime.web.build_agent')
    def test_stream_endpoint_builds_agent_with_params(self, mock_build):
        """Test that stream endpoint passes parameters to build_agent"""
        mock_agent = MagicMock()
        mock_agent.ask_stream.return_value = [{"done": True}]
        mock_build.return_value = mock_agent
        
        with patch.dict(os.environ, {}, clear=True):
            self.client.get("/stream?provider=openai&model=gpt-4&q=test")
            mock_build.assert_called_once_with(
                provider="openai",
                model_name="gpt-4"
            )
    
    @patch('agent.runtime.web.build_agent')
    def test_chat_endpoint_success(self, mock_build):
        """Test chat endpoint returns response"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Hello from agent"
        mock_build.return_value = mock_agent
        
        with patch.dict(os.environ, {}, clear=True):
            response = self.client.post(
                "/chat",
                json={"q": "test", "provider": "echo"}
            )
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data['role'], 'assistant')
            self.assertEqual(data['content'], 'Hello from agent')
    
    @patch('agent.runtime.web.build_agent')
    def test_chat_endpoint_with_auth(self, _mock_build):
        """Test chat endpoint authentication"""
        with patch.dict(os.environ, {'AGENT_API_KEY': 'secret'}):
            response = self.client.post(
                "/chat",
                json={"q": "test"},
                headers={"x-api-key": "wrong"}
            )
            self.assertEqual(response.status_code, 401)


if __name__ == '__main__':
    unittest.main()