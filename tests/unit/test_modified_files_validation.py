"""
Unit tests for validating modified prompt files and configurations.
Tests schema validation, content integrity, and format correctness.
"""
import json
import os
import pytest
from pathlib import Path


class TestModifiedPromptFiles:
    """Test suite for validating modified AI prompt text files."""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root directory."""
        return Path(__file__).parent.parent.parent
    
    def test_lovable_agent_prompt_exists(self, repo_root):
        """Test that Lovable Agent Prompt.txt exists and is readable."""
        prompt_file = repo_root / "Lovable" / "Agent Prompt.txt"
        assert prompt_file.exists(), f"Lovable Agent Prompt.txt not found at {prompt_file}"
        assert prompt_file.is_file(), "Lovable Agent Prompt.txt is not a file"
        
        content = prompt_file.read_text(encoding='utf-8')
        assert len(content) > 0, "Lovable Agent Prompt.txt is empty"
        assert len(content) > 100, "Lovable Agent Prompt.txt seems too short"
    
    def test_lovable_agent_prompt_structure(self, repo_root):
        """Test that Lovable Agent Prompt.txt contains expected sections."""
        prompt_file = repo_root / "Lovable" / "Agent Prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        
        expected_sections = [
            "# Lovable AI Editor System Prompt",
            "## Role",
            "## General Guidelines",
            "## Required Workflow"
        ]
        
        for section in expected_sections:
            assert section in content, f"Expected section '{section}' not found in Lovable Agent Prompt"
    
    def test_lovable_agent_prompt_no_secrets(self, repo_root):
        """Test that Lovable Agent Prompt doesn't contain sensitive information."""
        prompt_file = repo_root / "Lovable" / "Agent Prompt.txt"
        content = prompt_file.read_text(encoding='utf-8').lower()
        
        sensitive_patterns = ['api_key', 'password', 'secret_key', 'token=']
        for pattern in sensitive_patterns:
            assert pattern not in content, f"Found potential secret pattern: {pattern}"
    
    def test_lovable_prompt_exists(self, repo_root):
        """Test that new Lovable Prompt.txt exists and is valid."""
        prompt_file = repo_root / "Lovable" / "Prompt.txt"
        assert prompt_file.exists(), f"Lovable Prompt.txt not found at {prompt_file}"
        
        content = prompt_file.read_text(encoding='utf-8')
        assert len(content) > 0, "Lovable Prompt.txt is empty"
        assert "You are Lovable" in content, "Lovable identity not clearly stated"
    
    def test_lovable_prompt_contains_role_definition(self, repo_root):
        """Test that Lovable Prompt.txt has a clear role definition."""
        prompt_file = repo_root / "Lovable" / "Prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        
        assert "<role>" in content or "## Role" in content or "You are Lovable" in content, \
            "Missing clear role definition"
    
    def test_samedev_prompt_exists(self, repo_root):
        """Test that Same.dev Prompt.txt exists and is readable."""
        prompt_file = repo_root / "Same.dev" / "Prompt.txt"
        assert prompt_file.exists(), f"Same.dev Prompt.txt not found at {prompt_file}"
        
        content = prompt_file.read_text(encoding='utf-8')
        assert len(content) > 0, "Same.dev Prompt.txt is empty"
        assert len(content) > 100, "Same.dev Prompt.txt seems too short"
    
    def test_samedev_prompt_structure(self, repo_root):
        """Test that Same.dev Prompt.txt contains expected sections."""
        prompt_file = repo_root / "Same.dev" / "Prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        
        expected_sections = [
            "## Core Identity and Environment",
            "## Communication Protocol",
            "## Tool Calling Requirements"
        ]
        
        for section in expected_sections:
            assert section in content, f"Expected section '{section}' not found in Same.dev Prompt"
    
    def test_samedev_prompt_mentions_docker(self, repo_root):
        """Test that Same.dev prompt mentions its Docker environment."""
        prompt_file = repo_root / "Same.dev" / "Prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        
        assert "Docker" in content or "Ubuntu" in content, \
            "Same.dev should mention its Docker/Ubuntu environment"
    
    def test_orchids_system_prompt_exists(self, repo_root):
        """Test that Orchids.app System Prompt.txt exists and is valid."""
        prompt_file = repo_root / "Orchids.app" / "System Prompt.txt"
        assert prompt_file.exists(), f"Orchids.app System Prompt.txt not found"
        
        content = prompt_file.read_text(encoding='utf-8')
        assert len(content) > 0, "Orchids.app System Prompt is empty"
    
    def test_orchids_system_prompt_structure(self, repo_root):
        """Test that Orchids.app System Prompt contains expected XML-like tags."""
        prompt_file = repo_root / "Orchids.app" / "System Prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        
        expected_tags = [
            "<completeness_principle>",
            "<context_gathering_principle>",
            "<tool_calling>",
            "<communication>"
        ]
        
        for tag in expected_tags:
            assert tag in content, f"Expected tag '{tag}' not found in Orchids System Prompt"
    
    def test_orchids_system_prompt_has_closing_tags(self, repo_root):
        """Test that all opening XML tags have corresponding closing tags."""
        prompt_file = repo_root / "Orchids.app" / "System Prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        
        import re
        opening_tags = re.findall(r'<([a-z_]+)>', content)
        closing_tags = re.findall(r'</([a-z_]+)>', content)
        
        for tag in opening_tags:
            assert tag in closing_tags, f"Opening tag <{tag}> has no closing tag </{tag}>"
    
    def test_orchids_decision_making_prompt_exists(self, repo_root):
        """Test that Orchids.app Decision-making prompt.txt exists."""
        prompt_file = repo_root / "Orchids.app" / "Decision-making prompt.txt"
        assert prompt_file.exists(), f"Orchids Decision-making prompt not found"
        
        content = prompt_file.read_text(encoding='utf-8')
        assert len(content) > 0, "Orchids Decision-making prompt is empty"
    
    def test_orchids_decision_making_structure(self, repo_root):
        """Test that Orchids Decision-making prompt contains tool orchestration logic."""
        prompt_file = repo_root / "Orchids.app" / "Decision-making prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        
        assert "<role>" in content, "Missing role definition"
        assert "<task>" in content, "Missing task definition"
        assert "<tools>" in content, "Missing tools section"
        assert "<rules>" in content, "Missing rules section"
    
    def test_orchids_decision_making_mentions_tools(self, repo_root):
        """Test that Orchids Decision-making prompt mentions specific tools."""
        prompt_file = repo_root / "Orchids.app" / "Decision-making prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        
        expected_tools = ["generate_design_system", "clone_website"]
        for tool in expected_tools:
            assert tool in content, f"Expected tool '{tool}' not mentioned in Decision-making prompt"


