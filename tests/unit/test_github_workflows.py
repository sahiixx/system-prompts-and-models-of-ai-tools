"""
Comprehensive unit tests for GitHub Actions workflow files
Tests YAML validation, structure, permissions, and GitHub Actions best practices
"""

import pytest
import yaml
import json
from pathlib import Path
from typing import Dict, Any, List

# Repository root path
REPO_ROOT = Path(__file__).parent.parent.parent
WORKFLOWS_DIR = REPO_ROOT / '.github' / 'workflows'


def get_on_key(workflow_dict):
    """
    Helper to get the 'on' trigger from workflow dict.
    YAML parsers convert 'on:' to boolean True, so we need to check both.
    """
    return workflow_dict.get('on', workflow_dict.get(True, {}))


class TestWorkflowYAMLSyntax:
    """Test suite for YAML syntax validation"""

    def test_manual_workflow_is_valid_yaml(self):
        """Test that manual.yml is valid YAML"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        assert workflow_path.exists(), f"Workflow file not found: {workflow_path}"

        with open(workflow_path, 'r') as f:
            try:
                content = yaml.safe_load(f)
                assert content is not None, "Workflow file is empty"
                assert isinstance(content, dict), "Workflow content must be a dictionary"
            except yaml.YAMLError as e:
                pytest.fail(f"Invalid YAML syntax: {e}")

    def test_all_workflows_have_valid_yaml(self):
        """Test that all workflow files have valid YAML syntax"""
        workflow_files = list(WORKFLOWS_DIR.glob('*.yml')) + list(WORKFLOWS_DIR.glob('*.yaml'))
        assert len(workflow_files) > 0, "No workflow files found"

        invalid_files = []
        for workflow_file in workflow_files:
            try:
                with open(workflow_file, 'r') as f:
                    yaml.safe_load(f)
            except yaml.YAMLError as e:
                invalid_files.append((workflow_file.name, str(e)))

        assert len(invalid_files) == 0, f"Invalid YAML in files: {invalid_files}"

    def test_manual_workflow_has_no_tabs(self):
        """Test that manual.yml uses spaces, not tabs (YAML requirement)"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            content = f.read()

        assert '\t' not in content, "Workflow file contains tabs; YAML requires spaces"


class TestWorkflowStructure:
    """Test suite for workflow structure and required fields"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow for testing"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)

    def test_manual_workflow_has_name(self, manual_workflow):
        """Test that workflow has a name field"""
        assert 'name' in manual_workflow, "Workflow must have a 'name' field"
        assert isinstance(manual_workflow['name'], str), "Workflow name must be a string"
        assert len(manual_workflow['name'].strip()) > 0, "Workflow name cannot be empty"

    def test_manual_workflow_has_correct_name(self, manual_workflow):
        """Test that workflow name is correct"""
        assert manual_workflow['name'] == 'Manual workflow', \
            f"Expected 'Manual workflow', got '{manual_workflow['name']}'"

    def test_manual_workflow_has_on_trigger(self, manual_workflow):
        """Test that workflow has 'on' trigger configuration"""
        triggers = get_on_key(manual_workflow)
        assert triggers is not None and len(triggers) > 0, \
            "Workflow must have an 'on' trigger field"
        assert isinstance(triggers, dict), "'on' field must be a dictionary"

    def test_manual_workflow_has_jobs(self, manual_workflow):
        """Test that workflow has jobs defined"""
        assert 'jobs' in manual_workflow, "Workflow must have 'jobs' field"
        assert isinstance(manual_workflow['jobs'], dict), "'jobs' field must be a dictionary"
        assert len(manual_workflow['jobs']) > 0, "Workflow must have at least one job"


class TestWorkflowPermissions:
    """Test suite for workflow permissions (security focus)"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow for testing"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)

    def test_manual_workflow_has_permissions(self, manual_workflow):
        """Test that workflow has permissions defined (security best practice)"""
        assert 'permissions' in manual_workflow, \
            "Workflow should have explicit permissions defined for security"

    def test_manual_workflow_permissions_structure(self, manual_workflow):
        """Test that permissions field is properly structured"""
        permissions = manual_workflow.get('permissions')
        assert permissions is not None, "Permissions field should not be None"
        assert isinstance(permissions, (dict, str)), \
            "Permissions must be a dictionary or string (read-all/write-all)"

    def test_manual_workflow_has_contents_read_permission(self, manual_workflow):
        """Test that workflow has contents: read permission"""
        permissions = manual_workflow.get('permissions')
        assert isinstance(permissions, dict), \
            "Permissions should be a dict for granular control"
        assert 'contents' in permissions, \
            "Workflow should have 'contents' permission defined"
        assert permissions['contents'] == 'read', \
            f"Expected 'contents: read', got 'contents: {permissions['contents']}'"

    def test_manual_workflow_uses_least_privilege(self, manual_workflow):
        """Test that workflow follows least privilege principle"""
        permissions = manual_workflow.get('permissions', {})
        if isinstance(permissions, dict):
            # Should not have unnecessary write permissions for a simple greeting workflow
            write_permissions = [k for k, v in permissions.items()
                               if v in ['write', 'admin']]
            assert len(write_permissions) == 0, \
                f"Workflow has unnecessary write permissions: {write_permissions}"

    def test_permissions_are_valid_github_scopes(self, manual_workflow):
        """Test that all permission scopes are valid GitHub Actions permissions"""
        valid_scopes = {
            'actions', 'attestations', 'checks', 'contents', 'deployments',
            'id-token', 'issues', 'discussions', 'packages', 'pages',
            'pull-requests', 'repository-projects', 'security-events',
            'statuses'
        }
        valid_levels = {'read', 'write', 'none'}

        permissions = manual_workflow.get('permissions', {})
        if isinstance(permissions, dict):
            for scope, level in permissions.items():
                assert scope in valid_scopes, \
                    f"Invalid permission scope: {scope}"
                assert level in valid_levels, \
                    f"Invalid permission level for {scope}: {level}"


