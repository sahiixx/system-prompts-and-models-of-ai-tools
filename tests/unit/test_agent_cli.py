"""
Comprehensive Unit Tests for agent/cli.py
Tests CLI functionality including build_agent and main entry point
"""

import unittest
import sys
import os
from unittest.mock import patch, MagicMock, call
from io import StringIO

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.cli import build_agent, main
from agent.core.agent import Agent
from agent.models.echo import EchoModel
from agent.models.openai import OpenAIModel
from agent.models.ollama import OllamaModel


class TestBuildAgent(unittest.TestCase):
    """Test suite for build_agent function"""

    def test_build_agent_default_echo(self):
        """Test building agent with default echo provider"""
        agent = build_agent()
        self.assertIsInstance(agent, Agent)
        self.assertIsInstance(agent.model, EchoModel)
        self.assertEqual(agent.model.name, "echo")

    def test_build_agent_echo_explicit(self):
        """Test building agent with explicit echo provider"""
        agent = build_agent(provider="echo")
        self.assertIsInstance(agent, Agent)
        self.assertIsInstance(agent.model, EchoModel)

    def test_build_agent_openai_default_model(self):
        """Test building agent with OpenAI provider and default model"""
        agent = build_agent(provider="openai")
        self.assertIsInstance(agent, Agent)
        self.assertIsInstance(agent.model, OpenAIModel)
        self.assertEqual(agent.model.model, "gpt-4o-mini")

    def test_build_agent_openai_custom_model(self):
        """Test building agent with OpenAI provider and custom model"""
        agent = build_agent(provider="openai", model_name="gpt-4")
        self.assertIsInstance(agent, Agent)
        self.assertIsInstance(agent.model, OpenAIModel)
        self.assertEqual(agent.model.model, "gpt-4")

    def test_build_agent_ollama_default_model(self):
        """Test building agent with Ollama provider and default model"""
        agent = build_agent(provider="ollama")
        self.assertIsInstance(agent, Agent)
        self.assertIsInstance(agent.model, OllamaModel)
        self.assertEqual(agent.model.model, "llama3.1")

    def test_build_agent_ollama_custom_model(self):
        """Test building agent with Ollama provider and custom model"""
        agent = build_agent(provider="ollama", model_name="llama2")
        self.assertIsInstance(agent, Agent)
        self.assertIsInstance(agent.model, OllamaModel)
        self.assertEqual(agent.model.model, "llama2")

    def test_build_agent_has_tools_registry(self):
        """Test that built agent has tools registry with builtin tools"""
        agent = build_agent()
        self.assertIsNotNone(agent.tools)
        specs = agent.tools.list_specs()
        self.assertGreater(len(specs), 0)
        # Check for some expected tools
        tool_names = [spec["name"] for spec in specs]
        self.assertIn("fs.read", tool_names)
        self.assertIn("math.calc", tool_names)

    def test_build_agent_has_memory(self):
        """Test that built agent has memory configured"""
        agent = build_agent()
        self.assertIsNotNone(agent.memory)
        self.assertEqual(agent.memory.max_messages, 200)

    def test_build_agent_has_config(self):
        """Test that built agent has proper configuration"""
        agent = build_agent(provider="openai", model_name="gpt-4")
        self.assertIsNotNone(agent.config)
        self.assertEqual(agent.config.model_name, "gpt-4")


class TestMainCLI(unittest.TestCase):
    """Test suite for main CLI entry point"""

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', 'Hello world'])
    def test_main_one_shot_message(self, mock_build):
        """Test main with one-shot message"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent

        with patch('sys.stdout', new=StringIO()) as fake_out:
            main()
            self.assertIn("Response", fake_out.getvalue())

        mock_agent.ask.assert_called_once_with("Hello world")

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', 'Multiple', 'word', 'prompt'])
    def test_main_multi_word_prompt(self, mock_build):
        """Test main with multi-word prompt"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent

        main()
        mock_agent.ask.assert_called_once_with("Multiple word prompt")

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--provider', 'openai', 'test'])
    def test_main_with_provider_flag(self, mock_build):
        """Test main with provider flag"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent

        main()
        mock_build.assert_called_once_with(provider='openai', model_name=None)

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--provider', 'ollama', '--model', 'llama2', 'test'])
    def test_main_with_provider_and_model_flags(self, mock_build):
        """Test main with both provider and model flags"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent

        main()
        mock_build.assert_called_once_with(provider='ollama', model_name='llama2')


