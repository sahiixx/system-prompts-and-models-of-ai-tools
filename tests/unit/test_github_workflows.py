#\!/usr/bin/env python3
"""
Comprehensive unit tests for GitHub Actions workflow files.
Tests workflow structure, permissions, security best practices, and YAML validity.
"""

import pytest
import yaml
import sys
from pathlib import Path
from typing import Dict, Any, List

# Workflows directory path relative to repository root
WORKFLOWS_DIR = Path(__file__).parent.parent.parent / '.github' / 'workflows'


def get_trigger_key(workflow: Dict[str, Any]) -> Any:
    """
    Get the trigger key from a workflow, handling YAML's parsing of 'on' as boolean.
    YAML interprets 'on:' as True, so we need to check for both 'on' and True.
    """
    if 'on' in workflow:
        return 'on'
    elif True in workflow:
        return True
    return None


class TestWorkflowYAMLValidity:
    """Test suite for YAML validity of workflow files"""

    @pytest.fixture
    def workflow_files(self):
        """Get all workflow YAML files"""
        return list(WORKFLOWS_DIR.glob('*.yml')) + list(WORKFLOWS_DIR.glob('*.yaml'))

    def test_workflows_directory_exists(self):
        """Test that workflows directory exists"""
        assert WORKFLOWS_DIR.exists(), f"Workflows directory not found at {WORKFLOWS_DIR}"
        assert WORKFLOWS_DIR.is_dir(), f"Workflows path is not a directory: {WORKFLOWS_DIR}"

    def test_workflow_files_exist(self, workflow_files):
        """Test that workflow files exist in the directory"""
        assert len(workflow_files) > 0, "No workflow files found in .github/workflows/"

    def test_all_workflows_are_valid_yaml(self, workflow_files):
        """Test that all workflow files are valid YAML"""
        for workflow_file in workflow_files:
            with open(workflow_file, 'r') as f:
                try:
                    yaml.safe_load(f)
                except yaml.YAMLError as e:
                    pytest.fail(f"Invalid YAML in {workflow_file.name}: {e}")

    def test_workflows_have_no_tabs(self, workflow_files):
        """Test that workflow files don't contain tabs (YAML best practice)"""
        for workflow_file in workflow_files:
            with open(workflow_file, 'r') as f:
                content = f.read()
                assert '\t' not in content, f"Workflow {workflow_file.name} contains tab characters. Use spaces for indentation."

    def test_workflows_use_consistent_indentation(self, workflow_files):
        """Test that workflow files use consistent indentation (2 spaces)"""
        for workflow_file in workflow_files:
            with open(workflow_file, 'r') as f:
                lines = f.readlines()
                for i, line in enumerate(lines, 1):
                    if line.strip() and line.startswith(' '):
                        # Count leading spaces
                        spaces = len(line) - len(line.lstrip())
                        if spaces % 2 \!= 0:
                            pytest.fail(
                                f"Inconsistent indentation in {workflow_file.name}:{i} "
                                f"(expected multiple of 2 spaces, got {spaces})"
                            )


