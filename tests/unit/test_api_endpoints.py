"""
Comprehensive unit tests for aggregated API endpoint files
Tests index.json, by-type.json, by-pricing.json, search.json, features.json, and statistics.json
"""

import pytest
import json
from pathlib import Path
from datetime import datetime


class TestAPIIndexEndpoint:
    """Test suite for api/index.json"""
    
    @pytest.fixture
    def api_dir(self):
        """Locate the api directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'api'
    
    def test_index_json_exists(self, api_dir):
        """Test that index.json exists"""
        index_json = api_dir / 'index.json'
        assert index_json.exists(), "index.json should exist"
    
    def test_index_json_valid_json(self, api_dir):
        """Test that index.json is valid JSON"""
        try:
            with open(api_dir / 'index.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"index.json is not valid JSON: {e}")
    
    def test_index_json_structure(self, api_dir):
        """Test index.json has required structure"""
        with open(api_dir / 'index.json', 'r') as f:
            data = json.load(f)
        
        assert 'version' in data, "Should have version"
        assert 'generated' in data, "Should have generated timestamp"
        assert 'count' in data, "Should have tool count"
        assert 'tools' in data, "Should have tools list"
        assert isinstance(data['tools'], list), "Tools should be a list"
    
    def test_index_includes_new_tools(self, api_dir):
        """Test that index includes newly added tools"""
        with open(api_dir / 'index.json', 'r') as f:
            data = json.load(f)
        
        tool_slugs = [tool['slug'] for tool in data['tools']]
        new_tools = ['api', 'examples', 'platform', 'tests', 'yaml']
        
        for new_tool in new_tools:
            assert new_tool in tool_slugs, f"Index should include {new_tool}"
    
    def test_index_count_matches_tools_length(self, api_dir):
        """Test that count field matches number of tools"""
        with open(api_dir / 'index.json', 'r') as f:
            data = json.load(f)
        
        assert data['count'] == len(data['tools']), "Count should match tools array length"
    
    def test_index_tools_have_required_fields(self, api_dir):
        """Test that each tool in index has required fields"""
        with open(api_dir / 'index.json', 'r') as f:
            data = json.load(f)
        
        required_fields = ['slug', 'name', 'type', 'description', 'status']
        
        for tool in data['tools']:
            for field in required_fields:
                assert field in tool, f"Tool {tool.get('slug', 'unknown')} should have {field}"
    
    def test_index_tool_count_increased(self, api_dir):
        """Test that tool count increased with new additions"""
        with open(api_dir / 'index.json', 'r') as f:
            data = json.load(f)
        
        # Should have at least 37 tools (original + 5 new ones)
        assert data['count'] >= 37, f"Should have at least 37 tools, got {data['count']}"


class TestAPIByTypeEndpoint:
    """Test suite for api/by-type.json"""
    
    @pytest.fixture
    def api_dir(self):
        """Locate the api directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'api'
    
    def test_by_type_json_exists(self, api_dir):
        """Test that by-type.json exists"""
        by_type_json = api_dir / 'by-type.json'
        assert by_type_json.exists(), "by-type.json should exist"
    
    def test_by_type_json_valid_json(self, api_dir):
        """Test that by-type.json is valid JSON"""
        try:
            with open(api_dir / 'by-type.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"by-type.json is not valid JSON: {e}")
    
    def test_by_type_structure(self, api_dir):
        """Test by-type.json structure"""
        with open(api_dir / 'by-type.json', 'r') as f:
            data = json.load(f)
        
        assert 'version' in data, "Should have version"
        assert 'generated' in data, "Should have generated timestamp"
        assert 'types' in data, "Should have types mapping"
        assert isinstance(data['types'], dict), "Types should be a dict"
    
    def test_by_type_includes_ide_plugin(self, api_dir):
        """Test that by-type includes IDE Plugin category"""
        with open(api_dir / 'by-type.json', 'r') as f:
            data = json.load(f)
        
        assert 'IDE Plugin' in data['types'], "Should have IDE Plugin category"
        ide_plugins = data['types']['IDE Plugin']
        assert isinstance(ide_plugins, list), "IDE Plugin should be a list"
        assert len(ide_plugins) > 0, "Should have IDE plugins"
    
    def test_by_type_includes_new_tools(self, api_dir):
        """Test that by-type includes newly added tools"""
        with open(api_dir / 'by-type.json', 'r') as f:
            data = json.load(f)
        
        # All new tools are IDE Plugin type
        ide_plugins = data['types']['IDE Plugin']
        ide_slugs = [tool['slug'] for tool in ide_plugins]
        
        new_tools = ['api', 'examples', 'platform', 'tests', 'yaml']
        for new_tool in new_tools:
            assert new_tool in ide_slugs, f"IDE Plugin should include {new_tool}"
    
    def test_by_type_tools_have_required_fields(self, api_dir):
        """Test that tools in each type have required fields"""
        with open(api_dir / 'by-type.json', 'r') as f:
            data = json.load(f)
        
        required_fields = ['slug', 'name', 'description']
        
        for type_name, tools in data['types'].items():
            for tool in tools:
                for field in required_fields:
                    assert field in tool, f"Tool in {type_name} should have {field}"


class TestAPIByPricingEndpoint:
    """Test suite for api/by-pricing.json"""
    
    @pytest.fixture
    def api_dir(self):
        """Locate the api directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'api'
    
    def test_by_pricing_json_exists(self, api_dir):
        """Test that by-pricing.json exists"""
        by_pricing_json = api_dir / 'by-pricing.json'
        assert by_pricing_json.exists(), "by-pricing.json should exist"
    
    def test_by_pricing_json_valid_json(self, api_dir):
        """Test that by-pricing.json is valid JSON"""
        try:
            with open(api_dir / 'by-pricing.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"by-pricing.json is not valid JSON: {e}")
    
    def test_by_pricing_structure(self, api_dir):
        """Test by-pricing.json structure"""
        with open(api_dir / 'by-pricing.json', 'r') as f:
            data = json.load(f)
        
        assert 'version' in data, "Should have version"
        assert 'generated' in data, "Should have generated timestamp"
        assert 'pricing_models' in data, "Should have pricing_models mapping"
        assert isinstance(data['pricing_models'], dict), "Pricing models should be a dict"
    
    def test_by_pricing_includes_unknown(self, api_dir):
        """Test that by-pricing includes unknown category"""
        with open(api_dir / 'by-pricing.json', 'r') as f:
            data = json.load(f)
        
        assert 'unknown' in data['pricing_models'], "Should have unknown pricing category"
        unknown_tools = data['pricing_models']['unknown']
        assert isinstance(unknown_tools, list), "Unknown should be a list"
    
    def test_by_pricing_includes_new_tools(self, api_dir):
        """Test that by-pricing categorizes new tools"""
        with open(api_dir / 'by-pricing.json', 'r') as f:
            data = json.load(f)
        
        # New tools have unknown pricing
        if 'unknown' in data['pricing_models']:
            unknown_slugs = [tool['slug'] for tool in data['pricing_models']['unknown']]
            new_tools = ['api', 'examples', 'platform', 'tests', 'yaml']
            
            for new_tool in new_tools:
                assert new_tool in unknown_slugs, f"New tool {new_tool} should be in unknown pricing"


class TestAPISearchEndpoint:
    """Test suite for api/search.json"""
    
    @pytest.fixture
    def api_dir(self):
        """Locate the api directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'api'
    
    def test_search_json_exists(self, api_dir):
        """Test that search.json exists"""
        search_json = api_dir / 'search.json'
        assert search_json.exists(), "search.json should exist"
    
    def test_search_json_valid_json(self, api_dir):
        """Test that search.json is valid JSON"""
        try:
            with open(api_dir / 'search.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"search.json is not valid JSON: {e}")
    
    def test_search_structure(self, api_dir):
        """Test search.json structure"""
        with open(api_dir / 'search.json', 'r') as f:
            data = json.load(f)
        
        assert 'version' in data, "Should have version"
        assert 'generated' in data, "Should have generated timestamp"
        assert 'index' in data, "Should have search index"
        assert isinstance(data['index'], list), "Index should be a list"
    
    def test_search_entries_have_keywords(self, api_dir):
        """Test that search entries have keywords for searching"""
        with open(api_dir / 'search.json', 'r') as f:
            data = json.load(f)
        
        for entry in data['index']:
            assert 'slug' in entry, "Search entry should have slug"
            assert 'name' in entry, "Search entry should have name"
            assert 'keywords' in entry, "Search entry should have keywords"
            assert isinstance(entry['keywords'], list), "Keywords should be a list"
    
    def test_search_includes_new_tools(self, api_dir):
        """Test that search index includes new tools"""
        with open(api_dir / 'search.json', 'r') as f:
            data = json.load(f)
        
        search_slugs = [entry['slug'] for entry in data['index']]
        new_tools = ['api', 'examples', 'platform', 'tests', 'yaml']
        
        for new_tool in new_tools:
            assert new_tool in search_slugs, f"Search should include {new_tool}"
    
    def test_search_keywords_lowercase(self, api_dir):
        """Test that search keywords are lowercase for case-insensitive search"""
        with open(api_dir / 'search.json', 'r') as f:
            data = json.load(f)
        
        for entry in data['index']:
            keywords = entry['keywords']
            for keyword in keywords:
                assert keyword == keyword.lower(), f"Keyword '{keyword}' should be lowercase"


class TestAPIFeaturesEndpoint:
    """Test suite for api/features.json"""
    
    @pytest.fixture
    def api_dir(self):
        """Locate the api directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'api'
    
    def test_features_json_exists(self, api_dir):
        """Test that features.json exists"""
        features_json = api_dir / 'features.json'
        assert features_json.exists(), "features.json should exist"
    
    def test_features_json_valid_json(self, api_dir):
        """Test that features.json is valid JSON"""
        try:
            with open(api_dir / 'features.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"features.json is not valid JSON: {e}")
    
    def test_features_structure(self, api_dir):
        """Test features.json structure"""
        with open(api_dir / 'features.json', 'r') as f:
            data = json.load(f)
        
        assert 'version' in data, "Should have version"
        assert 'generated' in data, "Should have generated timestamp"
        assert 'features' in data, "Should have features mapping"
        assert isinstance(data['features'], dict), "Features should be a dict"
    
    def test_features_has_common_features(self, api_dir):
        """Test that features includes common AI coding features"""
        with open(api_dir / 'features.json', 'r') as f:
            data = json.load(f)
        
        common_features = ['codeGeneration', 'chatInterface', 'debugging']
        for feature in common_features:
            assert feature in data['features'], f"Should include {feature} feature"
    
    def test_features_tools_structure(self, api_dir):
        """Test that feature entries have correct structure"""
        with open(api_dir / 'features.json', 'r') as f:
            data = json.load(f)
        
        for feature_name, tools in data['features'].items():
            assert isinstance(tools, list), f"{feature_name} should be a list"
            for tool in tools:
                assert 'slug' in tool, f"Tool in {feature_name} should have slug"
                assert 'name' in tool, f"Tool in {feature_name} should have name"


class TestAPIStatisticsEndpoint:
    """Test suite for api/statistics.json"""
    
    @pytest.fixture
    def api_dir(self):
        """Locate the api directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'api'
    
    def test_statistics_json_exists(self, api_dir):
        """Test that statistics.json exists"""
        statistics_json = api_dir / 'statistics.json'
        assert statistics_json.exists(), "statistics.json should exist"
    
    def test_statistics_json_valid_json(self, api_dir):
        """Test that statistics.json is valid JSON"""
        try:
            with open(api_dir / 'statistics.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"statistics.json is not valid JSON: {e}")
    
    def test_statistics_structure(self, api_dir):
        """Test statistics.json structure"""
        with open(api_dir / 'statistics.json', 'r') as f:
            data = json.load(f)
        
        assert 'version' in data, "Should have version"
        assert 'generated' in data, "Should have generated timestamp"
        assert 'total_tools' in data, "Should have total_tools count"
        assert 'by_type' in data, "Should have by_type breakdown"
        assert 'by_pricing' in data, "Should have by_pricing breakdown"
        assert 'feature_adoption' in data, "Should have feature_adoption stats"
    
    def test_statistics_total_tools_increased(self, api_dir):
        """Test that total tools count increased"""
        with open(api_dir / 'statistics.json', 'r') as f:
            data = json.load(f)
        
        # Should have at least 37 tools
        assert data['total_tools'] >= 37, f"Total tools should be at least 37, got {data['total_tools']}"
    
    def test_statistics_by_type_includes_ide_plugin(self, api_dir):
        """Test that by_type statistics include IDE Plugin"""
        with open(api_dir / 'statistics.json', 'r') as f:
            data = json.load(f)
        
        assert 'IDE Plugin' in data['by_type'], "Should have IDE Plugin in type breakdown"
        # IDE Plugin count should increase with new tools
        assert data['by_type']['IDE Plugin'] >= 30, "Should have at least 30 IDE plugins"
    
    def test_statistics_by_pricing_includes_unknown(self, api_dir):
        """Test that by_pricing includes unknown category"""
        with open(api_dir / 'statistics.json', 'r') as f:
            data = json.load(f)
        
        assert 'unknown' in data['by_pricing'], "Should have unknown pricing in breakdown"
        # Unknown count should increase with new tools
        assert data['by_pricing']['unknown'] >= 35, "Should have at least 35 tools with unknown pricing"
    
    def test_statistics_feature_adoption_has_data(self, api_dir):
        """Test that feature adoption has meaningful data"""
        with open(api_dir / 'statistics.json', 'r') as f:
            data = json.load(f)
        
        feature_adoption = data['feature_adoption']
        assert len(feature_adoption) > 0, "Should have feature adoption data"
        
        # Check that values are reasonable
        for feature, count in feature_adoption.items():
            assert isinstance(count, int), f"{feature} count should be an integer"
            assert count >= 0, f"{feature} count should be non-negative"
    
    def test_statistics_most_common_features(self, api_dir):
        """Test that most_common_features is sorted correctly"""
        with open(api_dir / 'statistics.json', 'r') as f:
            data = json.load(f)
        
        if 'most_common_features' in data:
            most_common = data['most_common_features']
            assert isinstance(most_common, list), "Most common features should be a list"
            
            # Check that it's sorted by count (descending)
            if len(most_common) > 1:
                for i in range(len(most_common) - 1):
                    assert most_common[i][1] >= most_common[i+1][1], \
                        "Most common features should be sorted by count (descending)"


class TestAPIEndpointConsistency:
    """Test consistency across API endpoints"""
    
    @pytest.fixture
    def api_dir(self):
        """Locate the api directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'api'
    
    def test_all_endpoints_exist(self, api_dir):
        """Test that all expected API endpoints exist"""
        endpoints = ['index.json', 'by-type.json', 'by-pricing.json', 
                    'search.json', 'features.json', 'statistics.json']
        
        for endpoint in endpoints:
            endpoint_file = api_dir / endpoint
            assert endpoint_file.exists(), f"{endpoint} should exist"
    
    def test_all_endpoints_have_version(self, api_dir):
        """Test that all endpoints have version field"""
        endpoints = ['index.json', 'by-type.json', 'by-pricing.json', 
                    'search.json', 'features.json', 'statistics.json']
        
        for endpoint in endpoints:
            with open(api_dir / endpoint, 'r') as f:
                data = json.load(f)
            assert 'version' in data, f"{endpoint} should have version"
    
    def test_all_endpoints_have_timestamp(self, api_dir):
        """Test that all endpoints have generated timestamp"""
        endpoints = ['index.json', 'by-type.json', 'by-pricing.json', 
                    'search.json', 'features.json', 'statistics.json']
        
        for endpoint in endpoints:
            with open(api_dir / endpoint, 'r') as f:
                data = json.load(f)
            assert 'generated' in data, f"{endpoint} should have generated timestamp"
    
    def test_tool_counts_consistent(self, api_dir):
        """Test that tool counts are consistent across endpoints"""
        # Load index
        with open(api_dir / 'index.json', 'r') as f:
            index_data = json.load(f)
        index_count = index_data['count']
        
        # Load statistics
        with open(api_dir / 'statistics.json', 'r') as f:
            stats_data = json.load(f)
        stats_count = stats_data['total_tools']
        
        # Load search
        with open(api_dir / 'search.json', 'r') as f:
            search_data = json.load(f)
        search_count = len(search_data['index'])
        
        # All should match
        assert index_count == stats_count, "Index and statistics counts should match"
        assert index_count == search_count, "Index and search counts should match"
    
    def test_new_tools_in_all_endpoints(self, api_dir):
        """Test that new tools appear in all relevant endpoints"""
        new_tools = ['api', 'examples', 'platform', 'tests', 'yaml']
        
        # Check index
        with open(api_dir / 'index.json', 'r') as f:
            index_data = json.load(f)
        index_slugs = [tool['slug'] for tool in index_data['tools']]
        
        # Check search
        with open(api_dir / 'search.json', 'r') as f:
            search_data = json.load(f)
        search_slugs = [entry['slug'] for entry in search_data['index']]
        
        # Check by-type
        with open(api_dir / 'by-type.json', 'r') as f:
            by_type_data = json.load(f)
        type_slugs = []
        for tools in by_type_data['types'].values():
            type_slugs.extend([tool['slug'] for tool in tools])
        
        for new_tool in new_tools:
            assert new_tool in index_slugs, f"{new_tool} should be in index"
            assert new_tool in search_slugs, f"{new_tool} should be in search"
            assert new_tool in type_slugs, f"{new_tool} should be in by-type"


pytestmark = pytest.mark.unit