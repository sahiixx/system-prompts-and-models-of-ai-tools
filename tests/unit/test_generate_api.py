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
            },
            {
                'slug': 'github-copilot',
                'name': 'GitHub Copilot',
                'type': 'IDE Plugin',
                'description': 'AI pair programmer',
                'status': 'active',
                'pricing': {'model': 'paid'},
                'features': {
                    'codeGeneration': True,
                    'codeCompletion': True,
                    'agentMode': False,
                    'chatInterface': True
                },
                'tags': ['IDE', 'Microsoft']
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
    
    def test_init_with_string_path(self):
        """Test initialization with string path"""
        generator = APIGenerator(".")
        
        assert isinstance(generator.repo_path, Path)
        assert str(generator.repo_path) == "."
    
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
        
        assert len(metadata) == 3
        assert any(m['slug'] == 'cursor' for m in metadata)
        assert any(m['slug'] == 'claude-code' for m in metadata)
        assert any(m['slug'] == 'github-copilot' for m in metadata)
    
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
        assert 'invalid.json' in captured.out
    
    def test_load_metadata_mixed_valid_invalid(self, generator, sample_metadata, capfd):
        """Test loading mixture of valid and invalid JSON files"""
        # Create valid file
        valid_file = generator.metadata_dir / 'cursor.json'
        with open(valid_file, 'w') as f:
            json.dump(sample_metadata[0], f)
        
        # Create invalid file
        invalid_file = generator.metadata_dir / 'broken.json'
        with open(invalid_file, 'w') as f:
            f.write('{ broken')
        
        metadata = generator.load_metadata()
        captured = capfd.readouterr()
        
        assert len(metadata) == 1
        assert metadata[0]['slug'] == 'cursor'
        assert 'Warning' in captured.out
    
    def test_load_metadata_nonexistent_directory(self, temp_repo):
        """Test loading metadata when directory doesn't exist"""
        # Remove metadata directory
        shutil.rmtree(temp_repo / 'metadata')
        
        generator = APIGenerator(str(temp_repo))
        metadata = generator.load_metadata()
        
        assert metadata == []
    
    def test_load_metadata_with_non_json_files(self, generator, sample_metadata):
        """Test that non-JSON files are ignored"""
        # Create JSON file
        json_file = generator.metadata_dir / 'tool.json'
        with open(json_file, 'w') as f:
            json.dump(sample_metadata[0], f)
        
        # Create non-JSON files
        (generator.metadata_dir / 'readme.txt').write_text('not json')
        (generator.metadata_dir / 'data.xml').write_text('<xml/>')
        
        metadata = generator.load_metadata()
        
        assert len(metadata) == 1
        assert metadata[0]['slug'] == 'cursor'
    
    def test_generate_tools_index(self, generator, sample_metadata):
        """Test generating tools index endpoint"""
        result = generator.generate_tools_index(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'generated' in result
        assert result['count'] == 3
        assert len(result['tools']) == 3
        
        # Check first tool structure
        tool = result['tools'][0]
        assert 'slug' in tool
        assert 'name' in tool
        assert 'type' in tool
        assert 'description' in tool
        assert 'status' in tool
        assert tool['slug'] == 'cursor'
    
    def test_generate_tools_index_empty(self, generator):
        """Test generating tools index with no tools"""
        result = generator.generate_tools_index([])
        
        assert result['count'] == 0
        assert result['tools'] == []
        assert result['version'] == '1.0'
    
    def test_generate_tools_index_missing_optional_fields(self, generator):
        """Test index generation with missing optional fields"""
        metadata = [{
            'slug': 'test-tool',
            'name': 'Test Tool',
            'type': 'CLI Tool'
        }]
        
        result = generator.generate_tools_index(metadata)
        
        assert result['count'] == 1
        assert result['tools'][0]['description'] == ''
        assert result['tools'][0]['status'] == 'unknown'
    
    def test_generate_tool_detail(self, generator, sample_metadata):
        """Test generating detailed tool endpoint"""
        tool = sample_metadata[0]
        result = generator.generate_tool_detail(tool)
        
        assert result['version'] == '1.0'
        assert 'generated' in result
        assert result['slug'] == 'cursor'
        assert result['name'] == 'Cursor'
        assert result['type'] == 'IDE Plugin'
        assert result['features'] == tool['features']
        assert result['pricing'] == tool['pricing']
    
    def test_generate_tool_detail_preserves_all_fields(self, generator, sample_metadata):
        """Test that tool detail preserves all original fields"""
        tool = sample_metadata[0].copy()
        tool['custom_field'] = 'custom_value'
        
        result = generator.generate_tool_detail(tool)
        
        assert result['custom_field'] == 'custom_value'
        assert all(k in result for k in tool.keys())
    
    def test_generate_by_type(self, generator, sample_metadata):
        """Test generating by-type grouping"""
        result = generator.generate_by_type(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'types' in result
        assert 'IDE Plugin' in result['types']
        assert 'CLI Tool' in result['types']
        assert len(result['types']['IDE Plugin']) == 2
        assert len(result['types']['CLI Tool']) == 1
        
        # Verify structure of grouped items
        ide_plugin = result['types']['IDE Plugin'][0]
        
        assert 'slug' in ide_plugin
        assert 'name' in ide_plugin
        assert 'description' in ide_plugin
    
    def test_generate_by_type_missing_type(self, generator):
        """Test generating by-type with missing type field"""
        metadata = [{'slug': 'test', 'name': 'Test'}]
        result = generator.generate_by_type(metadata)
        
        assert 'Other' in result['types']
        assert len(result['types']['Other']) == 1
    
    def test_generate_by_type_empty_description(self, generator):
        """Test by-type handles missing descriptions"""
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool'
        }]
        
        result = generator.generate_by_type(metadata)
        
        assert result['types']['CLI Tool'][0]['description'] == ''
    
    def test_generate_by_pricing(self, generator, sample_metadata):
        """Test generating by-pricing grouping"""
        result = generator.generate_by_pricing(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'pricing_models' in result
        assert 'freemium' in result['pricing_models']
        assert 'free' in result['pricing_models']
        assert 'paid' in result['pricing_models']
        
        # Verify counts
        assert len(result['pricing_models']['freemium']) == 1
        assert len(result['pricing_models']['free']) == 1
        assert len(result['pricing_models']['paid']) == 1
    
    def test_generate_by_pricing_missing_pricing(self, generator):
        """Test generating by-pricing with missing pricing field"""
        metadata = [{'slug': 'test', 'name': 'Test', 'type': 'CLI Tool'}]
        result = generator.generate_by_pricing(metadata)
        
        assert 'unknown' in result['pricing_models']
        assert len(result['pricing_models']['unknown']) == 1
    
    def test_generate_by_pricing_missing_model(self, generator):
        """Test by-pricing with pricing object but no model"""
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool',
            'pricing': {'tiers': []}
        }]
        
        result = generator.generate_by_pricing(metadata)
        
        assert 'unknown' in result['pricing_models']
    
    def test_generate_features_matrix(self, generator, sample_metadata):
        """Test generating features matrix"""
        result = generator.generate_features_matrix(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'features' in result
        assert 'codeGeneration' in result['features']
        assert 'agentMode' in result['features']
        assert 'chatInterface' in result['features']
        
        # codeGeneration should be in all 3 tools
        assert len(result['features']['codeGeneration']) == 3
        
        # agentMode only in cursor
        assert len(result['features']['agentMode']) == 1
        assert result['features']['agentMode'][0]['slug'] == 'cursor'
    
    def test_generate_features_matrix_no_features(self, generator):
        """Test features matrix with tools that have no features"""
        metadata = [{'slug': 'test', 'name': 'Test', 'type': 'CLI Tool'}]
        result = generator.generate_features_matrix(metadata)
        
        assert result['features'] == {}
    
    def test_generate_features_matrix_false_features(self, generator):
        """Test that false features are not included"""
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool',
            'features': {
                'enabled': True,
                'disabled': False
            }
        }]
        
        result = generator.generate_features_matrix(metadata)
        
        assert 'enabled' in result['features']
        assert 'disabled' not in result['features']
    
    def test_generate_statistics(self, generator, sample_metadata):
        """Test generating statistics"""
        result = generator.generate_statistics(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'generated' in result
        assert result['total_tools'] == 3
        
        # Check type counts
        assert result['by_type']['IDE Plugin'] == 2
        assert result['by_type']['CLI Tool'] == 1
        
        # Check pricing counts
        assert result['by_pricing']['freemium'] == 1
        assert result['by_pricing']['free'] == 1
        assert result['by_pricing']['paid'] == 1
        
        # Check feature adoption
        assert result['feature_adoption']['codeGeneration'] == 3
        assert result['feature_adoption']['agentMode'] == 1
        
        # Check most common features
        assert 'most_common_features' in result
        assert isinstance(result['most_common_features'], list)
        assert len(result['most_common_features']) <= 10
    
    def test_generate_statistics_empty(self, generator):
        """Test statistics with no tools"""
        result = generator.generate_statistics([])
        
        assert result['total_tools'] == 0
        assert result['by_type'] == {}
        assert result['by_pricing'] == {}
        assert result['feature_adoption'] == {}
        assert result['most_common_features'] == []
    
    def test_generate_statistics_feature_sorting(self, generator):
        """Test that features are sorted by adoption count"""
        metadata = [
            {
                'slug': 't1',
                'name': 'T1',
                'type': 'CLI Tool',
                'pricing': {'model': 'free'},
                'features': {'common': True, 'rare': True}
            },
            {
                'slug': 't2',
                'name': 'T2',
                'type': 'CLI Tool',
                'pricing': {'model': 'free'},
                'features': {'common': True}
            },
            {
                'slug': 't3',
                'name': 'T3',
                'type': 'CLI Tool',
                'pricing': {'model': 'free'},
                'features': {'common': True}
            }
        ]
        
        result = generator.generate_statistics(metadata)
        
        most_common = result['most_common_features']
        assert most_common[0][0] == 'common'
        assert most_common[0][1] == 3
        assert most_common[1][0] == 'rare'
        assert most_common[1][1] == 1
    
    def test_generate_search_index(self, generator, sample_metadata):
        """Test generating search index"""
        result = generator.generate_search_index(sample_metadata)
        
        assert result['version'] == '1.0'
        assert 'index' in result
        assert len(result['index']) == 3
        
        # Check structure
        item = result['index'][0]
        assert 'slug' in item
        assert 'name' in item
        assert 'type' in item
        assert 'description' in item
        assert 'tags' in item
        assert 'keywords' in item
        
        # Check keywords generation
        assert 'cursor' in item['keywords']
        assert 'ide plugin' in item['keywords']
    
    def test_generate_search_index_keywords_lowercase(self, generator, sample_metadata):
        """Test that keywords are normalized to lowercase"""
        result = generator.generate_search_index(sample_metadata)
        
        for item in result['index']:
            for keyword in item['keywords']:
                assert keyword == keyword.lower()
    
    def test_generate_search_index_no_tags(self, generator):
        """Test search index with tools that have no tags"""
        metadata = [{
            'slug': 'test',
            'name': 'Test Tool',
            'type': 'CLI Tool',
            'description': 'A test'
        }]
        
        result = generator.generate_search_index(metadata)
        
        assert result['index'][0]['tags'] == []
        assert 'test tool' in result['index'][0]['keywords']
        assert 'test' in result['index'][0]['keywords']
        assert 'cli tool' in result['index'][0]['keywords']
    
    def test_generate_all_creates_directories(self, generator, sample_metadata):
        """Test that generate_all creates necessary directories"""
        # Remove api directory
        shutil.rmtree(generator.api_dir)
        
        # Create sample metadata files
        for tool in sample_metadata:
            file_path = generator.metadata_dir / f"{tool['slug']}.json"
            with open(file_path, 'w') as f:
                json.dump(tool, f)
        
        generator.generate_all()
        
        assert generator.api_dir.exists()
        assert (generator.api_dir / 'tools').exists()
    
    def test_generate_all_creates_endpoints(self, generator, sample_metadata):
        """Test that all endpoints are created"""
        # Create sample metadata files
        for tool in sample_metadata:
            file_path = generator.metadata_dir / f"{tool['slug']}.json"
            with open(file_path, 'w') as f:
                json.dump(tool, f)
        
        generator.generate_all()
        
        # Check main endpoints
        assert (generator.api_dir / 'index.json').exists()
        assert (generator.api_dir / 'by-type.json').exists()
        assert (generator.api_dir / 'by-pricing.json').exists()
        assert (generator.api_dir / 'features.json').exists()
        assert (generator.api_dir / 'statistics.json').exists()
        assert (generator.api_dir / 'search.json').exists()
        
        # Check individual tool endpoints
        for tool in sample_metadata:
            assert (generator.api_dir / 'tools' / f"{tool['slug']}.json").exists()
        
        # Check documentation
        assert (generator.api_dir / 'README.md').exists()
    
    def test_generate_all_valid_json_output(self, generator, sample_metadata):
        """Test that generated JSON files are valid"""
        # Create sample metadata files
        for tool in sample_metadata:
            file_path = generator.metadata_dir / f"{tool['slug']}.json"
            with open(file_path, 'w') as f:
                json.dump(tool, f)
        
        generator.generate_all()
        
        # Verify all JSON files are valid
        for json_file in generator.api_dir.glob('*.json'):
            with open(json_file) as f:
                data = json.load(f)  # Should not raise exception
                assert 'version' in data
                assert 'generated' in data
        
        # Verify tool files
        for json_file in (generator.api_dir / 'tools').glob('*.json'):
            with open(json_file) as f:
                data = json.load(f)
                assert 'version' in data
    
    def test_generate_all_output_messages(self, generator, sample_metadata, capfd):
        """Test that generate_all produces proper output"""
        # Create sample metadata files
        for tool in sample_metadata:
            file_path = generator.metadata_dir / f"{tool['slug']}.json"
            with open(file_path, 'w') as f:
                json.dump(tool, f)
        
        generator.generate_all()
        captured = capfd.readouterr()
        
        assert 'Generating API endpoints' in captured.out
        assert 'Loading metadata' in captured.out
        assert 'Found 3 tools' in captured.out
        assert 'Generated' in captured.out
    
    def test_generate_api_docs_creates_readme(self, generator, sample_metadata):
        """Test that API documentation is created"""
        generator.generate_api_docs(sample_metadata)
        
        readme_path = generator.api_dir / 'README.md'
        assert readme_path.exists()
        
        content = readme_path.read_text()
        assert 'API Documentation' in content
        assert 'Endpoints' in content
        assert 'Usage Examples' in content
    
    def test_generate_api_docs_includes_tool_count(self, generator, sample_metadata):
        """Test that docs include correct tool count"""
        generator.generate_api_docs(sample_metadata)
        
        readme_path = generator.api_dir / 'README.md'
        content = readme_path.read_text()
        
        assert '3' in content  # Tool count
    
    def test_print_usage_examples(self, generator, capfd):
        """Test printing usage examples"""
        generator.print_usage_examples()
        captured = capfd.readouterr()
        
        assert 'Usage Examples' in captured.out
        assert 'JavaScript' in captured.out
        assert 'Python' in captured.out
        assert 'cURL' in captured.out
    
    def test_main_function_default_repo(self, temp_repo, sample_metadata, monkeypatch, capfd):
        """Test main function with default repository"""
        # Change to temp directory
        monkeypatch.chdir(temp_repo)
        
        # Create structure
        (temp_repo / 'metadata').mkdir(exist_ok=True)
        (temp_repo / 'api').mkdir(exist_ok=True)
        
        # Create sample metadata
        for tool in sample_metadata:
            file_path = temp_repo / 'metadata' / f"{tool['slug']}.json"
            with open(file_path, 'w') as f:
                json.dump(tool, f)
        
        # Mock sys.argv
        with patch('sys.argv', ['generate-api.py']):
            from generate_api import main
            main()
        
        captured = capfd.readouterr()
        assert 'Generating API endpoints' in captured.out
    
    def test_datetime_format_in_generated_field(self, generator, sample_metadata):
        """Test that generated timestamp is in ISO format"""
        result = generator.generate_tools_index(sample_metadata)
        
        # Should be parseable as datetime
        generated = datetime.fromisoformat(result['generated'])
        assert isinstance(generated, datetime)
    
    def test_unicode_handling(self, generator):
        """Test that Unicode characters are handled correctly"""
        metadata = [{
            'slug': 'test',
            'name': 'Test Tööl',
            'type': 'CLI Tool',
            'description': 'Üñíçödé support 中文',
            'pricing': {'model': 'free'},
            'features': {}
        }]
        
        result = generator.generate_tools_index(metadata)
        
        assert result['tools'][0]['name'] == 'Test Tööl'
        assert '中文' in result['tools'][0]['description']
    
    def test_large_metadata_set(self, generator):
        """Test with large number of tools"""
        metadata = [
            {
                'slug': f'tool-{i}',
                'name': f'Tool {i}',
                'type': 'CLI Tool',
                'pricing': {'model': 'free'},
                'features': {'feature1': True, 'feature2': i % 2 == 0}
            }
            for i in range(100)
        ]
        
        result = generator.generate_tools_index(metadata)
        
        assert result['count'] == 100
        assert len(result['tools']) == 100
        
        stats = generator.generate_statistics(metadata)
        assert stats['total_tools'] == 100


class TestAPIGeneratorAdvanced:
    """Advanced test cases for comprehensive coverage"""
    
    @pytest.fixture
    def temp_repo(self):
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        (repo_path / 'metadata').mkdir()
        (repo_path / 'api').mkdir()
        yield repo_path
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def generator(self, temp_repo):
        return APIGenerator(str(temp_repo))
    
    def test_load_metadata_preserves_order(self, generator, temp_repo):
        """Test that metadata loading preserves alphabetical order"""
        _ = temp_repo
        metadata = [
            {'slug': 'zebra', 'name': 'Zebra'},
            {'slug': 'alpha', 'name': 'Alpha'},
            {'slug': 'beta', 'name': 'Beta'}
        ]
        
        for tool in metadata:
            file_path = generator.metadata_dir / f"{tool['slug']}.json"
            with open(file_path, 'w') as f:
                json.dump(tool, f)
        
        loaded = generator.load_metadata()
        
        # Should be sorted by slug
        slugs = [t['slug'] for t in loaded]
        assert slugs == sorted(slugs)
    
    def test_load_metadata_handles_subdirectories(self, generator, temp_repo):
        """Test that subdirectories in metadata dir are ignored"""
        _ = temp_repo
        subdir = generator.metadata_dir / 'subdir'
        subdir.mkdir()
        (subdir / 'test.json').write_text('{"slug": "test"}')
        
        # Also create a valid file at root
        (generator.metadata_dir / 'valid.json').write_text('{"slug": "valid", "name": "Valid"}')
        
        metadata = generator.load_metadata()
        
        # Should only load from root level
        assert len(metadata) == 1
        assert metadata[0]['slug'] == 'valid'
    
    def test_generate_tools_index_timestamp_format(self, generator):
        """Test that timestamp in index is ISO format"""
        metadata = [{'slug': 'test', 'name': 'Test', 'type': 'CLI Tool'}]
        result = generator.generate_tools_index(metadata)
        
        # Should be valid ISO timestamp
        timestamp = result['generated']
        parsed = datetime.fromisoformat(timestamp)
        assert isinstance(parsed, datetime)
    
    def test_generate_tools_index_handles_special_chars_in_description(self, generator):
        """Test that special characters in descriptions are preserved"""
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool',
            'description': 'Test with "quotes" and \'apostrophes\' & special <chars>'
        }]
        
        result = generator.generate_tools_index(metadata)
        
        # Should preserve special characters
        assert '"quotes"' in result['tools'][0]['description']
        assert '&' in result['tools'][0]['description']
    
    def test_generate_tool_detail_with_nested_objects(self, generator):
        """Test tool detail with deeply nested objects"""
        tool = {
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool',
            'features': {
                'advanced': {
                    'nested': {
                        'deeply': True
                    }
                }
            }
        }
        
        result = generator.generate_tool_detail(tool)
        
        # Should preserve nested structure
        assert result['features']['advanced']['nested']['deeply']
    
    def test_generate_by_type_multiple_same_type(self, generator):
        """Test grouping multiple tools of same type"""
        metadata = [
            {'slug': 't1', 'name': 'T1', 'type': 'CLI Tool', 'description': 'D1'},
            {'slug': 't2', 'name': 'T2', 'type': 'CLI Tool', 'description': 'D2'},
            {'slug': 't3', 'name': 'T3', 'type': 'CLI Tool', 'description': 'D3'}
        ]
        
        result = generator.generate_by_type(metadata)
        
        assert len(result['types']['CLI Tool']) == 3
        assert all('slug' in t for t in result['types']['CLI Tool'])
    
    def test_generate_by_type_empty_type_string(self, generator):
        """Test handling of empty type string"""
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': ''
        }]
        
        result = generator.generate_by_type(metadata)
        
        # Should categorize as Other
        assert 'Other' in result['types']
    
    def test_generate_by_pricing_complex_pricing(self, generator):
        """Test by-pricing with complex pricing objects"""
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool',
            'pricing': {
                'model': 'freemium',
                'tiers': [
                    {'name': 'Free', 'price': 0},
                    {'name': 'Pro', 'price': 10}
                ]
            }
        }]
        
        result = generator.generate_by_pricing(metadata)
        
        assert 'freemium' in result['pricing_models']
        assert len(result['pricing_models']['freemium']) == 1
    
    def test_generate_by_pricing_all_models(self, generator):
        """Test that all pricing models are represented"""
        metadata = [
            {'slug': 't1', 'name': 'T1', 'type': 'CLI', 'pricing': {'model': 'free'}},
            {'slug': 't2', 'name': 'T2', 'type': 'CLI', 'pricing': {'model': 'paid'}},
            {'slug': 't3', 'name': 'T3', 'type': 'CLI', 'pricing': {'model': 'freemium'}},
            {'slug': 't4', 'name': 'T4', 'type': 'CLI', 'pricing': {'model': 'enterprise'}}
        ]
        
        result = generator.generate_by_pricing(metadata)
        
        assert 'free' in result['pricing_models']
        assert 'paid' in result['pricing_models']
        assert 'freemium' in result['pricing_models']
        assert 'enterprise' in result['pricing_models']
    
    def test_generate_features_matrix_mixed_boolean_values(self, generator):
        """Test features matrix with explicit true/false values"""
        metadata = [
            {
                'slug': 't1',
                'name': 'T1',
                'type': 'CLI',
                'features': {
                    'feature1': True,
                    'feature2': False,
                    'feature3': True
                }
            }
        ]
        
        result = generator.generate_features_matrix(metadata)
        
        # Only true features should be included
        assert 'feature1' in result['features']
        assert 'feature3' in result['features']
        assert 'feature2' not in result['features']
    
    def test_generate_features_matrix_aggregate_across_tools(self, generator):
        """Test that features are aggregated across all tools"""
        metadata = [
            {'slug': 't1', 'name': 'T1', 'type': 'CLI', 'features': {'f1': True, 'f2': True}},
            {'slug': 't2', 'name': 'T2', 'type': 'CLI', 'features': {'f2': True, 'f3': True}},
            {'slug': 't3', 'name': 'T3', 'type': 'CLI', 'features': {'f1': True, 'f3': True}}
        ]
        
        result = generator.generate_features_matrix(metadata)
        
        # All features should be present
        assert 'f1' in result['features']
        assert 'f2' in result['features']
        assert 'f3' in result['features']
        
        # Check counts
        assert len(result['features']['f1']) == 2  # t1, t3
        assert len(result['features']['f2']) == 2  # t1, t2
        assert len(result['features']['f3']) == 2  # t2, t3
    
    def test_generate_statistics_edge_case_empty_features(self, generator):
        """Test statistics with tools that have empty features"""
        metadata = [
            {'slug': 't1', 'name': 'T1', 'type': 'CLI', 'pricing': {'model': 'free'}, 'features': {}},
            {'slug': 't2', 'name': 'T2', 'type': 'CLI', 'pricing': {'model': 'free'}, 'features': {}}
        ]
        
        result = generator.generate_statistics(metadata)
        
        assert result['total_tools'] == 2
        assert result['feature_adoption'] == {}
        assert result['most_common_features'] == []
    
    def test_generate_statistics_limits_top_features(self, generator):
        """Test that most_common_features limits to 10 items"""
        # Create 15 features
        features = {f'feature{i}': True for i in range(15)}
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI',
            'pricing': {'model': 'free'},
            'features': features
        }]
        
        result = generator.generate_statistics(metadata)
        
        # Should limit to 10
        assert len(result['most_common_features']) <= 10
    
    def test_generate_statistics_type_distribution(self, generator):
        """Test type distribution in statistics"""
        metadata = [
            {'slug': 't1', 'name': 'T1', 'type': 'CLI Tool', 'pricing': {'model': 'free'}},
            {'slug': 't2', 'name': 'T2', 'type': 'CLI Tool', 'pricing': {'model': 'free'}},
            {'slug': 't3', 'name': 'T3', 'type': 'IDE Plugin', 'pricing': {'model': 'free'}},
        ]
        
        result = generator.generate_statistics(metadata)
        
        assert result['by_type']['CLI Tool'] == 2
        assert result['by_type']['IDE Plugin'] == 1
    
    def test_generate_search_index_combines_all_searchable_fields(self, generator):
        """Test that search index includes all relevant fields"""
        metadata = [{
            'slug': 'test-tool',
            'name': 'Test Tool',
            'type': 'CLI Tool',
            'description': 'A testing tool',
            'tags': ['testing', 'dev']
        }]
        
        result = generator.generate_search_index(metadata)
        
        keywords = result['index'][0]['keywords']
        
        # Should include slug words
        assert 'test' in keywords or 'test-tool' in keywords
        # Should include name words
        assert 'test' in keywords and 'tool' in keywords
        # Should include type
        assert 'cli' in keywords or 'cli tool' in keywords
        # Should include tags
        assert 'testing' in keywords
        assert 'dev' in keywords
    
    def test_generate_search_index_handles_hyphenated_terms(self, generator):
        """Test that hyphenated terms are split for search"""
        metadata = [{
            'slug': 'multi-word-tool',
            'name': 'Multi-Word Tool',
            'type': 'CLI Tool',
            'description': 'Test'
        }]
        
        result = generator.generate_search_index(metadata)
        keywords = result['index'][0]['keywords']
        
        # Should include both hyphenated and split versions
        assert any('multi' in k for k in keywords)
        assert any('word' in k for k in keywords)
    
    def test_generate_search_index_deduplicates_keywords(self, generator):
        """Test that duplicate keywords are removed"""
        metadata = [{
            'slug': 'tool',
            'name': 'Tool',
            'type': 'CLI Tool',
            'description': 'A tool for tools',
            'tags': ['tool']
        }]
        
        result = generator.generate_search_index(metadata)
        keywords = result['index'][0]['keywords']
        
        # Count occurrences of 'tool'
        tool_count = keywords.count('tool')
        # Should appear only once despite multiple sources
        assert tool_count == 1
    
    def test_generate_all_handles_empty_metadata_dir(self, generator, capfd):
        """Test generate_all with no metadata files"""
        generator.generate_all()
        captured = capfd.readouterr()
        
        assert 'Found 0 tools' in captured.out
        # Should still create empty endpoints
        assert (generator.api_dir / 'index.json').exists()
    
    def test_generate_all_creates_proper_directory_structure(self, generator, temp_repo):
        """Test that directory structure is created correctly"""
        _ = temp_repo
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool'
        }]
        
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata[0], f)
        
        generator.generate_all()
        
        # Check directory structure
        assert (generator.api_dir / 'tools').is_dir()
        assert (generator.api_dir / 'index.json').is_file()
    
    def test_generate_all_json_indentation(self, generator, temp_repo):
        """Test that generated JSON is properly indented"""
        _ = temp_repo
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool'
        }]
        
        file_path = generator.metadata_dir / 'test.json'
        with open(file_path, 'w') as f:
            json.dump(metadata[0], f)
        
        generator.generate_all()
        
        # Check that JSON is formatted (has newlines)
        with open(generator.api_dir / 'index.json') as f:
            content = f.read()
        
        assert '\n' in content
        assert '  ' in content or '\t' in content  # Has indentation
    
    def test_generate_api_docs_markdown_format(self, generator):
        """Test that API docs are valid Markdown"""
        metadata = [{'slug': 'test', 'name': 'Test', 'type': 'CLI Tool'}]
        generator.generate_api_docs(metadata)
        
        readme_path = generator.api_dir / 'README.md'
        content = readme_path.read_text()
        
        # Should have markdown headers
        assert content.startswith('#')
        # Should have code blocks
        assert '```' in content
    
    def test_generate_api_docs_includes_all_endpoints(self, generator):
        """Test that docs list all available endpoints"""
        metadata = [{'slug': 'test', 'name': 'Test', 'type': 'CLI Tool'}]
        generator.generate_api_docs(metadata)
        
        readme_path = generator.api_dir / 'README.md'
        content = readme_path.read_text()
        
        # Should mention key endpoints
        assert 'index.json' in content
        assert 'by-type.json' in content
        assert 'by-pricing.json' in content
        assert 'features.json' in content
        assert 'statistics.json' in content
        assert 'search.json' in content
    
    def test_print_usage_examples_all_languages(self, generator, capfd):
        """Test that usage examples include multiple languages"""
        generator.print_usage_examples()
        captured = capfd.readouterr()
        
        # Should have examples for multiple languages/tools
        assert 'JavaScript' in captured.out or 'fetch' in captured.out
        assert 'Python' in captured.out or 'requests' in captured.out
        assert 'cURL' in captured.out or 'curl' in captured.out
    
    def test_main_creates_all_endpoints(self, temp_repo, monkeypatch, capfd):
        """Test that main function creates complete API"""
        _ = capfd
        monkeypatch.chdir(temp_repo)
        
        # Create sample metadata
        metadata = {'slug': 'test', 'name': 'Test', 'type': 'CLI Tool'}
        (temp_repo / 'metadata' / 'test.json').write_text(json.dumps(metadata))
        
        with patch('sys.argv', ['generate-api.py']):
            from generate_api import main
            main()
        
        # Should create all endpoints
        api_dir = temp_repo / 'api'
        assert (api_dir / 'index.json').exists()
        assert (api_dir / 'by-type.json').exists()
        assert (api_dir / 'tools' / 'test.json').exists()
    
    def test_tool_detail_includes_version_timestamp(self, generator):
        """Test that tool detail includes version and timestamp"""
        tool = {
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool'
        }
        
        result = generator.generate_tool_detail(tool)
        
        assert 'version' in result
        assert 'generated' in result
    
    def test_by_type_sorts_tools_alphabetically(self, generator):
        """Test that tools within types are sorted"""
        metadata = [
            {'slug': 'zebra', 'name': 'Zebra', 'type': 'CLI Tool', 'description': ''},
            {'slug': 'alpha', 'name': 'Alpha', 'type': 'CLI Tool', 'description': ''},
            {'slug': 'beta', 'name': 'Beta', 'type': 'CLI Tool', 'description': ''}
        ]
        
        result = generator.generate_by_type(metadata)
        tools = result['types']['CLI Tool']
        
        # Should be sorted alphabetically by name or slug
        names = [t['name'] for t in tools]
        assert names == sorted(names) or [t['slug'] for t in tools] == sorted([t['slug'] for t in tools])
    
    def test_empty_description_defaults_to_empty_string(self, generator):
        """Test that missing descriptions default to empty string"""
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool'
            # No description field
        }]
        
        result = generator.generate_tools_index(metadata)
        
        assert result['tools'][0]['description'] == ''
    
    def test_empty_status_defaults_to_unknown(self, generator):
        """Test that missing status defaults to unknown"""
        metadata = [{
            'slug': 'test',
            'name': 'Test',
            'type': 'CLI Tool'
            # No status field
        }]
        
        result = generator.generate_tools_index(metadata)
        
        assert result['tools'][0]['status'] == 'unknown'


pytestmark = pytest.mark.unit