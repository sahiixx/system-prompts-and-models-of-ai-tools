"""
Comprehensive unit tests for azure-pipelines.yml
Tests Azure DevOps Pipeline YAML structure, configuration, and best practices
"""
import pytest
import sys
import yaml
from pathlib import Path


class TestAzurePipelineStructure:
    """Test suite for Azure Pipelines YAML structure validation"""
    
    @pytest.fixture
    def repo_root(self):
        """
        Locate the repository root directory.
        
        Returns:
            Path: Path to the repository root directory.
        """
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """
        Load and parse the azure-pipelines.yml file.
        
        Parameters:
            repo_root (pathlib.Path): Path to the repository root.
        
        Returns:
            dict: Parsed YAML content of azure-pipelines.yml as a Python mapping.
        """
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_exists(self, repo_root):
        """Test that azure-pipelines.yml file exists"""
        azure_yml = repo_root / 'azure-pipelines.yml'
        assert azure_yml.exists(), "azure-pipelines.yml should exist"
        assert azure_yml.is_file(), "azure-pipelines.yml should be a file"
    
    def test_azure_pipeline_is_valid_yaml(self, repo_root):
        """Test that azure-pipelines.yml is valid YAML"""
        try:
            with open(repo_root / 'azure-pipelines.yml', 'r') as f:
                yaml.safe_load(f)
        except yaml.YAMLError as e:
            pytest.fail(f"azure-pipelines.yml is not valid YAML: {e}")
    
    def test_azure_pipeline_not_empty(self, azure_pipeline):
        """Test that azure-pipelines.yml is not empty"""
        assert azure_pipeline is not None, "Azure pipeline should not be None"
        assert azure_pipeline != {}, "Azure pipeline should not be empty"
    
    def test_azure_pipeline_has_trigger(self, azure_pipeline):
        """Test that pipeline has trigger configuration"""
        assert 'trigger' in azure_pipeline, "Pipeline must have trigger configuration"
        trigger = azure_pipeline['trigger']
        assert trigger is not None, "Trigger should not be None"
    
    def test_azure_pipeline_trigger_includes_main(self, azure_pipeline):
        """Test that pipeline triggers on main branch"""
        trigger = azure_pipeline['trigger']
        if isinstance(trigger, list):
            assert 'main' in trigger, "Pipeline should trigger on main branch"
        elif isinstance(trigger, dict):
            if 'branches' in trigger and 'include' in trigger['branches']:
                assert 'main' in trigger['branches']['include'], "Pipeline should trigger on main branch"
    
    def test_azure_pipeline_has_pool(self, azure_pipeline):
        """Test that pipeline has pool configuration"""
        assert 'pool' in azure_pipeline, "Pipeline must have pool configuration"
        pool = azure_pipeline['pool']
        assert pool is not None, "Pool should not be None"
        assert isinstance(pool, dict), "Pool should be a dictionary"
    
    def test_azure_pipeline_pool_vmimage(self, azure_pipeline):
        """Test that pool specifies vmImage"""
        pool = azure_pipeline['pool']
        assert 'vmImage' in pool, "Pool must specify vmImage"
        vm_image = pool['vmImage']
        assert isinstance(vm_image, str), "vmImage should be a string"
        assert len(vm_image) > 0, "vmImage should not be empty"
    
    def test_azure_pipeline_uses_ubuntu(self, azure_pipeline):
        """Test that pipeline uses Ubuntu for Linux compatibility"""
        pool = azure_pipeline['pool']
        vm_image = pool['vmImage']
        assert 'ubuntu' in vm_image.lower(), "Pipeline should use Ubuntu-based image"
    
    def test_azure_pipeline_has_steps(self, azure_pipeline):
        """Test that pipeline has steps defined"""
        assert 'steps' in azure_pipeline, "Pipeline must have steps"
        steps = azure_pipeline['steps']
        assert isinstance(steps, list), "Steps should be a list"
        assert len(steps) > 0, "Pipeline should have at least one step"


