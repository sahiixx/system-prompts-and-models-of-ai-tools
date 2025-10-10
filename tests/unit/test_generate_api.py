#\!/usr/bin/env python3

"""
Comprehensive unit tests for generate-api.py
Tests API generation, metadata loading, and endpoint creation
"""

import pytest
import json
import sys
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch, mock_open

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'scripts'))

from generate_api import APIGenerator


class TestAPIGenerator:
    """Test suite for APIGenerator class"""
    
    @pytest.fixture
    def temp_repo(self):
        """Create a temporary repository structure"""
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        
        # Create directory structure
        (repo_path / 'metadata').mkdir()
        (repo_path / 'api').mkdir()
        
        yield repo_path
        
        # Cleanup
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def sample_metadata(self):
        """Sample metadata for testing"""
        return [
            {
                'slug': 'cursor',
                'name': 'Cursor',
                'type': 'IDE Plugin',
                'description': 'AI-powered code editor',
                'status': 'active',
                'pricing': {'model': 'freemium'},
                'features': {
                    'codeGeneration': True,
                    'agentMode': True,
                    'chatInterface': True
                },
                'tags': ['IDE', 'Premium']
            },
            {
                'slug': 'claude-code',
                'name': 'Claude Code',
                'type': 'CLI Tool',
                'description': 'CLI coding assistant',
                'status': 'active',
                'pricing': {'model': 'free'},
                'features': {
                    'codeGeneration': True,
                    'agentMode': False,
                    'chatInterface': False
                },
                'tags': ['CLI', 'Free']
            }
        ]
    
    @pytest.fixture
    def generator(self, temp_repo):
        """Create APIGenerator instance with temp repo"""
        return APIGenerator(str(temp_repo))
    
    def test_init(self, temp_repo):
        """Test APIGenerator initialization"""
        generator = APIGenerator(str(temp_repo))
        
        assert generator.repo_path == temp_repo
        assert generator.api_dir == temp_repo / 'api'
        assert generator.metadata_dir == temp_repo / 'metadata'
    
    def test_load_metadata_empty_directory(self, generator):
        """Test loading metadata from empty directory"""
        metadata = generator.load_metadata()
        
        assert isinstance(metadata, list)
        assert len(metadata) == 0
    
    def test_load_metadata_with_files(self, generator, sample_metadata):
        """Test loading metadata from directory with JSON files"""
        # Create metadata files
        for tool in sample_metadata:
            file_path = generator.metadata_dir / f"{tool['slug']}.json"
            with open(file_path, 'w') as f:
                json.dump(tool, f)
        
        metadata = generator.load_metadata()
        
        assert len(metadata) == 2
        assert any(m['slug'] == 'cursor' for m in metadata)
        assert any(m['slug'] == 'claude-code' for m in metadata)
    
    def test_load_metadata_invalid_json(self, generator, capfd):
        """Test loading metadata with invalid JSON file"""
        # Create invalid JSON file
        file_path = generator.metadata_dir / 'invalid.json'
        with open(file_path, 'w') as f:
            f.write('{ invalid json')
        
        metadata = generator.load_metadata()
        captured = capfd.readouterr()
        
        assert len(metadata) == 0
        assert 'Warning' in captured.out
    
    def test_load_metadata_nonexistent_directory(self, temp_repo):
        """Test loading metadata when directory doesn't exist"""
        # Remove metadata directory
        shutil.rmtree(temp_repo / 'metadata')
        
        generator = APIGenerator(str(temp_repo))
        metadata = generator.load_metadata()
        
        assert metadata == []
    
    def test_generate_tools_index(self, generator, sample_metadata):
        """Test generating tools index endpoint"""
        result = generator.generate_tools_index(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'generated' in result
        assert result['count'] == 2
        assert len(result['tools']) == 2
        
        # Check first tool structure
        tool = result['tools'][0]
        assert 'slug' in tool
        assert 'name' in tool
        assert 'type' in tool
        assert 'description' in tool
        assert 'status' in tool
    
    def test_generate_tools_index_empty(self, generator):
        """Test generating tools index with no tools"""
        result = generator.generate_tools_index([])
        
        assert result['count'] == 0
        assert result['tools'] == []
    
    def test_generate_tool_detail(self, generator, sample_metadata):
        """Test generating detailed tool endpoint"""
        tool = sample_metadata[0]
        result = generator.generate_tool_detail(tool)
        
        assert result['version'] == '1.0'
        assert 'generated' in result
        assert result['slug'] == 'cursor'
        assert result['name'] == 'Cursor'
        assert result['type'] == 'IDE Plugin'
    
    def test_generate_by_type(self, generator, sample_metadata):
        """Test generating by-type grouping"""
        result = generator.generate_by_type(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'types' in result
        assert 'IDE Plugin' in result['types']
        assert 'CLI Tool' in result['types']
        assert len(result['types']['IDE Plugin']) == 1
        assert len(result['types']['CLI Tool']) == 1
    
    def test_generate_by_type_missing_type(self, generator):
        """Test generating by-type with missing type field"""
        metadata = [{'slug': 'test', 'name': 'Test'}]
        result = generator.generate_by_type(metadata)
        
        assert 'Other' in result['types']
    
    def test_generate_by_pricing(self, generator, sample_metadata):
        """Test generating by-pricing grouping"""
        result = generator.generate_by_pricing(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'pricing_models' in result
        assert 'freemium' in result['pricing_models']
        assert 'free' in result['pricing_models']
    
    def test_generate_by_pricing_missing_pricing(self, generator):
        """Test generating by-pricing with missing pricing field"""
        metadata = [{'slug': 'test', 'name': 'Test'}]
        result = generator.generate_by_pricing(metadata)
        
        assert 'unknown' in result['pricing_models']
    
    def test_generate_features_matrix(self, generator, sample_metadata):
        """Test generating features matrix"""
        result = generator.generate_features_matrix(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'features' in result
        assert 'codeGeneration' in result['features']
        assert 'agentMode' in result['features']
        
        # codeGeneration should have 2 tools
        assert len(result['features']['codeGeneration']) == 2
        # agentMode should have 1 tool
        assert len(result['features']['agentMode']) == 1
    
    def test_generate_features_matrix_no_features(self, generator):
        """Test features matrix with tools having no features"""
        metadata = [{'slug': 'test', 'name': 'Test'}]
        result = generator.generate_features_matrix(metadata)
        
        assert result['features'] == {}
    
    def test_generate_statistics(self, generator, sample_metadata):
        """Test generating statistics endpoint"""
        result = generator.generate_statistics(sample_metadata)
        
        assert result['version'] == '1.0'
        assert result['total_tools'] == 2
        assert 'by_type' in result
        assert 'by_pricing' in result
        assert 'feature_adoption' in result
        assert 'most_common_features' in result
        
        # Check feature adoption counts
        assert result['feature_adoption']['codeGeneration'] == 2
        assert result['feature_adoption']['agentMode'] == 1
    
    def test_generate_statistics_empty(self, generator):
        """Test generating statistics with no tools"""
        result = generator.generate_statistics([])
        
        assert result['total_tools'] == 0
        assert result['by_type'] == {}
        assert result['by_pricing'] == {}
    
    def test_generate_search_index(self, generator, sample_metadata):
        """Test generating search index"""
        result = generator.generate_search_index(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'index' in result
        assert len(result['index']) == 2
        
        # Check first entry
        entry = result['index'][0]
        assert 'slug' in entry
        assert 'name' in entry
        assert 'keywords' in entry
        
        # Check keywords are lowercase
        assert all(k.islower() for k in entry['keywords'])
    
    def test_generate_search_index_with_tags(self, generator, sample_metadata):
        """Test search index includes tags in keywords"""
        result = generator.generate_search_index(sample_metadata)
        
        cursor_entry = next(e for e in result['index'] if e['slug'] == 'cursor')
        
        assert 'ide' in cursor_entry['keywords']
        assert 'premium' in cursor_entry['keywords']
    
    def test_generate_api_docs(self, generator, sample_metadata):
        """Test generating API documentation"""
        generator.generate_api_docs(sample_metadata)
        
        readme_path = generator.api_dir / 'README.md'
        assert readme_path.exists()
        
        content = readme_path.read_text()
        assert '# 🔌 API Documentation' in content
        assert 'Endpoints' in content
        assert str(len(sample_metadata)) in content
    
    def test_print_usage_examples(self, generator, capsys):
        """Test printing usage examples"""
        generator.print_usage_examples()
        captured = capsys.readouterr()
        
        assert 'Usage Examples' in captured.out
        assert 'JavaScript' in captured.out
        assert 'Python' in captured.out
        assert 'cURL' in captured.out


class TestAPIGeneratorIntegration:
    """Integration tests for full API generation"""
    
    @pytest.fixture
    def full_repo(self):
        """Create a full repository structure"""
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        
        # Create directories
        metadata_dir = repo_path / 'metadata'
        api_dir = repo_path / 'api'
        metadata_dir.mkdir()
        api_dir.mkdir()
        
        # Create sample metadata files
        tools = [
            {
                'slug': 'cursor',
                'name': 'Cursor',
                'type': 'IDE Plugin',
                'description': 'AI editor',
                'status': 'active',
                'pricing': {'model': 'freemium'},
                'features': {'codeGeneration': True, 'agentMode': True}
            },
            {
                'slug': 'windsurf',
                'name': 'Windsurf',
                'type': 'IDE Plugin',
                'description': 'AI IDE',
                'status': 'beta',
                'pricing': {'model': 'free'},
                'features': {'codeGeneration': True, 'agentMode': False}
            }
        ]
        
        for tool in tools:
            with open(metadata_dir / f"{tool['slug']}.json", 'w') as f:
                json.dump(tool, f)
        
        yield repo_path
        
        shutil.rmtree(temp_dir)
    
    def test_generate_all_endpoints(self, full_repo):
        """Test generating all API endpoints"""
        generator = APIGenerator(str(full_repo))
        generator.generate_all()
        
        # Check that all main endpoints were created
        assert (full_repo / 'api' / 'index.json').exists()
        assert (full_repo / 'api' / 'by-type.json').exists()
        assert (full_repo / 'api' / 'by-pricing.json').exists()
        assert (full_repo / 'api' / 'features.json').exists()
        assert (full_repo / 'api' / 'statistics.json').exists()
        assert (full_repo / 'api' / 'search.json').exists()
        assert (full_repo / 'api' / 'README.md').exists()
        
        # Check individual tool endpoints
        tools_dir = full_repo / 'api' / 'tools'
        assert tools_dir.exists()
        assert (tools_dir / 'cursor.json').exists()
        assert (tools_dir / 'windsurf.json').exists()
        
        # Verify content of index.json
        with open(full_repo / 'api' / 'index.json') as f:
            index = json.load(f)
        
        assert index['count'] == 2
        assert len(index['tools']) == 2
    
    def test_generated_json_validity(self, full_repo):
        """Test that all generated JSON files are valid"""
        generator = APIGenerator(str(full_repo))
        generator.generate_all()
        
        # Find all JSON files in api directory
        json_files = list((full_repo / 'api').rglob('*.json'))
        
        assert len(json_files) > 0
        
        for json_file in json_files:
            with open(json_file) as f:
                data = json.load(f)  # Will raise if invalid
            
            # Check common fields
            assert 'version' in data
            assert 'generated' in data


class TestEdgeCases:
    """Test edge cases and error conditions"""
    
    @pytest.fixture
    def generator(self):
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        (repo_path / 'metadata').mkdir()
        (repo_path / 'api').mkdir()
        
        gen = APIGenerator(str(repo_path))
        
        yield gen
        
        shutil.rmtree(temp_dir)
    
    def test_unicode_handling(self, generator):
        """Test handling of Unicode characters in metadata"""
        metadata = [{
            'slug': 'test',
            'name': 'Test 测试',
            'type': 'Tool',
            'description': 'Testing 🚀 unicode',
            'status': 'active'
        }]
        
        result = generator.generate_tools_index(metadata)
        
        assert result['tools'][0]['name'] == 'Test 测试'
        assert '🚀' in result['tools'][0]['description']
    
    def test_large_metadata_set(self, generator):
        """Test handling large number of tools"""
        metadata = [
            {
                'slug': f'tool-{i}',
                'name': f'Tool {i}',
                'type': 'Test',
                'status': 'active'
            }
            for i in range(100)
        ]
        
        result = generator.generate_tools_index(metadata)
        
        assert result['count'] == 100
        assert len(result['tools']) == 100
    
    def test_missing_optional_fields(self, generator):
        """Test handling metadata with missing optional fields"""
        metadata = [{
            'slug': 'minimal',
            'name': 'Minimal'
        }]
        
        # Should not raise exceptions
        generator.generate_tools_index(metadata)
        generator.generate_by_type(metadata)
        generator.generate_by_pricing(metadata)
        generator.generate_statistics(metadata)
    
    def test_datetime_serialization(self, generator):
        """Test that datetime is properly serialized"""
        result = generator.generate_tools_index([])
        
        # Should be ISO format string
        assert isinstance(result['generated'], str)
        # Should be parseable as datetime
        datetime.fromisoformat(result['generated'])
    
    def test_special_characters_in_slug(self, generator):
        """Test handling of special characters"""
        metadata = [{
            'slug': 'test-tool_v2.0',
            'name': 'Test Tool',
            'type': 'Tool',
            'status': 'active'
        }]
        
        result = generator.generate_tool_detail(metadata[0])
        
        assert result['slug'] == 'test-tool_v2.0'


# Marker for pytest
pytestmark = pytest.mark.unit