class TestModifiedJSONFiles:
    """Test suite for validating modified JSON configuration files."""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root directory."""
        return Path(__file__).parent.parent.parent
    
    def test_lovable_agent_tools_json_valid(self, repo_root):
        """Test that Lovable Agent Tools.json is valid JSON."""
        json_file = repo_root / "Lovable" / "Agent Tools.json"
        assert json_file.exists(), f"Lovable Agent Tools.json not found"
        
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        assert isinstance(data, list), "Agent Tools.json should be a JSON array"
        assert len(data) > 0, "Agent Tools.json should not be empty"
    
    def test_lovable_agent_tools_schema(self, repo_root):
        """Test that each tool in Lovable Agent Tools.json has required fields."""
        json_file = repo_root / "Lovable" / "Agent Tools.json"
        
        with open(json_file, 'r', encoding='utf-8') as f:
            tools = json.load(f)
        
        for i, tool in enumerate(tools):
            assert "name" in tool, f"Tool {i} missing 'name' field"
            assert "description" in tool, f"Tool {i} ({tool.get('name', 'unknown')}) missing 'description' field"
            assert "parameters" in tool, f"Tool {i} ({tool.get('name', 'unknown')}) missing 'parameters' field"
            
            params = tool["parameters"]
            assert "type" in params, f"Tool {tool['name']} parameters missing 'type'"
            assert "properties" in params, f"Tool {tool['name']} parameters missing 'properties'"
            assert isinstance(params["properties"], dict), f"Tool {tool['name']} properties must be a dict"
    
    def test_lovable_tool_names_unique(self, repo_root):
        """Test that all tool names in Lovable Agent Tools.json are unique."""
        json_file = repo_root / "Lovable" / "Agent Tools.json"
        
        with open(json_file, 'r', encoding='utf-8') as f:
            tools = json.load(f)
        
        tool_names = [tool["name"] for tool in tools]
        assert len(tool_names) == len(set(tool_names)), "Duplicate tool names found"
    
    def test_lovable_tool_names_follow_convention(self, repo_root):
        """Test that tool names follow a consistent naming convention."""
        json_file = repo_root / "Lovable" / "Agent Tools.json"
        
        with open(json_file, 'r', encoding='utf-8') as f:
            tools = json.load(f)
        
        for tool in tools:
            name = tool["name"]
            assert name.startswith("lov-"), f"Tool name '{name}' should start with 'lov-'"
            assert name.islower() or '-' in name, f"Tool name '{name}' should be lowercase with hyphens"
    
    def test_lovable_tools_have_examples(self, repo_root):
        """Test that tool parameters in Lovable Agent Tools.json have examples."""
        json_file = repo_root / "Lovable" / "Agent Tools.json"
        
        with open(json_file, 'r', encoding='utf-8') as f:
            tools = json.load(f)
        
        for tool in tools:
            properties = tool["parameters"]["properties"]
            for prop_name, prop_def in properties.items():
                assert "example" in prop_def or "type" in prop_def, \
                    f"Tool {tool['name']}, property {prop_name} should have an example or type"
    
    def test_lovable_required_parameters_exist(self, repo_root):
        """Test that required parameters are defined in properties."""
        json_file = repo_root / "Lovable" / "Agent Tools.json"
        
        with open(json_file, 'r', encoding='utf-8') as f:
            tools = json.load(f)
        
        for tool in tools:
            if "required" in tool["parameters"]:
                required_params = tool["parameters"]["required"]
                properties = tool["parameters"]["properties"]
                
                for req_param in required_params:
                    assert req_param in properties, \
                        f"Tool {tool['name']}: required parameter '{req_param}' not in properties"


class TestFundingConfiguration:
    """Test suite for GitHub funding configuration."""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root directory."""
        return Path(__file__).parent.parent.parent
    
    def test_funding_yml_exists(self, repo_root):
        """Test that .github/FUNDING.yml exists."""
        funding_file = repo_root / ".github" / "FUNDING.yml"
        assert funding_file.exists(), "FUNDING.yml not found"
    
    def test_funding_yml_structure(self, repo_root):
        """Test that FUNDING.yml contains valid funding platforms."""
        funding_file = repo_root / ".github" / "FUNDING.yml"
        content = funding_file.read_text(encoding='utf-8')
        
        valid_platforms = ["patreon", "github", "ko_fi", "custom"]
        has_platform = any(platform in content.lower() for platform in valid_platforms)
        assert has_platform, "No valid funding platform found in FUNDING.yml"
    
    def test_funding_yml_not_empty(self, repo_root):
        """Test that FUNDING.yml is not empty."""
        funding_file = repo_root / ".github" / "FUNDING.yml"
        content = funding_file.read_text(encoding='utf-8').strip()
        assert len(content) > 0, "FUNDING.yml is empty"
    
    def test_funding_yml_valid_format(self, repo_root):
        """Test that FUNDING.yml follows expected YAML format."""
        funding_file = repo_root / ".github" / "FUNDING.yml"
        content = funding_file.read_text(encoding='utf-8')
        
        lines = [line.strip() for line in content.split('\n') if line.strip() and not line.strip().startswith('#')]
        for line in lines:
            assert ':' in line, f"Invalid FUNDING.yml line: {line}"