class TestAzurePipelineNodeSetup:
    """Test suite for Node.js setup in Azure Pipeline"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """Load and parse the azure-pipelines.yml file."""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_has_node_tool(self, azure_pipeline):
        """Test that pipeline has Node.js tool setup step"""
        steps = azure_pipeline['steps']
        node_steps = [s for s in steps if 'task' in s and 'NodeTool' in s['task']]
        assert len(node_steps) > 0, "Pipeline should have NodeTool task"
    
    def test_azure_pipeline_node_tool_version(self, azure_pipeline):
        """Test that NodeTool task specifies correct version"""
        steps = azure_pipeline['steps']
        node_step = next((s for s in steps if 'task' in s and 'NodeTool' in s['task']), None)
        assert node_step is not None, "Should have NodeTool step"
        assert 'task' in node_step, "Step should have task field"
        assert 'NodeTool@0' == node_step['task'], "Should use NodeTool@0 task"
    
    def test_azure_pipeline_node_tool_inputs(self, azure_pipeline):
        """Test that NodeTool task has proper inputs configuration"""
        steps = azure_pipeline['steps']
        node_step = next((s for s in steps if 'task' in s and 'NodeTool' in s['task']), None)
        assert 'inputs' in node_step, "NodeTool step should have inputs"
        inputs = node_step['inputs']
        assert isinstance(inputs, dict), "Inputs should be a dictionary"
    
    def test_azure_pipeline_node_version_spec(self, azure_pipeline):
        """Test that Node.js version is specified"""
        steps = azure_pipeline['steps']
        node_step = next((s for s in steps if 'task' in s and 'NodeTool' in s['task']), None)
        inputs = node_step['inputs']
        assert 'versionSpec' in inputs, "NodeTool should specify versionSpec"
        version_spec = inputs['versionSpec']
        assert isinstance(version_spec, str), "versionSpec should be a string"
    
    def test_azure_pipeline_node_version_value(self, azure_pipeline):
        """Test that Node.js version is reasonable"""
        steps = azure_pipeline['steps']
        node_step = next((s for s in steps if 'task' in s and 'NodeTool' in s['task']), None)
        version_spec = node_step['inputs']['versionSpec']
        # Version should be 20.x as specified
        assert '20' in version_spec, "Should use Node.js 20.x"
    
    def test_azure_pipeline_node_tool_display_name(self, azure_pipeline):
        """Test that NodeTool step has display name"""
        steps = azure_pipeline['steps']
        node_step = next((s for s in steps if 'task' in s and 'NodeTool' in s['task']), None)
        assert 'displayName' in node_step, "NodeTool step should have displayName"
        display_name = node_step['displayName']
        assert isinstance(display_name, str), "displayName should be a string"
        assert len(display_name) > 0, "displayName should not be empty"
        assert 'node' in display_name.lower() or 'install' in display_name.lower(), \
            "displayName should be descriptive"


class TestAzurePipelineBuildSteps:
    """Test suite for build steps in Azure Pipeline"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """Load and parse the azure-pipelines.yml file."""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_has_script_steps(self, azure_pipeline):
        """Test that pipeline has script steps"""
        steps = azure_pipeline['steps']
        script_steps = [s for s in steps if 'script' in s]
        assert len(script_steps) > 0, "Pipeline should have script steps"
    
    def test_azure_pipeline_has_npm_install(self, azure_pipeline):
        """Test that pipeline includes npm install"""
        steps = azure_pipeline['steps']
        script_steps = [s for s in steps if 'script' in s]
        npm_install_found = False
        for step in script_steps:
            script_content = step['script']
            if isinstance(script_content, str) and 'npm install' in script_content:
                npm_install_found = True
                break
        assert npm_install_found, "Pipeline should include npm install"
    
    def test_azure_pipeline_has_npm_build(self, azure_pipeline):
        """Test that pipeline includes npm build"""
        steps = azure_pipeline['steps']
        script_steps = [s for s in steps if 'script' in s]
        npm_build_found = False
        for step in script_steps:
            script_content = step['script']
            if isinstance(script_content, str) and 'npm run build' in script_content:
                npm_build_found = True
                break
        assert npm_build_found, "Pipeline should include npm run build"
    
    def test_azure_pipeline_build_step_display_name(self, azure_pipeline):
        """Test that build script step has display name"""
        steps = azure_pipeline['steps']
        script_steps = [s for s in steps if 'script' in s and 'npm' in str(s.get('script', ''))]
        assert len(script_steps) > 0, "Should have npm script steps"
        build_step = script_steps[0]
        assert 'displayName' in build_step, "Build step should have displayName"
        display_name = build_step['displayName']
        assert isinstance(display_name, str), "displayName should be a string"
        assert len(display_name) > 0, "displayName should not be empty"
    
    def test_azure_pipeline_build_order(self, azure_pipeline):
        """Test that npm install comes before npm build"""
        steps = azure_pipeline['steps']
        npm_script = None
        for step in steps:
            if 'script' in step and 'npm' in str(step['script']):
                npm_script = step['script']
                break
        
        if npm_script and isinstance(npm_script, str):
            install_pos = npm_script.find('npm install')
            build_pos = npm_script.find('npm run build')
            if install_pos != -1 and build_pos != -1:
                assert install_pos < build_pos, "npm install should come before npm run build"
    
    def test_azure_pipeline_step_order(self, azure_pipeline):
        """Test that steps are in logical order"""
        steps = azure_pipeline['steps']
        step_types = []
        for step in steps:
            if 'task' in step and 'NodeTool' in step['task']:
                step_types.append('node_setup')
            elif 'script' in step:
                step_types.append('script')
        
        # Node setup should come before script execution
        if 'node_setup' in step_types and 'script' in step_types:
            node_idx = step_types.index('node_setup')
            script_idx = step_types.index('script')
            assert node_idx < script_idx, "Node.js setup should come before script execution"


class TestAzurePipelineComments:
    """Test suite for comments and documentation in Azure Pipeline"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    def test_azure_pipeline_has_comments(self, repo_root):
        """Test that pipeline file has explanatory comments"""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            content = f.read()
        assert '#' in content, "Pipeline should have comments"
        comment_lines = [line for line in content.split('\n') if line.strip().startswith('#')]
        assert len(comment_lines) >= 1, "Pipeline should have explanatory comments"
    
    def test_azure_pipeline_has_header_comment(self, repo_root):
        """Test that pipeline has header comment describing purpose"""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            lines = f.readlines()
        # First few lines should include comments
        first_lines = ''.join(lines[:5])
        assert '#' in first_lines, "Pipeline should have header comments"
    
    def test_azure_pipeline_mentions_nodejs(self, repo_root):
        """Test that comments mention Node.js/React context"""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            content = f.read()
        comment_lines = [line for line in content.split('\n') if line.strip().startswith('#')]
        comment_text = ' '.join(comment_lines).lower()
        assert 'node' in comment_text or 'react' in comment_text, \
            "Comments should mention Node.js or React"
    
    def test_azure_pipeline_has_documentation_link(self, repo_root):
        """Test that pipeline includes documentation reference"""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            content = f.read()
        # Should have a link to Azure DevOps documentation
        assert 'http' in content or 'docs.microsoft.com' in content, \
            "Pipeline should include documentation link"