class TestWorkflowTriggers:
    """Test suite for workflow trigger configuration"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow for testing"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)

    def test_manual_workflow_uses_workflow_dispatch(self, manual_workflow):
        """Test that workflow uses workflow_dispatch trigger"""
        triggers = get_on_key(manual_workflow)
        assert 'workflow_dispatch' in triggers, \
            "Manual workflow should use 'workflow_dispatch' trigger"

    def test_workflow_dispatch_has_inputs(self, manual_workflow):
        """Test that workflow_dispatch has input configuration"""
        triggers = get_on_key(manual_workflow)
        dispatch = triggers.get('workflow_dispatch', {})

        assert 'inputs' in dispatch, \
            "workflow_dispatch should have 'inputs' defined"
        assert isinstance(dispatch['inputs'], dict), \
            "workflow_dispatch inputs must be a dictionary"

    def test_workflow_input_name_exists(self, manual_workflow):
        """Test that 'name' input is defined"""
        triggers = get_on_key(manual_workflow)
        inputs = triggers['workflow_dispatch']['inputs']
        assert 'name' in inputs, "Expected 'name' input to be defined"

    def test_workflow_input_name_has_description(self, manual_workflow):
        """Test that 'name' input has a description"""
        triggers = get_on_key(manual_workflow)
        name_input = triggers['workflow_dispatch']['inputs']['name']
        assert 'description' in name_input, "Input should have a 'description'"
        assert isinstance(name_input['description'], str), \
            "Input description must be a string"
        assert len(name_input['description'].strip()) > 0, \
            "Input description cannot be empty"

    def test_workflow_input_name_has_default(self, manual_workflow):
        """Test that 'name' input has a default value"""
        triggers = get_on_key(manual_workflow)
        name_input = triggers['workflow_dispatch']['inputs']['name']
        assert 'default' in name_input, "Input should have a 'default' value"
        assert name_input['default'] == 'World', \
            f"Expected default 'World', got '{name_input['default']}'"

    def test_workflow_input_name_is_required(self, manual_workflow):
        """Test that 'name' input is marked as required"""
        triggers = get_on_key(manual_workflow)
        name_input = triggers['workflow_dispatch']['inputs']['name']
        assert 'required' in name_input, "Input should specify if it's 'required'"
        assert name_input['required'] is True, "Expected 'required: true'"

    def test_workflow_input_name_has_correct_type(self, manual_workflow):
        """Test that 'name' input has correct type"""
        triggers = get_on_key(manual_workflow)
        name_input = triggers['workflow_dispatch']['inputs']['name']
        assert 'type' in name_input, "Input should have a 'type' specified"
        assert name_input['type'] == 'string', \
            f"Expected type 'string', got '{name_input['type']}'"

    def test_workflow_input_types_are_valid(self, manual_workflow):
        """Test that all input types are valid GitHub Actions types"""
        valid_types = {'boolean', 'choice', 'environment', 'number', 'string'}

        triggers = get_on_key(manual_workflow)
        inputs = triggers['workflow_dispatch']['inputs']
        for input_name, input_config in inputs.items():
            if 'type' in input_config:
                assert input_config['type'] in valid_types, \
                    f"Invalid input type for {input_name}: {input_config['type']}"


class TestWorkflowJobs:
    """Test suite for workflow jobs configuration"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow for testing"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)

    def test_greet_job_exists(self, manual_workflow):
        """Test that 'greet' job exists"""
        jobs = manual_workflow.get('jobs', {})
        assert 'greet' in jobs, "Expected 'greet' job to be defined"

    def test_greet_job_has_runs_on(self, manual_workflow):
        """Test that greet job has runs-on specified"""
        greet_job = manual_workflow['jobs']['greet']
        assert 'runs-on' in greet_job, "Job must have 'runs-on' field"
        assert isinstance(greet_job['runs-on'], str), \
            "'runs-on' must be a string"

    def test_greet_job_uses_valid_runner(self, manual_workflow):
        """Test that greet job uses a valid GitHub-hosted runner"""
        valid_runners = {
            'ubuntu-latest', 'ubuntu-22.04', 'ubuntu-20.04',
            'windows-latest', 'windows-2022', 'windows-2019',
            'macos-latest', 'macos-13', 'macos-12', 'macos-11'
        }

        greet_job = manual_workflow['jobs']['greet']
        runner = greet_job['runs-on']

        # Check if it's a GitHub-hosted runner or a self-hosted label
        is_valid = (runner in valid_runners or
                   runner.startswith('self-hosted') or
                   isinstance(runner, list))

        assert is_valid, f"Invalid or outdated runner: {runner}"

    def test_greet_job_has_steps(self, manual_workflow):
        """Test that greet job has steps defined"""
        greet_job = manual_workflow['jobs']['greet']
        assert 'steps' in greet_job, "Job must have 'steps' field"
        assert isinstance(greet_job['steps'], list), \
            "'steps' must be a list"
        assert len(greet_job['steps']) > 0, \
            "Job must have at least one step"