class TestSpawnPrompt:
    """Test suite for the new Spawn prompt file."""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root directory."""
        return Path(__file__).parent.parent.parent
    
    def test_spawn_directory_exists(self, repo_root):
        """Test that -Spawn directory exists (note the dash prefix)."""
        spawn_dir = repo_root / "-Spawn"
        assert spawn_dir.exists(), f"-Spawn directory not found at {spawn_dir}"
        assert spawn_dir.is_dir(), "-Spawn is not a directory"
    
    def test_spawn_prompt_exists(self, repo_root):
        """Test that -Spawn/Prompt.txt exists."""
        prompt_file = repo_root / "-Spawn" / "Prompt.txt"
        assert prompt_file.exists(), f"-Spawn/Prompt.txt not found at {prompt_file}"
    
    def test_spawn_prompt_not_empty(self, repo_root):
        """Test that Spawn prompt is not empty."""
        prompt_file = repo_root / "-Spawn" / "Prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        assert len(content) > 0, "Spawn Prompt.txt is empty"
    
    def test_spawn_prompt_mentions_spawn(self, repo_root):
        """Test that Spawn prompt mentions the spawn tool."""
        prompt_file = repo_root / "-Spawn" / "Prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        
        assert "spawn" in content.lower() or "@spawn" in content.lower(), \
            "Spawn prompt should mention spawn"


class TestReadmeIntegrity:
    """Test suite for README.md modifications."""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root directory."""
        return Path(__file__).parent.parent.parent
    
    def test_readme_exists(self, repo_root):
        """Test that README.md exists."""
        readme_file = repo_root / "README.md"
        assert readme_file.exists(), "README.md not found"
    
    def test_readme_not_empty(self, repo_root):
        """Test that README.md is not empty."""
        readme_file = repo_root / "README.md"
        content = readme_file.read_text(encoding='utf-8')
        assert len(content) > 0, "README.md is empty"
    
    def test_readme_mentions_tools(self, repo_root):
        """Test that README.md mentions the AI tools in the repository."""
        readme_file = repo_root / "README.md"
        content = readme_file.read_text(encoding='utf-8')
        
        tools_to_check = ["Lovable", "Cursor", "Same.dev", "Orchids"]
        mentions = sum(1 for tool in tools_to_check if tool in content)
        assert mentions >= 2, "README should mention at least 2 major AI tools"
    
    def test_readme_has_title(self, repo_root):
        """Test that README.md has a title."""
        readme_file = repo_root / "README.md"
        content = readme_file.read_text(encoding='utf-8')
        
        assert content.startswith('#'), "README should start with a markdown heading"


