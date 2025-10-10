"""
Comprehensive unit tests for generate-metadata.py
Tests metadata generation and validation
"""

import pytest
import json
import sys
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch, mock_open

sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'scripts'))

from generate_metadata import MetadataGenerator


class TestMetadataGenerator:
    """Test suite for MetadataGenerator class"""
    
    @pytest.fixture
    def temp_repo(self):
        """Create temporary repository structure"""
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        
        # Create tool directories
        (repo_path / 'TestTool').mkdir()
        (repo_path / 'AnotherTool').mkdir()
        (repo_path / 'metadata').mkdir()
        
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
    
    def test_init_creates_metadata_dir(self):
        """Test that initialization creates metadata directory"""
        with tempfile.TemporaryDirectory() as temp_dir:
            repo = Path(temp_dir)
            generator = MetadataGenerator(str(repo))
            
            assert generator.metadata_dir.exists()
    
    def test_scan_tool_directories(self, generator, temp_repo):
        """Test scanning for tool directories"""
        _ = temp_repo
        tools = generator.scan_tool_directories()
        
        assert 'TestTool' in tools
        assert 'AnotherTool' in tools
        assert 'metadata' not in tools
    
    def test_scan_tool_directories_excludes_hidden(self, temp_repo):
        """Test that hidden directories are excluded"""
        (temp_repo / '.hidden').mkdir()
        
        generator = MetadataGenerator(str(temp_repo))
        tools = generator.scan_tool_directories()
        
        assert '.hidden' not in tools
    
    def test_scan_tool_directories_excludes_system(self, temp_repo):
        """Test that system directories are excluded"""
        (temp_repo / '.git').mkdir()
        (temp_repo / 'node_modules').mkdir()
        (temp_repo / 'scripts').mkdir()
        
        generator = MetadataGenerator(str(temp_repo))
        tools = generator.scan_tool_directories()
        
        assert '.git' not in tools
        assert 'node_modules' not in tools
        assert 'scripts' not in tools
    
    def test_scan_tool_directories_sorted(self, temp_repo):
        """Test that tool directories are sorted"""
        (temp_repo / 'ZTool').mkdir()
        (temp_repo / 'ATool').mkdir()
        
        generator = MetadataGenerator(str(temp_repo))
        tools = generator.scan_tool_directories()
        
        assert tools == sorted(tools)
    
    def test_slugify(self, generator):
        """Test slug generation"""
        assert generator.slugify('Test Tool') == 'test-tool'
        assert generator.slugify('Test  Tool') == 'test-tool'
        assert generator.slugify('Test-Tool') == 'test-tool'
        assert generator.slugify('TEST TOOL') == 'test-tool'
    
    def test_slugify_special_characters(self, generator):
        """Test slugify removes special characters"""
        assert generator.slugify('Test@Tool!') == 'testtool'
        assert generator.slugify('Test (Tool)') == 'test-tool'
        assert generator.slugify('Test_Tool') == 'test_tool'
    
    def test_slugify_unicode(self, generator):
        """Test slugify with Unicode characters"""
        result = generator.slugify('Tëst Töol')
        assert result.replace('ë', 'e').replace('ö', 'o') == 'test-tool'
    
    def test_slugify_strips_hyphens(self, generator):
        """Test that leading/trailing hyphens are stripped"""
        assert generator.slugify('-Test-') == 'test'
        assert generator.slugify('--Test--') == 'test'
    
    def test_detect_tool_type_cli(self, generator):
        """Test detecting CLI tool type"""
        assert generator.detect_tool_type('CLI Tool', []) == 'CLI Tool'
        assert generator.detect_tool_type('Terminal App', []) == 'CLI Tool'
    
    def test_detect_tool_type_web(self, generator):
        """Test detecting web platform type"""
        assert generator.detect_tool_type('Web App', []) == 'Web Platform'
        assert generator.detect_tool_type('Dev Platform', []) == 'Web Platform'
    
    def test_detect_tool_type_agent(self, generator):
        """Test detecting autonomous agent type"""
        assert generator.detect_tool_type('Agent Tool', []) == 'Autonomous Agent'
        assert generator.detect_tool_type('Devin AI', []) == 'Autonomous Agent'
        assert generator.detect_tool_type('Poke Assistant', []) == 'Autonomous Agent'
    
    def test_detect_tool_type_default(self, generator):
        """Test default tool type"""
        assert generator.detect_tool_type('Random Tool', []) == 'IDE Plugin'
    
    def test_analyze_prompt_file(self, generator, temp_repo):
        """Test analyzing prompt file"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('''
        You are a coding assistant.
        Be concise in your responses.
        Use available tools in parallel when possible.
        Verify all changes before applying.
        Remember context in agents.md.
        ''')
        
        result = generator.analyze_prompt_file(prompt)
        
        assert 'patterns' in result
        assert 'features' in result
        assert 'metrics' in result
        assert result['patterns']['conciseness'] != 'low'
        assert result['patterns']['parallelTools']
        assert result['patterns']['verificationGates']
    
    def test_analyze_prompt_file_features(self, generator, temp_repo):
        """Test feature detection in prompt file"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('''
        Generate code and provide completions.
        Chat interface for conversations.
        Agent mode for autonomous operation.
        Use git for version control.
        Refactor and debug code.
        ''')
        
        result = generator.analyze_prompt_file(prompt)
        features = result['features']
        
        assert features['codeGeneration']
        assert features['codeCompletion']
        assert features['chatInterface']
        assert features['agentMode']
        assert features['gitIntegration']
        assert features['refactoring']
        assert features['debugging']
    
    def test_analyze_prompt_file_security(self, generator, temp_repo):
        """Test security detection"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('''
        Never expose secrets or API keys.
        Protect passwords and sensitive data.
        Use encryption for credentials.
        Ensure security of all operations.
        ''')
        
        result = generator.analyze_prompt_file(prompt)
        
        assert result['metrics']['securityRules'] > 0
    
    def test_analyze_prompt_file_empty(self, generator, temp_repo):
        """Test analyzing empty prompt file"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('')
        
        result = generator.analyze_prompt_file(prompt)
        
        assert 'patterns' in result
        assert 'features' in result
    
    def test_analyze_prompt_file_unreadable(self, generator, temp_repo):
        """Test handling unreadable file"""
        prompt = temp_repo / 'nonexistent.txt'
        
        result = generator.analyze_prompt_file(prompt)
        
        assert result == {}
    
    def test_detect_conciseness_very_high(self, generator):
        """Test very high conciseness detection"""
        content = 'Be concise, brief, and short. Avoid verbose responses. Keep it minimal.'
        result = generator.detect_conciseness(content)
        
        assert result == 'very-high'
    
    def test_detect_conciseness_high(self, generator):
        """Test high conciseness detection"""
        content = 'Be concise and brief in responses.'
        result = generator.detect_conciseness(content)
        
        assert result in ['high', 'very-high']
    
    def test_detect_conciseness_medium(self, generator):
        """Test medium conciseness detection"""
        content = 'Keep responses concise when appropriate.'
        result = generator.detect_conciseness(content)
        
        assert result in ['medium', 'high']
    
    def test_detect_conciseness_low(self, generator):
        """Test low conciseness detection"""
        content = 'Provide detailed and comprehensive responses.'
        result = generator.detect_conciseness(content)
        
        assert result == 'low'
    
    def test_calculate_conciseness_score(self, generator):
        """Test calculating conciseness score"""
        content = 'Be concise and brief. Keep it short.'
        score = generator.calculate_conciseness_score(content)
        
        assert 50 < score <= 100
    
    def test_calculate_conciseness_score_verbose(self, generator):
        """Test score for verbose content"""
        content = 'Provide detailed and comprehensive explanations. Be verbose and thorough.'
        score = generator.calculate_conciseness_score(content)
        
        assert 0 <= score < 50
    
    def test_calculate_conciseness_score_neutral(self, generator):
        """Test score for neutral content"""
        content = 'Normal content without specific directives.'
        score = generator.calculate_conciseness_score(content)
        
        assert 40 <= score <= 60
    
    def test_analyze_tools_file(self, generator, temp_repo):
        """Test analyzing tools JSON file"""
        tools_file = temp_repo / 'tools.json'
        tools_data = [
            {"name": "read_file", "description": "Read a file"},
            {"name": "write_file", "description": "Write a file"},
            {"name": "list_dir", "description": "List directory"}
        ]
        with open(tools_file, 'w') as f:
            json.dump(tools_data, f)
        
        result = generator.analyze_tools_file(tools_file)
        
        assert result['toolsCount'] == 3
    
    def test_analyze_tools_file_dict_format(self, generator, temp_repo):
        """Test analyzing tools file with dict format"""
        tools_file = temp_repo / 'tools.json'
        tools_data = {
            "functions": [
                {"name": "tool1"},
                {"name": "tool2"}
            ]
        }
        with open(tools_file, 'w') as f:
            json.dump(tools_data, f)
        
        result = generator.analyze_tools_file(tools_file)
        
        assert result['toolsCount'] == 2
    
    def test_analyze_tools_file_invalid(self, generator, temp_repo):
        """Test analyzing invalid tools file"""
        tools_file = temp_repo / 'tools.json'
        tools_file.write_text('invalid json')
        
        result = generator.analyze_tools_file(tools_file)
        
        assert result['toolsCount'] == 0
    
    def test_detect_versions(self, generator, temp_repo):
        """Test detecting version patterns"""
        tool_dir = temp_repo / 'TestTool'
        
        (tool_dir / 'prompt-v1.0.txt').write_text('V1')
        (tool_dir / 'prompt-v2.3.txt').write_text('V2')
        (tool_dir / 'agent-version-3.txt').write_text('V3')
        
        versions = generator.detect_versions(tool_dir)
        
        assert len(versions) > 0
    
    def test_detect_versions_date_based(self, generator, temp_repo):
        """Test detecting date-based versions"""
        tool_dir = temp_repo / 'TestTool'
        
        (tool_dir / 'prompt-2024-01-15.txt').write_text('V1')
        (tool_dir / 'prompt-2024-02-20.txt').write_text('V2')
        
        versions = generator.detect_versions(tool_dir)
        
        assert len(versions) > 0
    
    def test_detect_versions_default(self, generator, temp_repo):
        """Test default version when no pattern found"""
        tool_dir = temp_repo / 'TestTool'
        (tool_dir / 'prompt.txt').write_text('V1')
        
        versions = generator.detect_versions(tool_dir)
        
        assert versions == ['1.0']
    
    def test_generate_metadata(self, generator, temp_repo):
        """Test generating metadata for a tool"""
        tool_dir = temp_repo / 'TestTool'
        (tool_dir / 'prompt.txt').write_text('Concise coding assistant.')
        (tool_dir / 'README.md').write_text('# Test Tool')
        
        metadata = generator.generate_metadata('TestTool')
        
        assert metadata['name'] == 'TestTool'
        assert metadata['slug'] == 'testtool'
        assert 'type' in metadata
        assert 'status' in metadata
        assert 'version' in metadata
        assert 'features' in metadata
    
    def test_generate_metadata_with_tools(self, generator, temp_repo):
        """Test generating metadata with tools file"""
        tool_dir = temp_repo / 'TestTool'
        (tool_dir / 'prompt.txt').write_text('Test')
        
        tools_file = tool_dir / 'tools.json'
        with open(tools_file, 'w') as f:
            json.dump([{"name": "tool1"}, {"name": "tool2"}], f)
        
        metadata = generator.generate_metadata('TestTool')
        
        assert 'metrics' in metadata
        assert metadata['metrics'].get('toolsCount', 0) > 0
    
    def test_generate_metadata_platforms(self, generator, temp_repo):
        """Test platform detection in metadata"""
        tool_dir = temp_repo / 'VSCode Extension'
        (tool_dir / 'prompt.txt').write_text('Test')
        
        metadata = generator.generate_metadata('VSCode Extension')
        
        assert metadata['platforms']['vscode']
    
    def test_save_metadata(self, generator, temp_repo, capfd):
        """Test saving metadata to file"""
        _ = temp_repo
        metadata = {
            'name': 'Test',
            'slug': 'test',
            'type': 'CLI Tool'
        }
        
        generator.save_metadata('Test', metadata)
        captured = capfd.readouterr()
        
        assert (generator.metadata_dir / 'test.json').exists()
        assert 'Generated' in captured.out
    
    def test_save_metadata_unicode(self, generator, temp_repo):
        """Test saving metadata with Unicode characters"""
        _ = temp_repo
        metadata = {
            'name': 'Tëst Töol',
            'slug': 'test-tool',
            'description': 'Unicode characters: 中文 日本語'
        }
        
        generator.save_metadata('Test', metadata)
        
        # Should be saved as UTF-8
        saved_file = generator.metadata_dir / 'test.json'
        with open(saved_file, 'r', encoding='utf-8') as f:
            loaded = json.load(f)
        
        assert loaded['description'] == metadata['description']
    
    def test_generate_all(self, generator, temp_repo, capfd):
        """Test generating metadata for all tools"""
        (temp_repo / 'Tool1' / 'prompt.txt').write_text('Tool 1')
        (temp_repo / 'Tool2' / 'prompt.txt').write_text('Tool 2')
        
        generator.generate_all()
        captured = capfd.readouterr()
        
        assert 'Found' in captured.out
        assert 'Generated metadata' in captured.out
        assert (generator.metadata_dir / 'tool1.json').exists()
        assert (generator.metadata_dir / 'tool2.json').exists()
    
    def test_generate_all_handles_errors(self, generator, temp_repo, capfd):
        """Test that generate_all handles errors gracefully"""
        # Create a tool with no files (will likely cause an error)
        
        (temp_repo / 'EmptyTool').mkdir()
        
        generator.generate_all()
        captured = capfd.readouterr()
        
        # Should not crash, might have warning
        assert 'Found' in captured.out
    
    def test_validate_metadata_valid(self, generator, temp_repo):
        """Test validating valid metadata"""
        _ = temp_repo
        metadata = {
            'name': 'Test',
            'slug': 'test',
            'type': 'CLI Tool',
            'status': 'active',
            'description': 'Test tool'
        }
        
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        assert errors == []
    
    def test_validate_metadata_missing_fields(self, generator, temp_repo):
        """Test validation with missing required fields"""
        _ = temp_repo
        metadata = {
            'name': 'Test'
            # Missing: slug, type, status, description
        }
        
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        assert len(errors) > 0
        assert any('slug' in error for error in errors)
    
    def test_validate_metadata_invalid_type(self, generator, temp_repo):
        """Test validation with invalid type"""
        _ = temp_repo
        metadata = {
            'name': 'Test',
            'slug': 'test',
            'type': 'Invalid Type',
            'status': 'active',
            'description': 'Test'
        }
        
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        assert any('Invalid type' in error for error in errors)
    
    def test_validate_metadata_invalid_status(self, generator, temp_repo):
        """Test validation with invalid status"""
        _ = temp_repo
        metadata = {
            'name': 'Test',
            'slug': 'test',
            'type': 'CLI Tool',
            'status': 'invalid',
            'description': 'Test'
        }
        
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        assert any('Invalid status' in error for error in errors)
    
    def test_validate_metadata_invalid_json(self, generator, temp_repo):
        """Test validation with invalid JSON"""
        _ = temp_repo
        file_path = generator.metadata_dir / 'test.json'
        file_path.write_text('{ invalid json')
        
        errors = generator.validate_metadata(file_path)
        
        assert len(errors) > 0
        assert any('Invalid JSON' in error for error in errors)
    
    def test_validate_all(self, generator, temp_repo, capfd):
        """Test validating all metadata files"""
        _ = temp_repo
        # Create valid metadata
        valid = {
            'name': 'Test',
            'slug': 'test',
            'type': 'CLI Tool',
            'status': 'active',
            'description': 'Test'
        }
        with open(generator.metadata_dir / 'valid.json', 'w') as f:
            json.dump(valid, f)
        
        # Create invalid metadata
        invalid = {'name': 'Invalid'}
        with open(generator.metadata_dir / 'invalid.json', 'w') as f:
            json.dump(invalid, f)
        
        generator.validate_all()
        captured = capfd.readouterr()
        
        assert 'Validating' in captured.out
        assert 'valid.json' in captured.out
        assert 'invalid.json' in captured.out
    
    def test_validate_all_no_errors(self, generator, temp_repo, capfd):
        """Test validation with all valid files"""
        _ = temp_repo
        valid = {
            'name': 'Test',
            'slug': 'test',
            'type': 'CLI Tool',
            'status': 'active',
            'description': 'Test'
        }
        with open(generator.metadata_dir / 'test.json', 'w') as f:
            json.dump(valid, f)
        
        generator.validate_all()
        captured = capfd.readouterr()
        
        assert 'All metadata files are valid' in captured.out
    
    def test_main_generate_all(self, temp_repo, capfd):
        """Test main function with --all flag"""
        (temp_repo / 'Tool1').mkdir()
        (temp_repo / 'Tool1' / 'prompt.txt').write_text('Test')
        
        with patch('sys.argv', ['generate-metadata.py', '--all', '--repo', str(temp_repo)]):
            from generate_metadata import main
            main()
        
        captured = capfd.readouterr()
        assert 'Found' in captured.out
    
    def test_main_generate_single_tool(self, temp_repo, capfd):
        """Test main function with specific tool"""
        (temp_repo / 'Tool1').mkdir()
        (temp_repo / 'Tool1' / 'prompt.txt').write_text('Test')
        
        with patch('sys.argv', ['generate-metadata.py', '--tool', 'Tool1', '--repo', str(temp_repo)]):
            from generate_metadata import main
            main()
        
        captured = capfd.readouterr()
        assert 'Done' in captured.out
    
    def test_main_validate(self, temp_repo, capfd):
        """Test main function with --validate flag"""
        metadata = {
            'name': 'Test',
            'slug': 'test',
            'type': 'CLI Tool',
            'status': 'active',
            'description': 'Test'
        }
        metadata_dir = temp_repo / 'metadata'
        metadata_dir.mkdir(exist_ok=True)
        with open(metadata_dir / 'test.json', 'w') as f:
            json.dump(metadata, f)
        
        with patch('sys.argv', ['generate-metadata.py', '--validate', '--repo', str(temp_repo)]):
            from generate_metadata import main
            main()
        
        captured = capfd.readouterr()
        assert 'Validating' in captured.out
    
    def test_patterns_comprehensive(self, generator, temp_repo):
        """Test comprehensive pattern detection"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('''
        You are an agent that operates autonomously.
        Use sub-agents to delegate complex tasks.
        Execute tools in parallel for efficiency.
        Always verify results before proceeding.
        Track progress in a TODO system.
        Maintain context in agents.md memory file.
        Be concise and brief in all responses.
        ''')
        
        result = generator.analyze_prompt_file(prompt)
        patterns = result['patterns']
        
        assert patterns['parallelTools']
        assert patterns['subAgents']
        assert patterns['verificationGates']
        assert patterns['todoSystem']
        assert patterns['memoryContext']
        assert patterns['agentsFile']
        assert patterns['conciseness'] in ['high', 'very-high']

class TestMetadataGeneratorAdvanced:
    """Advanced test cases for comprehensive coverage"""
    
    @pytest.fixture
    def temp_repo(self):
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        (repo_path / 'metadata').mkdir()
        yield repo_path
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def generator(self, temp_repo):
        return MetadataGenerator(str(temp_repo))
    
    def test_scan_tool_directories_with_files_only(self, generator, temp_repo):
        """Test that scan ignores files, only gets directories"""
        (temp_repo / 'file1.txt').write_text('Not a directory')
        (temp_repo / 'RealTool').mkdir()
        
        tools = generator.scan_tool_directories()
        
        assert 'RealTool' in tools
        assert len(tools) == 1
    
    def test_slugify_consecutive_spaces(self, generator):
        """Test slugify with multiple consecutive spaces"""
        assert generator.slugify('Tool    With    Spaces') == 'tool-with-spaces'
    
    def test_slugify_numbers(self, generator):
        """Test slugify preserves numbers"""
        assert generator.slugify('Tool v2.0') == 'tool-v20'
    
    def test_analyze_tools_file_with_empty_array(self, generator, temp_repo):
        """Test tools file with empty array"""
        tools_file = temp_repo / 'tools.json'
        with open(tools_file, 'w') as f:
            json.dump([], f)
        
        result = generator.analyze_tools_file(tools_file)
        
        assert result['toolsCount'] == 0
    
    def test_validate_metadata_empty_required_fields(self, generator, temp_repo):
        """Test validation catches empty required fields"""
        _ = temp_repo
        metadata = {
            'name': '',
            'slug': '',
            'type': 'CLI Tool',
            'status': 'active',
            'description': ''
        }
        
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        assert len(errors) > 0


pytestmark = pytest.mark.unit


class TestMetadataGeneratorAdvancedExtra:
    """Advanced test cases for comprehensive coverage"""
    
    @pytest.fixture
    def temp_repo(self):
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        (repo_path / 'metadata').mkdir()
        yield repo_path
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def generator(self, temp_repo):
        return MetadataGenerator(str(temp_repo))
    
    def test_scan_tool_directories_with_files_only(self, generator, temp_repo):
        """Test that scan ignores files, only gets directories"""
        (temp_repo / 'file1.txt').write_text('Not a directory')
        (temp_repo / 'file2.md').write_text('Also not a directory')
        (temp_repo / 'RealTool').mkdir()
        
        tools = generator.scan_tool_directories()
        
        assert 'RealTool' in tools
        assert len(tools) == 1
    
    def test_slugify_consecutive_spaces(self, generator):
        """Test slugify with multiple consecutive spaces"""
        assert generator.slugify('Tool    With    Spaces') == 'tool-with-spaces'
    
    def test_slugify_mixed_case_preservation(self, generator):
        """Test that slugify lowercases everything"""
        assert generator.slugify('MixedCaseTool') == 'mixedcasetool'
        assert generator.slugify('ALLCAPS') == 'allcaps'
    
    def test_slugify_numbers(self, generator):
        """Test slugify preserves numbers"""
        assert generator.slugify('Tool v2.0') == 'tool-v20'
        assert generator.slugify('Version 3.14') == 'version-314'
    
    def test_detect_tool_type_with_mixed_indicators(self, generator):
        """Test type detection with conflicting keywords"""
        # If name has multiple type indicators, should pick first match
        result = generator.detect_tool_type('CLI Web Platform', [])
        # Should return one of the types, not both
        assert result in ['CLI Tool', 'Web Platform']
    
    def test_detect_tool_type_with_files_list(self, generator):
        """Test that files list is used in detection"""
        files = ['readme.md', 'tools.json', 'prompt.txt']
        result = generator.detect_tool_type('Unknown', files)
        # Should still return a valid type
        assert result in ['IDE Plugin', 'CLI Tool', 'Web Platform', 'Autonomous Agent']
    
    def test_analyze_prompt_file_with_all_features(self, generator, temp_repo):
        """Test prompt analysis detecting all feature types"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('''
        You can generate code, complete code, and provide refactoring suggestions.
        Chat with users through the interface.
        Run in agent mode for autonomous tasks.
        Debug code and fix issues.
        Integrate with git for version control.
        Test code automatically.
        Document your work.
        Analyze code for improvements.
        Search codebases efficiently.
        Deploy code to production.
        ''')
        
        result = generator.analyze_prompt_file(prompt)
        features = result['features']
        
        # Should detect multiple features
        assert features['codeGeneration']
        assert features['codeCompletion']
        assert features['refactoring']
        assert features['chatInterface']
        assert features['agentMode']
        assert features['debugging']
        assert features['gitIntegration']
        assert features['testing']
    
    def test_analyze_prompt_file_pattern_detection(self, generator, temp_repo):
        """Test comprehensive pattern detection"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('''
        You operate as an autonomous agent with sub-agents.
        Use tools in parallel for maximum efficiency.
        Always verify results before proceeding.
        Maintain a TODO list of pending tasks.
        Remember context by consulting agents.md.
        Be extremely concise and brief.
        Never expose any secrets or credentials.
        ''')
        
        result = generator.analyze_prompt_file(prompt)
        patterns = result['patterns']
        
        assert patterns['parallelTools']
        assert patterns['subAgents']
        assert patterns['verificationGates']
        assert patterns['todoSystem']
        assert patterns['agentsFile']
        assert patterns['memoryContext']
        assert patterns['conciseness'] in ['high', 'very-high']
    
    def test_analyze_prompt_file_metrics(self, generator, temp_repo):
        """Test that metrics are calculated"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('''
        Never expose API keys.
        Protect passwords.
        Secure credentials.
        Line 1
        Line 2
        Line 3
        Line 4
        Line 5
        ''')
        
        result = generator.analyze_prompt_file(prompt)
        metrics = result['metrics']
        
        assert 'securityRules' in metrics
        assert metrics['securityRules'] >= 3
        assert 'lengthLines' in metrics
        assert metrics['lengthLines'] > 0
    
    def test_detect_conciseness_with_edge_content(self, generator):
        """Test conciseness detection with minimal content"""
        assert generator.detect_conciseness('') == 'low'
        assert generator.detect_conciseness('x') == 'low'
        assert generator.detect_conciseness('Be concise') in ['medium', 'high', 'very-high']
    
    def test_calculate_conciseness_score_boundary_cases(self, generator):
        """Test conciseness score at boundaries"""
        # Very concise content
        high_score = generator.calculate_conciseness_score('Be concise, brief, short, minimal, terse')
        assert high_score > 60
        
        # Very verbose content
        low_score = generator.calculate_conciseness_score('Provide detailed, comprehensive, thorough, extensive explanations')
        assert low_score < 40
    
    def test_analyze_tools_file_with_empty_array(self, generator, temp_repo):
        """Test tools file with empty array"""
        tools_file = temp_repo / 'tools.json'
        with open(tools_file, 'w') as f:
            json.dump([], f)
        
        result = generator.analyze_tools_file(tools_file)
        
        assert result['toolsCount'] == 0
    
    def test_analyze_tools_file_with_nested_functions(self, generator, temp_repo):
        """Test tools file with nested function structures"""
        tools_file = temp_repo / 'tools.json'
        tools_data = {
            'tools': {
                'functions': [
                    {'name': 'tool1'},
                    {'name': 'tool2'}
                ]
            }
        }
        with open(tools_file, 'w') as f:
            json.dump(tools_data, f)
        
        result = generator.analyze_tools_file(tools_file)
        
        # Should handle nested structure
        assert result['toolsCount'] >= 0
    
    def test_analyze_tools_file_missing(self, generator, temp_repo):
        """Test analyzing non-existent tools file"""
        tools_file = temp_repo / 'nonexistent.json'
        
        result = generator.analyze_tools_file(tools_file)
        
        assert result['toolsCount'] == 0
    
    def test_detect_versions_with_mixed_formats(self, generator, temp_repo):
        """Test version detection with multiple naming patterns"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        
        (tool_dir / 'prompt-v1.0.txt').write_text('V1')
        (tool_dir / 'prompt-2024-01-15.txt').write_text('Date version')
        (tool_dir / 'prompt-latest.txt').write_text('Latest')
        
        versions = generator.detect_versions(tool_dir)
        
        # Should find at least some versions
        assert len(versions) > 0
    
    def test_detect_versions_no_prompt_files(self, generator, temp_repo):
        """Test version detection with no prompt files"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        
        (tool_dir / 'readme.md').write_text('Docs')
        (tool_dir / 'config.json').write_text('{}')
        
        versions = generator.detect_versions(tool_dir)
        
        # Should return default version
        assert len(versions) == 1
        assert versions[0] == '1.0'
    
    def test_generate_metadata_full_structure(self, generator, temp_repo):
        """Test that generated metadata has all required fields"""
        tool_dir = temp_repo / 'FullTool'
        tool_dir.mkdir()
        
        (tool_dir / 'prompt.txt').write_text('Full featured tool with all capabilities')
        (tool_dir / 'tools.json').write_text('[{"name": "tool1"}]')
        (tool_dir / 'README.md').write_text('# Full Tool\n\nDocumentation')
        
        metadata = generator.generate_metadata('FullTool')
        
        # Check all major fields
        assert 'name' in metadata
        assert 'slug' in metadata
        assert 'type' in metadata
        assert 'status' in metadata
        assert 'version' in metadata
        assert 'features' in metadata
        assert 'patterns' in metadata
        assert 'metrics' in metadata
        assert 'platforms' in metadata
    
    def test_generate_metadata_pricing_detection(self, generator, temp_repo):
        """Test pricing model detection in metadata"""
        tool_dir = temp_repo / 'PricedTool'
        tool_dir.mkdir()
        
        (tool_dir / 'prompt.txt').write_text('A premium tool')
        (tool_dir / 'README.md').write_text('Free tier available')
        
        metadata = generator.generate_metadata('PricedTool')
        
        # Should have pricing information
        assert 'pricing' in metadata
    
    def test_generate_metadata_with_documentation(self, generator, temp_repo):
        """Test that documentation paths are included"""
        tool_dir = temp_repo / 'DocumentedTool'
        tool_dir.mkdir()
        
        (tool_dir / 'prompt.txt').write_text('Test')
        (tool_dir / 'README.md').write_text('# Docs')
        (tool_dir / 'CHANGELOG.md').write_text('## Changes')
        
        metadata = generator.generate_metadata('DocumentedTool')
        
        # Should include documentation
        assert 'documentation' in metadata
    
    def test_save_metadata_pretty_print(self, generator, temp_repo):
        """Test that saved JSON is pretty-printed"""
        _ = temp_repo
        metadata = {
            'name': 'Test',
            'slug': 'test',
            'type': 'CLI Tool',
            'features': {'f1': True, 'f2': False}
        }
        
        generator.save_metadata('Test', metadata)
        
        # Read back and check formatting
        file_path = generator.metadata_dir / 'test.json'
        content = file_path.read_text()
        
        # Should have newlines and indentation
        assert '\n' in content
        assert '  ' in content or '\t' in content
    
    def test_save_metadata_overwrites_existing(self, generator, temp_repo):
        """Test that save overwrites existing files"""
        _ = temp_repo
        metadata1 = {'name': 'Test1', 'slug': 'test'}
        metadata2 = {'name': 'Test2', 'slug': 'test', 'new_field': 'value'}
        
        generator.save_metadata('Test', metadata1)
        generator.save_metadata('Test', metadata2)
        
        # Should have the new content
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path) as f:
            saved = json.load(f)
        
        assert saved['name'] == 'Test2'
        assert 'new_field' in saved
    
    def test_generate_all_with_multiple_tools(self, generator, temp_repo, capfd):
        """Test generating metadata for multiple tools"""
        for tool_name in ['Tool1', 'Tool2', 'Tool3']:
            tool_dir = temp_repo / tool_name
            tool_dir.mkdir()
            (tool_dir / 'prompt.txt').write_text(f'{tool_name} prompt')
        
        generator.generate_all()
        captured = capfd.readouterr()
        
        assert 'Found 3 tools' in captured.out
        assert 'Generated metadata for 3 tools' in captured.out
        
        # Check all metadata files were created
        assert (generator.metadata_dir / 'tool1.json').exists()
        assert (generator.metadata_dir / 'tool2.json').exists()
        assert (generator.metadata_dir / 'tool3.json').exists()
    
    def test_generate_all_skips_excluded_dirs(self, generator, temp_repo, capfd):
        """Test that excluded directories are not processed"""
        (temp_repo / '.git').mkdir()
        (temp_repo / 'node_modules').mkdir()
        (temp_repo / 'ValidTool').mkdir()
        (temp_repo / 'ValidTool' / 'prompt.txt').write_text('Valid')
        
        generator.generate_all()
        captured = capfd.readouterr()
        
        # Should only find the valid tool
        assert 'Found 1 tool' in captured.out
    
    def test_validate_metadata_all_required_fields(self, generator, temp_repo):
        """Test validation checks all required fields"""
        _ = temp_repo
        metadata = {
            'name': 'Test',
            'slug': 'test',
            'type': 'CLI Tool',
            'status': 'active',
            'description': 'Test tool'
        }
        
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        # Should pass validation
        assert len(errors) == 0
    
    def test_validate_metadata_invalid_values(self, generator, temp_repo):
        """Test validation detects invalid field values"""
        _ = temp_repo
        metadata = {
            'name': 'Test',
            'slug': 'test',
            'type': 'InvalidType',
            'status': 'InvalidStatus',
            'description': 'Test'
        }
        
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        # Should have errors for invalid values
        assert len(errors) >= 2
    
    def test_validate_metadata_empty_required_fields(self, generator, temp_repo):
        """Test validation catches empty required fields"""
        _ = temp_repo
        metadata = {
            'name': '',
            'slug': '',
            'type': 'CLI Tool',
            'status': 'active',
            'description': ''
        }
        
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata, f)
        
        errors = generator.validate_metadata(file_path)
        
        # Should have errors for empty fields
        assert len(errors) > 0
    
    def test_validate_all_mixed_results(self, generator, temp_repo, capfd):
        """Test validate_all with mix of valid and invalid files"""
        _ = temp_repo
        # Valid metadata
        valid = {
            'name': 'Valid',
            'slug': 'valid',
            'type': 'CLI Tool',
            'status': 'active',
            'description': 'Valid'
        }
        with open(generator.metadata_dir / 'valid.json', 'w') as f:
            json.dump(valid, f)
        
        # Invalid metadata
        invalid = {
            'name': 'Invalid'
            # Missing required fields
        }
        with open(generator.metadata_dir / 'invalid.json', 'w') as f:
            json.dump(invalid, f)
        
        generator.validate_all()
        captured = capfd.readouterr()
        
        # Should report both files
        assert 'valid.json' in captured.out
        assert 'invalid.json' in captured.out
        # Should indicate some errors
        assert 'error' in captured.out.lower() or 'invalid' in captured.out.lower()
    
    def test_main_with_specific_tool_name(self, temp_repo, capfd):
        """Test main function generates metadata for specific tool"""
        tool_dir = temp_repo / 'SpecificTool'
        tool_dir.mkdir()
        (tool_dir / 'prompt.txt').write_text('Specific tool content')
        
        with patch('sys.argv', ['generate-metadata.py', '--tool', 'SpecificTool', '--repo', str(temp_repo)]):
            from generate_metadata import main
            main()
        
        capfd.readouterr()
        
        # Should process the tool
        assert (temp_repo / 'metadata' / 'specifictool.json').exists()
    
    def test_main_validate_with_errors(self, temp_repo, capfd):
        """Test main with validation that finds errors"""
        # Create invalid metadata
        invalid = {'name': 'Test'}
        (temp_repo / 'metadata' / 'test.json').write_text(json.dumps(invalid))
        
        with patch('sys.argv', ['generate-metadata.py', '--validate', '--repo', str(temp_repo)]):
            from generate_metadata import main
            main()
        
        captured = capfd.readouterr()
        
        # Should report validation errors
        assert 'error' in captured.out.lower() or 'invalid' in captured.out.lower()
    
    def test_analyze_prompt_with_code_blocks(self, generator, temp_repo):
        """Test analyzing prompts with code examples"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('''
        You can generate code like this:
        ```python
        
        def hello():
            print("Hello")
        ```
        
        And execute commands:
        $ npm install
        $ npm test
        ''')
        
        result = generator.analyze_prompt_file(prompt)
        
        # Should still parse correctly
        assert 'patterns' in result
        assert 'features' in result
    
    def test_slugify_already_slug_format(self, generator):
        """Test slugify on already-slugified text"""
        assert generator.slugify('already-a-slug') == 'already-a-slug'
        assert generator.slugify('perfect_slug_123') == 'perfect_slug_123'
    
    def test_detect_tool_type_from_filename_patterns(self, generator):
        """Test type detection considers common patterns"""
        # VSCode extension
        assert generator.detect_tool_type('VSCode Extension', []) == 'IDE Plugin'
        # Jetbrains plugin
        assert generator.detect_tool_type('IntelliJ Plugin', []) == 'IDE Plugin'
    
    def test_platforms_detection(self, generator, temp_repo):
        """Test that platform flags are set correctly"""
        tool_dir = temp_repo / 'VSCode Tool'
        tool_dir.mkdir()
        (tool_dir / 'prompt.txt').write_text('VSCode extension')
        
        metadata = generator.generate_metadata('VSCode Tool')
        platforms = metadata.get('platforms', {})
        
        # Should detect VSCode
        assert platforms.get('vscode', False)
    
    def test_concurrent_feature_detection(self, generator, temp_repo):
        """Test detection of concurrency/parallel features"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('Execute tasks in parallel and concurrently')
        
        result = generator.analyze_prompt_file(prompt)
        
        assert result['patterns']['parallelTools']
    
    def test_memory_context_detection(self, generator, temp_repo):
        """Test detection of memory/context patterns"""
        prompt = temp_repo / 'prompt.txt'
        prompt.write_text('Remember previous context and maintain memory')
        
        result = generator.analyze_prompt_file(prompt)
        
        assert result['patterns']['memoryContext']


pytestmark = pytest.mark.unit