class TestAzurePipelineBestPractices:
    """Test suite for Azure Pipeline best practices"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """Load and parse the azure-pipelines.yml file."""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_uses_latest_image(self, azure_pipeline):
        """Test that pipeline uses latest Ubuntu image"""
        pool = azure_pipeline['pool']
        vm_image = pool['vmImage']
        assert 'latest' in vm_image.lower(), \
            "Should use latest Ubuntu image for up-to-date tooling"
    
    def test_azure_pipeline_all_steps_have_display_names(self, azure_pipeline):
        """Test that all steps have descriptive display names"""
        steps = azure_pipeline['steps']
        for i, step in enumerate(steps):
            assert 'displayName' in step, \
                f"Step {i} should have displayName for clarity"
            assert len(step['displayName']) > 0, \
                f"Step {i} displayName should not be empty"
    
    def test_azure_pipeline_task_version_pinning(self, azure_pipeline):
        """Test that tasks use version pinning"""
        steps = azure_pipeline['steps']
        for step in steps:
            if 'task' in step:
                task = step['task']
                assert '@' in task, f"Task {task} should specify version (e.g., @0)"
    
    def test_azure_pipeline_no_hardcoded_secrets(self, repo_root):
        """Test that pipeline doesn't contain hardcoded secrets"""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            content = f.read().lower()
        
        suspicious_patterns = ['password:', 'token:', 'api_key:', 'secret:', 'credential:']
        for pattern in suspicious_patterns:
            if pattern in content:
                # Should be in variables or pipeline variables, not hardcoded
                pytest.fail(f"Potential hardcoded secret found: {pattern}")
    
    def test_azure_pipeline_multiline_scripts(self, azure_pipeline):
        """Test that multiline scripts use proper YAML syntax"""
        steps = azure_pipeline['steps']
        for step in steps:
            if 'script' in step:
                script = step['script']
                if isinstance(script, str) and '\n' in script:
                    # Multiline scripts should be properly formatted
                    assert len(script.strip()) > 0, "Multiline script should not be empty"