class TestV0PromptFile:
    """Test suite for v0 Prompts and Tools modifications."""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root directory."""
        return Path(__file__).parent.parent.parent
    
    def test_v0_directory_exists(self, repo_root):
        """Test that v0 Prompts and Tools directory exists."""
        v0_dir = repo_root / "v0 Prompts and Tools"
        assert v0_dir.exists(), f"v0 Prompts and Tools directory not found"
    
    def test_v0_prompt_exists(self, repo_root):
        """Test that v0 Prompts and Tools/Prompt.txt exists."""
        prompt_file = repo_root / "v0 Prompts and Tools" / "Prompt.txt"
        assert prompt_file.exists(), f"v0 Prompt.txt not found at {prompt_file}"
    
    def test_v0_prompt_not_empty(self, repo_root):
        """Test that v0 Prompt.txt is not empty."""
        prompt_file = repo_root / "v0 Prompts and Tools" / "Prompt.txt"
        content = prompt_file.read_text(encoding='utf-8')
        assert len(content) > 0, "v0 Prompt.txt is empty"


class TestPromptFileEncodings:
    """Test suite for checking file encodings and special characters."""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def modified_text_files(self, repo_root):
        """Get list of all modified text files."""
        return [
            repo_root / "Lovable" / "Agent Prompt.txt",
            repo_root / "Lovable" / "Prompt.txt",
            repo_root / "Same.dev" / "Prompt.txt",
            repo_root / "Orchids.app" / "System Prompt.txt",
            repo_root / "Orchids.app" / "Decision-making prompt.txt",
            repo_root / "v0 Prompts and Tools" / "Prompt.txt",
            repo_root / "-Spawn" / "Prompt.txt",
            repo_root / "README.md"
        ]
    
    def test_files_are_utf8_encoded(self, modified_text_files):
        """Test that all modified text files are UTF-8 encoded."""
        for file_path in modified_text_files:
            if file_path.exists():
                try:
                    file_path.read_text(encoding='utf-8')
                except UnicodeDecodeError:
                    pytest.fail(f"File {file_path} is not valid UTF-8")
    
    def test_files_have_no_null_bytes(self, modified_text_files):
        """Test that text files don't contain null bytes."""
        for file_path in modified_text_files:
            if file_path.exists():
                content = file_path.read_bytes()
                assert b'\x00' not in content, f"File {file_path} contains null bytes"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])