class TestManualWorkflow:
    """Test suite specifically for manual.yml workflow"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow file"""
        workflow_file = WORKFLOWS_DIR / 'manual.yml'
        assert workflow_file.exists(), "manual.yml not found"
        with open(workflow_file, 'r') as f:
            return yaml.safe_load(f)

    def test_manual_workflow_has_name(self, manual_workflow):
        """Test that manual workflow has a name"""
        assert 'name' in manual_workflow, "Workflow must have a 'name' field"
        assert manual_workflow['name'] == 'Manual workflow'

    def test_manual_workflow_has_permissions(self, manual_workflow):
        """Test that manual workflow has top-level permissions defined"""
        assert 'permissions' in manual_workflow, (
            "Workflow must have 'permissions' field for security best practices. "
            "This was added in the recent change."
        )

    def test_manual_workflow_permissions_contents_read(self, manual_workflow):
        """Test that manual workflow has contents: read permission"""
        assert 'permissions' in manual_workflow
        assert 'contents' in manual_workflow['permissions']
        assert manual_workflow['permissions']['contents'] == 'read', (
            "Workflow should have 'contents: read' permission (principle of least privilege)"
        )

    def test_manual_workflow_is_manually_triggered(self, manual_workflow):
        """Test that workflow is configured for manual triggering"""
        trigger_key = get_trigger_key(manual_workflow)
        assert trigger_key is not None, "Workflow must have trigger configuration"
        assert 'workflow_dispatch' in manual_workflow[trigger_key]

    def test_manual_workflow_has_input_parameters(self, manual_workflow):
        """Test that workflow_dispatch has input parameters"""
        trigger_key = get_trigger_key(manual_workflow)
        assert trigger_key is not None
        dispatch_config = manual_workflow[trigger_key]['workflow_dispatch']

        assert 'inputs' in dispatch_config, "workflow_dispatch should have inputs defined"
        assert 'name' in dispatch_config['inputs'], "Should have 'name' input parameter"

    def test_manual_workflow_input_name_structure(self, manual_workflow):
        """Test that name input parameter has correct structure"""
        trigger_key = get_trigger_key(manual_workflow)
        name_input = manual_workflow[trigger_key]['workflow_dispatch']['inputs']['name']

        assert 'description' in name_input
        assert name_input['description'] == 'Person to greet'

        assert 'default' in name_input
        assert name_input['default'] == 'World'

        assert 'required' in name_input
        assert name_input['required'] is True

        assert 'type' in name_input
        assert name_input['type'] == 'string'

    def test_manual_workflow_has_jobs(self, manual_workflow):
        """Test that workflow has jobs defined"""
        assert 'jobs' in manual_workflow
        assert len(manual_workflow['jobs']) > 0

    def test_manual_workflow_greet_job_exists(self, manual_workflow):
        """Test that greet job exists"""
        assert 'greet' in manual_workflow['jobs']

    def test_manual_workflow_greet_job_structure(self, manual_workflow):
        """Test greet job has correct structure"""
        greet_job = manual_workflow['jobs']['greet']

        assert 'runs-on' in greet_job
        assert greet_job['runs-on'] == 'ubuntu-latest'

        assert 'steps' in greet_job
        assert len(greet_job['steps']) > 0

    def test_manual_workflow_greet_step_uses_input(self, manual_workflow):
        """Test that greeting step uses the input parameter"""
        greet_job = manual_workflow['jobs']['greet']
        steps = greet_job['steps']

        assert len(steps) > 0
        greeting_step = steps[0]

        assert 'name' in greeting_step
        assert greeting_step['name'] == 'Send greeting'

        assert 'run' in greeting_step
        assert '${{ inputs.name }}' in greeting_step['run']


class TestWorkflowSecurityBestPractices:
    """Test suite for security best practices across all workflows"""

    @pytest.fixture
    def all_workflows(self):
        """Load all workflow files"""
        workflows = {}
        for workflow_file in WORKFLOWS_DIR.glob('*.yml'):
            with open(workflow_file, 'r') as f:
                workflows[workflow_file.name] = yaml.safe_load(f)
        return workflows

    def test_workflows_have_explicit_permissions(self, all_workflows):
        """Test that all workflows have explicit permissions defined"""
        workflows_without_permissions = []

        for name, workflow in all_workflows.items():
            if 'permissions' not in workflow:
                workflows_without_permissions.append(name)

        assert len(workflows_without_permissions) == 0, (
            f"The following workflows lack explicit permissions (security best practice): "
            f"{', '.join(workflows_without_permissions)}"
        )

    def test_workflows_use_pinned_action_versions(self, all_workflows):
        """Test that workflows use pinned versions for actions"""
        for name, workflow in all_workflows.items():
            if 'jobs' in workflow:
                for job_name, job in workflow['jobs'].items():
                    if 'steps' in job:
                        for step in job['steps']:
                            if 'uses' in step:
                                action = step['uses']
                                # Check if action has a version (either @vX or @sha)
                                if '@' not in action:
                                    pytest.fail(
                                        f"Action in {name} (job: {job_name}) is not pinned: {action}. "
                                        f"Use @vX or @sha for security."
                                    )

    def test_workflows_dont_use_write_all_permissions(self, all_workflows):
        """Test that workflows don't use overly broad permissions"""
        dangerous_permissions = ['write-all']

        for name, workflow in all_workflows.items():
            if 'permissions' in workflow:
                perms = workflow['permissions']

                # Check for string-based write-all
                if isinstance(perms, str):
                    assert perms not in dangerous_permissions, (
                        f"Workflow {name} uses overly broad permission: {perms}"
                    )

    def test_manual_workflow_follows_least_privilege(self, all_workflows):
        """Test that manual.yml specifically follows principle of least privilege"""
        manual_workflow = all_workflows.get('manual.yml')
        assert manual_workflow is not None

        permissions = manual_workflow.get('permissions', {})

        # Verify only necessary permissions are granted
        assert permissions.get('contents') == 'read', (
            "manual.yml should have 'contents: read' as it only needs to read code"
        )

        # Ensure no write permissions unless necessary
        for scope, perm in permissions.items():
            if perm == 'write':
                pytest.fail(
                    f"manual.yml has write permission for {scope}, "
                    f"but it only echoes input and shouldn't need write access"
                )


