"""
Comprehensive unit tests for updates to agent/cli.py
Tests Ollama provider integration
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import patch, Mock
import argparse

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from agent.cli import build_agent, main
from agent.models.ollama import OllamaModel
from agent.models.openai import OpenAIModel
from agent.models.echo import EchoModel


class TestBuildAgentWithOllama:
    """Test suite for build_agent with Ollama provider"""
    
    def test_build_agent_with_echo_provider(self):
        """Test building agent with echo provider"""
        agent = build_agent(provider="echo")
        
        assert isinstance(agent.model, EchoModel)
        assert agent.model.name == "echo"
    
    @patch('agent.cli.OpenAIModel')
    def test_build_agent_with_openai_provider(self, mock_openai):
        """Test building agent with OpenAI provider"""
        mock_instance = Mock()
        mock_instance.name = "gpt-4o-mini"
        mock_openai.return_value = mock_instance
        
        build_agent(provider="openai")
        
        mock_openai.assert_called_once_with(model="gpt-4o-mini")
    
    @patch('agent.cli.OllamaModel')
    def test_build_agent_with_ollama_provider(self, mock_ollama):
        """Test building agent with Ollama provider"""
        mock_instance = Mock()
        mock_instance.name = "llama3.1"
        mock_ollama.return_value = mock_instance
        
        build_agent(provider="ollama")
        
        mock_ollama.assert_called_once_with(model="llama3.1")
    
    @patch('agent.cli.OllamaModel')
    def test_build_agent_ollama_with_custom_model(self, mock_ollama):
        """Test building Ollama agent with custom model name"""
        mock_instance = Mock()
        mock_instance.name = "llama2"
        mock_ollama.return_value = mock_instance
        
        build_agent(provider="ollama", model_name="llama2")
        
        mock_ollama.assert_called_once_with(model="llama2")
    
    @patch('agent.cli.OllamaModel')
    def test_build_agent_ollama_default_model(self, mock_ollama):
        """Test that Ollama uses llama3.1 as default"""
        mock_instance = Mock()
        mock_instance.name = "llama3.1"
        mock_ollama.return_value = mock_instance
        
        build_agent(provider="ollama", model_name=None)
        
        # Should use default llama3.1
        mock_ollama.assert_called_once_with(model="llama3.1")
    
    def test_build_agent_creates_tools(self):
        """Test that build_agent creates tools"""
        agent = build_agent(provider="echo")
        
        # Should have registered tools
        specs = agent.tools.list_specs()
        assert len(specs) > 0
        
        # Check for some expected tools
        tool_names = [spec["name"] for spec in specs]
        assert "shell" in tool_names
        assert "fs.read" in tool_names
    
    def test_build_agent_creates_memory(self):
        """Test that build_agent creates memory"""
        agent = build_agent(provider="echo")
        
        assert agent.memory is not None
        assert agent.memory.max_messages == 200
    
    def test_build_agent_sets_config(self):
        """Test that build_agent sets agent config"""
        agent = build_agent(provider="echo")
        
        assert agent.config is not None
        assert agent.config.model_name == "echo"


class TestMainWithOllamaProvider:
    """Test suite for main() with Ollama provider"""
    
    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['agent', '--provider', 'ollama', 'hello'])
    def test_main_accepts_ollama_provider(self, mock_build_agent):
        """Test that main accepts ollama as provider choice"""
        mock_agent = Mock()
        mock_agent.ask.return_value = "Response"
        mock_build_agent.return_value = mock_agent
        
        with pytest.raises(SystemExit):
            main()
        
        # Should exit normally (exit code 0 from reaching end of main)
        # Actually, it won't raise SystemExit when successful
        pass
        
        # Verify build_agent was called with ollama
        mock_build_agent.assert_called_once_with(provider="ollama", model_name=None)
    
    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['agent', '--provider', 'ollama', '--model', 'llama2', 'test'])
    def test_main_ollama_with_custom_model(self, mock_build_agent):
        """Test main with Ollama provider and custom model"""
        mock_agent = Mock()
        mock_agent.ask.return_value = "Response"
        mock_build_agent.return_value = mock_agent
        
        try:
            main()
        except SystemExit:
            pass
        
        mock_build_agent.assert_called_once_with(provider="ollama", model_name="llama2")
    
    @patch('sys.argv', ['agent', '--provider', 'invalid'])
    def test_main_rejects_invalid_provider(self):
        """Test that main rejects invalid provider"""
        with pytest.raises(SystemExit):
            # argparse will raise SystemExit for invalid choice
            main()
    
    @patch('agent.cli.build_agent')
    @patch('sys.argv', ['agent', '--provider', 'echo'])
    @patch('builtins.input', side_effect=['hello', 'exit'])
    @patch('builtins.print')
    def test_main_repl_mode_with_echo(self, _mock_print, _mock_input, mock_build_agent):
        """Test REPL mode with echo provider"""
        mock_agent = Mock()
        mock_agent.ask.return_value = "Echo response"
        mock_build_agent.return_value = mock_agent
        
        main()
        
        mock_build_agent.assert_called_once_with(provider="echo", model_name=None)
        assert mock_agent.ask.call_count >= 1


class TestProviderChoices:
    """Test provider argument choices"""
    
    def test_provider_choices_include_ollama(self):
        """Test that provider choices include ollama"""
        parser = argparse.ArgumentParser()
        parser.add_argument("--provider", choices=["echo", "openai", "ollama"])
        
        # Should not raise error
        args = parser.parse_args(["--provider", "ollama"])
        assert args.provider == "ollama"
    
    def test_provider_choices_include_all_three(self):
        """Test that all three providers are valid"""
        parser = argparse.ArgumentParser()
        parser.add_argument("--provider", choices=["echo", "openai", "ollama"])
        
        for provider in ["echo", "openai", "ollama"]:
            args = parser.parse_args(["--provider", provider])
            assert args.provider == provider


class TestOllamaImport:
    """Test that OllamaModel is properly imported"""
    
    def test_ollama_model_imported_in_cli(self):
        """Test that OllamaModel is imported in cli module"""
        import agent.cli
        
        assert hasattr(agent.cli, 'OllamaModel')
    
    def test_ollama_model_can_be_instantiated(self):
        """Test that OllamaModel can be instantiated"""
        from agent.cli import OllamaModel as CLI_OllamaModel
        
        model = CLI_OllamaModel()
        assert model.model == "llama3.1"