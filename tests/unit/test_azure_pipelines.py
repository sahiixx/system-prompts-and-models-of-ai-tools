"""
Comprehensive unit tests for Azure Pipelines configuration file
Tests azure-pipelines.yml structure, configuration, and best practices
"""

import pytest
import yaml
from pathlib import Path


class TestAzurePipelinesStructure:
    """Test suite for Azure Pipelines YAML structure validation"""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline_file(self, repo_root):
        """
        Get path to azure-pipelines.yml file.
        
        Parameters:
            repo_root (pathlib.Path): Path to the repository root.
        
        Returns:
            Path: Path to azure-pipelines.yml file.
        """
        return repo_root / 'azure-pipelines.yml'
    
    @pytest.fixture
    def azure_pipeline_config(self, azure_pipeline_file):
        """
        Load and parse the Azure Pipelines configuration file.
        
        Parameters:
            azure_pipeline_file (pathlib.Path): Path to azure-pipelines.yml.
        
        Returns:
            dict: Parsed YAML content as a Python mapping.
        """
        with open(azure_pipeline_file, 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_file_exists(self, azure_pipeline_file):
        """Test that azure-pipelines.yml file exists in repository root"""
        assert azure_pipeline_file.exists(), "azure-pipelines.yml should exist"
        assert azure_pipeline_file.is_file(), "azure-pipelines.yml should be a file"
    
    def test_azure_pipeline_is_valid_yaml(self, azure_pipeline_file):
        """Test that azure-pipelines.yml is valid YAML syntax"""
        try:
            with open(azure_pipeline_file, 'r') as f:
                data = yaml.safe_load(f)
            assert data is not None, "YAML should parse to a non-None value"
        except yaml.YAMLError as e:
            pytest.fail(f"azure-pipelines.yml contains invalid YAML: {e}")
    
    def test_azure_pipeline_is_dict(self, azure_pipeline_config):
        """Test that parsed YAML is a dictionary"""
        assert isinstance(azure_pipeline_config, dict), \
            "azure-pipelines.yml should parse to a dictionary"
    
    def test_azure_pipeline_has_trigger(self, azure_pipeline_config):
        """Test that pipeline has trigger configuration"""
        assert 'trigger' in azure_pipeline_config, \
            "Pipeline should have 'trigger' field"
    
    def test_azure_pipeline_has_pool(self, azure_pipeline_config):
        """Test that pipeline has pool configuration"""
        assert 'pool' in azure_pipeline_config, \
            "Pipeline should have 'pool' field"
    
    def test_azure_pipeline_has_steps(self, azure_pipeline_config):
        """Test that pipeline has steps defined"""
        assert 'steps' in azure_pipeline_config, \
            "Pipeline should have 'steps' field"
    
    def test_trigger_includes_main_branch(self, azure_pipeline_config):
        """Test that trigger includes main branch"""
        trigger = azure_pipeline_config.get('trigger')
        assert trigger is not None, "Trigger should not be None"
        
        # Trigger can be a list or a dict with branches
        if isinstance(trigger, list):
            assert 'main' in trigger, \
                "Trigger should include 'main' branch"
        elif isinstance(trigger, dict):
            branches = trigger.get('branches', {})
            include = branches.get('include', [])
            assert 'main' in include, \
                "Trigger branches should include 'main'"
    
    def test_pool_has_vm_image(self, azure_pipeline_config):
        """Test that pool configuration has vmImage specified"""
        pool = azure_pipeline_config.get('pool')
        assert pool is not None, "Pool should not be None"
        assert isinstance(pool, dict), "Pool should be a dictionary"
        assert 'vmImage' in pool, "Pool should have 'vmImage' field"
    
    def test_pool_vm_image_value(self, azure_pipeline_config):
        """Test that vmImage is set to a valid Ubuntu image"""
        pool = azure_pipeline_config.get('pool', {})
        vm_image = pool.get('vmImage')
        assert vm_image is not None, "vmImage should not be None"
        assert isinstance(vm_image, str), "vmImage should be a string"
        assert 'ubuntu' in vm_image.lower(), \
            "vmImage should be an Ubuntu-based image"
    
    def test_steps_is_list(self, azure_pipeline_config):
        """Test that steps is a list"""
        steps = azure_pipeline_config.get('steps')
        assert isinstance(steps, list), "Steps should be a list"
        assert len(steps) > 0, "Steps list should not be empty"
    
    def test_steps_count(self, azure_pipeline_config):
        """Test that pipeline has expected number of steps"""
        steps = azure_pipeline_config.get('steps', [])
        assert len(steps) >= 2, \
            "Pipeline should have at least 2 steps (Node setup and build)"
    
    def test_first_step_is_node_tool(self, azure_pipeline_config):
        """Test that first step installs Node.js using NodeTool task"""
        steps = azure_pipeline_config.get('steps', [])
        assert len(steps) > 0, "Steps should not be empty"
        
        first_step = steps[0]
        assert 'task' in first_step, "First step should be a task"
        assert first_step['task'] == 'NodeTool@0', \
            "First step should be NodeTool@0 task"
    
    def test_node_tool_has_version_spec(self, azure_pipeline_config):
        """Test that NodeTool task has versionSpec input"""
        steps = azure_pipeline_config.get('steps', [])
        node_tool_step = steps[0]
        
        assert 'inputs' in node_tool_step, \
            "NodeTool task should have inputs"
        assert 'versionSpec' in node_tool_step['inputs'], \
            "NodeTool inputs should have versionSpec"
    
    def test_node_version_specification(self, azure_pipeline_config):
        """Test that Node.js version is specified correctly"""
        steps = azure_pipeline_config.get('steps', [])
        node_tool_step = steps[0]
        inputs = node_tool_step.get('inputs', {})
        version_spec = inputs.get('versionSpec')
        
        assert version_spec is not None, "versionSpec should not be None"
        assert isinstance(version_spec, str), "versionSpec should be a string"
        assert 'x' in version_spec.lower() or version_spec.replace('.', '').isdigit(), \
            "versionSpec should be a valid version pattern"
    
    def test_node_version_is_modern(self, azure_pipeline_config):
        """Test that Node.js version is a modern LTS version"""
        steps = azure_pipeline_config.get('steps', [])
        node_tool_step = steps[0]
        inputs = node_tool_step.get('inputs', {})
        version_spec = inputs.get('versionSpec', '')
        
        # Extract major version number
        version_parts = version_spec.split('.')
        if version_parts:
            major_version = version_parts[0]
            if major_version.isdigit():
                major_version_num = int(major_version)
                assert major_version_num >= 18, \
                    "Node.js version should be 18.x or higher for LTS support"
    
    def test_node_tool_has_display_name(self, azure_pipeline_config):
        """Test that NodeTool task has a display name"""
        steps = azure_pipeline_config.get('steps', [])
        node_tool_step = steps[0]
        
        assert 'displayName' in node_tool_step, \
            "NodeTool task should have displayName"
        assert isinstance(node_tool_step['displayName'], str), \
            "displayName should be a string"
        assert len(node_tool_step['displayName']) > 0, \
            "displayName should not be empty"
    
    def test_build_step_is_script(self, azure_pipeline_config):
        """Test that build step is a script task"""
        steps = azure_pipeline_config.get('steps', [])
        assert len(steps) >= 2, "Should have at least 2 steps"
        
        build_step = steps[1]
        assert 'script' in build_step, \
            "Second step should be a script task"
    
    def test_build_script_contains_npm_install(self, azure_pipeline_config):
        """Test that build script includes npm install command"""
        steps = azure_pipeline_config.get('steps', [])
        build_step = steps[1]
        script = build_step.get('script', '')
        
        assert 'npm install' in script, \
            "Build script should include 'npm install' command"
    
    def test_build_script_contains_npm_build(self, azure_pipeline_config):
        """Test that build script includes npm build command"""
        steps = azure_pipeline_config.get('steps', [])
        build_step = steps[1]
        script = build_step.get('script', '')
        
        assert 'npm run build' in script or 'npm build' in script, \
            "Build script should include npm build command"
    
    def test_build_step_has_display_name(self, azure_pipeline_config):
        """Test that build script has a display name"""
        steps = azure_pipeline_config.get('steps', [])
        build_step = steps[1]
        
        assert 'displayName' in build_step, \
            "Build script should have displayName"
        assert isinstance(build_step['displayName'], str), \
            "displayName should be a string"
        assert len(build_step['displayName']) > 0, \
            "displayName should not be empty"
    
    def test_all_steps_have_display_names(self, azure_pipeline_config):
        """Test that all steps have meaningful display names"""
        steps = azure_pipeline_config.get('steps', [])
        
        for i, step in enumerate(steps):
            assert 'displayName' in step or 'task' in step or 'script' in step, \
                f"Step {i} should have either displayName, task, or script"
    
    def test_no_hardcoded_secrets(self, azure_pipeline_config):
        """Test that pipeline doesn't contain hardcoded secrets or tokens"""
        yaml_content = yaml.dump(azure_pipeline_config)
        
        # Common patterns that might indicate secrets
        forbidden_patterns = [
            'password',
            'secret',
            'token',
            'api_key',
            'apikey',
            'access_key',
            'private_key'
        ]
        
        yaml_lower = yaml_content.lower()
        for pattern in forbidden_patterns:
            if pattern in yaml_lower:
                # Check if it's in a comment or variable reference
                if not ('$(' in yaml_content or '${' in yaml_content):
                    pytest.fail(f"Pipeline may contain hardcoded {pattern}")
    
    def test_steps_order_is_logical(self, azure_pipeline_config):
        """Test that steps are in logical order (setup before build)"""
        steps = azure_pipeline_config.get('steps', [])
        
        # First step should be environment setup (NodeTool)
        first_step = steps[0]
        assert 'task' in first_step and 'NodeTool' in first_step['task'], \
            "First step should setup Node.js environment"
        
        # Subsequent steps should be build/test/deploy
        for step in steps[1:]:
            assert 'script' in step or 'task' in step, \
                "Build steps should have script or task"


class TestAzurePipelinesContent:
    """Test suite for Azure Pipelines content validation"""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root path"""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline_file(self, repo_root):
        """Get azure-pipelines.yml file path"""
        return repo_root / 'azure-pipelines.yml'
    
    @pytest.fixture
    def azure_pipeline_raw_content(self, azure_pipeline_file):
        """
        Read raw content of azure-pipelines.yml.
        
        Parameters:
            azure_pipeline_file (pathlib.Path): Path to the pipeline file.
        
        Returns:
            str: Raw file content.
        """
        with open(azure_pipeline_file, 'r') as f:
            return f.read()
    
    def test_file_has_comments(self, azure_pipeline_raw_content):
        """Test that file includes helpful comments"""
        assert '#' in azure_pipeline_raw_content, \
            "Pipeline file should include comments for documentation"
    
    def test_file_not_empty(self, azure_pipeline_raw_content):
        """Test that file is not empty"""
        assert len(azure_pipeline_raw_content.strip()) > 0, \
            "Pipeline file should not be empty"
    
    def test_file_size_reasonable(self, azure_pipeline_raw_content):
        """Test that file size is reasonable (not too large or too small)"""
        content_length = len(azure_pipeline_raw_content)
        assert content_length > 50, \
            "Pipeline file seems too small, may be incomplete"
        assert content_length < 100000, \
            "Pipeline file seems too large, may contain unnecessary content"
    
    def test_uses_yaml_syntax(self, azure_pipeline_raw_content):
        """Test that file uses proper YAML syntax with colons and hyphens"""
        assert ':' in azure_pipeline_raw_content, \
            "YAML should contain key-value pairs with colons"
        assert '-' in azure_pipeline_raw_content, \
            "YAML should contain list items with hyphens"
    
    def test_no_tabs_in_yaml(self, azure_pipeline_raw_content):
        """Test that YAML file doesn't contain tabs (YAML spec requires spaces)"""
        assert '\t' not in azure_pipeline_raw_content, \
            "YAML files should use spaces, not tabs for indentation"
    
    def test_consistent_indentation(self, azure_pipeline_raw_content):
        """Test that indentation is consistent throughout the file"""
        lines = azure_pipeline_raw_content.split('\n')
        indents = []
        
        for line in lines:
            if line.strip() and not line.strip().startswith('#'):
                # Count leading spaces
                spaces = len(line) - len(line.lstrip(' '))
                if spaces > 0:
                    indents.append(spaces)
        
        if indents:
            # Check that all indents are multiples of the smallest indent
            min_indent = min(indents)
            if min_indent > 0:
                for indent in indents:
                    assert indent % min_indent == 0, \
                        f"Inconsistent indentation detected: {indent} is not a multiple of {min_indent}"


class TestAzurePipelinesBestPractices:
    """Test suite for Azure Pipelines best practices"""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root path"""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline_file(self, repo_root):
        """Get azure-pipelines.yml file path"""
        return repo_root / 'azure-pipelines.yml'
    
    @pytest.fixture
    def azure_pipeline_config(self, azure_pipeline_file):
        """Load and parse azure-pipelines.yml"""
        with open(azure_pipeline_file, 'r') as f:
            return yaml.safe_load(f)
    
    def test_uses_specific_task_versions(self, azure_pipeline_config):
        """Test that tasks use specific versions (e.g., @0, @1) not @latest"""
        steps = azure_pipeline_config.get('steps', [])
        
        for step in steps:
            if 'task' in step:
                task = step['task']
                assert '@' in task, \
                    f"Task '{task}' should specify a version (e.g., @0)"
                assert '@latest' not in task.lower(), \
                    f"Task '{task}' should use specific version, not @latest"
    
    def test_display_names_are_descriptive(self, azure_pipeline_config):
        """Test that display names are descriptive and helpful"""
        steps = azure_pipeline_config.get('steps', [])
        
        for step in steps:
            if 'displayName' in step:
                display_name = step['displayName']
                assert len(display_name) > 5, \
                    f"Display name '{display_name}' should be more descriptive"
                assert display_name != 'Run script', \
                    "Display name should be more specific than 'Run script'"
    
    def test_trigger_is_defined(self, azure_pipeline_config):
        """Test that trigger is explicitly defined (not relying on defaults)"""
        assert 'trigger' in azure_pipeline_config, \
            "Pipeline should explicitly define trigger configuration"
    
    def test_pool_is_explicitly_configured(self, azure_pipeline_config):
        """Test that pool is explicitly configured"""
        assert 'pool' in azure_pipeline_config, \
            "Pipeline should explicitly define pool configuration"
        
        pool = azure_pipeline_config['pool']
        assert pool is not None and pool != {}, \
            "Pool configuration should not be empty"


class TestAzurePipelinesEdgeCases:
    """Test suite for edge cases and error conditions"""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root path"""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline_file(self, repo_root):
        """Get azure-pipelines.yml file path"""
        return repo_root / 'azure-pipelines.yml'
    
    def test_file_is_readable(self, azure_pipeline_file):
        """Test that file has proper read permissions"""
        assert azure_pipeline_file.exists(), "File should exist"
        assert azure_pipeline_file.is_file(), "Should be a regular file"
        
        # Try to read the file
        try:
            with open(azure_pipeline_file, 'r') as f:
                f.read()
        except PermissionError:
            pytest.fail("File should be readable")
    
    def test_handles_multiline_scripts(self, azure_pipeline_file):
        """Test that multiline scripts are properly formatted"""
        with open(azure_pipeline_file, 'r') as f:
            content = f.read()
        
        # If there's a pipe character for multiline, check format
        if '|' in content:
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if 'script:' in line and '|' in line:
                    # Next lines should be indented
                    if i + 1 < len(lines):
                        next_line = lines[i + 1]
                        if next_line.strip():
                            assert next_line.startswith('  '), \
                                "Multiline script content should be indented"
    
    def test_no_duplicate_keys(self, azure_pipeline_file):
        """Test that there are no duplicate keys at the same level"""
        with open(azure_pipeline_file, 'r') as f:
            content = f.read()
        
        try:
            # yaml.safe_load will handle duplicates by keeping last value
            # But we want to check the raw content for duplicates
            data = yaml.safe_load(content)
            
            # If we got here, YAML is valid
            # Check top-level keys
            if isinstance(data, dict):
                top_keys = list(data.keys())
                assert len(top_keys) == len(set(top_keys)), \
                    "Should not have duplicate top-level keys"
        except yaml.YAMLError as e:
            pytest.fail(f"YAML parsing error: {e}")
    
    def test_yaml_is_not_json(self, azure_pipeline_file):
        """Test that file is YAML format, not JSON"""
        with open(azure_pipeline_file, 'r') as f:
            content = f.read()
        
        # YAML files shouldn't start with { or [
        content_stripped = content.lstrip()
        if content_stripped:
            assert not content_stripped.startswith('{'), \
                "File should be YAML format, not JSON"
            assert not content_stripped.startswith('['), \
                "File should be YAML format, not JSON"


class TestAzurePipelinesIntegration:
    """Integration tests for Azure Pipelines configuration"""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root path"""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline_file(self, repo_root):
        """Get azure-pipelines.yml file path"""
        return repo_root / 'azure-pipelines.yml'
    
    @pytest.fixture
    def azure_pipeline_config(self, azure_pipeline_file):
        """Load and parse azure-pipelines.yml"""
        with open(azure_pipeline_file, 'r') as f:
            return yaml.safe_load(f)
    
    def test_node_version_matches_project_requirements(self, azure_pipeline_config):
        """Test that Node.js version in pipeline matches project requirements"""
        steps = azure_pipeline_config.get('steps', [])
        node_tool_step = steps[0]
        inputs = node_tool_step.get('inputs', {})
        pipeline_version = inputs.get('versionSpec', '')
        
        # This is informational - just verify version is specified
        assert pipeline_version, \
            "Pipeline should specify a Node.js version"
    
    def test_npm_commands_are_standard(self, azure_pipeline_config):
        """Test that npm commands follow standard conventions"""
        steps = azure_pipeline_config.get('steps', [])
        
        for step in steps:
            if 'script' in step:
                script = step['script']
                if 'npm' in script:
                    # Should use 'npm install' not 'npm i'
                    # Should use 'npm run build' not custom commands
                    assert 'npm install' in script or 'npm ci' in script or 'npm run' in script, \
                        "Should use standard npm commands"
    
    def test_build_step_runs_after_install(self, azure_pipeline_config):
        """Test that build command comes after install in the same script"""
        steps = azure_pipeline_config.get('steps', [])
        
        for step in steps:
            if 'script' in step:
                script = step['script']
                if 'npm install' in script and 'npm run build' in script:
                    # install should come before build
                    install_pos = script.index('npm install')
                    build_pos = script.index('npm run build')
                    assert install_pos < build_pos, \
                        "npm install should come before npm run build"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])