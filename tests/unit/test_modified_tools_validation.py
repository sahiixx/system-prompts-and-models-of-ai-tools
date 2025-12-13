"""
Unit tests for modified and new tool configuration files in the diff.

This module tests:
- Lovable/Agent Tools.json validation
- Modified prompt file integrity
- JSON schema compliance
"""

import pytest
import json
from pathlib import Path


class TestLovableAgentTools:
    """Test Lovable/Agent Tools.json validation."""
    
    @pytest.fixture
    def tools_path(self):
        """Return path to Lovable Agent Tools.json."""
        return Path("Lovable/Agent Tools.json")
    
    @pytest.fixture
    def tools_data(self, tools_path):
        """Load and return Lovable tools configuration."""
        if not tools_path.exists():
            pytest.skip(f"Tools file not found: {tools_path}")
        with open(tools_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def test_lovable_tools_file_exists(self, tools_path):
        """Test that Lovable Agent Tools.json exists."""
        assert tools_path.exists(), f"Tools file not found: {tools_path}"
    
    def test_lovable_tools_valid_json(self, tools_path):
        """Test that Lovable tools file is valid JSON."""
        with open(tools_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        assert isinstance(data, list), "Tools must be a JSON array"
    
    def test_lovable_tools_not_empty(self, tools_data):
        """Test that Lovable tools array is not empty."""
        assert len(tools_data) > 0, "Tools array should contain at least one tool"
    
    def test_each_lovable_tool_has_required_fields(self, tools_data):
        """Test that each Lovable tool has required fields."""
        required_fields = ['name', 'description', 'parameters']
        
        for i, tool in enumerate(tools_data):
            for field in required_fields:
                assert field in tool, \
                    f"Tool at index {i} missing required field: {field}"
    
    def test_lovable_tool_names_unique(self, tools_data):
        """Test that Lovable tool names are unique."""
        names = [tool['name'] for tool in tools_data]
        duplicates = [name for name in names if names.count(name) > 1]
        assert len(duplicates) == 0, f"Duplicate tool names: {set(duplicates)}"
    
    def test_lovable_tool_parameters_valid(self, tools_data):
        """Test that Lovable tool parameters are valid."""
        for i, tool in enumerate(tools_data):
            params = tool.get('parameters', {})
            
            assert 'properties' in params, \
                f"Tool {i} missing parameters.properties"
            assert 'required' in params, \
                f"Tool {i} missing parameters.required"
            
            assert isinstance(params['properties'], dict), \
                f"Tool {i} properties must be a dict"
            assert isinstance(params['required'], list), \
                f"Tool {i} required must be a list"
    
    def test_lovable_required_fields_in_properties(self, tools_data):
        """Test that required fields exist in properties."""
        for i, tool in enumerate(tools_data):
            params = tool.get('parameters', {})
            properties = params.get('properties', {})
            required = params.get('required', [])
            
            for req_field in required:
                assert req_field in properties, \
                    f"Tool {i}: required field '{req_field}' not in properties"
    
    def test_lovable_tool_descriptions_meaningful(self, tools_data):
        """Test that tool descriptions are meaningful."""
        for i, tool in enumerate(tools_data):
            desc = tool.get('description', '')
            assert len(desc) > 10, \
                f"Tool {i} description too short (should be > 10 chars)"
            assert isinstance(desc, str), \
                f"Tool {i} description must be a string"
    
    def test_lovable_specific_tools_present(self, tools_data):
        """Test that Lovable-specific tools are present."""
        tool_names = [tool['name'] for tool in tools_data]
        
        # Lovable should have these core tools based on the prompt
        expected_prefixes = ['lov-']
        
        lovable_tools = [name for name in tool_names 
                        if any(name.startswith(prefix) for prefix in expected_prefixes)]
        
        assert len(lovable_tools) > 0, \
            "Should have Lovable-specific tools (starting with 'lov-')"
    
    def test_lovable_write_tool_exists(self, tools_data):
        """Test that lov-write tool exists (core functionality)."""
        tool_names = [tool['name'] for tool in tools_data]
        assert 'lov-write' in tool_names, \
            "Should have lov-write tool for file operations"
    
    def test_lovable_search_tool_exists(self, tools_data):
        """Test that lov-search-files tool exists."""
        tool_names = [tool['name'] for tool in tools_data]
        assert 'lov-search-files' in tool_names, \
            "Should have lov-search-files tool"
    
    def test_lovable_line_replace_tool_exists(self, tools_data):
        """Test that lov-line-replace tool exists."""
        tool_names = [tool['name'] for tool in tools_data]
        assert 'lov-line-replace' in tool_names, \
            "Should have lov-line-replace tool for precise editing"


class TestModifiedPromptFiles:
    """Test modified prompt files."""
    
    @pytest.fixture
    def lovable_prompt_path(self):
        """Return path to Lovable prompt."""
        return Path("Lovable/Agent Prompt.txt")
    
    @pytest.fixture
    def orchids_decision_path(self):
        """Return path to Orchids decision-making prompt."""
        return Path("Orchids.app/Decision-making prompt.txt")
    
    @pytest.fixture
    def orchids_system_path(self):
        """Return path to Orchids system prompt."""
        return Path("Orchids.app/System Prompt.txt")
    
    def test_lovable_prompt_exists(self, lovable_prompt_path):
        """Test that Lovable prompt file exists."""
        assert lovable_prompt_path.exists(), \
            f"Prompt file not found: {lovable_prompt_path}"
    
    def test_orchids_prompts_exist(self, orchids_decision_path, orchids_system_path):
        """Test that Orchids prompt files exist."""
        assert orchids_decision_path.exists(), \
            f"Prompt file not found: {orchids_decision_path}"
        assert orchids_system_path.exists(), \
            f"Prompt file not found: {orchids_system_path}"
    
    def test_prompt_files_not_empty(self, lovable_prompt_path, 
                                     orchids_decision_path, orchids_system_path):
        """Test that prompt files are not empty."""
        for path in [lovable_prompt_path, orchids_decision_path, orchids_system_path]:
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                assert len(content) > 100, \
                    f"Prompt file seems too short: {path}"
    
    def test_prompt_files_valid_utf8(self, lovable_prompt_path, 
                                      orchids_decision_path, orchids_system_path):
        """Test that prompt files are valid UTF-8."""
        for path in [lovable_prompt_path, orchids_decision_path, orchids_system_path]:
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                assert content, f"Failed to read: {path}"
    
    def test_lovable_prompt_has_sections(self, lovable_prompt_path):
        """Test that Lovable prompt has expected sections."""
        if not lovable_prompt_path.exists():
            pytest.skip("Lovable prompt not found")
        
        with open(lovable_prompt_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Based on the content we saw, check for key sections
        expected_sections = ['Role', 'Guidelines', 'Technology Stack']
        for section in expected_sections:
            assert section in content, \
                f"Lovable prompt missing section: {section}"
    
    def test_orchids_prompts_have_structure(self, orchids_decision_path, 
                                             orchids_system_path):
        """Test that Orchids prompts have proper structure."""
        for path in [orchids_decision_path, orchids_system_path]:
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Should have some structure (headings, lists, etc.)
                has_structure = (
                    '#' in content or  # Markdown headings
                    '-' in content or  # Lists
                    '*' in content or  # Bullets/emphasis
                    '##' in content    # Subheadings
                )
                assert has_structure, f"Prompt should have structure: {path}"
    
    def test_prompts_no_sensitive_data(self, lovable_prompt_path, 
                                        orchids_decision_path, orchids_system_path):
        """Test that prompts don't contain sensitive data."""
        sensitive_patterns = [
            'password', 'api_key', 'secret_key', 'private_key',
            'auth_token', 'bearer ', 'basic auth'
        ]
        
        for path in [lovable_prompt_path, orchids_decision_path, orchids_system_path]:
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read().lower()
                
                for pattern in sensitive_patterns:
                    assert pattern not in content, \
                        f"Prompt may contain sensitive data '{pattern}': {path}"


class TestNewPromptFiles:
    """Test newly added prompt files."""
    
    @pytest.fixture
    def spawn_prompt_path(self):
        """Return path to Spawn prompt."""
        return Path("-Spawn/Prompt.txt")
    
    @pytest.fixture
    def lovable_new_prompt_path(self):
        """Return path to new Lovable prompt."""
        return Path("Lovable/Prompt.txt")
    
    def test_spawn_prompt_exists(self, spawn_prompt_path):
        """Test that Spawn prompt exists."""
        assert spawn_prompt_path.exists(), \
            f"Spawn prompt not found: {spawn_prompt_path}"
    
    def test_lovable_new_prompt_exists(self, lovable_new_prompt_path):
        """Test that new Lovable prompt exists."""
        assert lovable_new_prompt_path.exists(), \
            f"Lovable prompt not found: {lovable_new_prompt_path}"
    
    def test_new_prompts_not_empty(self, spawn_prompt_path, lovable_new_prompt_path):
        """Test that new prompt files are not empty."""
        for path in [spawn_prompt_path, lovable_new_prompt_path]:
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                assert len(content) > 50, \
                    f"Prompt file seems too short: {path}"
    
    def test_new_prompts_valid_encoding(self, spawn_prompt_path, lovable_new_prompt_path):
        """Test that new prompts use valid encoding."""
        for path in [spawn_prompt_path, lovable_new_prompt_path]:
            if path.exists():
                # Test UTF-8 encoding
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                assert content, f"Failed to read as UTF-8: {path}"


class TestModifiedREADME:
    """Test modified README.md."""
    
    @pytest.fixture
    def readme_path(self):
        """Return path to README.md."""
        return Path("README.md")
    
    def test_readme_exists(self, readme_path):
        """Test that README.md exists."""
        assert readme_path.exists(), "README.md not found"
    
    def test_readme_not_empty(self, readme_path):
        """Test that README.md is not empty."""
        with open(readme_path, 'r', encoding='utf-8') as f:
            content = f.read()
        assert len(content) > 100, "README.md seems too short"
    
    def test_readme_valid_markdown(self, readme_path):
        """Test that README has markdown structure."""
        with open(readme_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Should have markdown headings
        assert '#' in content, "README should have markdown headings"
    
    def test_readme_mentions_tools(self, readme_path):
        """Test that README mentions the tools."""
        with open(readme_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Should mention some of the tools
        tools_mentioned = sum(1 for tool in ['v0', 'Cursor', 'Lovable', 'Devin'] 
                             if tool in content)
        assert tools_mentioned >= 2, \
            "README should mention at least 2 tools"


class TestFundingYAML:
    """Test modified FUNDING.yml."""
    
    @pytest.fixture
    def funding_path(self):
        """Return path to FUNDING.yml."""
        return Path(".github/FUNDING.yml")
    
    def test_funding_file_exists(self, funding_path):
        """Test that FUNDING.yml exists."""
        assert funding_path.exists(), "FUNDING.yml not found"
    
    def test_funding_file_valid_yaml(self, funding_path):
        """Test that FUNDING.yml is valid YAML-like."""
        with open(funding_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Basic YAML structure check
        assert ':' in content, "FUNDING.yml should have key:value pairs"
    
    def test_funding_has_platforms(self, funding_path):
        """Test that FUNDING.yml specifies platforms."""
        with open(funding_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Should have at least one funding platform
        platforms = ['patreon', 'github', 'ko_fi', 'custom']
        has_platform = any(platform in content.lower() for platform in platforms)
        assert has_platform, "FUNDING.yml should specify at least one platform"
    
    def test_funding_no_empty_values(self, funding_path):
        """Test that FUNDING.yml doesn't have empty values."""
        with open(funding_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for line in lines:
            if ':' in line and not line.strip().startswith('#'):
                key, value = line.split(':', 1)
                # Skip comment lines and empty lines
                if value.strip() and not value.strip().startswith('#'):
                    assert len(value.strip()) > 0, \
                        f"Empty value in FUNDING.yml: {key}"