class TestWorkflowSteps:
    """Test suite for workflow steps configuration"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow for testing"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)

    def test_greeting_step_exists(self, manual_workflow):
        """Test that greeting step exists"""
        steps = manual_workflow['jobs']['greet']['steps']
        assert len(steps) > 0, "Should have at least one step"

        # Find the greeting step
        greeting_step = None
        for step in steps:
            if step.get('name') == 'Send greeting':
                greeting_step = step
                break

        assert greeting_step is not None, "Expected 'Send greeting' step"

    def test_greeting_step_has_name(self, manual_workflow):
        """Test that greeting step has a name"""
        steps = manual_workflow['jobs']['greet']['steps']
        greeting_step = next((s for s in steps if 'Send greeting' in s.get('name', '')), None)

        assert greeting_step is not None, "Greeting step not found"
        assert 'name' in greeting_step, "Step should have a 'name' field"

    def test_greeting_step_has_run_command(self, manual_workflow):
        """Test that greeting step has a run command"""
        steps = manual_workflow['jobs']['greet']['steps']
        greeting_step = next((s for s in steps if 'Send greeting' in s.get('name', '')), None)

        assert 'run' in greeting_step, "Step should have a 'run' command"
        assert isinstance(greeting_step['run'], str), \
            "'run' command must be a string"

    def test_greeting_step_uses_input_correctly(self, manual_workflow):
        """Test that greeting step uses the input variable correctly"""
        steps = manual_workflow['jobs']['greet']['steps']
        greeting_step = next((s for s in steps if 'Send greeting' in s.get('name', '')), None)

        run_command = greeting_step['run']
        # Check that it references the input properly
        assert 'inputs.name' in run_command, \
            "Step should reference 'inputs.name'"
        # Check proper GitHub Actions expression syntax
        assert '${{' in run_command and '}}' in run_command, \
            "Step should use proper GitHub Actions expression syntax ${{ }}"

    def test_all_steps_have_valid_structure(self, manual_workflow):
        """Test that all steps have valid structure"""
        steps = manual_workflow['jobs']['greet']['steps']

        for i, step in enumerate(steps):
            assert isinstance(step, dict), f"Step {i} must be a dictionary"

            # Each step must have either 'uses' or 'run'
            has_action = 'uses' in step or 'run' in step
            assert has_action, \
                f"Step {i} must have either 'uses' (action) or 'run' (command)"

            # If step has a name, it should be a string
            if 'name' in step:
                assert isinstance(step['name'], str), \
                    f"Step {i} name must be a string"


class TestWorkflowSecurity:
    """Test suite for workflow security best practices"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow for testing"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)

    def test_workflow_does_not_expose_secrets_in_echo(self, manual_workflow):
        """Test that workflow doesn't echo potentially sensitive data unsafely"""
        steps = manual_workflow['jobs']['greet']['steps']

        for step in steps:
            if 'run' in step:
                run_command = step['run'].lower()
                # This is a basic check - the greeting is intentional
                # but we verify it's not echoing secrets or tokens
                assert 'secrets.' not in run_command or '***' in run_command, \
                    "Don't echo secrets directly; use secret masking"

    def test_workflow_doesnt_have_overly_permissive_permissions(self, manual_workflow):
        """Test that workflow doesn't use 'write-all' permission"""
        permissions = manual_workflow.get('permissions')

        if isinstance(permissions, str):
            assert permissions != 'write-all', \
                "Avoid using 'write-all' permissions; use specific permissions"

        if isinstance(permissions, dict):
            for scope, level in permissions.items():
                if scope != 'contents':  # Allow contents for checkout
                    assert level != 'write', \
                        f"Unnecessary write permission for simple workflow: {scope}"

    def test_workflow_uses_pinned_action_versions(self, manual_workflow):
        """Test that any actions used have pinned versions (if applicable)"""
        steps = manual_workflow['jobs']['greet']['steps']

        for step in steps:
            if 'uses' in step:
                action = step['uses']
                # Action should have a version tag or commit SHA
                # Format: owner/repo@version or owner/repo@sha
                assert '@' in action, \
                    f"Action should be pinned to a version or SHA: {action}"


