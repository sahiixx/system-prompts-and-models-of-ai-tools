"""
Comprehensive unit tests for new JSON tool files
Tests api.json, examples.json, platform.json, tests.json, and yaml.json
"""

import pytest
import json
from pathlib import Path
from datetime import datetime


class TestNewToolJSONFiles:
    """Test suite for newly added tool JSON files"""
    
    @pytest.fixture
    def api_tools_dir(self):
        """Locate the api/tools directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'api' / 'tools'
    
    @pytest.fixture
    def metadata_dir(self):
        """Locate the metadata directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'metadata'
    
    # Test api.json
    def test_api_json_exists(self, api_tools_dir):
        """Test that api.json exists in api/tools"""
        api_json = api_tools_dir / 'api.json'
        assert api_json.exists(), "api.json should exist"
        assert api_json.is_file(), "api.json should be a file"
    
    def test_api_json_valid_json(self, api_tools_dir):
        """Test that api.json is valid JSON"""
        api_json = api_tools_dir / 'api.json'
        try:
            with open(api_json, 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"api.json is not valid JSON: {e}")
    
    def test_api_json_structure(self, api_tools_dir):
        """Test that api.json has required structure"""
        with open(api_tools_dir / 'api.json', 'r') as f:
            data = json.load(f)
        
        # Required top-level fields
        assert 'version' in data, "Should have version field"
        assert 'generated' in data, "Should have generated timestamp"
        assert 'name' in data, "Should have name field"
        assert 'slug' in data, "Should have slug field"
        assert 'type' in data, "Should have type field"
        assert 'description' in data, "Should have description field"
        
        # Verify slug matches filename
        assert data['slug'] == 'api', "Slug should be 'api'"
        assert data['name'] == 'api', "Name should be 'api'"
    
    def test_api_json_version_structure(self, api_tools_dir):
        """Test version field structure in api.json"""
        with open(api_tools_dir / 'api.json', 'r') as f:
            data = json.load(f)
        
        version = data['version']
        assert 'current' in version, "Version should have current"
        assert 'lastUpdated' in version, "Version should have lastUpdated"
        assert 'history' in version, "Version should have history"
        assert isinstance(version['history'], list), "History should be a list"
        assert len(version['history']) > 0, "History should have entries"
    
    # Test examples.json
    def test_examples_json_exists(self, api_tools_dir):
        """Test that examples.json exists"""
        examples_json = api_tools_dir / 'examples.json'
        assert examples_json.exists(), "examples.json should exist"
    
    def test_examples_json_valid_json(self, api_tools_dir):
        """Test that examples.json is valid JSON"""
        try:
            with open(api_tools_dir / 'examples.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"examples.json is not valid JSON: {e}")
    
    def test_examples_json_structure(self, api_tools_dir):
        """Test examples.json structure"""
        with open(api_tools_dir / 'examples.json', 'r') as f:
            data = json.load(f)
        
        assert data['slug'] == 'examples', "Slug should be 'examples'"
        assert data['name'] == 'examples', "Name should be 'examples'"
        assert 'type' in data, "Should have type field"
        assert 'pricing' in data, "Should have pricing field"
        assert 'models' in data, "Should have models field"
        assert 'features' in data, "Should have features field"
        assert 'platforms' in data, "Should have platforms field"
    
    # Test platform.json
    def test_platform_json_exists(self, api_tools_dir):
        """Test that platform.json exists"""
        platform_json = api_tools_dir / 'platform.json'
        assert platform_json.exists(), "platform.json should exist"
    
    def test_platform_json_valid_json(self, api_tools_dir):
        """Test that platform.json is valid JSON"""
        try:
            with open(api_tools_dir / 'platform.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"platform.json is not valid JSON: {e}")
    
    def test_platform_json_structure(self, api_tools_dir):
        """Test platform.json structure"""
        with open(api_tools_dir / 'platform.json', 'r') as f:
            data = json.load(f)
        
        assert data['slug'] == 'platform', "Slug should be 'platform'"
        assert data['name'] == 'platform', "Name should be 'platform'"
        assert 'documentation' in data, "Should have documentation field"
        assert 'links' in data, "Should have links field"
        assert 'tags' in data, "Should have tags field"
        assert isinstance(data['tags'], list), "Tags should be a list"
    
    # Test tests.json
    def test_tests_json_exists(self, api_tools_dir):
        """Test that tests.json exists"""
        tests_json = api_tools_dir / 'tests.json'
        assert tests_json.exists(), "tests.json should exist"
    
    def test_tests_json_valid_json(self, api_tools_dir):
        """Test that tests.json is valid JSON"""
        try:
            with open(api_tools_dir / 'tests.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"tests.json is not valid JSON: {e}")
    
    def test_tests_json_structure(self, api_tools_dir):
        """Test tests.json structure"""
        with open(api_tools_dir / 'tests.json', 'r') as f:
            data = json.load(f)
        
        assert data['slug'] == 'tests', "Slug should be 'tests'"
        assert data['name'] == 'tests', "Name should be 'tests'"
        assert data['type'] == 'IDE Plugin', "Should be IDE Plugin type"
        assert data['status'] == 'active', "Should have active status"
    
    # Test yaml.json
    def test_yaml_json_exists(self, api_tools_dir):
        """Test that yaml.json exists"""
        yaml_json = api_tools_dir / 'yaml.json'
        assert yaml_json.exists(), "yaml.json should exist"
    
    def test_yaml_json_valid_json(self, api_tools_dir):
        """Test that yaml.json is valid JSON"""
        try:
            with open(api_tools_dir / 'yaml.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"yaml.json is not valid JSON: {e}")
    
    def test_yaml_json_structure(self, api_tools_dir):
        """Test yaml.json structure"""
        with open(api_tools_dir / 'yaml.json', 'r') as f:
            data = json.load(f)
        
        assert data['slug'] == 'yaml', "Slug should be 'yaml'"
        assert 'version' in data, "Should have version tracking"
        assert 'generated' in data, "Should have generation timestamp"


class TestNewToolMetadata:
    """Test suite for metadata files of new tools"""
    
    @pytest.fixture
    def metadata_dir(self):
        """Locate the metadata directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'metadata'
    
    def test_api_metadata_exists(self, metadata_dir):
        """Test that api metadata exists"""
        api_metadata = metadata_dir / 'api.json'
        assert api_metadata.exists(), "api.json metadata should exist"
    
    def test_api_metadata_valid_json(self, metadata_dir):
        """Test that api metadata is valid JSON"""
        try:
            with open(metadata_dir / 'api.json', 'r') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            pytest.fail(f"api.json metadata is not valid JSON: {e}")
    
    def test_examples_metadata_exists(self, metadata_dir):
        """Test that examples metadata exists"""
        examples_metadata = metadata_dir / 'examples.json'
        assert examples_metadata.exists(), "examples.json metadata should exist"
    
    def test_platform_metadata_exists(self, metadata_dir):
        """Test that platform metadata exists"""
        platform_metadata = metadata_dir / 'platform.json'
        assert platform_metadata.exists(), "platform.json metadata should exist"
    
    def test_tests_metadata_exists(self, metadata_dir):
        """Test that tests metadata exists"""
        tests_metadata = metadata_dir / 'tests.json'
        assert tests_metadata.exists(), "tests.json metadata should exist"
    
    def test_yaml_metadata_exists(self, metadata_dir):
        """Test that yaml metadata exists"""
        yaml_metadata = metadata_dir / 'yaml.json'
        assert yaml_metadata.exists(), "yaml.json metadata should exist"
    
    def test_metadata_consistency(self, metadata_dir):
        """Test that metadata files are consistent with tool files"""
        metadata_files = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for filename in metadata_files:
            with open(metadata_dir / filename, 'r') as f:
                metadata = json.load(f)
            
            slug = filename.replace('.json', '')
            assert metadata['slug'] == slug, f"Metadata slug should match filename for {filename}"


class TestJSONToolConsistency:
    """Test consistency across tool JSON files"""
    
    @pytest.fixture
    def api_tools_dir(self):
        """Locate the api/tools directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'api' / 'tools'
    
    def test_all_new_tools_have_required_fields(self, api_tools_dir):
        """Test that all new tool files have required fields"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        required_fields = ['version', 'generated', 'name', 'slug', 'type', 'status', 'description']
        
        for tool_file in new_tools:
            with open(api_tools_dir / tool_file, 'r') as f:
                data = json.load(f)
            
            for field in required_fields:
                assert field in data, f"{tool_file} should have {field} field"
    
    def test_all_new_tools_have_pricing(self, api_tools_dir):
        """Test that all new tools have pricing information"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for tool_file in new_tools:
            with open(api_tools_dir / tool_file, 'r') as f:
                data = json.load(f)
            
            assert 'pricing' in data, f"{tool_file} should have pricing field"
            pricing = data['pricing']
            assert 'model' in pricing, f"{tool_file} pricing should have model"
            assert 'tiers' in pricing, f"{tool_file} pricing should have tiers"
            assert isinstance(pricing['tiers'], list), f"{tool_file} pricing tiers should be a list"
    
    def test_all_new_tools_have_models(self, api_tools_dir):
        """Test that all new tools have models information"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for tool_file in new_tools:
            with open(api_tools_dir / tool_file, 'r') as f:
                data = json.load(f)
            
            assert 'models' in data, f"{tool_file} should have models field"
            models = data['models']
            assert 'primary' in models, f"{tool_file} models should have primary"
            assert 'supported' in models, f"{tool_file} models should have supported"
            assert isinstance(models['supported'], list), f"{tool_file} supported models should be a list"
    
    def test_all_new_tools_have_platforms(self, api_tools_dir):
        """Test that all new tools have platforms information"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for tool_file in new_tools:
            with open(api_tools_dir / tool_file, 'r') as f:
                data = json.load(f)
            
            assert 'platforms' in data, f"{tool_file} should have platforms field"
            platforms = data['platforms']
            assert isinstance(platforms, dict), f"{tool_file} platforms should be a dict"
            # Check for common platform flags
            common_platforms = ['vscode', 'jetbrains', 'web', 'cli', 'standalone']
            for platform in common_platforms:
                assert platform in platforms, f"{tool_file} should have {platform} platform flag"
    
    def test_all_new_tools_have_documentation(self, api_tools_dir):
        """Test that all new tools have documentation information"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for tool_file in new_tools:
            with open(api_tools_dir / tool_file, 'r') as f:
                data = json.load(f)
            
            assert 'documentation' in data, f"{tool_file} should have documentation field"
            docs = data['documentation']
            assert 'folder' in docs, f"{tool_file} documentation should have folder"
            assert 'files' in docs, f"{tool_file} documentation should have files"
    
    def test_generated_timestamp_format(self, api_tools_dir):
        """Test that generated timestamps are in ISO format"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for tool_file in new_tools:
            with open(api_tools_dir / tool_file, 'r') as f:
                data = json.load(f)
            
            timestamp = data['generated']
            try:
                # Try to parse as ISO datetime
                datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                pytest.fail(f"{tool_file} has invalid timestamp format: {timestamp}")
    
    def test_version_tracking_consistency(self, api_tools_dir):
        """Test that version tracking is consistent across new tools"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for tool_file in new_tools:
            with open(api_tools_dir / tool_file, 'r') as f:
                data = json.load(f)
            
            version = data['version']
            assert version['current'] == '1.0', f"{tool_file} should have version 1.0"
            assert version['lastUpdated'] == '2025-01-02', f"{tool_file} should have consistent date"
            
            history = version['history']
            assert len(history) == 1, f"{tool_file} should have one history entry"
            assert history[0]['version'] == '1.0', f"{tool_file} history should match current version"


class TestJSONEdgeCases:
    """Test edge cases and error conditions for JSON files"""
    
    @pytest.fixture
    def api_tools_dir(self):
        """Locate the api/tools directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / 'api' / 'tools'
    
    def test_json_files_not_empty(self, api_tools_dir):
        """Test that JSON files are not empty"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for tool_file in new_tools:
            file_path = api_tools_dir / tool_file
            assert file_path.stat().st_size > 0, f"{tool_file} should not be empty"
    
    def test_json_files_utf8_encoded(self, api_tools_dir):
        """Test that JSON files are properly UTF-8 encoded"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for tool_file in new_tools:
            try:
                with open(api_tools_dir / tool_file, 'r', encoding='utf-8') as f:
                    f.read()
            except UnicodeDecodeError:
                pytest.fail(f"{tool_file} is not properly UTF-8 encoded")
    
    def test_no_trailing_commas(self, api_tools_dir):
        """Test that JSON files don't have trailing commas"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for tool_file in new_tools:
            with open(api_tools_dir / tool_file, 'r') as f:
                content = f.read()
            
            # Check for common trailing comma patterns
            assert ',\n}' not in content, f"{tool_file} should not have trailing comma before closing brace"
            assert ',\n]' not in content, f"{tool_file} should not have trailing comma before closing bracket"
    
    def test_json_indentation_consistent(self, api_tools_dir):
        """Test that JSON files have consistent indentation"""
        new_tools = ['api.json', 'examples.json', 'platform.json', 'tests.json', 'yaml.json']
        
        for tool_file in new_tools:
            with open(api_tools_dir / tool_file, 'r') as f:
                content = f.read()
            
            # Check that indentation is used (not minified)
            lines = content.split('\n')
            indented_lines = [line for line in lines if line.startswith('  ')]
            assert len(indented_lines) > 0, f"{tool_file} should use indentation"


pytestmark = pytest.mark.unit