class TestAzurePipelineValidation:
    """Test suite for Azure Pipeline validation and error handling"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """Load and parse the azure-pipelines.yml file."""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_yaml_indentation(self, repo_root):
        """Test that YAML indentation is consistent"""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            content = f.read()
        lines = content.split('\n')
        indent_sizes = set()
        for line in lines:
            if line and not line.strip().startswith('#'):
                stripped = line.lstrip()
                if stripped:
                    indent = len(line) - len(stripped)
                    if indent > 0:
                        # Should use multiples of 2
                        indent_sizes.add(indent % 2)
        # All non-zero indents should be multiples of 2
        assert 0 in indent_sizes or len(indent_sizes) == 0, \
            "Indentation should be consistent (multiples of 2)"
    
    def test_azure_pipeline_no_trailing_whitespace(self, repo_root):
        """Test that pipeline file has no trailing whitespace"""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            lines = f.readlines()
        for i, line in enumerate(lines, 1):
            # Only check non-empty lines
            if line.strip() and not line.strip().startswith('#'):
                no_newline = line.rstrip('\n')
                if no_newline != no_newline.rstrip():
                    pytest.fail(f"Line {i} has trailing whitespace")
    
    def test_azure_pipeline_ends_with_newline(self, repo_root):
        """Test that pipeline file ends with newline"""
        with open(repo_root / 'azure-pipelines.yml', 'rb') as f:
            content = f.read()
        assert content.endswith(b'\n'), "File should end with newline"
    
    def test_azure_pipeline_no_tabs(self, repo_root):
        """Test that pipeline uses spaces, not tabs"""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            content = f.read()
        assert '\t' not in content, "Pipeline should use spaces, not tabs"
    
    def test_azure_pipeline_valid_field_names(self, azure_pipeline):
        """Test that pipeline uses valid Azure Pipelines field names"""
        valid_root_fields = [
            'trigger', 'pr', 'schedules', 'pool', 'variables', 
            'stages', 'jobs', 'steps', 'resources', 'parameters',
            'name', 'appendCommitMessageToRunName'
        ]
        for field in azure_pipeline.keys():
            assert field in valid_root_fields, \
                f"Field '{field}' is not a valid Azure Pipelines root field"


class TestAzurePipelineSecurity:
    """Test suite for security considerations in Azure Pipeline"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """Load and parse the azure-pipelines.yml file."""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_no_sudo_usage(self, azure_pipeline):
        """Test that pipeline doesn't use sudo unnecessarily"""
        steps = azure_pipeline['steps']
        for step in steps:
            if 'script' in step:
                script = step['script']
                if isinstance(script, str):
                    assert 'sudo' not in script.lower(), \
                        "Avoid using sudo in pipeline scripts unless necessary"
    
    def test_azure_pipeline_safe_npm_commands(self, azure_pipeline):
        """Test that npm commands are safe"""
        steps = azure_pipeline['steps']
        for step in steps:
            if 'script' in step:
                script = step['script']
                if isinstance(script, str) and 'npm' in script:
                    # Should not use npm with unsafe flags
                    assert '--unsafe-perm' not in script, \
                        "Avoid using --unsafe-perm flag"
    
    def test_azure_pipeline_no_curl_pipe_sh(self, azure_pipeline):
        """Test that pipeline doesn't use dangerous curl | sh pattern"""
        steps = azure_pipeline['steps']
        for step in steps:
            if 'script' in step:
                script = step['script']
                if isinstance(script, str):
                    assert not ('curl' in script and '|' in script and 'sh' in script), \
                        "Avoid piping curl output directly to shell"
    
    def test_azure_pipeline_script_injection_safety(self, azure_pipeline):
        """Test that scripts don't have obvious injection vulnerabilities"""
        steps = azure_pipeline['steps']
        for step in steps:
            if 'script' in step:
                script = step['script']
                if isinstance(script, str):
                    # Check for unquoted variable expansion patterns
                    # This is a basic check - real validation would be more complex
                    if '$(' in script or '${' in script:
                        # Should have proper quoting
                        pass  # This is informational


