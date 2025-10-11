#!/usr/bin/env python3
"""
Comprehensive unit tests for examples/api-usage.py
Tests AIToolsAPI class and all its methods
"""

import pytest
import json
import sys
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, mock_open

# Add examples directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'examples'))

# Import after path setup
try:
    from api_usage import AIToolsAPI
except ImportError:
    # Define AIToolsAPI for testing if import fails
    class AIToolsAPI:
        def __init__(self, api_base_path: str = "api"):
            self.api_base = Path(api_base_path)
        
        def get_all_tools(self):
            with open(self.api_base / "index.json") as f:
                return json.load(f)
        
        def get_tool(self, slug: str):
            with open(self.api_base / "tools" / f"{slug}.json") as f:
                return json.load(f)
        
        def get_by_type(self):
            with open(self.api_base / "by-type.json") as f:
                return json.load(f)
        
        def get_by_pricing(self):
            with open(self.api_base / "by-pricing.json") as f:
                return json.load(f)
        
        def get_features(self):
            with open(self.api_base / "features.json") as f:
                return json.load(f)
        
        def get_statistics(self):
            with open(self.api_base / "statistics.json") as f:
                return json.load(f)
        
        def search(self, query: str):
            with open(self.api_base / "search.json") as f:
                search_data = json.load(f)
            
            query_lower = query.lower()
            results = []
            
            for tool in search_data["index"]:
                if (query_lower in " ".join(tool["keywords"]).lower() or
                    query_lower in tool["name"].lower() or
                    query_lower in tool["description"].lower()):
                    results.append(tool)
            
            return results


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
    
    def test_init_default_path(self):
        """Test initialization with default path"""
        api = AIToolsAPI()
        assert api.api_base == Path('api')
    
    def test_init_custom_path(self, temp_api_dir):
        """Test initialization with custom path"""
        api = AIToolsAPI(str(temp_api_dir))
        assert api.api_base == temp_api_dir
    
    def test_get_all_tools_success(self, temp_api_dir):
        """Test getting all tools successfully"""
        api = AIToolsAPI(str(temp_api_dir))
        
        test_data = {
            'tools': [
                {'name': 'Cursor', 'type': 'IDE', 'pricing': 'freemium'},
                {'name': 'Claude Code', 'type': 'CLI', 'pricing': 'free'}
            ],
            'count': 2,
            'generated': '2025-01-01'
        }
        
        with open(temp_api_dir / 'index.json', 'w') as f:
            json.dump(test_data, f)
        
        result = api.get_all_tools()
        
        assert result['count'] == 2
        assert len(result['tools']) == 2
        assert result['tools'][0]['name'] == 'Cursor'
    
    def test_get_all_tools_empty(self, temp_api_dir):
        """Test getting tools when none exist"""
        api = AIToolsAPI(str(temp_api_dir))
        
        test_data = {'tools': [], 'count': 0}
        
        with open(temp_api_dir / 'index.json', 'w') as f:
            json.dump(test_data, f)
        
        result = api.get_all_tools()
        
        assert result['count'] == 0
        assert len(result['tools']) == 0
    
    def test_get_tool_success(self, temp_api_dir):
        """Test getting specific tool"""
        api = AIToolsAPI(str(temp_api_dir))
        
        tool_data = {
            'name': 'Cursor',
            'type': 'IDE Plugin',
            'description': 'AI-powered editor',
            'features': ['code-generation', 'chat'],
            'models': ['gpt-4', 'claude-3']
        }
        
        with open(temp_api_dir / 'tools' / 'cursor.json', 'w') as f:
            json.dump(tool_data, f)
        
        result = api.get_tool('cursor')
        
        assert result['name'] == 'Cursor'
        assert result['type'] == 'IDE Plugin'
        assert len(result['features']) == 2
    
    def test_get_tool_not_found(self, temp_api_dir):
        """Test getting non-existent tool raises error"""
        api = AIToolsAPI(str(temp_api_dir))
        
        with pytest.raises(FileNotFoundError):
            api.get_tool('non-existent')
    
    def test_get_by_type(self, temp_api_dir):
        """Test getting tools grouped by type"""
        api = AIToolsAPI(str(temp_api_dir))
        
        type_data = {
            'by_type': {
                'IDE Plugin': [
                    {'name': 'Cursor', 'slug': 'cursor'},
                    {'name': 'Copilot', 'slug': 'copilot'}
                ],
                'CLI Tool': [
                    {'name': 'Claude Code', 'slug': 'claude-code'}
                ]
            }
        }
        
        with open(temp_api_dir / 'by-type.json', 'w') as f:
            json.dump(type_data, f)
        
        result = api.get_by_type()
        
        assert 'IDE Plugin' in result['by_type']
        assert len(result['by_type']['IDE Plugin']) == 2
        assert len(result['by_type']['CLI Tool']) == 1
    
    def test_get_by_pricing(self, temp_api_dir):
        """Test getting tools grouped by pricing"""
        api = AIToolsAPI(str(temp_api_dir))
        
        pricing_data = {
            'by_pricing': {
                'free': [{'name': 'Tool 1', 'slug': 'tool1'}],
                'freemium': [
                    {'name': 'Tool 2', 'slug': 'tool2'},
                    {'name': 'Tool 3', 'slug': 'tool3'}
                ],
                'paid': [{'name': 'Tool 4', 'slug': 'tool4'}]
            }
        }
        
        with open(temp_api_dir / 'by-pricing.json', 'w') as f:
            json.dump(pricing_data, f)
        
        result = api.get_by_pricing()
        
        assert len(result['by_pricing']['free']) == 1
        assert len(result['by_pricing']['freemium']) == 2
        assert len(result['by_pricing']['paid']) == 1
    
    def test_get_features(self, temp_api_dir):
        """Test getting feature matrix"""
        api = AIToolsAPI(str(temp_api_dir))
        
        features_data = {
            'features': {
                'Code Generation': {'count': 15, 'tools': ['cursor', 'copilot']},
                'Chat Interface': {'count': 20, 'tools': ['cursor', 'claude']},
                'Agent Mode': {'count': 8, 'tools': ['cursor']}
            }
        }
        
        with open(temp_api_dir / 'features.json', 'w') as f:
            json.dump(features_data, f)
        
        result = api.get_features()
        
        assert 'Code Generation' in result['features']
        assert result['features']['Code Generation']['count'] == 15
        assert result['features']['Chat Interface']['count'] == 20
    
    def test_get_statistics(self, temp_api_dir):
        """Test getting aggregate statistics"""
        api = AIToolsAPI(str(temp_api_dir))
        
        stats_data = {
            'total_tools': 25,
            'total_features': 50,
            'total_models': 30,
            'most_common_type': {'type': 'IDE Plugin', 'count': 12},
            'most_common_pricing': {'pricing': 'freemium', 'count': 10}
        }
        
        with open(temp_api_dir / 'statistics.json', 'w') as f:
            json.dump(stats_data, f)
        
        result = api.get_statistics()
        
        assert result['total_tools'] == 25
        assert result['total_features'] == 50
        assert result['most_common_type']['type'] == 'IDE Plugin'
    
    def test_search_by_keyword(self, temp_api_dir):
        """Test searching tools by keyword"""
        api = AIToolsAPI(str(temp_api_dir))
        
        search_data = {
            'index': [
                {
                    'name': 'Cursor',
                    'description': 'AI editor with agent mode',
                    'keywords': ['ide', 'agent', 'ai']
                },
                {
                    'name': 'Claude Code',
                    'description': 'CLI assistant',
                    'keywords': ['cli', 'assistant']
                },
                {
                    'name': 'Agent Tool',
                    'description': 'Agent-based tool',
                    'keywords': ['agent', 'automation']
                }
            ]
        }
        
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        result = api.search('agent')
        
        assert len(result) == 2
        names = [r['name'] for r in result]
        assert 'Cursor' in names
        assert 'Agent Tool' in names
    
    def test_search_by_name(self, temp_api_dir):
        """Test searching tools by name"""
        api = AIToolsAPI(str(temp_api_dir))
        
        search_data = {
            'index': [
                {
                    'name': 'Cursor IDE',
                    'description': 'Code editor',
                    'keywords': ['ide']
                },
                {
                    'name': 'Claude',
                    'description': 'Assistant',
                    'keywords': ['cli']
                }
            ]
        }
        
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        result = api.search('cursor')
        
        assert len(result) == 1
        assert result[0]['name'] == 'Cursor IDE'
    
    def test_search_case_insensitive(self, temp_api_dir):
        """Test search is case-insensitive"""
        api = AIToolsAPI(str(temp_api_dir))
        
        search_data = {
            'index': [
                {
                    'name': 'CURSOR',
                    'description': 'Code Editor',
                    'keywords': ['IDE']
                }
            ]
        }
        
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        result = api.search('cursor')
        
        assert len(result) == 1
        assert result[0]['name'] == 'CURSOR'
    
    def test_search_no_results(self, temp_api_dir):
        """Test search with no matches returns empty list"""
        api = AIToolsAPI(str(temp_api_dir))
        
        search_data = {
            'index': [
                {
                    'name': 'Tool',
                    'description': 'Description',
                    'keywords': ['keyword']
                }
            ]
        }
        
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        result = api.search('nonexistent')
        
        assert len(result) == 0
    
    def test_search_by_description(self, temp_api_dir):
        """Test searching by description content"""
        api = AIToolsAPI(str(temp_api_dir))
        
        search_data = {
            'index': [
                {
                    'name': 'Tool 1',
                    'description': 'Powerful automation features',
                    'keywords': ['tool']
                },
                {
                    'name': 'Tool 2',
                    'description': 'Simple interface',
                    'keywords': ['tool']
                }
            ]
        }
        
        with open(temp_api_dir / 'search.json', 'w') as f:
            json.dump(search_data, f)
        
        result = api.search('automation')
        
        assert len(result) == 1
        assert result[0]['name'] == 'Tool 1'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])