class TestWorkflowStructure:
    """Test suite for general workflow structure and best practices"""

    @pytest.fixture
    def all_workflows(self):
        """Load all workflow files"""
        workflows = {}
        for workflow_file in WORKFLOWS_DIR.glob('*.yml'):
            with open(workflow_file, 'r') as f:
                workflows[workflow_file.name] = yaml.safe_load(f)
        return workflows

    def test_workflows_have_name_field(self, all_workflows):
        """Test that all workflows have a name field"""
        for name, workflow in all_workflows.items():
            assert 'name' in workflow, f"Workflow {name} is missing 'name' field"
            assert workflow['name'], f"Workflow {name} has empty name"

    def test_workflows_have_triggers(self, all_workflows):
        """Test that all workflows have trigger conditions"""
        for name, workflow in all_workflows.items():
            trigger_key = get_trigger_key(workflow)
            assert trigger_key is not None, f"Workflow {name} is missing trigger definition"

    def test_workflows_have_jobs(self, all_workflows):
        """Test that all workflows have at least one job"""
        for name, workflow in all_workflows.items():
            assert 'jobs' in workflow, f"Workflow {name} has no jobs defined"
            assert len(workflow['jobs']) > 0, f"Workflow {name} has empty jobs section"

    def test_workflow_jobs_have_runs_on(self, all_workflows):
        """Test that all jobs specify a runner"""
        for workflow_name, workflow in all_workflows.items():
            if 'jobs' in workflow:
                for job_name, job in workflow['jobs'].items():
                    assert 'runs-on' in job or 'uses' in job, (
                        f"Job {job_name} in {workflow_name} must specify 'runs-on' or 'uses'"
                    )

    def test_workflow_steps_have_names_or_uses(self, all_workflows):
        """Test that all steps have either a name or uses field"""
        for workflow_name, workflow in all_workflows.items():
            if 'jobs' in workflow:
                for job_name, job in workflow['jobs'].items():
                    if 'steps' in job:
                        for i, step in enumerate(job['steps']):
                            assert 'name' in step or 'uses' in step or 'run' in step, (
                                f"Step {i} in job {job_name} of {workflow_name} "
                                f"should have 'name', 'uses', or 'run'"
                            )


