"""
Comprehensive unit tests for examples/api-usage.py
Tests the AIToolsAPI client and example usage scenarios
"""

import pytest
import json
import sys
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, mock_open, call
from io import StringIO

sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'examples'))

from api_usage import AIToolsAPI


class TestAIToolsAPI:
    """Test suite for AIToolsAPI class"""
    
    @pytest.fixture
    def temp_api_dir(self):
        """Create temporary API directory structure"""
        temp_dir = tempfile.mkdtemp()
        api_path = Path(temp_dir) / 'api'
        api_path.mkdir()
        (api_path / 'tools').mkdir()
        
        yield api_path
        
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def sample_index(self):
        """Sample index.json data"""
        return {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'count': 3,
            'tools': [
                {
                    'slug': 'cursor',
                    'name': 'Cursor',
                    'type': 'IDE Plugin',
                    'description': 'AI-powered editor',
                    'status': 'active'
                },
                {
                    'slug': 'claude-code',
                    'name': 'Claude Code',
                    'type': 'CLI Tool',
                    'description': 'CLI assistant',
                    'status': 'active'
                },
                {
                    'slug': 'github-copilot',
                    'name': 'GitHub Copilot',
                    'type': 'IDE Plugin',
                    'description': 'AI pair programmer',
                    'status': 'active'
                }
            ]
        }
    
    @pytest.fixture
    def sample_tool(self):
        """Sample tool detail data"""
        return {
            'slug': 'cursor',
            'name': 'Cursor',
            'type': 'IDE Plugin',
            'description': 'AI-powered code editor',
            'status': 'active',
            'features': {
                'codeGeneration': True,
                'agentMode': True,
                'chatInterface': True,
                'debugging': False
            },
            'models': {
                'primary': 'claude-3.5-sonnet',
                'supported': ['claude-3.5-sonnet', 'gpt-4', 'gpt-3.5-turbo'],
                'customizable': True
            },
            'pricing': {
                'model': 'freemium',
                'tiers': [
                    {'name': 'Free', 'price': 0},
                    {'name': 'Pro', 'price': 20}
                ]
            }
        }
    
    @pytest.fixture
    def api(self, temp_api_dir):
        """Create AIToolsAPI instance with temp directory"""
        return AIToolsAPI(str(temp_api_dir))
    
    def test_init_with_default_path(self):
        """Test initialization with default API path"""
        api = AIToolsAPI()
        
        assert api.api_base == Path('api')
    
    def test_init_with_custom_path(self, temp_api_dir):
        """Test initialization with custom path"""
        api = AIToolsAPI(str(temp_api_dir))
        
        assert api.api_base == temp_api_dir
    
    def test_init_with_path_object(self, temp_api_dir):
        """Test initialization with Path object"""
        api = AIToolsAPI(temp_api_dir)
        
        assert api.api_base == temp_api_dir
    
    def test_get_all_tools(self, api, temp_api_dir, sample_index):
        """Test getting all tools from index"""
        with open(temp_api_dir / 'index.json', 'w') as f:
            json.dump(sample_index, f)
        
        result = api.get_all_tools()
        
        assert result['version'] == '1.0'
        assert result['count'] == 3
        assert len(result['tools']) == 3
        assert result['tools'][0]['slug'] == 'cursor'
    
    def test_get_all_tools_empty(self, api, temp_api_dir):
        """Test getting all tools when index is empty"""
        empty_index = {'version': '1.0', 'generated': '2025-01-02T00:00:00', 'count': 0, 'tools': []}
        with open(temp_api_dir / 'index.json', 'w') as f:
            json.dump(empty_index, f)
        
        result = api.get_all_tools()
        
        assert result['count'] == 0
        assert result['tools'] == []
    
    def test_get_all_tools_file_not_found(self, api):
        """Test getting all tools when file doesn't exist"""
        with pytest.raises(FileNotFoundError):
            api.get_all_tools()
    
    def test_get_all_tools_invalid_json(self, api, temp_api_dir):
        """Test getting all tools with invalid JSON"""
        with open(temp_api_dir / 'index.json', 'w') as f:
            f.write('{ invalid json')
        
        with pytest.raises(json.JSONDecodeError):
            api.get_all_tools()
    
    def test_get_tool(self, api, temp_api_dir, sample_tool):
        """Test getting a specific tool"""
        with open(temp_api_dir / 'tools' / 'cursor.json', 'w') as f:
            json.dump(sample_tool, f)
        
        result = api.get_tool('cursor')
        
        assert result['name'] == 'Cursor'
        assert result['type'] == 'IDE Plugin'
        assert 'features' in result
        assert 'models' in result
    
    def test_get_tool_not_found(self, api):
        """Test getting a tool that doesn't exist"""
        with pytest.raises(FileNotFoundError):
            api.get_tool('nonexistent')
    
    def test_get_tool_with_unicode(self, api, temp_api_dir):
        """Test getting tool with Unicode characters"""
        tool = {
            'slug': 'test',
            'name': 'Tëst Töol',
            'description': 'Unicode: 中文 日本語'
        }
        with open(temp_api_dir / 'tools' / 'test.json', 'w', encoding='utf-8') as f:
            json.dump(tool, f, ensure_ascii=False)
        
        result = api.get_tool('test')
        
        assert result['name'] == 'Tëst Töol'
        assert '中文' in result['description']
    
    def test_get_by_type(self, api, temp_api_dir):
        """Test getting tools grouped by type"""
        by_type = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'types': {
                'IDE Plugin': [
                    {'slug': 'cursor', 'name': 'Cursor', 'description': 'Editor'},
                    {'slug': 'copilot', 'name': 'Copilot', 'description': 'Assistant'}
                ],
                'CLI Tool': [
                    {'slug': 'claude-code', 'name': 'Claude Code', 'description': 'CLI'}
                ]
            }
        }
        with open(temp_api_dir / 'by-type.json', 'w') as f:
            json.dump(by_type, f)
        
        result = api.get_by_type()
        
        assert 'types' in result
        assert 'IDE Plugin' in result['types']
        assert len(result['types']['IDE Plugin']) == 2
        assert len(result['types']['CLI Tool']) == 1
    
    def test_get_by_type_empty(self, api, temp_api_dir):
        """Test getting by type when no types exist"""
        by_type = {'version': '1.0', 'generated': '2025-01-02T00:00:00', 'types': {}}
        with open(temp_api_dir / 'by-type.json', 'w') as f:
            json.dump(by_type, f)
        
        result = api.get_by_type()
        
        assert result['types'] == {}
    
    def test_get_by_pricing(self, api, temp_api_dir):
        """Test getting tools grouped by pricing"""
        by_pricing = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'pricing_models': {
                'free': [
                    {'slug': 'tool1', 'name': 'Tool 1', 'type': 'CLI Tool'}
                ],
                'freemium': [
                    {'slug': 'tool2', 'name': 'Tool 2', 'type': 'IDE Plugin'}
                ],
                'paid': [
                    {'slug': 'tool3', 'name': 'Tool 3', 'type': 'Web Platform'}
                ]
            }
        }
        with open(temp_api_dir / 'by-pricing.json', 'w') as f:
            json.dump(by_pricing, f)
        
        result = api.get_by_pricing()
        
        assert 'pricing_models' in result
        assert len(result['pricing_models']) == 3
        assert 'free' in result['pricing_models']
        assert 'freemium' in result['pricing_models']
        assert 'paid' in result['pricing_models']
    
    def test_get_features(self, api, temp_api_dir):
        """Test getting feature adoption matrix"""
        features = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'features': {
                'codeGeneration': [
                    {'slug': 'cursor', 'name': 'Cursor'},
                    {'slug': 'copilot', 'name': 'Copilot'}
                ],
                'agentMode': [
                    {'slug': 'cursor', 'name': 'Cursor'}
                ]
            }
        }
        with open(temp_api_dir / 'features.json', 'w') as f:
            json.dump(features, f)
        
        result = api.get_features()
        
        assert 'features' in result
        assert 'codeGeneration' in result['features']
        assert len(result['features']['codeGeneration']) == 2
        assert len(result['features']['agentMode']) == 1
    
    def test_get_statistics(self, api, temp_api_dir):
        """Test getting aggregate statistics"""
        stats = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'total_tools': 10,
            'by_type': {
                'IDE Plugin': 5,
                'CLI Tool': 3,
                'Web Platform': 2
            },
            'by_pricing': {
                'free': 4,
                'freemium': 3,
                'paid': 3
            },
            'feature_adoption': {
                'codeGeneration': 10,
                'agentMode': 5,
                'chatInterface': 8
            },
            'most_common_features': [
                ['codeGeneration', 10],
                ['chatInterface', 8],
                ['agentMode', 5]
            ]
        }
        with open(temp_api_dir / 'statistics.json', 'w') as f:
            json.dump(stats, f)
        
        result = api.get_statistics()
        
        assert result['total_tools'] == 10
        assert len(result['by_type']) == 3
        assert len(result['most_common_features']) == 3
    
    def test_search_by_keyword(self, api, temp_api_dir):
        """Test searching tools by keyword"""
        search_data = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'index': [
                {
                    'slug': 'cursor',
                    'name': 'Cursor',
                    'type': 'IDE Plugin',
                    'description': 'AI-powered editor with agent mode',
                    'tags': ['IDE', 'Agent'],
                    'keywords': ['cursor', 'ide', 'agent', 'editor']
                },
                {
                    'slug': 'claude-code',
                    'name': 'Claude Code',
                    'type': 'CLI Tool',
                    'description': 'Command-line assistant',
                    'tags': ['CLI'],
                    'keywords': ['claude', 'cli', 'code']
                }
            ]
        }
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        results = api.search('agent')
        
        assert len(results) == 1
        assert results[0]['slug'] == 'cursor'
    
    def test_search_case_insensitive(self, api, temp_api_dir):
        """Test that search is case insensitive"""
        search_data = {
            'version': '1.0',
            'index': [
                {
                    'slug': 'cursor',
                    'name': 'Cursor',
                    'type': 'IDE Plugin',
                    'description': 'IDE Plugin',
                    'tags': [],
                    'keywords': ['cursor', 'ide']
                }
            ]
        }
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        results_lower = api.search('cursor')
        results_upper = api.search('CURSOR')
        results_mixed = api.search('CuRsOr')
        
        assert len(results_lower) == 1
        assert len(results_upper) == 1
        assert len(results_mixed) == 1
    
    def test_search_in_name(self, api, temp_api_dir):
        """Test searching in tool name"""
        search_data = {
            'version': '1.0',
            'index': [
                {
                    'slug': 'github-copilot',
                    'name': 'GitHub Copilot',
                    'type': 'IDE Plugin',
                    'description': 'Assistant',
                    'tags': [],
                    'keywords': ['github', 'copilot']
                }
            ]
        }
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        results = api.search('GitHub')
        
        assert len(results) == 1
        assert 'GitHub' in results[0]['name']
    
    def test_search_in_description(self, api, temp_api_dir):
        """Test searching in tool description"""
        search_data = {
            'version': '1.0',
            'index': [
                {
                    'slug': 'tool',
                    'name': 'Tool',
                    'type': 'CLI Tool',
                    'description': 'An autonomous agent for coding',
                    'tags': [],
                    'keywords': ['tool']
                }
            ]
        }
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        results = api.search('autonomous')
        
        assert len(results) == 1
    
    def test_search_no_results(self, api, temp_api_dir):
        """Test search with no matching results"""
        search_data = {
            'version': '1.0',
            'index': [
                {
                    'slug': 'tool',
                    'name': 'Tool',
                    'type': 'CLI Tool',
                    'description': 'Description',
                    'tags': [],
                    'keywords': ['tool']
                }
            ]
        }
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        results = api.search('nonexistent')
        
        assert len(results) == 0
        assert results == []
    
    def test_search_empty_query(self, api, temp_api_dir):
        """Test search with empty query"""
        search_data = {
            'version': '1.0',
            'index': [
                {
                    'slug': 'tool',
                    'name': 'Tool',
                    'type': 'CLI Tool',
                    'description': '',
                    'tags': [],
                    'keywords': ['tool']
                }
            ]
        }
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        results = api.search('')
        
        # Empty string should match everything
        assert len(results) >= 1
    
    def test_search_partial_match(self, api, temp_api_dir):
        """Test search with partial keyword match"""
        search_data = {
            'version': '1.0',
            'index': [
                {
                    'slug': 'cursor',
                    'name': 'Cursor',
                    'type': 'IDE Plugin',
                    'description': 'Editor',
                    'tags': [],
                    'keywords': ['cursor', 'editor']
                }
            ]
        }
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        results = api.search('edit')
        
        # Should find 'editor' via partial match
        assert len(results) == 1
    
    def test_search_multiple_matches(self, api, temp_api_dir):
        """Test search returning multiple results"""
        search_data = {
            'version': '1.0',
            'index': [
                {
                    'slug': 'cursor',
                    'name': 'Cursor',
                    'type': 'IDE Plugin',
                    'description': 'Code editor',
                    'tags': [],
                    'keywords': ['cursor', 'code']
                },
                {
                    'slug': 'vscode',
                    'name': 'VSCode',
                    'type': 'IDE Plugin',
                    'description': 'Code editor',
                    'tags': [],
                    'keywords': ['vscode', 'code']
                }
            ]
        }
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        results = api.search('code')
        
        assert len(results) == 2
    
    def test_path_traversal_protection(self, api):
        """Test that path traversal attempts are prevented"""
        # Trying to access files outside the API directory should fail
        with pytest.raises(FileNotFoundError):
            api.get_tool('../../../etc/passwd')
    
    def test_get_tool_special_characters_in_slug(self, api, temp_api_dir):
        """Test handling special characters in slug"""
        # Should handle URL-safe characters
        tool = {'slug': 'tool-name_v2', 'name': 'Tool'}
        with open(temp_api_dir / 'tools' / 'tool-name_v2.json', 'w') as f:
            json.dump(tool, f)
        
        result = api.get_tool('tool-name_v2')
        
        assert result['slug'] == 'tool-name_v2'