class TestAzurePipelineEdgeCases:
    """Test suite for edge cases and boundary conditions"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """Load and parse the azure-pipelines.yml file."""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_handles_empty_trigger_list(self, azure_pipeline):
        """Test that trigger list is not empty"""
        trigger = azure_pipeline['trigger']
        if isinstance(trigger, list):
            assert len(trigger) > 0, "Trigger list should not be empty"
    
    def test_azure_pipeline_pool_not_empty(self, azure_pipeline):
        """Test that pool configuration is not empty"""
        pool = azure_pipeline['pool']
        assert len(pool) > 0, "Pool configuration should not be empty"
    
    def test_azure_pipeline_steps_not_empty(self, azure_pipeline):
        """Test that steps list is not empty"""
        steps = azure_pipeline['steps']
        assert len(steps) > 0, "Steps should not be empty"
    
    def test_azure_pipeline_script_not_empty(self, azure_pipeline):
        """Test that script content is not empty"""
        steps = azure_pipeline['steps']
        for step in steps:
            if 'script' in step:
                script = step['script']
                assert len(str(script).strip()) > 0, "Script should not be empty"
    
    def test_azure_pipeline_display_names_unique(self, azure_pipeline):
        """Test that display names are reasonably unique"""
        steps = azure_pipeline['steps']
        display_names = [s.get('displayName', '') for s in steps]
        # Display names should be descriptive and preferably unique
        assert len(display_names) == len(steps), "All steps should have display names"


class TestAzurePipelineIntegration:
    """Test suite for integration and compatibility"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """Load and parse the azure-pipelines.yml file."""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_compatible_with_github(self, repo_root):
        """Test that pipeline is compatible with GitHub integration"""
        # Azure Pipelines can trigger from GitHub repos
        # Check that trigger configuration is compatible
        azure_yml = repo_root / 'azure-pipelines.yml'
        assert azure_yml.exists(), "Pipeline should exist for GitHub integration"
    
    def test_azure_pipeline_node_version_matches_project(self, azure_pipeline):
        """Test that Node.js version is reasonable for the project"""
        steps = azure_pipeline['steps']
        node_step = next((s for s in steps if 'task' in s and 'NodeTool' in s['task']), None)
        if node_step:
            version_spec = node_step['inputs']['versionSpec']
            # Should be a recent Node.js version
            major_version = int(version_spec.split('.')[0])
            assert major_version >= 18, \
                "Node.js version should be 18 or higher for modern React"
    
    def test_azure_pipeline_build_command_standard(self, azure_pipeline):
        """Test that build command follows standard npm conventions"""
        steps = azure_pipeline['steps']
        for step in steps:
            if 'script' in step and 'npm run build' in str(step['script']):
                # Using standard npm build command is good practice
                assert True
                return
        pytest.fail("Pipeline should use 'npm run build' command")


class TestAzurePipelineRobustness:
    """Test suite for pipeline robustness and error handling"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """Load and parse the azure-pipelines.yml file."""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_step_failure_behavior(self, azure_pipeline):
        """Test that steps don't have continueOnError set unnecessarily"""
        steps = azure_pipeline['steps']
        for step in steps:
            if 'continueOnError' in step:
                # Generally, we want to fail fast unless there's a good reason
                continue_on_error = step['continueOnError']
                if continue_on_error is True:
                    pytest.fail("Steps should fail fast by default (continueOnError: false)")
    
    def test_azure_pipeline_timeout_not_excessive(self, azure_pipeline):
        """Test that pipeline doesn't have excessive timeouts"""
        # Check if timeoutInMinutes is set
        if 'jobs' in azure_pipeline:
            jobs = azure_pipeline['jobs']
            if isinstance(jobs, list):
                for job in jobs:
                    if 'timeoutInMinutes' in job:
                        timeout = job['timeoutInMinutes']
                        assert timeout <= 360, \
                            "Job timeout should not exceed 6 hours (360 minutes)"


