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
        Return the path to the repository's .github/workflows directory.
        
        Returns:
            pathlib.Path: Path to the .github/workflows directory at the repository root.
        """
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def manual_workflow(self, workflows_dir):
        """
        Load and parse the .github/workflows/manual.yml workflow file.
        
        Parameters:
            workflows_dir (pathlib.Path): Path to the `.github/workflows` directory.
        
        Returns:
            dict | list | None: Parsed YAML content of manual.yml (commonly a dict of the workflow), or `None` if the file is empty.
        """
        with open(workflows_dir / 'manual.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_manual_workflow_exists(self, workflows_dir):
        """Test that manual.yml workflow file exists"""
        manual_yml = workflows_dir / 'manual.yml'
        assert manual_yml.exists(), "manual.yml should exist"
        assert manual_yml.is_file(), "manual.yml should be a file"
    
    def test_manual_workflow_is_valid_yaml(self, workflows_dir):
        """
        Verify that .github/workflows/manual.yml parses as valid YAML.
        
        If parsing fails, the test fails and reports the YAML parser error.
        """
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
        Verify the workflow_dispatch inputs include a 'name' input with expected attributes.
        
        Asserts that the workflow's `workflow_dispatch` contains an `inputs` mapping with a `name` entry whose `description` is "Person to greet", `default` is "World", `required` is True, and `type` is "string".
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
        """
        Verify the workflow defines a 'greet' job configured to run on 'ubuntu-latest' and containing at least one step.
        
        Asserts that the top-level `jobs` key exists, that a `greet` job is present, that the `greet` job specifies `runs-on: ubuntu-latest`, and that the job includes a non-empty `steps` list.
        """
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
        Verify the greet job contains a "Send greeting" step whose run command echoes a greeting and references the workflow input.
        
        Checks that the greet job has a step named "Send greeting", that the step uses a `run` command which includes an `echo` invocation, contains the literal text "Hello", and references the workflow input token `${{ inputs.name }}`.
        
        Parameters:
            manual_workflow (dict): Parsed YAML content of the workflow file (manual.yml).
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
        Return the path to the repository's .github/workflows directory.
        
        Returns:
            pathlib.Path: Path to the .github/workflows directory at the repository root.
        """
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def manual_workflow(self, workflows_dir):
        """
        Load and parse the .github/workflows/manual.yml workflow file.
        
        Parameters:
            workflows_dir (pathlib.Path): Path to the `.github/workflows` directory.
        
        Returns:
            dict | list | None: Parsed YAML content of manual.yml (commonly a dict of the workflow), or `None` if the file is empty.
        """
        with open(workflows_dir / 'manual.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_workflow_has_comments(self, workflows_dir):
        """Test that workflow file has helpful comments"""
        with open(workflows_dir / 'manual.yml', 'r') as f:
            content = f.read()
        assert '#' in content, "Workflow should have comments"
        comment_lines = [line for line in content.split('\n') if line.strip().startswith('#')]
        assert len(comment_lines) >= 3, "Workflow should have multiple explanatory comments"
    
    def test_workflow_naming_conventions(self, manual_workflow):
        """
        Ensure each job name is alphanumeric after removing hyphens and underscores and is at least 3 characters long.
        
        Fails the test if any job name contains characters other than letters or digits (ignoring '-' and '_') or is shorter than 3 characters.
        """
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
        """Test that echo commands properly quote variables"""
        steps = manual_workflow['jobs']['greet']['steps']
        for step in steps:
            if 'run' in step and 'echo' in step['run'].lower():
                run_command = step['run']
                if '${{' in run_command:
                    assert '"' in run_command or "'" in run_command, "Echo with variables should be quoted"
    
    def test_workflow_runner_valid(self, manual_workflow):
        """
        Ensure the `greet` job's runner is an allowed GitHub-hosted runner or a self-hosted runner.
        
        Checks that `jobs.greet.runs-on` contains one of the approved runners (ubuntu-latest, ubuntu-22.04, ubuntu-20.04, windows-latest, macos-latest) or starts with the `self-hosted` prefix.
        
        Parameters:
            manual_workflow (dict): Parsed YAML mapping of the manual.yml workflow file.
        """
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
        Return the path to the repository's .github/workflows directory.
        
        Returns:
            pathlib.Path: Path to the .github/workflows directory at the repository root.
        """
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def manual_workflow(self, workflows_dir):
        """
        Load and parse the .github/workflows/manual.yml workflow file.
        
        Parameters:
            workflows_dir (pathlib.Path): Path to the `.github/workflows` directory.
        
        Returns:
            dict | list | None: Parsed YAML content of manual.yml (commonly a dict of the workflow), or `None` if the file is empty.
        """
        with open(workflows_dir / 'manual.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_explicit_permissions(self, manual_workflow):
        """
        Ensure the workflow file defines a top-level `permissions` key.
        
        Asserts that the `permissions` key exists in the parsed workflow YAML and its value is not null.
        """
        assert 'permissions' in manual_workflow
        permissions = manual_workflow['permissions']
        assert permissions is not None, "Permissions should not be null"
    
    def test_least_privilege(self, manual_workflow):
        """
        Ensure the workflow's permissions do not grant write access.
        
        If a permissions mapping is present, asserts that no permission value equals 'write'; fails the test if any write-level permissions are found.
        """
        permissions = manual_workflow.get('permissions', {})
        if isinstance(permissions, dict):
            write_perms = [k for k, v in permissions.items() if v == 'write']
            assert len(write_perms) == 0, "Simple workflow shouldn't need write permissions"
    
    def test_no_pull_request_target(self, manual_workflow):
        """
        Ensure the workflow does not configure the pull_request_target event.
        
        Parameters:
            manual_workflow (dict): Parsed YAML mapping of the workflow file (manual.yml).
        """
        on_config = manual_workflow.get('on', manual_workflow.get(True, {}))
        assert 'pull_request_target' not in on_config, "pull_request_target is dangerous"
    
    def test_input_validation(self, manual_workflow):
        """
        Ensure required workflow_dispatch inputs declare a type.
        
        Asserts that every input marked `required: true` in `workflow_dispatch` inputs includes a `type` key.
        """
        on_config = manual_workflow.get('on', manual_workflow.get(True, {}))
        inputs = on_config['workflow_dispatch']['inputs']
        for input_name, config in inputs.items():
            if config.get('required') is True:
                assert 'type' in config, f"Required input '{input_name}' should specify type"
    
    def test_no_hardcoded_secrets(self, manual_workflow):
        """
        Checks the workflow YAML for potential hardcoded secrets.
        
        Scans the serialized workflow for suspicious keys (`password`, `token`, `api_key`, `secret`, `credential`) and fails the test if any appear outside templating or GitHub Secrets references (i.e., the line does not contain `{{` and does not reference `secrets.`).
        
        Parameters:
            manual_workflow (dict): Parsed YAML content of the workflow file under test.
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
        Return the path to the repository's .github/workflows directory.
        
        Returns:
            pathlib.Path: Path to the .github/workflows directory at the repository root.
        """
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def manual_workflow(self, workflows_dir):
        """
        Load and parse the .github/workflows/manual.yml workflow file.
        
        Parameters:
            workflows_dir (pathlib.Path): Path to the `.github/workflows` directory.
        
        Returns:
            dict | list | None: Parsed YAML content of manual.yml (commonly a dict of the workflow), or `None` if the file is empty.
        """
        with open(workflows_dir / 'manual.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_special_characters_handling(self, manual_workflow):
        """
        Verify the workflow's `name` input is configured to accept arbitrary characters.
        
        Asserts that the `workflow_dispatch` `name` input has type `'string'`, ensuring the input can contain special characters.
        """
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
        """
        Ensure manual.yml contains no trailing whitespace on non-empty, non-comment lines.
        
        Scans .github/workflows/manual.yml line by line, ignores blank lines and comment lines (starting with `#`), and fails the test with the offending line number if any line ends with trailing spaces or tabs.
        """
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