class TestAIToolsAPIAdvanced:
    """Advanced tests for edge cases and error scenarios"""
    
    @pytest.fixture
    def temp_api_dir(self):
        temp_dir = tempfile.mkdtemp()
        api_path = Path(temp_dir) / 'api'
        api_path.mkdir()
        (api_path / 'tools').mkdir()
        yield api_path
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def api(self, temp_api_dir):
        return AIToolsAPI(str(temp_api_dir))
    
    def test_large_json_file(self, api, temp_api_dir):
        """Test handling large JSON files"""
        # Create a large index with many tools
        large_index = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'count': 1000,
            'tools': [
                {
                    'slug': f'tool-{i}',
                    'name': f'Tool {i}',
                    'type': 'CLI Tool',
                    'description': f'Description {i}',
                    'status': 'active'
                }
                for i in range(1000)
            ]
        }
        with open(temp_api_dir / 'index.json', 'w') as f:
            json.dump(large_index, f)
        
        result = api.get_all_tools()
        
        assert result['count'] == 1000
        assert len(result['tools']) == 1000
    
    def test_malformed_features_dict(self, api, temp_api_dir):
        """Test handling tool with malformed features"""
        tool = {
            'slug': 'test',
            'name': 'Test',
            'features': 'not a dict'  # Should be dict
        }
        with open(temp_api_dir / 'tools' / 'test.json', 'w') as f:
            json.dump(tool, f)
        
        result = api.get_tool('test')
        
        # Should still load, just with malformed data
        assert result['features'] == 'not a dict'
    
    def test_missing_optional_fields(self, api, temp_api_dir):
        """Test tool with missing optional fields"""
        minimal_tool = {
            'slug': 'minimal',
            'name': 'Minimal Tool'
        }
        with open(temp_api_dir / 'tools' / 'minimal.json', 'w') as f:
            json.dump(minimal_tool, f)
        
        result = api.get_tool('minimal')
        
        assert result['name'] == 'Minimal Tool'
        assert 'features' not in result
    
    def test_search_with_special_regex_chars(self, api, temp_api_dir):
        """Test search with regex special characters"""
        search_data = {
            'version': '1.0',
            'index': [
                {
                    'slug': 'tool',
                    'name': 'C++ Tool',
                    'type': 'CLI Tool',
                    'description': 'Tool for C++',
                    'tags': [],
                    'keywords': ['c++', 'tool']
                }
            ]
        }
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        # Should handle special chars without regex errors
        results = api.search('c++')
        
        assert len(results) == 1
    
    def test_concurrent_reads(self, api, temp_api_dir):
        """Test that multiple concurrent reads work correctly"""
        import threading
        
        # Create test data
        index = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'count': 1,
            'tools': [{'slug': 'test', 'name': 'Test', 'type': 'CLI Tool', 'description': '', 'status': 'active'}]
        }
        with open(temp_api_dir / 'index.json', 'w') as f:
            json.dump(index, f)
        
        results = []
        errors = []
        
        def read_index():
            try:
                result = api.get_all_tools()
                results.append(result)
            except (OSError, json.JSONDecodeError) as e:
                errors.append(e)
        
        # Create and start multiple threads
        threads = [threading.Thread(target=read_index) for _ in range(10)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        
        # All reads should succeed
        assert len(errors) == 0
        assert len(results) == 10
    
    def test_empty_keywords_list(self, api, temp_api_dir):
        """Test search with tool that has empty keywords"""
        search_data = {
            'version': '1.0',
            'index': [
                {
                    'slug': 'tool',
                    'name': 'Tool',
                    'type': 'CLI Tool',
                    'description': 'A tool',
                    'tags': [],
                    'keywords': []
                }
            ]
        }
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        # Should still be searchable by name/description
        results = api.search('tool')
        
        assert len(results) == 1
    
    def test_nested_dict_in_features(self, api, temp_api_dir):
        """Test tool with nested dictionary in features"""
        tool = {
            'slug': 'test',
            'name': 'Test',
            'features': {
                'basic': True,
                'advanced': {
                    'nested': True,
                    'deep': {
                        'level': True
                    }
                }
            }
        }
        with open(temp_api_dir / 'tools' / 'test.json', 'w') as f:
            json.dump(tool, f)
        
        result = api.get_tool('test')
        
        # Should preserve nested structure
        assert result['features']['advanced']['deep']['level']
    
    def test_utf8_encoding(self, api, temp_api_dir):
        """Test proper UTF-8 encoding handling"""
        tool = {
            'slug': 'test',
            'name': '测试工具',  # Chinese
            'description': 'Тест инструмент'  # Russian
        }
        with open(temp_api_dir / 'tools' / 'test.json', 'w', encoding='utf-8') as f:
            json.dump(tool, f, ensure_ascii=False)
        
        result = api.get_tool('test')
        
        assert result['name'] == '测试工具'
        assert result['description'] == 'Тест инструмент'
    
    def test_file_permissions_error(self, api, temp_api_dir):
        """Test handling of file permission errors"""
        import os
        
        # Create file and make it unreadable
        file_path = temp_api_dir / 'index.json'
        with open(file_path, 'w') as f:
            json.dump({'version': '1.0', 'tools': []}, f)
        
        try:
            os.chmod(file_path, 0o000)
            
            # Should raise PermissionError
            with pytest.raises((PermissionError, OSError)):
                api.get_all_tools()
        finally:
            # Restore permissions for cleanup
            try:
                os.chmod(file_path, 0o644)
            except OSError:
                pass
    
    def test_symlink_handling(self, api, temp_api_dir):
        """Test handling of symlinked files"""
        import os
        
        # Create actual file
        actual_file = temp_api_dir / 'actual_index.json'
        with open(actual_file, 'w') as f:
            json.dump({'version': '1.0', 'count': 0, 'tools': []}, f)
        
        # Create symlink
        symlink = temp_api_dir / 'index.json'
        try:
            os.symlink(actual_file, symlink)
            
            result = api.get_all_tools()
            
            # Should follow symlink and read successfully
            assert result['version'] == '1.0'
        except OSError:
            # Symlinks might not be supported on all systems
            pytest.skip("Symlinks not supported on this system")


class TestMainFunction:
    """Tests for the main() example function"""
    
    @pytest.fixture
    def temp_api_dir(self):
        temp_dir = tempfile.mkdtemp()
        api_path = Path(temp_dir) / 'api'
        api_path.mkdir()
        (api_path / 'tools').mkdir()
        yield api_path
        shutil.rmtree(temp_dir)
    
    def test_main_runs_without_errors(self, temp_api_dir, monkeypatch, capsys):
        """Test that main function runs all examples without errors"""
        # Create minimal API files
        self._create_test_api_files(temp_api_dir)
        
        # Change to temp directory
        monkeypatch.chdir(temp_api_dir.parent)
        
        from api_usage import main
        
        # Should run without raising exceptions
        main()
        
        captured = capsys.readouterr()
        assert 'AI Tools API' in captured.out
        assert 'Examples completed' in captured.out
    
    def _create_test_api_files(self, api_path):
        """Helper to create minimal test API files"""
        # Index
        index = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'count': 2,
            'tools': [
                {'slug': 'cursor', 'name': 'Cursor', 'type': 'IDE Plugin', 'description': 'Editor', 'status': 'active'},
                {'slug': 'github-copilot', 'name': 'GitHub Copilot', 'type': 'IDE Plugin', 'description': 'Assistant', 'status': 'active'}
            ]
        }
        with open(api_path / 'index.json', 'w') as f:
            json.dump(index, f)
        
        # Tool details
        for slug in ['cursor', 'github-copilot', 'windsurf']:
            tool = {
                'slug': slug,
                'name': slug.replace('-', ' ').title(),
                'type': 'IDE Plugin',
                'description': 'Test tool',
                'features': {'codeGeneration': True, 'agentMode': True},
                'models': {'primary': 'gpt-4', 'supported': ['gpt-4', 'claude-3']},
                'pricing': {'model': 'freemium'}
            }
            with open(api_path / 'tools' / f'{slug}.json', 'w') as f:
                json.dump(tool, f)
        
        # By type
        by_type = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'types': {
                'IDE Plugin': [
                    {'slug': 'cursor', 'name': 'Cursor', 'description': 'Editor'}
                ]
            }
        }
        with open(api_path / 'by-type.json', 'w') as f:
            json.dump(by_type, f)
        
        # By pricing
        by_pricing = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'pricing_models': {
                'freemium': [{'slug': 'cursor', 'name': 'Cursor', 'type': 'IDE Plugin'}]
            }
        }
        with open(api_path / 'by-pricing.json', 'w') as f:
            json.dump(by_pricing, f)
        
        # Features
        features = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'features': {
                'codeGeneration': [{'slug': 'cursor', 'name': 'Cursor'}]
            }
        }
        with open(api_path / 'features.json', 'w') as f:
            json.dump(features, f)
        
        # Statistics
        stats = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'total_tools': 2,
            'by_type': {'IDE Plugin': 2},
            'by_pricing': {'freemium': 2},
            'feature_adoption': {'codeGeneration': 2},
            'most_common_features': [['codeGeneration', 2]]
        }
        with open(api_path / 'statistics.json', 'w') as f:
            json.dump(stats, f)
        
        # Search
        search = {
            'version': '1.0',
            'generated': '2025-01-02T00:00:00',
            'index': [
                {
                    'slug': 'cursor',
                    'name': 'Cursor',
                    'type': 'IDE Plugin',
                    'description': 'Agent-powered editor',
                    'tags': ['IDE'],
                    'keywords': ['cursor', 'ide', 'agent']
                }
            ]
        }
        with open(api_path / 'search.json', 'w') as f:
            json.dump(search, f)


pytestmark = pytest.mark.unit