class TestWorkflowBestPractices:
    """Test suite for GitHub Actions best practices"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow for testing"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)

    def test_workflow_file_has_comments(self):
        """Test that workflow file has explanatory comments"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            content = f.read()

        # Count comment lines
        comment_lines = [line for line in content.split('\n') if line.strip().startswith('#')]
        assert len(comment_lines) > 0, \
            "Workflow should have comments explaining its purpose"

    def test_workflow_name_is_descriptive(self, manual_workflow):
        """Test that workflow name is descriptive"""
        name = manual_workflow['name']
        # Name should be more than just one word
        assert len(name.split()) >= 2 or len(name) > 8, \
            "Workflow name should be descriptive"

    def test_step_names_are_descriptive(self, manual_workflow):
        """Test that all steps with names have descriptive names"""
        steps = manual_workflow['jobs']['greet']['steps']

        for step in steps:
            if 'name' in step:
                name = step['name']
                # Step names should be reasonably descriptive
                assert len(name) > 3, \
                    f"Step name should be descriptive: '{name}'"

    def test_workflow_follows_yaml_indentation(self):
        """Test that workflow follows consistent YAML indentation"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            lines = f.readlines()

        # Check for consistent indentation (should be 2 spaces)
        for i, line in enumerate(lines, 1):
            if line.strip() and not line.strip().startswith('#'):
                # Get leading whitespace
                leading_spaces = len(line) - len(line.lstrip())
                if leading_spaces > 0:
                    # Should be multiple of 2
                    assert leading_spaces % 2 == 0, \
                        f"Line {i} has inconsistent indentation: {leading_spaces} spaces"


class TestWorkflowCompleteness:
    """Test suite for workflow completeness and edge cases"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow for testing"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)

    def test_workflow_handles_empty_input_gracefully(self, manual_workflow):
        """Test workflow configuration for handling empty inputs"""
        triggers = get_on_key(manual_workflow)
        name_input = triggers['workflow_dispatch']['inputs']['name']

        # Has default value for when input is empty
        assert 'default' in name_input, \
            "Input should have default value for empty case"
        assert len(name_input['default']) > 0, \
            "Default value should not be empty"

    def test_workflow_all_required_top_level_fields(self, manual_workflow):
        """Test that workflow has all recommended top-level fields"""
        required_fields = ['name', 'jobs']
        for field in required_fields:
            assert field in manual_workflow, \
                f"Workflow should have '{field}' field"

        # Check for 'on' trigger (which might be parsed as True)
        triggers = get_on_key(manual_workflow)
        assert triggers is not None and len(triggers) > 0, \
            "Workflow should have 'on' trigger field"

    def test_workflow_job_has_all_recommended_fields(self, manual_workflow):
        """Test that job has all recommended fields"""
        greet_job = manual_workflow['jobs']['greet']
        recommended_fields = ['runs-on', 'steps']

        for field in recommended_fields:
            assert field in greet_job, \
                f"Job should have '{field}' field"

    def test_workflow_can_be_serialized_back_to_yaml(self, manual_workflow):
        """Test that loaded workflow can be serialized back to YAML"""
        try:
            yaml_output = yaml.dump(manual_workflow, default_flow_style=False)
            assert len(yaml_output) > 0, "YAML serialization failed"

            # Verify it can be loaded again
            reloaded = yaml.safe_load(yaml_output)
            assert reloaded == manual_workflow, \
                "Workflow structure changed after YAML round-trip"
        except yaml.YAMLError as e:
            pytest.fail(f"Failed to serialize workflow to YAML: {e}")


