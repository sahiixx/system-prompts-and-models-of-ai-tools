"""
Comprehensive Unit Tests for agent/runtime/web.py
Tests FastAPI web runtime and SSE endpoints
"""

import unittest
import sys
import os
from unittest.mock import patch, MagicMock, AsyncMock, Mock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))


class TestWebRuntimeImports(unittest.TestCase):
    """Test suite for web runtime imports and app creation"""
    
    def test_app_creation(self):
        """Test that FastAPI app is created"""
        from agent.runtime.web import app
        self.assertIsNotNone(app)
    
    def test_cors_middleware_configured(self):
        """Test that CORS middleware is added"""
        from agent.runtime.web import app
        # Check that middleware is registered
        middleware_types = [type(m).__name__ for m in app.user_middleware]
        self.assertIn('CORSMiddleware', middleware_types)


class TestIndexEndpoint(unittest.TestCase):
    """Test suite for index endpoint"""
    
    @patch('agent.runtime.web.HTMLResponse')
    def test_index_returns_html(self, mock_html_response):
        """Test that index endpoint returns HTML"""
        from agent.runtime.web import index
        import asyncio
        
        asyncio.run(index())
        
        # Should call HTMLResponse
        mock_html_response.assert_called_once()
        call_kwargs = mock_html_response.call_args[1]
        self.assertIn('content', call_kwargs)
        self.assertIn('Execute Agent', call_kwargs['content'])


class TestStreamEndpoint(unittest.TestCase):
    """Test suite for /stream endpoint"""
    
    @patch('agent.runtime.web.build_agent')
    @patch('agent.runtime.web.EventSourceResponse')
    def test_stream_endpoint_builds_agent(self, _mock_sse, mock_build_agent):
        """Test that stream endpoint builds agent correctly"""
        from agent.runtime.web import stream
        import asyncio
        
        mock_agent = Mock()
        mock_agent.ask_stream.return_value = iter([{"delta": "test"}])
        mock_build_agent.return_value = mock_agent
        
        asyncio.run(stream(provider="echo", model="test", q="Hello"))
        
        mock_build_agent.assert_called_once_with(provider="echo", model_name="test")
    
    @patch.dict(os.environ, {'AGENT_API_KEY': 'secret-key'})
    @patch('agent.runtime.web.build_agent')
    def test_stream_endpoint_checks_api_key(self, _mock_build_agent):
        """Test that stream endpoint validates API key"""
        from agent.runtime.web import stream
        from fastapi import HTTPException
        import asyncio
        
        with self.assertRaises(HTTPException) as context:
            asyncio.run(stream(provider="echo", q="test", x_api_key="wrong-key"))
        
        self.assertEqual(context.exception.status_code, 401)
    
    @patch.dict(os.environ, {}, clear=True)
    @patch('agent.runtime.web.build_agent')
    @patch('agent.runtime.web.EventSourceResponse')
    def test_stream_endpoint_no_auth_when_key_not_set(self, _mock_sse, mock_build_agent):
        """Test that stream endpoint allows access when no API key is configured"""
        from agent.runtime.web import stream
        import asyncio
        
        mock_agent = Mock()
        mock_agent.ask_stream.return_value = iter([{"delta": "test"}])
        mock_build_agent.return_value = mock_agent
        
        # Should not raise
        asyncio.run(stream(provider="echo", q="test", x_api_key=None))


class TestChatEndpoint(unittest.TestCase):
    """Test suite for /chat endpoint"""
    
    @patch('agent.runtime.web.build_agent')
    def test_chat_endpoint_returns_response(self, mock_build_agent):
        """Test that chat endpoint returns assistant response"""
        from agent.runtime.web import chat
        import asyncio
        
        mock_agent = Mock()
        mock_agent.ask.return_value = "Test response"
        mock_build_agent.return_value = mock_agent
        
        payload = {"provider": "echo", "q": "Hello"}
        result = asyncio.run(chat(payload))
        
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Test response")
    
    @patch('agent.runtime.web.build_agent')
    def test_chat_endpoint_with_custom_params(self, mock_build_agent):
        """Test that chat endpoint passes custom parameters"""
        from agent.runtime.web import chat
        import asyncio
        
        mock_agent = Mock()
        mock_agent.ask.return_value = "Response"
        mock_build_agent.return_value = mock_agent
        
        payload = {
            "provider": "openai",
            "model": "gpt-4",
            "q": "Hello",
            "system": "Custom prompt",
            "session": "test-session"
        }
        asyncio.run(chat(payload))
        
        mock_build_agent.assert_called_once_with(
            provider="openai",
            model_name="gpt-4",
            session_path="test-session",
            system_prompt="Custom prompt"
        )
    
    @patch.dict(os.environ, {'AGENT_API_KEY': 'secret-key'})
    @patch('agent.runtime.web.build_agent')
    def test_chat_endpoint_checks_api_key(self, _mock_build_agent):
        """Test that chat endpoint validates API key"""
        from agent.runtime.web import chat
        from fastapi import HTTPException
        import asyncio
        
        payload = {"q": "test"}
        
        with self.assertRaises(HTTPException) as context:
            asyncio.run(chat(payload, x_api_key="wrong-key"))
        
        self.assertEqual(context.exception.status_code, 401)


if __name__ == '__main__':
    unittest.main()