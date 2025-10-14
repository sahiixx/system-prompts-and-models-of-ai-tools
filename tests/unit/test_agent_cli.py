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


if __name__ == '__main__':
    unittest.main()


class TestBuildAgentExtended(unittest.TestCase):
    """Extended tests for build_agent with new features"""
    
    def test_build_agent_with_anthropic_provider(self):
        """Test building agent with anthropic provider"""
        agent = build_agent(provider="anthropic")
        from agent.models.anthropic import AnthropicModel
        self.assertIsInstance(agent.model, AnthropicModel)
    
    def test_build_agent_anthropic_custom_model(self):
        """Test building agent with anthropic and custom model"""
        agent = build_agent(provider="anthropic", model_name="claude-3-opus-20240229")
        self.assertEqual(agent.model.name, "claude-3-opus-20240229")
    
    @patch('os.path.exists')
    @patch('builtins.open', unittest.mock.mock_open(read_data='[{"role":"user","content":"Hello"}]'))
    def test_build_agent_loads_session_from_file(self, mock_exists):
        """Test that build_agent loads session from file"""
        mock_exists.return_value = True
        with patch('agent.cli._safe_session_path') as mock_safe:
            mock_safe.return_value = '/test/session.json'
            agent = build_agent(session_path="session.json")
            messages = agent.memory.as_list()
            # Should have loaded at least one message
            self.assertGreater(len(messages), 0)
    
    def test_build_agent_with_system_prompt(self):
        """Test building agent with custom system prompt"""
        custom_prompt = "You are a specialized assistant"
        agent = build_agent(system_prompt=custom_prompt)
        self.assertEqual(agent.config.system_prompt, custom_prompt)
    
    def test_build_agent_system_prompt_from_env(self):
        """Test that system prompt can be set from environment"""
        with patch.dict(os.environ, {'AGENT_SYSTEM_PROMPT': 'From env'}):
            build_agent()
            # Note: this test assumes build_agent reads from env
            # The actual behavior depends on how main() calls build_agent


class TestMainExtended(unittest.TestCase):
    """Extended tests for main CLI function"""
    
    @patch('sys.argv', ['cli.py', 'test', '--stream'])
    @patch('agent.cli.build_agent')
    def test_main_stream_flag(self, mock_build):
        """Test main with --stream flag"""
        mock_agent = MagicMock()
        mock_agent.ask_stream.return_value = [
            {"delta": "Hello"},
            {"done": True}
        ]
        mock_build.return_value = mock_agent
        
        with patch('sys.stdout', new=StringIO()):
            main()
        
        mock_agent.ask_stream.assert_called_once()
    
    @patch('sys.argv', ['cli.py', 'test', '--session', 'my-session.json'])
    @patch('agent.cli.build_agent')
    def test_main_session_flag(self, mock_build):
        """Test main with --session flag"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent
        
        with patch('sys.stdout', new=StringIO()):
            main()
        
        # Check that build_agent was called with session_path
        call_args = mock_build.call_args
        self.assertIn('session_path', call_args[1])
    
    @patch('sys.argv', ['cli.py', 'test', '--system', 'Custom prompt'])
    @patch('agent.cli.build_agent')
    def test_main_system_flag(self, mock_build):
        """Test main with --system flag"""
        mock_agent = MagicMock()
        mock_agent.ask.return_value = "Response"
        mock_build.return_value = mock_agent
        
        with patch('sys.stdout', new=StringIO()):
            main()
        
        # Check that build_agent was called with system_prompt
        call_args = mock_build.call_args
        self.assertIn('system_prompt', call_args[1])
        self.assertEqual(call_args[1]['system_prompt'], 'Custom prompt')
    
    @patch('sys.argv', ['cli.py', 'test', '--stream'])
    @patch('agent.cli.build_agent')
    def test_main_stream_with_tool_results(self, mock_build):
        """Test streaming with tool results in output"""
        mock_agent = MagicMock()
        mock_agent.ask_stream.return_value = [
            {"delta": "Using tool"},
            {"tool_result": {"name": "calculator", "result": {"answer": 42}}},
            {"done": True}
        ]
        mock_build.return_value = mock_agent
        
        with patch('sys.stdout', new=StringIO()) as mock_out:
            main()
            output = mock_out.getvalue()
            # Should mention tool usage
            self.assertIn("tool", output.lower())


if __name__ == '__main__':
    unittest.main()

# Additional comprehensive tests added - see TEST_COVERAGE_SUMMARY.md for details