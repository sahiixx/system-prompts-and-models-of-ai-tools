#!/usr/bin/env python3
"""
Comprehensive unit tests for generate-metadata.py
Tests metadata generation from tool directories
"""

import pytest
import json
import sys
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'scripts'))

from generate_metadata import MetadataGenerator


class TestMetadataGenerator:
    """Test suite for MetadataGenerator class"""
    
    @pytest.fixture
    def temp_repo(self):
        """Create temporary repository structure"""
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        
        # Create metadata directory
        (repo_path / 'metadata').mkdir()
        
        # Create sample tool directories
        cursor_dir = repo_path / 'Cursor'
        cursor_dir.mkdir()
        
        yield repo_path
        
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def generator(self, temp_repo):
        """Create MetadataGenerator instance"""
        return MetadataGenerator(str(temp_repo))
    
    def test_init(self, temp_repo):
        """Test MetadataGenerator initialization"""
        generator = MetadataGenerator(str(temp_repo))
        
        assert generator.repo_path == temp_repo
        assert generator.metadata_dir == temp_repo / 'metadata'
        assert generator.metadata_dir.exists()
    
    def test_scan_tool_directories(self, generator, temp_repo):
        """Test scanning for tool directories"""
        # Create some tool directories
        (temp_repo / 'Cursor').mkdir(exist_ok=True)
        (temp_repo / 'Windsurf').mkdir()
        (temp_repo / '.git').mkdir()  # Should be excluded
        (temp_repo / 'metadata').mkdir(exist_ok=True)  # Should be excluded
        
        dirs = generator.scan_tool_directories()
        
        assert 'Cursor' in dirs
        assert 'Windsurf' in dirs
        assert '.git' not in dirs
        assert 'metadata' not in dirs
    
    def test_slugify(self, generator):
        """Test slug generation from tool names"""
        assert generator.slugify('Cursor') == 'cursor'
        assert generator.slugify('Claude Code') == 'claude-code'
        assert generator.slugify('VS Code Agent') == 'vs-code-agent'
        assert generator.slugify('Tool v2.0') == 'tool-v20'
        assert generator.slugify('Tool (Beta)') == 'tool-beta'
    
    def test_slugify_edge_cases(self, generator):
        """Test slug generation edge cases"""
        assert generator.slugify('') == ''
        assert generator.slugify('   Spaces   ') == 'spaces'
        assert generator.slugify('UPPERCASE') == 'uppercase'
        assert generator.slugify('multiple---dashes') == 'multiple-dashes'
    
    def test_detect_tool_type_cli(self, generator):
        """Test detecting CLI tool type"""
        assert generator.detect_tool_type('Claude CLI', []) == 'CLI Tool'
        assert generator.detect_tool_type('Terminal Tool', []) == 'CLI Tool'
    
    def test_detect_tool_type_web(self, generator):
        """Test detecting web platform type"""
        assert generator.detect_tool_type('Example.dev', []) == 'Web Platform'
        assert generator.detect_tool_type('Web App', []) == 'Web Platform'
    
    def test_detect_tool_type_agent(self, generator):
        """Test detecting autonomous agent type"""
        assert generator.detect_tool_type('Devin AI', []) == 'Autonomous Agent'
        assert generator.detect_tool_type('Poke Agent', []) == 'Autonomous Agent'
    
    def test_detect_tool_type_default(self, generator):
        """Test default tool type detection"""
        assert generator.detect_tool_type('Cursor', []) == 'IDE Plugin'
        assert generator.detect_tool_type('Unknown Tool', []) == 'IDE Plugin'
    
    def test_detect_conciseness_very_high(self, generator):
        """Test detecting very high conciseness"""
        content = """
        Be concise. Keep it brief. Be minimal.
        Avoid verbose explanations. Be terse and succinct.
        """
        
        result = generator.detect_conciseness(content)
        assert result == 'very-high'
    
    def test_detect_conciseness_high(self, generator):
        """Test detecting high conciseness"""
        content = "Be concise and brief in your responses."
        
        result = generator.detect_conciseness(content)
        assert result == 'high'
    
    def test_detect_conciseness_low(self, generator):
        """Test detecting low conciseness"""
        content = "Provide detailed and comprehensive explanations."
        
        result = generator.detect_conciseness(content)
        assert result == 'low'
    
    def test_calculate_conciseness_score(self, generator):
        """Test calculating numeric conciseness score"""
        high_content = "Be concise, brief, and short. Keep it minimal."
        score = generator.calculate_conciseness_score(high_content)
        
        assert 0 <= score <= 100
        assert score > 50
        
        low_content = "Provide detailed and comprehensive explanations."
        score = generator.calculate_conciseness_score(low_content)
        
        assert score < 50
    
    def test_analyze_prompt_file(self, generator, temp_repo):
        """Test analyzing a prompt file"""
        # Create a prompt file
        prompt_content = """
        You are an AI coding assistant.
        Be concise in your responses.
        Never log API keys or secrets.
        Verify all changes before applying.
        Execute tasks in parallel when possible.
        Use the available tools to complete tasks.
        """
        
        prompt_file = temp_repo / 'test.txt'
        prompt_file.write_text(prompt_content)
        
        result = generator.analyze_prompt_file(prompt_file)
        
        assert 'patterns' in result
        assert 'features' in result
        assert 'metrics' in result
        
        # Check detected patterns
        assert not result['patterns']['todoSystem']
        assert result['patterns']['parallelTools']
        assert result['patterns']['verificationGates']
        
        # Check detected features
        assert result['features']['codeGeneration']
        assert not result['features']['agentMode']
        
        # Check metrics
        assert result['metrics']['securityRules'] > 0
    
    def test_analyze_prompt_file_missing(self, generator, temp_repo):
        """Test analyzing a non-existent prompt file"""
        result = generator.analyze_prompt_file(temp_repo / 'missing.txt')
        
        assert result == {}
    
    def test_analyze_tools_file(self, generator, temp_repo):
        """Test analyzing tools JSON file"""
        tools_data = [
            {'name': 'tool1', 'description': 'First tool'},
            {'name': 'tool2', 'description': 'Second tool'},
            {'name': 'tool3', 'description': 'Third tool'}
        ]
        
        tools_file = temp_repo / 'tools.json'
        with open(tools_file, 'w') as f:
            json.dump(tools_data, f)
        
        result = generator.analyze_tools_file(tools_file)
        
        assert result['toolsCount'] == 3
    
    def test_analyze_tools_file_dict_format(self, generator, temp_repo):
        """Test analyzing tools JSON with dict format"""
        tools_data = {
            'functions': [
                {'name': 'tool1'},
                {'name': 'tool2'}
            ]
        }
        
        tools_file = temp_repo / 'tools.json'
        with open(tools_file, 'w') as f:
            json.dump(tools_data, f)
        
        result = generator.analyze_tools_file(tools_file)
        
        assert result['toolsCount'] == 2
    
    def test_analyze_tools_file_invalid(self, generator, temp_repo):
        """Test analyzing invalid tools file"""
        tools_file = temp_repo / 'invalid.json'
        tools_file.write_text('{ invalid json')
        
        result = generator.analyze_tools_file(tools_file)
        
        assert result['toolsCount'] == 0
    
    def test_detect_versions(self, generator, temp_repo):
        """Test detecting multiple versions"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        
        # Create version files
        (tool_dir / 'prompt-v1.0.txt').write_text('Version 1')
        (tool_dir / 'prompt-v2.3.txt').write_text('Version 2')
        (tool_dir / 'agent-prompt.txt').write_text('Agent')
        
        versions = generator.detect_versions(tool_dir)
        
        assert len(versions) >= 2
        assert any('v1.0' in v or 'v2.3' in v for v in versions)
    
    def test_detect_versions_no_versions(self, generator, temp_repo):
        """Test detecting versions when none exist"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        (tool_dir / 'prompt.txt').write_text('Basic prompt')
        
        versions = generator.detect_versions(tool_dir)
        
        assert versions == ['1.0']
    
    def test_generate_metadata(self, generator, temp_repo):
        """Test generating metadata for a tool"""
        # Create a tool directory
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        
        # Create files
        (tool_dir / 'Prompt.txt').write_text('Test prompt content')
        (tool_dir / 'Tools.json').write_text('[]')
        (tool_dir / 'README.md').write_text('# TestTool')
        
        metadata = generator.generate_metadata('TestTool')
        
        assert metadata['name'] == 'TestTool'
        assert metadata['slug'] == 'testtool'
        assert metadata['type'] in ['IDE Plugin', 'CLI Tool', 'Web Platform', 'Autonomous Agent']
        assert metadata['status'] == 'active'
        assert 'version' in metadata
        assert 'pricing' in metadata
        assert 'features' in metadata
        assert 'documentation' in metadata
    
    def test_save_metadata(self, generator, temp_repo):
        """Test saving metadata to file"""
        metadata = {
            'name': 'TestTool',
            'slug': 'testtool',
            'type': 'IDE Plugin',
            'status': 'active'
        }
        
        generator.save_metadata('TestTool', metadata)
        
        output_file = temp_repo / 'metadata' / 'testtool.json'
        assert output_file.exists()
        
        with open(output_file) as f:
            saved = json.load(f)
        
        assert saved['name'] == 'TestTool'
        assert saved['slug'] == 'testtool'
    
    def test_validate_metadata_valid(self, generator, temp_repo):
        """Test validating valid metadata"""
        metadata = {
            'name': 'Test',
            'slug': 'test',
            'type': 'IDE Plugin',
            'status': 'active',
            'description': 'Test tool'
        }
        
        file_path = temp_repo / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        assert len(errors) == 0
    
    def test_validate_metadata_missing_fields(self, generator, temp_repo):
        """Test validating metadata with missing required fields"""
        metadata = {'name': 'Test'}
        
        file_path = temp_repo / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        assert len(errors) > 0
        assert any('Missing required field' in e for e in errors)
    
    def test_validate_metadata_invalid_type(self, generator, temp_repo):
        """Test validating metadata with invalid type"""
        metadata = {
            'name': 'Test',
            'slug': 'test',
            'type': 'Invalid Type',
            'status': 'active',
            'description': 'Test'
        }
        
        file_path = temp_repo / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        assert any('Invalid type' in e for e in errors)
    
    def test_validate_metadata_invalid_json(self, generator, temp_repo):
        """Test validating invalid JSON"""
        file_path = temp_repo / 'invalid.json'
        file_path.write_text('{ invalid }')
        
        errors = generator.validate_metadata(file_path)
        
        assert len(errors) > 0
        assert any('Invalid JSON' in e for e in errors)


class TestMetadataGeneratorIntegration:
    """Integration tests for metadata generation"""
    
    @pytest.fixture
    def full_repo(self):
        """Create a full repository structure"""
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        
        # Create metadata directory
        (repo_path / 'metadata').mkdir()
        
        # Create tool directories with content
        for tool_name in ['Cursor', 'Windsurf']:
            tool_dir = repo_path / tool_name
            tool_dir.mkdir()
            
            (tool_dir / 'Prompt.txt').write_text('Test prompt')
            (tool_dir / 'README.md').write_text(f'# {tool_name}')
        
        yield repo_path
        
        shutil.rmtree(temp_dir)
    
    def test_generate_all(self, full_repo, capsys):
        """Test generating metadata for all tools"""
        generator = MetadataGenerator(str(full_repo))
        generator.generate_all()
        
        # Check output
        captured = capsys.readouterr()
        assert 'Found 2 tools' in captured.out
        assert 'Generated metadata for 2 tools' in captured.out
        
        # Check files were created
        assert (full_repo / 'metadata' / 'cursor.json').exists()
        assert (full_repo / 'metadata' / 'windsurf.json').exists()


pytestmark = pytest.mark.unit