class TestManualWorkflowEdgeCases:
    """Test edge cases and failure scenarios for manual workflow"""

    @pytest.fixture
    def manual_workflow_path(self):
        """Get the path to manual.yml"""
        return WORKFLOWS_DIR / 'manual.yml'

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow file"""
        workflow_file = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_file, 'r') as f:
            return yaml.safe_load(f)

    def test_manual_workflow_file_is_readable(self, manual_workflow_path):
        """Test that manual.yml is readable"""
        assert manual_workflow_path.exists()
        assert manual_workflow_path.is_file()

        # Try to read the file
        with open(manual_workflow_path, 'r') as f:
            content = f.read()
            assert len(content) > 0

    def test_manual_workflow_no_syntax_errors(self, manual_workflow_path):
        """Test that manual.yml has no YAML syntax errors"""
        with open(manual_workflow_path, 'r') as f:
            try:
                workflow = yaml.safe_load(f)
                assert workflow is not None
            except yaml.YAMLError as e:
                pytest.fail(f"YAML syntax error in manual.yml: {e}")

    def test_manual_workflow_permissions_format(self, manual_workflow):
        """Test that permissions are in correct format"""
        assert 'permissions' in manual_workflow
        permissions = manual_workflow['permissions']

        # Permissions should be a dict
        assert isinstance(permissions, dict), (
            "permissions should be a dictionary, not a string"
        )

        # All permission values should be valid
        valid_values = ['read', 'write', 'none']
        for scope, value in permissions.items():
            assert value in valid_values, (
                f"Permission value '{value}' for scope '{scope}' is invalid. "
                f"Must be one of: {valid_values}"
            )

    def test_manual_workflow_input_validation(self, manual_workflow):
        """Test that input parameters have proper validation"""
        trigger_key = get_trigger_key(manual_workflow)
        inputs = manual_workflow[trigger_key]['workflow_dispatch']['inputs']

        for input_name, input_config in inputs.items():
            # Required inputs should be explicitly marked
            if input_config.get('required'):
                assert 'description' in input_config, (
                    f"Required input '{input_name}' should have a description"
                )

            # Type should be specified
            assert 'type' in input_config, (
                f"Input '{input_name}' should specify a type"
            )

            # Type should be valid
            valid_types = ['boolean', 'choice', 'string', 'number', 'environment']
            assert input_config['type'] in valid_types, (
                f"Input '{input_name}' has invalid type: {input_config['type']}"
            )

    def test_manual_workflow_handles_special_input_characters(self, manual_workflow):
        """Test that workflow can handle special characters in input"""
        trigger_key = get_trigger_key(manual_workflow)
        inputs = manual_workflow[trigger_key]['workflow_dispatch']['inputs']

        # Check that string inputs don't restrict special characters unnecessarily
        for _input_name, input_config in inputs.items():
            if input_config.get('type') == 'string':
                # No pattern restrictions that would prevent reasonable input
                assert 'pattern' not in input_config or len(input_config['pattern']) > 0


class TestManualWorkflowIntegration:
    """Integration tests for manual workflow"""

    @pytest.fixture
    def manual_workflow(self):
        """Load the manual workflow file"""
        workflow_file = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_file, 'r') as f:
            return yaml.safe_load(f)

    def test_manual_workflow_permissions_position(self):
        """Test that permissions are defined at the top level (after name)"""
        workflow_file = WORKFLOWS_DIR / 'manual.yml'

        with open(workflow_file, 'r') as f:
            lines = f.readlines()

        # Find the line numbers for key sections
        name_line = -1
        permissions_line = -1
        on_line = -1

        for i, line in enumerate(lines):
            if line.strip().startswith('name:'):
                name_line = i
            elif line.strip().startswith('permissions:'):
                permissions_line = i
            elif line.strip().startswith('on:'):
                on_line = i

        # Permissions should come after name and before on
        assert name_line >= 0, "Workflow must have a name"
        assert permissions_line >= 0, "Workflow must have permissions"
        assert on_line >= 0, "Workflow must have on triggers"

        assert name_line < permissions_line, (
            "permissions should be defined after name"
        )
        assert permissions_line < on_line, (
            "permissions should be defined before on triggers"
        )

    def test_manual_workflow_comments_preserved(self):
        """Test that helpful comments are preserved in the workflow"""
        workflow_file = WORKFLOWS_DIR / 'manual.yml'

        with open(workflow_file, 'r') as f:
            content = f.read()

        # Check for important comments
        assert '# This is a basic workflow' in content or 'basic workflow' in content.lower()
        assert '# Controls when' in content or 'when the action will run' in content.lower()

    def test_manual_workflow_complete_structure(self, manual_workflow):
        """Test complete structure of manual workflow end-to-end"""
        # Verify complete structure
        assert 'name' in manual_workflow
        assert 'permissions' in manual_workflow
        assert 'contents' in manual_workflow['permissions']
        assert manual_workflow['permissions']['contents'] == 'read'

        trigger_key = get_trigger_key(manual_workflow)
        assert trigger_key is not None
        assert 'workflow_dispatch' in manual_workflow[trigger_key]

        assert 'jobs' in manual_workflow
        assert 'greet' in manual_workflow['jobs']

        greet_job = manual_workflow['jobs']['greet']
        assert 'runs-on' in greet_job
        assert 'steps' in greet_job
        assert len(greet_job['steps']) > 0


class TestWorkflowComparison:
    """Test suite comparing manual.yml with other workflows"""

    @pytest.fixture
    def all_workflows(self):
        """Load all workflow files"""
        workflows = {}
        for workflow_file in WORKFLOWS_DIR.glob('*.yml'):
            with open(workflow_file, 'r') as f:
                workflows[workflow_file.name] = yaml.safe_load(f)
        return workflows

    def test_manual_workflow_permissions_consistency(self, all_workflows):
        """Test that manual.yml permissions are consistent with similar workflows"""
        manual_workflow = all_workflows.get('manual.yml')

        # Manual workflow should have more restrictive permissions than deployment workflows
        deployment_workflows = [
            'deploy.yml', 'pages.yml', 'static.yml', 'jekyll-gh-pages.yml'
        ]

        for deploy_workflow_name in deployment_workflows:
            if deploy_workflow_name in all_workflows:
                deploy_workflow = all_workflows[deploy_workflow_name]

                # Deployment workflows should have write permissions
                if 'permissions' in deploy_workflow:
                    deploy_perms = deploy_workflow['permissions']

                    # Manual workflow should NOT have write permissions like deploy workflows do
                    manual_perms = manual_workflow.get('permissions', {})

                    if 'pages' in deploy_perms or 'id-token' in deploy_perms:
                        assert 'pages' not in manual_perms or manual_perms.get('pages') \!= 'write', (
                            "manual.yml should not have pages write permission "
                            "(it's not a deployment workflow)"
                        )

    def test_all_manually_triggered_workflows_have_permissions(self, all_workflows):
        """Test that all workflow_dispatch workflows have explicit permissions"""
        for name, workflow in all_workflows.items():
            trigger_key = get_trigger_key(workflow)
            if trigger_key is not None:
                triggers = workflow[trigger_key]

                # If workflow can be manually triggered
                if isinstance(triggers, dict) and 'workflow_dispatch' in triggers:
                    assert 'permissions' in workflow, (
                        f"Manually triggered workflow {name} should have explicit permissions"
                    )


class TestWorkflowYAMLQuirks:
    """Test suite for handling YAML parsing quirks"""

    @pytest.fixture
    def manual_workflow_raw(self):
        """Read manual workflow as raw text"""
        workflow_file = WORKFLOWS_DIR / 'manual.yml'
        with open(workflow_file, 'r') as f:
            return f.read()

    def test_workflow_uses_on_keyword_correctly(self, manual_workflow_raw):
        """Test that workflow file contains 'on:' keyword in raw form"""
        # The raw file should have 'on:' even if YAML parses it as True
        assert 'on:' in manual_workflow_raw, "Workflow should use 'on:' trigger keyword"

    def test_workflow_on_keyword_not_quoted(self, manual_workflow_raw):
        """Test that 'on' is not unnecessarily quoted"""
        # It's valid to not quote 'on' in YAML, GitHub Actions handles it
        lines = manual_workflow_raw.split('\n')
        for line in lines:
            if line.strip().startswith('on:'):
                # Check it's not quoted
                assert '"on"' not in line and "'on'" not in line, (
                    "The 'on' keyword doesn't need to be quoted in GitHub Actions"
                )


# Mark all tests in this module as unit tests
pytestmark = pytest.mark.unit