class TestSafeSessionPath(unittest.TestCase):
    """Test suite for _safe_session_path function"""

    def test_safe_session_path_none_input(self):
        """Test that None input returns None"""
        from agent.cli import _safe_session_path
        result = _safe_session_path(None)
        self.assertIsNone(result)

    def test_safe_session_path_empty_string(self):
        """Test that empty string returns None"""
        from agent.cli import _safe_session_path
        result = _safe_session_path("")
        self.assertIsNone(result)

    def test_safe_session_path_simple_filename(self):
        """Test simple filename is sanitized to .agent_sessions directory"""
        from agent.cli import _safe_session_path
        result = _safe_session_path("mysession.json")
        self.assertIsNotNone(result)
        self.assertTrue(result.endswith("mysession.json"))
        self.assertIn(".agent_sessions", result)

    def test_safe_session_path_removes_path_traversal(self):
        """Test that path traversal attempts are sanitized"""
        from agent.cli import _safe_session_path
        result = _safe_session_path("../../etc/passwd")
        self.assertIsNotNone(result)
        self.assertIn(".agent_sessions", result)
        # Should only use basename
        self.assertTrue(result.endswith("passwd"))
        self.assertNotIn("..", result)

    def test_safe_session_path_removes_absolute_path(self):
        """Test that absolute paths are converted to relative"""
        from agent.cli import _safe_session_path
        result = _safe_session_path("/session.json")
        self.assertIsNotNone(result)
        self.assertIn(".agent_sessions", result)
        self.assertTrue(result.endswith("session.json"))

    def test_safe_session_path_rejects_slashes(self):
        """Test that paths with slashes get default name"""
        from agent.cli import _safe_session_path
        result = _safe_session_path("subdir/session.json")
        self.assertIsNotNone(result)
        self.assertTrue(result.endswith("session.json"))

    def test_safe_session_path_rejects_backslashes(self):
        """Test that paths with backslashes get default name"""
        from agent.cli import _safe_session_path
        result = _safe_session_path("subdir\\session.json")
        self.assertIsNotNone(result)
        self.assertTrue(result.endswith("session.json"))

    def test_safe_session_path_rejects_invalid_chars(self):
        """Test that invalid characters result in default name"""
        from agent.cli import _safe_session_path
        result = _safe_session_path("session@#$.json")
        self.assertIsNotNone(result)
        self.assertTrue(result.endswith("session.json"))

    def test_safe_session_path_allows_valid_chars(self):
        """Test that valid characters (alphanumeric, dot, dash, underscore) are allowed"""
        from agent.cli import _safe_session_path
        result = _safe_session_path("my-session_2024.json")
        self.assertIsNotNone(result)
        self.assertTrue(result.endswith("my-session_2024.json"))

    @patch('os.makedirs')
    def test_safe_session_path_creates_directory(self, mock_makedirs):
        """Test that .agent_sessions directory is created"""
        from agent.cli import _safe_session_path
        _safe_session_path("test.json")
        mock_makedirs.assert_called_once()


