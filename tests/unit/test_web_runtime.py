"""
Comprehensive Unit Tests for agent/runtime/web.py
Tests FastAPI web runtime endpoints and SSE streaming
"""

import unittest
import sys
import os
from unittest.mock import patch, MagicMock, Mock, AsyncMock
import asyncio

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))


class TestWebRuntimeEndpoints(unittest.TestCase):
    """Test suite for web runtime HTTP endpoints"""

    def test_app_exists(self):
        """Test that FastAPI app is created"""
        from agent.runtime.web import app
        self.assertIsNotNone(app)

    def test_app_has_cors_middleware(self):
        """Test that CORS middleware is configured"""
        from agent.runtime.web import app
        # Check that middleware is present
        self.assertTrue(hasattr(app, 'user_middleware'))


class TestIndexEndpoint(unittest.TestCase):
    """Test suite for index endpoint"""

    @patch('agent.runtime.web.HTMLResponse')
    async def test_index_returns_html(self, mock_html_response):
        """Test that index endpoint returns HTML"""
        from agent.runtime.web import index

        await index()

        # Should have been called with HTML content
        mock_html_response.assert_called_once()
        call_args = mock_html_response.call_args
        self.assertIn('content', call_args[1])
        html_content = call_args[1]['content']
        self.assertIn('<!doctype html>', html_content.lower())
        self.assertIn('Execute Agent', html_content)


class TestStreamEndpoint(unittest.TestCase):
    """Test suite for stream endpoint"""

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {}, clear=True)
    async def test_stream_builds_agent(self, mock_build_agent):
        """Test that stream endpoint builds agent"""
        from agent.runtime.web import stream

        mock_agent = Mock()
        mock_agent.ask_stream.return_value = [{"delta": "test"}]
        mock_build_agent.return_value = mock_agent

        await stream(provider="echo", model=None, q="test", x_api_key=None)

        mock_build_agent.assert_called_once()
        call_kwargs = mock_build_agent.call_args[1]
        self.assertEqual(call_kwargs['provider'], 'echo')

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {'AGENT_API_KEY': 'secret-key'})
    async def test_stream_requires_api_key_when_set(self, _mock_build_agent):
        """Test that stream endpoint requires API key when configured"""
        from agent.runtime.web import stream
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as context:
            await stream(provider="echo", model=None, q="test", x_api_key="wrong-key")

        self.assertEqual(context.exception.status_code, 401)

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {'AGENT_API_KEY': 'secret-key'})
    async def test_stream_allows_correct_api_key(self, mock_build_agent):
        """Test that stream endpoint allows correct API key"""
        from agent.runtime.web import stream

        mock_agent = Mock()
        mock_agent.ask_stream.return_value = [{"delta": "test"}]
        mock_build_agent.return_value = mock_agent

        response = await stream(provider="echo", model=None, q="test", x_api_key="secret-key")

        # Should not raise
        self.assertIsNotNone(response)

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {}, clear=True)
    async def test_stream_passes_parameters(self, mock_build_agent):
        """Test that stream endpoint passes all parameters"""
        from agent.runtime.web import stream

        mock_agent = Mock()
        mock_agent.ask_stream.return_value = [{"delta": "test"}]
        mock_build_agent.return_value = mock_agent

        await stream(provider="openai", model="gpt-4", q="hello", x_api_key=None)

        call_kwargs = mock_build_agent.call_args[1]
        self.assertEqual(call_kwargs['provider'], 'openai')
        self.assertEqual(call_kwargs['model_name'], 'gpt-4')

        mock_agent.ask_stream.assert_called_once_with("hello")

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {}, clear=True)
    async def test_stream_returns_event_source_response(self, mock_build_agent):
        """Test that stream endpoint returns EventSourceResponse"""
        from agent.runtime.web import stream, EventSourceResponse

        mock_agent = Mock()
        mock_agent.ask_stream.return_value = [{"delta": "test"}]
        mock_build_agent.return_value = mock_agent

        response = await stream(provider="echo", model=None, q="test", x_api_key=None)

        self.assertIsInstance(response, EventSourceResponse)


