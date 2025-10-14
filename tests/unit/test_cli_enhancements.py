"""
Comprehensive Unit Tests for CLI enhancements
Tests session persistence, system prompts, and streaming in agent/cli.py
"""

import unittest
import sys
import os
import json
import tempfile
import shutil
from unittest.mock import patch, MagicMock, mock_open, call
from io import StringIO

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.cli import build_agent, main, _safe_session_path


class TestSafeSessionPath(unittest.TestCase):
    """Test suite for _safe_session_path function"""
    
    def test_safe_session_path_none(self):
        """Test that None input returns None"""
        result = _safe_session_path(None)
        self.assertIsNone(result)
    
    def test_safe_session_path_empty_string(self):
        """Test that empty string returns None"""
        result = _safe_session_path("")
        self.assertIsNone(result)
    
    def test_safe_session_path_simple_filename(self):
        """Test sanitizing a simple filename"""
        result = _safe_session_path("session.json")
        self.assertIsNotNone(result)
        self.assertTrue(result.endswith("session.json"))
        self.assertIn(".agent_sessions", result)
    
    def test_safe_session_path_strips_directory(self):
        """Test that directory components are stripped"""
        result = _safe_session_path("/etc/passwd")
        self.assertIsNotNone(result)
        # Should only use basename
        self.assertTrue(result.endswith("passwd"))
        self.assertNotIn("/etc/", result)
    
    def test_safe_session_path_relative_path(self):
        """Test that relative paths are sanitized"""
        result = _safe_session_path("../../../etc/passwd")
        self.assertIsNotNone(result)
        # Should only use basename
        self.assertTrue(result.endswith("passwd"))
    
    def test_safe_session_path_invalid_characters(self):
        """Test that invalid characters result in default name"""
        result = _safe_session_path("file<>name.json")
        self.assertIsNotNone(result)
        # Should fallback to session.json
        self.assertTrue(result.endswith("session.json"))
    
    def test_safe_session_path_creates_directory(self):
        """Test that the .agent_sessions directory is created"""
        with tempfile.TemporaryDirectory() as tmpdir:
            original_cwd = os.getcwd()
            try:
                os.chdir(tmpdir)
                _safe_session_path("test.json")
                sessions_dir = os.path.join(tmpdir, ".agent_sessions")
                self.assertTrue(os.path.exists(sessions_dir))
            finally:
                os.chdir(original_cwd)


class TestBuildAgentEnhancements(unittest.TestCase):
    """Test suite for build_agent enhancements"""
    
    def test_build_agent_with_anthropic_provider(self):
        """Test building agent with Anthropic provider"""
        from agent.models.anthropic import AnthropicModel
        agent = build_agent(provider="anthropic")
        self.assertIsInstance(agent.model, AnthropicModel)
    
    def test_build_agent_with_system_prompt(self):
        """Test building agent with custom system prompt"""
        agent = build_agent(provider="echo", system_prompt="Be concise")
        self.assertEqual(agent.config.system_prompt, "Be concise")
    
    def test_build_agent_system_prompt_none(self):
        """Test building agent with None system prompt"""
        agent = build_agent(provider="echo", system_prompt=None)
        self.assertIsNone(agent.config.system_prompt)
    
    @patch('builtins.open', new_callable=mock_open, read_data='[{"role":"user","content":"hi","tool_name":null}]')
    @patch('os.path.exists', return_value=True)
    def test_build_agent_loads_existing_session(self, _mock_exists, _mock_file):
        """Test that existing session is loaded"""
        with tempfile.TemporaryDirectory() as tmpdir:
            session_file = os.path.join(tmpdir, "session.json")
            agent = build_agent(provider="echo", session_path=session_file)
            # Memory should be loaded from file
            self.assertIsNotNone(agent.memory)
    
    @patch('os.path.exists', return_value=False)
    def test_build_agent_no_session_file(self, _mock_exists):
        """Test building agent when session file doesn't exist"""
        agent = build_agent(provider="echo", session_path="nonexistent.json")
        # Should create agent with empty memory
        self.assertIsNotNone(agent.memory)


class TestCLIStreamingSupport(unittest.TestCase):
    """Test suite for CLI streaming support"""
    
    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--stream', '--provider', 'echo', 'Hello'])
    def test_main_with_stream_flag(self, mock_build):
        """Test main with --stream flag"""
        mock_agent = MagicMock()
        mock_agent.ask_stream.return_value = [
            {"delta": "Hello"},
            {"done": True}
        ]
        mock_build.return_value = mock_agent
        
        with patch('sys.stdout', new=StringIO()) as fake_out:
            main()
            output = fake_out.getvalue()
            self.assertIn("Hello", output)
        
        mock_agent.ask_stream.assert_called_once_with("Hello")
    
    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--stream', '--provider', 'echo', 'test'])
    def test_main_stream_with_tool_results(self, mock_build):
        """Test streaming with tool results"""
        mock_agent = MagicMock()
        mock_agent.ask_stream.return_value = [
            {"delta": "Using "},
            {"delta": "tool"},
            {"tool_result": {"name": "test_tool", "result": {"ok": True}}},
            {"delta": "Done"},
            {"done": True}
        ]
        mock_build.return_value = mock_agent
        
        with patch('sys.stdout', new=StringIO()) as fake_out:
            main()
            output = fake_out.getvalue()
            self.assertIn("Using", output)
            self.assertIn("tool", output)
    
    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--provider', 'echo', 'test'])
    def test_main_without_stream_flag(self, mock_build):
        """Test main without --stream flag uses ask()"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent
        
        main()
        
        mock_agent.ask.assert_called_once_with("test")
        mock_agent.ask_stream.assert_not_called()


class TestCLISessionPersistence(unittest.TestCase):
    """Test suite for CLI session persistence"""
    
    def setUp(self):
        """Set up temporary directory for tests"""
        self.test_dir = tempfile.mkdtemp()
        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)
    
    def tearDown(self):
        """Clean up temporary directory"""
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--session', 'test.json', 'Hello'])
    def test_main_saves_session_after_oneshot(self, mock_build):
        """Test that session is saved after one-shot execution"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_agent.memory.to_json.return_value = '[]'
        mock_build.return_value = mock_agent
        
        main()
        
        # Check that session file was created
        sessions_dir = os.path.join(self.test_dir, ".agent_sessions")
        self.assertTrue(os.path.exists(sessions_dir))


class TestCLISystemPromptSupport(unittest.TestCase):
    """Test suite for CLI system prompt support"""
    
    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--system', 'Be brief', 'test'])
    def test_main_with_system_flag(self, mock_build):
        """Test main with --system flag"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent
        
        main()
        
        # Verify build_agent was called with system_prompt
        call_kwargs = mock_build.call_args[1]
        self.assertEqual(call_kwargs['system_prompt'], 'Be brief')
    
    @patch.dict(os.environ, {'AGENT_SYSTEM_PROMPT': 'From env'})
    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', 'test'])
    def test_main_system_prompt_from_env(self, mock_build):
        """Test that system prompt can come from environment"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent
        
        main()
        
        call_kwargs = mock_build.call_args[1]
        self.assertEqual(call_kwargs['system_prompt'], 'From env')
    
    @patch.dict(os.environ, {'AGENT_SYSTEM_PROMPT': 'From env'})
    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--system', 'From flag', 'test'])
    def test_main_system_prompt_flag_overrides_env(self, mock_build):
        """Test that --system flag overrides environment"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent
        
        main()
        
        call_kwargs = mock_build.call_args[1]
        self.assertEqual(call_kwargs['system_prompt'], 'From flag')


if __name__ == '__main__':
    unittest.main()