class TestBuildAgentEnhanced(unittest.TestCase):
    """Enhanced test suite for build_agent with new parameters"""

    def test_build_agent_anthropic_default_model(self):
        """Test building agent with Anthropic provider and default model"""
        agent = build_agent(provider="anthropic")
        self.assertIsInstance(agent, Agent)
        from agent.models.anthropic import AnthropicModel
        self.assertIsInstance(agent.model, AnthropicModel)
        self.assertEqual(agent.model.model, "claude-3-5-sonnet-latest")

    def test_build_agent_anthropic_custom_model(self):
        """Test building agent with Anthropic provider and custom model"""
        agent = build_agent(provider="anthropic", model_name="claude-3-opus-20240229")
        from agent.models.anthropic import AnthropicModel
        self.assertIsInstance(agent.model, AnthropicModel)
        self.assertEqual(agent.model.model, "claude-3-opus-20240229")

    def test_build_agent_with_system_prompt(self):
        """Test building agent with custom system prompt"""
        custom_prompt = "You are a specialized assistant."
        agent = build_agent(system_prompt=custom_prompt)
        self.assertEqual(agent.config.system_prompt, custom_prompt)

    def test_build_agent_with_none_system_prompt(self):
        """Test building agent with None system prompt doesn't override default"""
        agent = build_agent(system_prompt=None)
        # Should keep default system prompt
        self.assertIsNotNone(agent.config.system_prompt)

    @patch('os.path.exists', return_value=False)
    def test_build_agent_session_path_no_existing_file(self, _mock_exists):
        """Test building agent with session path when file doesn't exist"""
        agent = build_agent(session_path="test.json")
        self.assertIsNotNone(agent.memory)
        # Memory should be fresh
        self.assertEqual(len(agent.memory.messages), 0)

    @patch('os.path.exists', return_value=True)
    @patch('builtins.open', new_callable=unittest.mock.mock_open, read_data='[{"role": "user", "content": "Hello"}]')
    def test_build_agent_session_path_loads_existing(self, _mock_file, _mock_exists):
        """Test building agent loads existing session file"""
        agent = build_agent(session_path="existing.json")
        self.assertIsNotNone(agent.memory)
        # Should have loaded message
        self.assertGreater(len(agent.memory.messages), 0)

    @patch('os.path.exists', return_value=True)
    @patch('builtins.open', side_effect=Exception("Read error"))
    def test_build_agent_session_path_handles_read_error(self, _mock_file, _mock_exists):
        """Test building agent handles session file read errors gracefully"""
        agent = build_agent(session_path="corrupt.json")
        # Should not raise, memory should be fresh
        self.assertIsNotNone(agent.memory)
        self.assertEqual(len(agent.memory.messages), 0)


