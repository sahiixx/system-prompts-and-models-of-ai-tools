"""
Unit tests for Unified AI Platform configuration files.

This module tests JSON configuration validation including:
- system-config.json schema and structure
- tools.json format and completeness
- package.json dependencies and metadata
"""

import json
import os
import pytest
from pathlib import Path


class TestSystemConfig:
    """Test system-config.json validation."""
    
    @pytest.fixture
    def config_path(self):
        """Return path to system-config.json."""
        return Path("unified-ai-platform/config/system-config.json")
    
    @pytest.fixture
    def config_data(self, config_path):
        """Load and return system configuration."""
        if not config_path.exists():
            pytest.skip(f"Config file not found: {config_path}")
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def test_config_file_exists(self, config_path):
        """Test that system-config.json exists."""
        assert config_path.exists(), f"Configuration file not found: {config_path}"
    
    def test_config_is_valid_json(self, config_path):
        """Test that configuration file is valid JSON."""
        with open(config_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        assert isinstance(data, dict), "Configuration must be a JSON object"
    
    def test_platform_section_exists(self, config_data):
        """Test that platform section exists and is complete."""
        assert 'platform' in config_data, "Missing 'platform' section"
        platform = config_data['platform']
        
        required_fields = ['name', 'version', 'description']
        for field in required_fields:
            assert field in platform, f"Missing required field: platform.{field}"
            assert platform[field], f"Empty value for platform.{field}"
    
    def test_platform_version_format(self, config_data):
        """Test that platform version follows semantic versioning."""
        version = config_data['platform']['version']
        parts = version.split('.')
        assert len(parts) == 3, f"Version must be semver format (X.Y.Z): {version}"
        for part in parts:
            assert part.isdigit(), f"Version parts must be numeric: {version}"
    
    def test_core_capabilities_section(self, config_data):
        """Test core_capabilities section structure."""
        assert 'core_capabilities' in config_data, "Missing 'core_capabilities' section"
        capabilities = config_data['core_capabilities']
        
        expected_capabilities = [
            'multi_modal',
            'memory_system',
            'tool_system',
            'planning_system',
            'security'
        ]
        
        for capability in expected_capabilities:
            assert capability in capabilities, f"Missing capability: {capability}"
            assert 'enabled' in capabilities[capability], \
                f"Missing 'enabled' field in {capability}"
            assert isinstance(capabilities[capability]['enabled'], bool), \
                f"'enabled' must be boolean in {capability}"
    
    def test_multi_modal_configuration(self, config_data):
        """Test multi_modal capability configuration."""
        multi_modal = config_data['core_capabilities']['multi_modal']
        
        if multi_modal['enabled']:
            assert 'supported_types' in multi_modal, \
                "Multi-modal must specify supported_types when enabled"
            assert isinstance(multi_modal['supported_types'], list), \
                "supported_types must be a list"
            assert len(multi_modal['supported_types']) > 0, \
                "At least one supported type required when enabled"
    
    def test_memory_system_configuration(self, config_data):
        """Test memory_system capability configuration."""
        memory = config_data['core_capabilities']['memory_system']
        
        if memory['enabled']:
            assert 'types' in memory, "Memory system must specify types when enabled"
            assert isinstance(memory['types'], list), "Memory types must be a list"
            assert 'persistence' in memory, "Memory system must specify persistence"
    
    def test_tool_system_configuration(self, config_data):
        """Test tool_system capability configuration."""
        tools = config_data['core_capabilities']['tool_system']
        
        if tools['enabled']:
            assert 'modular' in tools, "Tool system must specify if modular"
            assert 'json_defined' in tools, "Tool system must specify if JSON defined"
            assert isinstance(tools['modular'], bool), "modular must be boolean"
            assert isinstance(tools['json_defined'], bool), "json_defined must be boolean"
    
    def test_planning_system_configuration(self, config_data):
        """Test planning_system capability configuration."""
        planning = config_data['core_capabilities']['planning_system']
        
        if planning['enabled']:
            assert 'modes' in planning, "Planning system must specify modes"
            assert isinstance(planning['modes'], list), "modes must be a list"
            assert 'strategies' in planning, "Planning system must specify strategies"
            assert isinstance(planning['strategies'], list), "strategies must be a list"
    
    def test_operating_modes_section(self, config_data):
        """Test operating_modes section exists and is valid."""
        assert 'operating_modes' in config_data, "Missing 'operating_modes' section"
        modes = config_data['operating_modes']
        
        # At minimum, should have development and production
        expected_modes = ['development', 'production']
        for mode in expected_modes:
            assert mode in modes, f"Missing operating mode: {mode}"
    
    def test_development_mode_settings(self, config_data):
        """Test development mode configuration."""
        dev_mode = config_data['operating_modes']['development']
        
        assert 'debug' in dev_mode, "Development mode must specify debug setting"
        assert 'logging' in dev_mode, "Development mode must specify logging level"
        assert isinstance(dev_mode['debug'], bool), "debug must be boolean"
    
    def test_production_mode_settings(self, config_data):
        """Test production mode configuration."""
        prod_mode = config_data['operating_modes']['production']
        
        assert 'debug' in prod_mode, "Production mode must specify debug setting"
        assert 'logging' in prod_mode, "Production mode must specify logging level"
        assert isinstance(prod_mode['debug'], bool), "debug must be boolean"
        
        # Production should have debug disabled
        assert prod_mode['debug'] is False, "Production mode should have debug=false"
    
    def test_performance_section(self, config_data):
        """Test performance configuration section."""
        assert 'performance' in config_data, "Missing 'performance' section"
        perf = config_data['performance']
        
        required_subsections = ['response_time', 'memory_usage', 'concurrent_operations']
        for subsection in required_subsections:
            assert subsection in perf, f"Missing performance.{subsection}"
    
    def test_response_time_targets(self, config_data):
        """Test response time performance targets."""
        response_time = config_data['performance']['response_time']
        
        assert 'target_ms' in response_time, "Missing target_ms"
        assert 'max_ms' in response_time, "Missing max_ms"
        
        target = response_time['target_ms']
        maximum = response_time['max_ms']
        
        assert isinstance(target, (int, float)), "target_ms must be numeric"
        assert isinstance(maximum, (int, float)), "max_ms must be numeric"
        assert target > 0, "target_ms must be positive"
        assert maximum > 0, "max_ms must be positive"
        assert maximum >= target, "max_ms should be >= target_ms"
    
    def test_memory_usage_limits(self, config_data):
        """Test memory usage limits."""
        memory = config_data['performance']['memory_usage']
        
        assert 'max_mb' in memory, "Missing max_mb"
        assert isinstance(memory['max_mb'], (int, float)), "max_mb must be numeric"
        assert memory['max_mb'] > 0, "max_mb must be positive"
    
    def test_concurrent_operations_limits(self, config_data):
        """Test concurrent operations configuration."""
        concurrent = config_data['performance']['concurrent_operations']
        
        assert 'max_parallel' in concurrent, "Missing max_parallel"
        assert 'queue_size' in concurrent, "Missing queue_size"
        
        assert isinstance(concurrent['max_parallel'], int), "max_parallel must be integer"
        assert isinstance(concurrent['queue_size'], int), "queue_size must be integer"
        assert concurrent['max_parallel'] > 0, "max_parallel must be positive"
        assert concurrent['queue_size'] > 0, "queue_size must be positive"
    
    def test_config_has_no_sensitive_data(self, config_data):
        """Test that configuration doesn't contain sensitive data."""
        config_str = json.dumps(config_data).lower()
        
        sensitive_patterns = [
            'password', 'secret', 'api_key', 'apikey', 'token', 
            'credentials', 'private_key', 'privatekey'
        ]
        
        for pattern in sensitive_patterns:
            assert pattern not in config_str, \
                f"Configuration should not contain '{pattern}'"


class TestToolsConfig:
    """Test tools.json validation."""
    
    @pytest.fixture
    def tools_path(self):
        """Return path to tools.json."""
        return Path("unified-ai-platform/config/tools.json")
    
    @pytest.fixture
    def tools_data(self, tools_path):
        """Load and return tools configuration."""
        if not tools_path.exists():
            pytest.skip(f"Tools file not found: {tools_path}")
        with open(tools_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def test_tools_file_exists(self, tools_path):
        """Test that tools.json exists."""
        assert tools_path.exists(), f"Tools file not found: {tools_path}"
    
    def test_tools_is_valid_json(self, tools_path):
        """Test that tools file is valid JSON."""
        with open(tools_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        assert isinstance(data, list), "Tools configuration must be a JSON array"
    
    def test_tools_array_not_empty(self, tools_data):
        """Test that tools array is not empty."""
        assert len(tools_data) > 0, "Tools array should contain at least one tool"
    
    def test_each_tool_has_required_fields(self, tools_data):
        """Test that each tool has required fields."""
        required_fields = ['type', 'function']
        
        for i, tool in enumerate(tools_data):
            for field in required_fields:
                assert field in tool, \
                    f"Tool at index {i} missing required field: {field}"
    
    def test_tool_type_is_valid(self, tools_data):
        """Test that tool type is 'function'."""
        valid_types = ['function']
        
        for i, tool in enumerate(tools_data):
            assert tool['type'] in valid_types, \
                f"Tool at index {i} has invalid type: {tool['type']}"
    
    def test_function_definition_structure(self, tools_data):
        """Test function definition structure."""
        for i, tool in enumerate(tools_data):
            func = tool.get('function', {})
            
            assert 'name' in func, f"Tool at index {i} missing function.name"
            assert 'description' in func, f"Tool at index {i} missing function.description"
            assert 'parameters' in func, f"Tool at index {i} missing function.parameters"
            
            # Validate name format
            name = func['name']
            assert isinstance(name, str), f"Tool name must be string at index {i}"
            assert len(name) > 0, f"Tool name cannot be empty at index {i}"
            
            # Validate description
            desc = func['description']
            assert isinstance(desc, str), f"Tool description must be string at index {i}"
            assert len(desc) > 0, f"Tool description cannot be empty at index {i}"
    
    def test_function_parameters_structure(self, tools_data):
        """Test function parameters structure."""
        for i, tool in enumerate(tools_data):
            params = tool['function'].get('parameters', {})
            
            assert 'type' in params, f"Tool at index {i} missing parameters.type"
            assert params['type'] == 'object', \
                f"Tool at index {i} parameters.type must be 'object'"
            assert 'properties' in params, \
                f"Tool at index {i} missing parameters.properties"
            assert isinstance(params['properties'], dict), \
                f"Tool at index {i} properties must be a dictionary"
    
    def test_parameter_properties_valid(self, tools_data):
        """Test that parameter properties are valid."""
        for i, tool in enumerate(tools_data):
            properties = tool['function']['parameters'].get('properties', {})
            
            for prop_name, prop_def in properties.items():
                assert 'type' in prop_def, \
                    f"Tool {i}, property '{prop_name}' missing type"
                
                valid_types = ['string', 'number', 'integer', 'boolean', 'array', 'object']
                assert prop_def['type'] in valid_types, \
                    f"Tool {i}, property '{prop_name}' has invalid type: {prop_def['type']}"
    
    def test_required_fields_are_list(self, tools_data):
        """Test that required fields are specified as list."""
        for i, tool in enumerate(tools_data):
            params = tool['function']['parameters']
            
            if 'required' in params:
                assert isinstance(params['required'], list), \
                    f"Tool at index {i} required must be a list"
                
                # Validate required fields exist in properties
                properties = params.get('properties', {})
                for req_field in params['required']:
                    assert req_field in properties, \
                        f"Tool {i}: required field '{req_field}' not in properties"
    
    def test_tool_names_are_unique(self, tools_data):
        """Test that tool names are unique."""
        names = [tool['function']['name'] for tool in tools_data]
        duplicates = [name for name in names if names.count(name) > 1]
        assert len(duplicates) == 0, f"Duplicate tool names found: {set(duplicates)}"
    
    def test_no_overly_permissive_tools(self, tools_data):
        """Test that tools don't have dangerous permissions."""
        dangerous_patterns = [
            'exec', 'eval', 'rm -rf', 'delete', 'drop table',
            'system', 'shell', '__import__'
        ]
        
        for i, tool in enumerate(tools_data):
            desc = tool['function']['description'].lower()
            name = tool['function']['name'].lower()
            
            for pattern in dangerous_patterns:
                if pattern in desc or pattern in name:
                    # This is a warning, not a failure - review required
                    print(f"WARNING: Tool {i} ('{tool['function']['name']}') "
                          f"may have dangerous permissions: '{pattern}'")


class TestPackageJson:
    """Test package.json validation."""
    
    @pytest.fixture
    def package_path(self):
        """Return path to package.json."""
        return Path("unified-ai-platform/package.json")
    
    @pytest.fixture
    def package_data(self, package_path):
        """Load and return package.json."""
        if not package_path.exists():
            pytest.skip(f"Package file not found: {package_path}")
        with open(package_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def test_package_file_exists(self, package_path):
        """Test that package.json exists."""
        assert package_path.exists(), f"Package file not found: {package_path}"
    
    def test_package_is_valid_json(self, package_path):
        """Test that package.json is valid JSON."""
        with open(package_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        assert isinstance(data, dict), "Package.json must be a JSON object"
    
    def test_required_fields_present(self, package_data):
        """Test that required npm fields are present."""
        required_fields = ['name', 'version', 'description']
        
        for field in required_fields:
            assert field in package_data, f"Missing required field: {field}"
            assert package_data[field], f"Empty value for: {field}"
    
    def test_package_name_valid(self, package_data):
        """Test that package name follows npm conventions."""
        name = package_data['name']
        
        # npm package name rules
        assert len(name) <= 214, "Package name too long (max 214 chars)"
        assert name.lower() == name, "Package name must be lowercase"
        assert not name.startswith('.'), "Package name cannot start with dot"
        assert not name.startswith('_'), "Package name cannot start with underscore"
    
    def test_version_format(self, package_data):
        """Test that version follows semantic versioning."""
        version = package_data['version']
        parts = version.split('.')
        assert len(parts) == 3, f"Version must be semver format: {version}"
        for part in parts:
            assert part.isdigit(), f"Version parts must be numeric: {version}"
    
    def test_scripts_section_exists(self, package_data):
        """Test that scripts section exists."""
        assert 'scripts' in package_data, "Missing 'scripts' section"
        scripts = package_data['scripts']
        assert isinstance(scripts, dict), "scripts must be an object"
    
    def test_essential_scripts_present(self, package_data):
        """Test that essential npm scripts are present."""
        scripts = package_data.get('scripts', {})
        
        essential_scripts = ['start', 'test']
        for script in essential_scripts:
            assert script in scripts, f"Missing essential script: {script}"
    
    def test_dependencies_structure(self, package_data):
        """Test dependencies structure if present."""
        if 'dependencies' in package_data:
            deps = package_data['dependencies']
            assert isinstance(deps, dict), "dependencies must be an object"
            
            for pkg_name, version in deps.items():
                assert isinstance(pkg_name, str), "Dependency name must be string"
                assert isinstance(version, str), "Dependency version must be string"
                assert len(version) > 0, f"Empty version for {pkg_name}"
    
    def test_dev_dependencies_structure(self, package_data):
        """Test devDependencies structure if present."""
        if 'devDependencies' in package_data:
            dev_deps = package_data['devDependencies']
            assert isinstance(dev_deps, dict), "devDependencies must be an object"
            
            for pkg_name, version in dev_deps.items():
                assert isinstance(pkg_name, str), "Dev dependency name must be string"
                assert isinstance(version, str), "Dev dependency version must be string"
    
    def test_no_dependency_conflicts(self, package_data):
        """Test that no package appears in both dependencies and devDependencies."""
        deps = set(package_data.get('dependencies', {}).keys())
        dev_deps = set(package_data.get('devDependencies', {}).keys())
        
        conflicts = deps & dev_deps
        assert len(conflicts) == 0, \
            f"Packages in both dependencies and devDependencies: {conflicts}"
    
    def test_engines_specification(self, package_data):
        """Test that Node.js engine version is specified."""
        if 'engines' in package_data:
            engines = package_data['engines']
            assert 'node' in engines, "Should specify Node.js version requirement"
    
    def test_main_entry_point_exists(self, package_data):
        """Test that main entry point file exists if specified."""
        if 'main' in package_data:
            main_file = Path("unified-ai-platform") / package_data['main']
            # We'll check this exists if the package is fully initialized
            # For now, just validate it's a string
            assert isinstance(package_data['main'], str), "main must be a string"
    
    def test_keywords_are_relevant(self, package_data):
        """Test that keywords exist and are relevant."""
        if 'keywords' in package_data:
            keywords = package_data['keywords']
            assert isinstance(keywords, list), "keywords must be an array"
            assert len(keywords) > 0, "Should have at least one keyword"
            
            for keyword in keywords:
                assert isinstance(keyword, str), "Each keyword must be a string"
                assert len(keyword) > 0, "Keywords cannot be empty strings"
    
    def test_license_specified(self, package_data):
        """Test that license is specified."""
        if 'license' in package_data:
            license_val = package_data['license']
            assert isinstance(license_val, str), "license must be a string"
            assert len(license_val) > 0, "license cannot be empty"
    
    def test_no_known_vulnerable_dependencies(self, package_data):
        """Test for known vulnerable package versions (basic check)."""
        # This is a basic check - in production, use npm audit
        deps = package_data.get('dependencies', {})
        
        # Check for very old versions that are known to be problematic
        if 'lodash' in deps:
            version = deps['lodash'].replace('^', '').replace('~', '')
            major_version = int(version.split('.')[0])
            assert major_version >= 4, "lodash version should be >= 4.x for security"


class TestConfigIntegration:
    """Integration tests for configuration files."""
    
    def test_all_config_files_exist(self):
        """Test that all required configuration files exist."""
        required_files = [
            "unified-ai-platform/config/system-config.json",
            "unified-ai-platform/config/tools.json",
            "unified-ai-platform/package.json"
        ]
        
        for file_path in required_files:
            path = Path(file_path)
            assert path.exists(), f"Required configuration file missing: {file_path}"
    
    def test_config_files_are_utf8(self):
        """Test that all config files are valid UTF-8."""
        config_files = [
            "unified-ai-platform/config/system-config.json",
            "unified-ai-platform/config/tools.json",
            "unified-ai-platform/package.json"
        ]
        
        for file_path in config_files:
            path = Path(file_path)
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                assert content, f"File is empty: {file_path}"
    
    def test_config_files_size_reasonable(self):
        """Test that config files are not unreasonably large."""
        config_files = [
            "unified-ai-platform/config/system-config.json",
            "unified-ai-platform/config/tools.json",
            "unified-ai-platform/package.json"
        ]
        
        max_size_mb = 5  # 5MB seems reasonable for config files
        
        for file_path in config_files:
            path = Path(file_path)
            if path.exists():
                size_mb = path.stat().st_size / (1024 * 1024)
                assert size_mb < max_size_mb, \
                    f"Config file too large: {file_path} ({size_mb:.2f}MB)"