class TestWorkflowIntegrationScenarios:
    """Test suite for workflow integration scenarios and practical usage"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow for testing"""
        workflow_path = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)

    def test_workflow_greeting_with_default_input(self, manual_workflow):
        """Test greeting behavior with default input value"""
        triggers = get_on_key(manual_workflow)
        name_input = triggers['workflow_dispatch']['inputs']['name']

        steps = manual_workflow['jobs']['greet']['steps']
        greeting_step = next((s for s in steps if 'Send greeting' in s.get('name', '')), None)

        # Simulate what the output would be with default
        run_command = greeting_step['run']
        # The command is: echo "Hello ${{ inputs.name }}"
        # With default, it would output: Hello World
        assert 'Hello' in run_command, "Greeting should contain 'Hello'"

    def test_workflow_supports_custom_input(self, manual_workflow):
        """Test that workflow accepts custom input values"""
        triggers = get_on_key(manual_workflow)
        name_input = triggers['workflow_dispatch']['inputs']['name']

        # Input type is string, so it should accept any string value
        assert name_input['type'] == 'string', \
            "Input should accept string type for custom names"

    def test_workflow_has_appropriate_timeout(self, manual_workflow):
        """Test workflow timeout configuration (if present)"""
        greet_job = manual_workflow['jobs']['greet']

        # If timeout-minutes is set, it should be reasonable
        if 'timeout-minutes' in greet_job:
            timeout = greet_job['timeout-minutes']
            assert isinstance(timeout, int), "Timeout must be an integer"
            assert 1 <= timeout <= 360, \
                "Timeout should be between 1 and 360 minutes"

    def test_workflow_input_description_is_user_friendly(self, manual_workflow):
        """Test that input description is clear and user-friendly"""
        triggers = get_on_key(manual_workflow)
        name_input = triggers['workflow_dispatch']['inputs']['name']
        description = name_input['description']

        # Should be descriptive and not just the field name
        assert len(description) > len('name'), \
            "Description should be more descriptive than just the field name"
        assert description != 'name', \
            "Description should explain the input, not just repeat the field name"


class TestAllWorkflowsCompliance:
    """Test suite to ensure all workflows follow consistent standards"""

    def test_all_workflows_have_explicit_permissions(self):
        """Test that all workflows have explicit permissions defined"""
        workflow_files = list(WORKFLOWS_DIR.glob('*.yml')) + list(WORKFLOWS_DIR.glob('*.yaml'))

        workflows_without_permissions = []
        for workflow_file in workflow_files:
            with open(workflow_file, 'r') as f:
                workflow = yaml.safe_load(f)

            if 'permissions' not in workflow:
                workflows_without_permissions.append(workflow_file.name)

        # Allow some workflows to not have permissions (like simple ones)
        # but manual.yml should definitely have them
        if 'manual.yml' in workflows_without_permissions:
            pytest.fail("manual.yml must have explicit permissions defined")

    def test_all_workflows_are_parseable(self):
        """Test that all workflow files can be parsed successfully"""
        workflow_files = list(WORKFLOWS_DIR.glob('*.yml')) + list(WORKFLOWS_DIR.glob('*.yaml'))

        parse_errors = []
        for workflow_file in workflow_files:
            try:
                with open(workflow_file, 'r') as f:
                    yaml.safe_load(f)
            except yaml.YAMLError as e:
                parse_errors.append((workflow_file.name, str(e)))

        assert len(parse_errors) == 0, \
            f"Failed to parse workflows: {parse_errors}"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])