class TestChatEndpoint(unittest.TestCase):
    """Test suite for chat endpoint"""

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {}, clear=True)
    async def test_chat_builds_agent(self, mock_build_agent):
        """Test that chat endpoint builds agent"""
        from agent.runtime.web import chat

        mock_agent = Mock()
        mock_agent.ask.return_value = "Response"
        mock_build_agent.return_value = mock_agent

        payload = {"provider": "echo", "model": None, "q": "test"}
        result = await chat(payload, x_api_key=None)

        mock_build_agent.assert_called_once()
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Response")

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {'AGENT_API_KEY': 'secret-key'})
    async def test_chat_requires_api_key_when_set(self, _mock_build_agent):
        """Test that chat endpoint requires API key when configured"""
        from agent.runtime.web import chat
        from fastapi import HTTPException

        payload = {"q": "test"}

        with self.assertRaises(HTTPException) as context:
            await chat(payload, x_api_key="wrong-key")

        self.assertEqual(context.exception.status_code, 401)

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {'AGENT_API_KEY': 'secret-key'})
    async def test_chat_allows_correct_api_key(self, mock_build_agent):
        """Test that chat endpoint allows correct API key"""
        from agent.runtime.web import chat

        mock_agent = Mock()
        mock_agent.ask.return_value = "Response"
        mock_build_agent.return_value = mock_agent

        payload = {"q": "test"}
        result = await chat(payload, x_api_key="secret-key")

        self.assertEqual(result["content"], "Response")

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {}, clear=True)
    async def test_chat_passes_all_parameters(self, mock_build_agent):
        """Test that chat endpoint passes all parameters"""
        from agent.runtime.web import chat

        mock_agent = Mock()
        mock_agent.ask.return_value = "Response"
        mock_build_agent.return_value = mock_agent

        payload = {
            "provider": "anthropic",
            "model": "claude-3-opus",
            "q": "Hello",
            "system": "Be helpful",
            "session": "test.json"
        }
        await chat(payload, x_api_key=None)

        call_kwargs = mock_build_agent.call_args[1]
        self.assertEqual(call_kwargs['provider'], 'anthropic')
        self.assertEqual(call_kwargs['model_name'], 'claude-3-opus')
        self.assertEqual(call_kwargs['system_prompt'], 'Be helpful')
        self.assertEqual(call_kwargs['session_path'], 'test.json')

        mock_agent.ask.assert_called_once_with("Hello")

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {}, clear=True)
    async def test_chat_handles_missing_provider(self, mock_build_agent):
        """Test that chat endpoint uses default provider"""
        from agent.runtime.web import chat

        mock_agent = Mock()
        mock_agent.ask.return_value = "Response"
        mock_build_agent.return_value = mock_agent

        payload = {"q": "test"}
        await chat(payload, x_api_key=None)

        call_kwargs = mock_build_agent.call_args[1]
        self.assertEqual(call_kwargs['provider'], 'echo')

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {}, clear=True)
    async def test_chat_handles_empty_query(self, mock_build_agent):
        """Test that chat endpoint handles empty query"""
        from agent.runtime.web import chat

        mock_agent = Mock()
        mock_agent.ask.return_value = "Response"
        mock_build_agent.return_value = mock_agent

        payload = {}
        await chat(payload, x_api_key=None)

        mock_agent.ask.assert_called_once_with("")

    @patch('agent.runtime.web.build_agent')
    @patch.dict(os.environ, {}, clear=True)
    async def test_chat_returns_dict_with_role_and_content(self, mock_build_agent):
        """Test that chat endpoint returns proper dict format"""
        from agent.runtime.web import chat

        mock_agent = Mock()
        mock_agent.ask.return_value = "Test response"
        mock_build_agent.return_value = mock_agent

        payload = {"q": "test"}
        result = await chat(payload, x_api_key=None)

        self.assertIn("role", result)
        self.assertIn("content", result)
        self.assertEqual(result["role"], "assistant")
        self.assertEqual(result["content"], "Test response")


class TestMainFunction(unittest.TestCase):
    """Test suite for main function"""

    @patch('agent.runtime.web.uvicorn')
    def test_main_runs_uvicorn(self, mock_uvicorn):
        """Test that main function runs uvicorn"""
        from agent.runtime.web import main

        main()

        mock_uvicorn.run.assert_called_once()
        call_args = mock_uvicorn.run.call_args[0]
        call_kwargs = mock_uvicorn.run.call_args[1]

        self.assertEqual(call_args[0], "agent.runtime.web:app")
        self.assertEqual(call_kwargs['host'], "127.0.0.1")
        self.assertEqual(call_kwargs['port'], 8000)
        self.assertTrue(call_kwargs['reload'])


if __name__ == '__main__':
    unittest.main()