class TestMainCLIEnhanced(unittest.TestCase):
    """Enhanced test suite for main CLI with streaming and session support"""

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--list-tools'])
    def test_main_list_tools(self, _mock_build):
        """Test --list-tools flag lists available tools"""
        from io import StringIO
        with patch('sys.stdout', new=StringIO()) as fake_out:
            main()
            output = fake_out.getvalue()
            self.assertIn("fs.read", output)
            self.assertIn("math.calc", output)

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--stream', 'test message'])
    def test_main_stream_mode(self, mock_build):
        """Test main with --stream flag"""
        mock_agent = MagicMock()
        mock_agent.ask_stream.return_value = [
            {"delta": "Hello"},
            {"delta": " world"},
            {"done": True}
        ]
        mock_build.return_value = mock_agent

        with patch('sys.stdout', new=StringIO()) as fake_out:
            main()
            output = fake_out.getvalue()
            self.assertIn("Hello world", output)

        mock_agent.ask_stream.assert_called_once_with("test message")

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--stream', 'test'])
    def test_main_stream_mode_with_tool_result(self, mock_build):
        """Test streaming mode displays tool results"""
        mock_agent = MagicMock()
        mock_agent.ask_stream.return_value = [
            {"delta": "Using tool"},
            {"tool_result": {"name": "test_tool", "result": {"value": 42}}},
            {"delta": " done"},
            {"done": True}
        ]
        mock_build.return_value = mock_agent

        with patch('sys.stdout', new=StringIO()) as fake_out:
            main()
            output = fake_out.getvalue()
            self.assertIn("test_tool", output)

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--session', 'test.json', 'hello'])
    @patch('builtins.open', new_callable=unittest.mock.mock_open)
    def test_main_saves_session_after_one_shot(self, mock_file, mock_build):
        """Test session is saved after one-shot message"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_agent.memory.to_json.return_value = '[]'
        mock_build.return_value = mock_agent

        main()

        # Should have written session file
        mock_file.assert_called()

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--session', '../evil/path.json', 'hello'])
    @patch('builtins.open', new_callable=unittest.mock.mock_open)
    def test_main_sanitizes_session_path(self, mock_file, mock_build):
        """Test that session path is sanitized for security"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_agent.memory.to_json.return_value = '[]'
        mock_build.return_value = mock_agent

        main()

        # Check that file write path doesn't contain traversal
        if mock_file.call_args_list:
            write_path = str(mock_file.call_args_list[-1])
            self.assertNotIn("..", write_path)

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--system', 'Custom system', 'hello'])
    def test_main_with_system_prompt(self, mock_build):
        """Test main with --system flag"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent

        main()

        # Should have passed system prompt to build_agent
        call_kwargs = mock_build.call_args[1]
        self.assertEqual(call_kwargs['system_prompt'], 'Custom system')

    @patch('agent.cli.build_agent')
    @patch.dict(os.environ, {'AGENT_SYSTEM_PROMPT': 'Env system'})
    @patch('sys.argv', ['execute-agent', 'hello'])
    def test_main_uses_env_system_prompt(self, mock_build):
        """Test main uses AGENT_SYSTEM_PROMPT from environment"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent

        main()

        call_kwargs = mock_build.call_args[1]
        self.assertEqual(call_kwargs['system_prompt'], 'Env system')

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent'])
    @patch('builtins.input', side_effect=['test message', 'exit'])
    def test_main_repl_mode(self, _mock_input, mock_build):
        """Test REPL mode processes messages"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent

        with patch('sys.stdout', new=StringIO()):
            main()

        mock_agent.ask.assert_called_with('test message')

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--stream'])
    @patch('builtins.input', side_effect=['test', 'quit'])
    def test_main_repl_stream_mode(self, _mock_input, mock_build):
        """Test REPL mode with streaming"""
        mock_agent = MagicMock()
        mock_agent.ask_stream.return_value = [
            {"delta": "Response"},
            {"done": True}
        ]
        mock_build.return_value = mock_agent

        with patch('sys.stdout', new=StringIO()):
            main()

        mock_agent.ask_stream.assert_called()

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--session', 'repl.json'])
    @patch('builtins.input', side_effect=['message', 'exit'])
    @patch('builtins.open', new_callable=unittest.mock.mock_open)
    def test_main_repl_saves_session_each_turn(self, mock_file, _mock_input, mock_build):
        """Test REPL mode saves session after each message"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_agent.memory.to_json.return_value = '[]'
        mock_build.return_value = mock_agent

        with patch('sys.stdout', new=StringIO()):
            main()

        # Should have written session file
        self.assertGreater(mock_file.call_count, 0)

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent'])
    @patch('builtins.input', side_effect=EOFError)
    def test_main_repl_handles_eof(self, _mock_input, mock_build):
        """Test REPL mode handles EOF (Ctrl-D) gracefully"""
        mock_agent = MagicMock()
        mock_build.return_value = mock_agent

        with patch('sys.stdout', new=StringIO()):
            # Should not raise
            main()

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent'])
    @patch('builtins.input', side_effect=['', 'quit'])
    def test_main_repl_skips_empty_input(self, _mock_input, mock_build):
        """Test REPL mode skips empty input lines"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent

        with patch('sys.stdout', new=StringIO()):
            main()

        # Should not have called ask for empty input
        mock_agent.ask.assert_not_called()

    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['execute-agent', '--provider', 'anthropic', '--model', 'claude-3-opus-20240229', 'test'])
    def test_main_with_anthropic_provider(self, mock_build):
        """Test main with anthropic provider"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent

        main()

        mock_build.assert_called_once()
        call_kwargs = mock_build.call_args[1]
        self.assertEqual(call_kwargs['provider'], 'anthropic')
        self.assertEqual(call_kwargs['model_name'], 'claude-3-opus-20240229')


if __name__ == '__main__':
    unittest.main()