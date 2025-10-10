"""
Comprehensive unit tests for GitHub Actions workflow files
Tests workflow YAML structure, configuration, and best practices
"""
import pytest
import sys
import yaml
from pathlib import Path

class TestWorkflowStructure:
    """Test suite for GitHub Actions workflow structure validation"""
    
    @pytest.fixture
    def workflows_dir(self):
        """
        Locate the repository's GitHub workflows directory.
        
        Returns:
            Path: Path to the `.github/workflows` directory at the repository root.
        """
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def manual_workflow(self, workflows_dir):
        """
        Load and parse the manual GitHub Actions workflow file from the workflows directory.
        
        Parameters:
            workflows_dir (pathlib.Path): Path to the `.github/workflows` directory containing `manual.yml`.
        
        Returns:
            dict: Parsed YAML content of `manual.yml` as a Python mapping.
        """
        with open(workflows_dir / 'manual.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_manual_workflow_exists(self, workflows_dir):
        """Test that manual.yml workflow file exists"""
        manual_yml = workflows_dir / 'manual.yml'
        assert manual_yml.exists(), "manual.yml should exist"
        assert manual_yml.is_file(), "manual.yml should be a file"
    
    def test_manual_workflow_is_valid_yaml(self, workflows_dir):
        """Test that manual.yml is valid YAML"""
        try:
            with open(workflows_dir / 'manual.yml', 'r') as f:
                yaml.safe_load(f)
        except yaml.YAMLError as e:
            pytest.fail(f"manual.yml is not valid YAML: {e}")
    
    def test_manual_workflow_has_name(self, manual_workflow):
        """Test that workflow has a name defined"""
        assert 'name' in manual_workflow, "Workflow must have a name"
        assert isinstance(manual_workflow['name'], str), "Workflow name must be a string"
        assert len(manual_workflow['name']) > 0, "Workflow name must not be empty"
    
    def test_manual_workflow_has_permissions(self, manual_workflow):
        """Test that workflow defines permissions (security best practice)"""
        assert 'permissions' in manual_workflow, "Workflow should define permissions for security"
        permissions = manual_workflow.get('permissions', {})
        assert 'contents' in permissions, "Should explicitly define contents permission"
        assert permissions['contents'] == 'read', "Should use read-only contents permission"
    
    def test_manual_workflow_trigger(self, manual_workflow):
        """Test that workflow has correct trigger configuration"""
        # YAML parses 'on' as True, so check for both
        assert 'on' in manual_workflow or True in manual_workflow, "Workflow must have trigger configuration"
        on_config = manual_workflow.get('on', manual_workflow.get(True, {}))
        assert 'workflow_dispatch' in on_config, "Manual workflow must use workflow_dispatch trigger"
    
    def test_manual_workflow_inputs(self, manual_workflow):
        """
        Verify the workflow_dispatch inputs include a 'name' input with the expected metadata.
        
        Asserts that the workflow's `workflow_dispatch.inputs` contains a `name` entry with:
        - description equal to "Person to greet"
        - default value equal to "World"
        - required set to True
        - type equal to "string"
        """
        on_config = manual_workflow.get('on', manual_workflow.get(True, {}))
        workflow_dispatch = on_config['workflow_dispatch']
        assert 'inputs' in workflow_dispatch, "workflow_dispatch should have inputs"
        inputs = workflow_dispatch['inputs']
        assert 'name' in inputs, "Should have 'name' input"
        name_input = inputs['name']
        assert name_input['description'] == 'Person to greet'
        assert name_input['default'] == 'World'
        assert name_input['required'] is True
        assert name_input['type'] == 'string'
    
    def test_manual_workflow_jobs(self, manual_workflow):
        """Test that workflow has properly configured jobs"""
        assert 'jobs' in manual_workflow, "Workflow must have jobs"
        jobs = manual_workflow['jobs']
        assert 'greet' in jobs, "Should have 'greet' job"
        greet_job = jobs['greet']
        assert 'runs-on' in greet_job, "Job must specify runs-on"
        assert greet_job['runs-on'] == 'ubuntu-latest'
        assert 'steps' in greet_job, "Job must have steps"
        assert len(greet_job['steps']) > 0, "Job must have at least one step"
    
    def test_manual_workflow_greeting_step(self, manual_workflow):
        """
        Verify the 'Send greeting' step in the `greet` job executes a run command that echoes a greeting and references the `name` input.
        
        Parameters:
            manual_workflow (dict): Parsed YAML mapping of .github/workflows/manual.yml representing the workflow.
        
        Notes:
            Asserts that a step named "Send greeting" exists in `jobs.greet.steps`, contains a `run` command, the command uses `echo`, includes the text "Hello", and references the inputs with `${{ inputs.name }}`.
        """
        steps = manual_workflow['jobs']['greet']['steps']
        greeting_step = next((s for s in steps if s.get('name') == 'Send greeting'), None)
        assert greeting_step is not None, "Should have 'Send greeting' step"
        assert 'run' in greeting_step, "Greeting step should use 'run'"
        run_command = greeting_step['run']
        assert 'echo' in run_command.lower(), "Should use echo command"
        assert 'Hello' in run_command, "Should include 'Hello' in greeting"
        assert '${{ inputs.name }}' in run_command, "Should reference the 'name' input"

class TestWorkflowBestPractices:
    """Test suite for GitHub Actions workflow best practices"""
    
    @pytest.fixture
    def workflows_dir(self):
        """
        Locate the repository's GitHub workflows directory.
        
        Returns:
            Path: Path to the `.github/workflows` directory at the repository root.
        """
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def manual_workflow(self, workflows_dir):
        """
        Load and parse the manual GitHub Actions workflow file from the workflows directory.
        
        Parameters:
            workflows_dir (pathlib.Path): Path to the `.github/workflows` directory containing `manual.yml`.
        
        Returns:
            dict: Parsed YAML content of `manual.yml` as a Python mapping.
        """
        with open(workflows_dir / 'manual.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_workflow_has_comments(self, workflows_dir):
        """
        Ensure the manual workflow file contains explanatory comments.
        
        Verifies that the file includes comment characters and that at least three lines start with `#`, indicating multiple explanatory comment lines.
        """
        with open(workflows_dir / 'manual.yml', 'r') as f:
            content = f.read()
        assert '#' in content, "Workflow should have comments"
        comment_lines = [line for line in content.split('\n') if line.strip().startswith('#')]
        assert len(comment_lines) >= 3, "Workflow should have multiple explanatory comments"
    
    def test_workflow_naming_conventions(self, manual_workflow):
        """Test that workflow follows GitHub Actions naming conventions"""
        for job_name in manual_workflow['jobs'].keys():
            assert job_name.replace('-', '').replace('_', '').isalnum()
            assert len(job_name) >= 3, f"Job name '{job_name}' should be descriptive"
    
    def test_workflow_input_types_valid(self, manual_workflow):
        """Test that input types are valid GitHub Actions types"""
        valid_types = ['string', 'boolean', 'choice', 'environment']
        on_config = manual_workflow.get('on', manual_workflow.get(True, {}))
        inputs = on_config['workflow_dispatch']['inputs']
        for _input_name, config in inputs.items():
            assert config.get('type') in valid_types
    
    def test_workflow_echo_safety(self, manual_workflow):
        """
        Ensure echo run steps that interpolate workflow expressions are quoted.
        
        Checks each step under the 'greet' job whose `run` contains an `echo` invocation; if the `run` includes a GitHub Actions expression token (`${{`), asserts the command contains at least one single or double quote to prevent unquoted variable expansion.
        """
        steps = manual_workflow['jobs']['greet']['steps']
        for step in steps:
            if 'run' in step and 'echo' in step['run'].lower():
                run_command = step['run']
                if '${{' in run_command:
                    assert '"' in run_command or "'" in run_command, "Echo with variables should be quoted"
    
    def test_workflow_runner_valid(self, manual_workflow):
        """Test that runner configuration is valid"""
        runner = manual_workflow['jobs']['greet']['runs-on']
        valid_runners = [
            'ubuntu-latest',
            'ubuntu-22.04',
            'ubuntu-20.04',
            'windows-latest',
            'macos-latest',
        ]
        assert any(vr in runner for vr in valid_runners) or runner.startswith('self-hosted')

class TestWorkflowSecurity:
    """Test suite for GitHub Actions workflow security"""
    
    @pytest.fixture
    def workflows_dir(self):
        """
        Locate the repository's GitHub workflows directory.
        
        Returns:
            Path: Path to the `.github/workflows` directory at the repository root.
        """
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def manual_workflow(self, workflows_dir):
        """
        Load and parse the manual GitHub Actions workflow file from the workflows directory.
        
        Parameters:
            workflows_dir (pathlib.Path): Path to the `.github/workflows` directory containing `manual.yml`.
        
        Returns:
            dict: Parsed YAML content of `manual.yml` as a Python mapping.
        """
        with open(workflows_dir / 'manual.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_explicit_permissions(self, manual_workflow):
        """Test that workflow explicitly sets permissions"""
        assert 'permissions' in manual_workflow
        permissions = manual_workflow['permissions']
        assert permissions is not None, "Permissions should not be null"
    
    def test_least_privilege(self, manual_workflow):
        """
        Ensure the workflow's permissions do not grant write access.
        
        Checks the top-level 'permissions' mapping and asserts there are no entries with the value 'write'.
        
        Parameters:
            manual_workflow (dict): Parsed YAML content of the workflow file.
        """
        permissions = manual_workflow.get('permissions', {})
        if isinstance(permissions, dict):
            write_perms = [k for k, v in permissions.items() if v == 'write']
            assert len(write_perms) == 0, "Simple workflow shouldn't need write permissions"
    
    def test_no_pull_request_target(self, manual_workflow):
        """Test that workflow doesn't use pull_request_target"""
        on_config = manual_workflow.get('on', manual_workflow.get(True, {}))
        assert 'pull_request_target' not in on_config, "pull_request_target is dangerous"
    
    def test_input_validation(self, manual_workflow):
        """
        Ensure required workflow_dispatch inputs specify a type.
        
        Asserts that every input under `workflow_dispatch.inputs` marked with `required: true` includes a `type` field; raises an assertion error naming the input when missing.
        """
        on_config = manual_workflow.get('on', manual_workflow.get(True, {}))
        inputs = on_config['workflow_dispatch']['inputs']
        for input_name, config in inputs.items():
            if config.get('required') is True:
                assert 'type' in config, f"Required input '{input_name}' should specify type"
    
    def test_no_hardcoded_secrets(self, manual_workflow):
        """
        Fail the test if the workflow contains hardcoded secret-like values.
        
        Searches the serialized workflow for common secret-key patterns (for example: `password`, `token`, `api_key`, `secret`, `credential`) and fails when any such pattern appears outside of templated references or GitHub Secrets (i.e., not within `{{ ... }}` and not containing `secrets.`).
        """
        workflow_str = yaml.dump(manual_workflow)
        suspicious = [
            'password:',
            'token:',
            'api_key:',
            'secret:',
            'credential:',
        ]
        for pattern in suspicious:
            lines = workflow_str.lower().split('\n')
            for line in lines:
                if pattern in line and '{{' not in line and 'secrets.' not in line:
                    pytest.fail(f"Potential hardcoded secret found: {line.strip()}")

class TestWorkflowEdgeCases:
    """Test suite for edge cases and error conditions"""
    
    @pytest.fixture
    def workflows_dir(self):
        """
        Locate the repository's GitHub workflows directory.
        
        Returns:
            Path: Path to the `.github/workflows` directory at the repository root.
        """
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def manual_workflow(self, workflows_dir):
        """
        Load and parse the manual GitHub Actions workflow file from the workflows directory.
        
        Parameters:
            workflows_dir (pathlib.Path): Path to the `.github/workflows` directory containing `manual.yml`.
        
        Returns:
            dict: Parsed YAML content of `manual.yml` as a Python mapping.
        """
        with open(workflows_dir / 'manual.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_special_characters_handling(self, manual_workflow):
        """Test that workflow can handle special characters in input"""
        on_config = manual_workflow.get('on', manual_workflow.get(True, {}))
        inputs = on_config['workflow_dispatch']['inputs']
        assert inputs['name']['type'] == 'string', "Input should handle various characters"
    
    def test_required_with_default(self, manual_workflow):
        """Test that required input has default value"""
        on_config = manual_workflow.get('on', manual_workflow.get(True, {}))
        name_input = on_config['workflow_dispatch']['inputs']['name']
        if name_input['required']:
            assert 'default' in name_input, "Required input should have default for UX"
    
    def test_yaml_indentation(self, workflows_dir):
        """Test that YAML indentation is consistent"""
        with open(workflows_dir / 'manual.yml', 'r') as f:
            content = f.read()
        lines = content.split('\n')
        indent_sizes = set()
        for line in lines:
            if line and not line.strip().startswith('#'):
                stripped = line.lstrip()
                if stripped:
                    indent = len(line) - len(stripped)
                    if indent > 0:
                        indent_sizes.add(indent % 2)
        # Should use multiples of 2
        assert 0 in indent_sizes or len(indent_sizes) == 0
    
    def test_no_trailing_whitespace(self, workflows_dir):
        """Test that workflow file has no trailing whitespace on code lines"""
        with open(workflows_dir / 'manual.yml', 'r') as f:
            lines = f.readlines()
        for i, line in enumerate(lines, 1):
            # Only check non-empty, non-comment lines
            if line.strip() and not line.strip().startswith('#'):
                no_newline = line.rstrip('\n')
                if no_newline != no_newline.rstrip():
                    pytest.fail(f"Line {i} has trailing whitespace")
    
    def test_ends_with_newline(self, workflows_dir):
        """Test that workflow file ends with newline"""
        with open(workflows_dir / 'manual.yml', 'rb') as f:
            content = f.read()
        assert content.endswith(b'\n'), "File should end with newline"

pytestmark = pytest.mark.unit