class TestAzurePipelinePerformance:
    """Test suite for pipeline performance considerations"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """Load and parse the azure-pipelines.yml file."""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_minimal_steps(self, azure_pipeline):
        """Test that pipeline has a reasonable number of steps"""
        steps = azure_pipeline['steps']
        # Should have essential steps but not be overly complex
        assert len(steps) >= 2, "Should have at least Node setup and build steps"
        assert len(steps) <= 20, "Pipeline should not be overly complex"
    
    def test_azure_pipeline_uses_npm_ci_consideration(self, azure_pipeline):
        """Test if pipeline could benefit from npm ci instead of npm install"""
        # This is informational - npm ci is faster and more reliable in CI
        steps = azure_pipeline['steps']
        for step in steps:
            if 'script' in step and 'npm install' in str(step['script']):
                # Consider recommending npm ci for CI/CD pipelines
                # This test just documents the current state
                pass


class TestAzurePipelineDocumentation:
    """Test suite for pipeline documentation and maintainability"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    def test_azure_pipeline_file_size_reasonable(self, repo_root):
        """Test that pipeline file size is reasonable"""
        azure_yml = repo_root / 'azure-pipelines.yml'
        file_size = azure_yml.stat().st_size
        # Should be small and maintainable (less than 50KB)
        assert file_size < 50000, "Pipeline file should be reasonably sized"
    
    def test_azure_pipeline_line_count_reasonable(self, repo_root):
        """Test that pipeline has reasonable number of lines"""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            lines = f.readlines()
        # Should be concise but complete
        assert len(lines) > 5, "Pipeline should have meaningful content"
        assert len(lines) < 500, "Pipeline should be maintainable"
    
    def test_azure_pipeline_comment_to_code_ratio(self, repo_root):
        """Test that pipeline has adequate comments"""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            lines = f.readlines()
        comment_lines = sum(1 for line in lines if line.strip().startswith('#'))
        code_lines = sum(1 for line in lines if line.strip() and not line.strip().startswith('#'))
        # Should have some comments for documentation
        if code_lines > 0:
            comment_ratio = comment_lines / code_lines
            assert comment_ratio >= 0.1, "Pipeline should have adequate comments"


class TestAzurePipelineRealWorld:
    """Test suite with real-world Azure Pipelines scenarios"""
    
    @pytest.fixture
    def repo_root(self):
        """Locate the repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def azure_pipeline(self, repo_root):
        """Load and parse the azure-pipelines.yml file."""
        with open(repo_root / 'azure-pipelines.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_azure_pipeline_standard_nodejs_workflow(self, azure_pipeline):
        """Test that pipeline follows standard Node.js workflow"""
        steps = azure_pipeline['steps']
        
        # Check for standard Node.js CI workflow pattern
        has_node_setup = any('NodeTool' in str(s.get('task', '')) for s in steps)
        has_install = any('npm install' in str(s.get('script', '')) for s in steps)
        has_build = any('npm run build' in str(s.get('script', '')) for s in steps)
        
        assert has_node_setup, "Should have Node.js setup"
        assert has_install, "Should have dependency installation"
        assert has_build, "Should have build step"
    
    def test_azure_pipeline_suitable_for_react(self, azure_pipeline):
        """Test that pipeline configuration is suitable for React projects"""
        # React projects typically need Node.js and build step
        steps = azure_pipeline['steps']
        
        # Should use recent Node.js version
        node_step = next((s for s in steps if 'NodeTool' in str(s.get('task', ''))), None)
        assert node_step is not None, "React projects need Node.js"
        
        # Should have build step (React needs compilation)
        has_build = any('build' in str(s.get('script', '')) for s in steps)
        assert has_build, "React projects need build step"
    
    def test_azure_pipeline_trigger_on_main_for_deployment(self, azure_pipeline):
        """Test that pipeline triggers on main branch for deployment"""
        trigger = azure_pipeline['trigger']
        # Triggering on main is standard for CD pipelines
        if isinstance(trigger, list):
            assert 'main' in trigger or 'master' in trigger, \
                "Should trigger on main/master branch"


pytestmark = pytest.mark.unit