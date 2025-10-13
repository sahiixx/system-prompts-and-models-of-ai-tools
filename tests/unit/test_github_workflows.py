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


class TestPagesWorkflow:
    """Comprehensive test suite for pages.yml workflow (the main deployment workflow)"""
    
    @pytest.fixture
    def workflows_dir(self):
        """Locate the repository's GitHub workflows directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def pages_workflow(self, workflows_dir):
        """Load and parse the pages.yml workflow file."""
        with open(workflows_dir / 'pages.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_pages_workflow_exists(self, workflows_dir):
        """Test that pages.yml workflow file exists"""
        pages_yml = workflows_dir / 'pages.yml'
        assert pages_yml.exists(), "pages.yml should exist"
        assert pages_yml.is_file(), "pages.yml should be a file"
    
    def test_pages_workflow_valid_yaml(self, workflows_dir):
        """Test that pages.yml is valid YAML"""
        try:
            with open(workflows_dir / 'pages.yml', 'r') as f:
                yaml.safe_load(f)
        except yaml.YAMLError as e:
            pytest.fail(f"pages.yml is not valid YAML: {e}")
    
    def test_pages_workflow_has_name(self, pages_workflow):
        """Test that workflow has a descriptive name"""
        assert 'name' in pages_workflow, "Workflow must have a name"
        assert isinstance(pages_workflow['name'], str), "Workflow name must be a string"
        assert len(pages_workflow['name']) > 0, "Workflow name must not be empty"
        # Ensure it's not deprecated
        assert 'deprecated' not in pages_workflow['name'].lower(), "pages.yml should not be deprecated"
    
    def test_pages_workflow_has_push_trigger(self, pages_workflow):
        """Test that workflow triggers on push to main branch"""
        on_config = pages_workflow.get('on', pages_workflow.get(True, {}))
        assert 'push' in on_config, "Should trigger on push"
        push_config = on_config['push']
        assert 'branches' in push_config, "Push should specify branches"
        assert 'main' in push_config['branches'], "Should deploy on main branch"
    
    def test_pages_workflow_has_permissions(self, pages_workflow):
        """Test that workflow defines GitHub Pages permissions"""
        assert 'permissions' in pages_workflow, "Workflow should define permissions"
        permissions = pages_workflow['permissions']
        assert 'contents' in permissions, "Should have contents permission"
        assert 'pages' in permissions, "Should have pages permission for deployment"
        assert 'id-token' in permissions, "Should have id-token permission for Pages"
        assert permissions['pages'] == 'write', "Pages permission should be write"
    
    def test_pages_workflow_has_concurrency(self, pages_workflow):
        """Test that workflow has concurrency control"""
        assert 'concurrency' in pages_workflow, "Should have concurrency control"
        concurrency = pages_workflow['concurrency']
        assert 'group' in concurrency, "Concurrency should have a group"
        assert 'cancel-in-progress' in concurrency, "Should specify cancel-in-progress"
        assert concurrency['cancel-in-progress'] is False, "Should not cancel pages deployment"
    
    def test_pages_workflow_has_build_job(self, pages_workflow):
        """Test that workflow has a build job"""
        assert 'jobs' in pages_workflow, "Workflow must have jobs"
        jobs = pages_workflow['jobs']
        assert 'build' in jobs, "Should have 'build' job"
        build_job = jobs['build']
        assert 'runs-on' in build_job, "Build job must specify runs-on"
        assert 'ubuntu' in build_job['runs-on'], "Should run on Ubuntu"
    
    def test_pages_workflow_build_steps(self, pages_workflow):
        """Test that build job has all required steps"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        
        # Check for required steps
        step_names = [step.get('name', '') for step in steps if 'name' in step]
        
        # Should checkout code
        assert any('checkout' in name.lower() for name in step_names), "Should checkout code"
        
        # Should setup Node.js
        assert any('node' in name.lower() or 'setup' in name.lower() for name in step_names), "Should setup Node.js"
        
        # Should setup Python (NEW in this change)
        assert any('python' in name.lower() for name in step_names), "Should setup Python"
        
        # Should install dependencies
        assert any('install' in name.lower() or 'dependencies' in name.lower() for name in step_names), "Should install dependencies"
        
        # Should generate metadata (NEW in this change)
        assert any('metadata' in name.lower() for name in step_names), "Should generate metadata"
        
        # Should generate API (NEW in this change)
        assert any('api' in name.lower() for name in step_names), "Should generate API endpoints"
        
        # Should build site
        assert any('build' in name.lower() for name in step_names), "Should build the site"
        
        # Should upload artifact
        assert any('upload' in name.lower() for name in step_names), "Should upload Pages artifact"
    
    def test_pages_workflow_python_setup(self, pages_workflow):
        """Test that Python setup step is properly configured"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        
        python_step = next((s for s in steps if 'python' in s.get('name', '').lower()), None)
        assert python_step is not None, "Should have Python setup step"
        assert 'uses' in python_step, "Python step should use an action"
        assert 'setup-python' in python_step['uses'], "Should use setup-python action"
        assert 'with' in python_step, "Should specify Python configuration"
        assert 'python-version' in python_step['with'], "Should specify Python version"
    
    def test_pages_workflow_metadata_generation(self, pages_workflow):
        """Test that metadata generation step is included"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        
        metadata_step = next((s for s in steps if 'metadata' in s.get('name', '').lower()), None)
        assert metadata_step is not None, "Should have metadata generation step"
        assert 'run' in metadata_step, "Metadata step should have run command"
        assert 'generate-metadata.py' in metadata_step['run'], "Should run generate-metadata.py"
    
    def test_pages_workflow_api_generation(self, pages_workflow):
        """Test that API generation step is included"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        
        api_step = next((s for s in steps if 'api' in s.get('name', '').lower() and 'generate' in s.get('name', '').lower()), None)
        assert api_step is not None, "Should have API generation step"
        assert 'run' in api_step, "API step should have run command"
        assert 'generate-api.py' in api_step['run'], "Should run generate-api.py"
    
    def test_pages_workflow_api_inclusion(self, pages_workflow):
        """Test that API files are included in the artifact"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        
        # Check for step that includes API in artifact
        api_include_step = next((s for s in steps if 'api' in s.get('name', '').lower() and 'artifact' in s.get('name', '').lower()), None)
        assert api_include_step is not None, "Should have step to include API in artifact"
        assert 'run' in api_include_step, "Should have run command"
        # Should copy API files to dist
        assert 'cp' in api_include_step['run'] or 'copy' in api_include_step['run'].lower(), "Should copy API files"
        assert 'api' in api_include_step['run'], "Should reference api directory"
    
    def test_pages_workflow_has_deploy_job(self, pages_workflow):
        """Test that workflow has a deploy job"""
        jobs = pages_workflow['jobs']
        assert 'deploy' in jobs, "Should have 'deploy' job"
        deploy_job = jobs['deploy']
        assert 'needs' in deploy_job, "Deploy should depend on build"
        assert 'build' in deploy_job['needs'], "Deploy should need build job"
    
    def test_pages_workflow_deploy_environment(self, pages_workflow):
        """Test that deploy job has proper environment configuration"""
        deploy_job = pages_workflow['jobs']['deploy']
        assert 'environment' in deploy_job, "Deploy should specify environment"
        environment = deploy_job['environment']
        assert environment['name'] == 'github-pages', "Should deploy to github-pages"
        assert 'url' in environment, "Should specify deployment URL"
    
    def test_pages_workflow_deploy_step(self, pages_workflow):
        """Test that deploy job uses deploy-pages action"""
        deploy_job = pages_workflow['jobs']['deploy']
        steps = deploy_job['steps']
        assert len(steps) > 0, "Deploy job should have steps"
        
        deploy_step = steps[0]
        assert 'uses' in deploy_step, "Should use deploy-pages action"
        assert 'deploy-pages' in deploy_step['uses'], "Should use GitHub's deploy-pages action"
    
    def test_pages_workflow_node_version(self, pages_workflow):
        """Test that Node.js version is specified correctly"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        
        node_step = next((s for s in steps if 'node' in s.get('name', '').lower()), None)
        assert node_step is not None, "Should have Node.js setup step"
        if 'with' in node_step and 'node-version' in node_step['with']:
            version = node_step['with']['node-version']
            assert version in ['20', '22', 'lts/*', 'latest'], f"Node version {version} should be reasonable"
    
    def test_pages_workflow_step_ordering(self, pages_workflow):
        """Test that build steps are in logical order"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        step_names = [s.get('name', '').lower() for s in steps if 'name' in s]
        
        # Checkout should come first
        checkout_idx = next((i for i, name in enumerate(step_names) if 'checkout' in name), -1)
        assert checkout_idx == 0, "Checkout should be first step"
        
        # Setup steps should come before generation
        node_idx = next((i for i, name in enumerate(step_names) if 'node' in name), -1)
        python_idx = next((i for i, name in enumerate(step_names) if 'python' in name), -1)
        metadata_idx = next((i for i, name in enumerate(step_names) if 'metadata' in name), -1)
        
        assert node_idx < metadata_idx, "Node setup should come before metadata generation"
        assert python_idx < metadata_idx, "Python setup should come before metadata generation"
        
        # Generation should come before build
        api_idx = next((i for i, name in enumerate(step_names) if 'api' in name and 'generate' in name), -1)
        build_idx = next((i for i, name in enumerate(step_names) if 'build' in name and 'site' in name), -1)
        
        if api_idx != -1 and build_idx != -1:
            assert api_idx < build_idx, "API generation should come before site build"


class TestDeprecatedDeployWorkflow:
    """Test suite for the deprecated deploy.yml workflow"""
    
    @pytest.fixture
    def workflows_dir(self):
        """Locate the repository's GitHub workflows directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def deploy_workflow(self, workflows_dir):
        """Load and parse the deploy.yml workflow file."""
        with open(workflows_dir / 'deploy.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_deploy_workflow_exists(self, workflows_dir):
        """Test that deploy.yml still exists"""
        deploy_yml = workflows_dir / 'deploy.yml'
        assert deploy_yml.exists(), "deploy.yml should exist for backward compatibility"
    
    def test_deploy_workflow_marked_deprecated(self, deploy_workflow):
        """Test that workflow name indicates deprecation"""
        assert 'name' in deploy_workflow, "Workflow must have a name"
        name = deploy_workflow['name'].lower()
        assert 'deprecated' in name or 'noop' in name, "Deploy workflow should be marked as deprecated"
    
    def test_deploy_workflow_no_push_trigger(self, deploy_workflow):
        """Test that deprecated workflow doesn't trigger on push"""
        on_config = deploy_workflow.get('on', deploy_workflow.get(True, {}))
        # Should only have workflow_dispatch
        assert 'push' not in on_config, "Deprecated workflow should not trigger on push"
        assert 'pull_request' not in on_config, "Deprecated workflow should not trigger on PR"
        assert 'workflow_dispatch' in on_config, "Should allow manual trigger for testing"
    
    def test_deploy_workflow_minimal_job(self, deploy_workflow):
        """Test that deprecated workflow has minimal noop job"""
        assert 'jobs' in deploy_workflow, "Workflow must have jobs"
        jobs = deploy_workflow['jobs']
        
        # Should have a simple noop job
        assert 'noop' in jobs or len(jobs) == 1, "Should have noop or single minimal job"
        
        # Get the first job (whatever it's called)
        job_name = next(iter(jobs.keys()))
        job = jobs[job_name]
        
        assert 'runs-on' in job, "Job must specify runs-on"
        steps = job.get('steps', [])
        
        # Should have minimal or no steps
        assert len(steps) <= 1, "Deprecated workflow should have minimal steps"
        
        # If it has a step, it should just echo a message
        if len(steps) == 1:
            step = steps[0]
            assert 'run' in step, "Step should have run command"
            assert 'deprecated' in step['run'].lower() or 'pages.yml' in step['run'].lower(), "Should mention deprecation"
    
    def test_deploy_workflow_no_build_logic(self, deploy_workflow):
        """Test that deprecated workflow has no actual build logic"""
        jobs = deploy_workflow['jobs']
        job_name = next(iter(jobs.keys()))
        job = jobs[job_name]
        steps = job.get('steps', [])
        
        # Should not have actual build steps
        step_content = ' '.join([str(s) for s in steps]).lower()
        assert 'npm install' not in step_content, "Should not install dependencies"
        assert 'npm run build' not in step_content, "Should not build site"
        assert 'python' not in step_content or 'setup-python' not in step_content, "Should not setup Python"
        assert 'deploy-pages' not in step_content, "Should not deploy to Pages"


class TestOtherWorkflowUpdates:
    """Test suite for other workflow file updates"""
    
    @pytest.fixture
    def workflows_dir(self):
        """Locate the repository's GitHub workflows directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    def test_jekyll_pages_workflow_exists(self, workflows_dir):
        """Test that jekyll-gh-pages.yml exists"""
        jekyll_yml = workflows_dir / 'jekyll-gh-pages.yml'
        assert jekyll_yml.exists(), "jekyll-gh-pages.yml should exist"
    
    def test_static_workflow_exists(self, workflows_dir):
        """Test that static.yml exists"""
        static_yml = workflows_dir / 'static.yml'
        assert static_yml.exists(), "static.yml should exist"
    
    def test_all_workflows_valid_yaml(self, workflows_dir):
        """Test that all workflow files are valid YAML"""
        workflow_files = list(workflows_dir.glob('*.yml')) + list(workflows_dir.glob('*.yaml'))
        assert len(workflow_files) > 0, "Should have workflow files"
        
        for workflow_file in workflow_files:
            try:
                with open(workflow_file, 'r') as f:
                    yaml.safe_load(f)
            except yaml.YAMLError as e:
                pytest.fail(f"{workflow_file.name} is not valid YAML: {e}")
    
    def test_workflows_have_names(self, workflows_dir):
        """Test that all workflows have descriptive names"""
        workflow_files = list(workflows_dir.glob('*.yml')) + list(workflows_dir.glob('*.yaml'))
        
        for workflow_file in workflow_files:
            with open(workflow_file, 'r') as f:
                workflow = yaml.safe_load(f)
            assert 'name' in workflow, f"{workflow_file.name} must have a name"
            assert len(workflow['name']) > 0, f"{workflow_file.name} name must not be empty"
    
    def test_workflows_have_permissions(self, workflows_dir):
        """Test that workflows define explicit permissions (security best practice)"""
        workflow_files = list(workflows_dir.glob('*.yml')) + list(workflows_dir.glob('*.yaml'))
        
        for workflow_file in workflow_files:
            with open(workflow_file, 'r') as f:
                workflow = yaml.safe_load(f)
            
            # Skip deprecated workflows
            if 'deprecated' in workflow.get('name', '').lower():
                continue
                
            assert 'permissions' in workflow, f"{workflow_file.name} should define permissions"


class TestWorkflowSecurityUpdated:
    """Additional security tests for updated workflows"""
    
    @pytest.fixture
    def workflows_dir(self):
        """Locate the repository's GitHub workflows directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def pages_workflow(self, workflows_dir):
        """Load and parse the pages.yml workflow file."""
        with open(workflows_dir / 'pages.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_pages_workflow_least_privilege(self, pages_workflow):
        """Test that pages workflow follows least privilege principle"""
        permissions = pages_workflow.get('permissions', {})
        
        # Should only have necessary permissions
        if isinstance(permissions, dict):
            for key, value in permissions.items():
                if key not in ['contents', 'pages', 'id-token']:
                    assert value == 'read', f"Unexpected write permission for {key}"
    
    def test_pages_workflow_trusted_actions(self, pages_workflow):
        """Test that workflow uses trusted GitHub Actions"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        
        for step in steps:
            if 'uses' in step:
                action = step['uses']
                # Should use official GitHub actions or pinned versions
                assert (action.startswith('actions/') or 
                       '@v' in action or 
                       '@' in action), f"Action {action} should be from trusted source or pinned"
    
    def test_pages_workflow_no_hardcoded_secrets(self, workflows_dir):
        """Test that pages.yml doesn't contain hardcoded secrets"""
        with open(workflows_dir / 'pages.yml', 'r') as f:
            content = f.read().lower()
        
        suspicious_patterns = ['password:', 'api_key:', 'secret:', 'token:']
        for pattern in suspicious_patterns:
            if pattern in content:
                # Make sure it's in a secrets context
                assert 'secrets.' in content or '{{' in content, f"Potential hardcoded secret: {pattern}"
    
    def test_pages_workflow_script_injection_prevention(self, pages_workflow):
        """Test that workflow prevents script injection in run commands"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        
        for step in steps:
            if 'run' in step:
                run_cmd = step['run']
                # Check if using expressions safely
                if '${{' in run_cmd:
                    # Multi-line commands should be careful with variable expansion
                    assert '|' in run_cmd or '"' in run_cmd or "'" in run_cmd, \
                        "Run commands with expressions should use proper quoting"


class TestWorkflowPerformance:
    """Test suite for workflow performance considerations"""
    
    @pytest.fixture
    def workflows_dir(self):
        """Locate the repository's GitHub workflows directory."""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def pages_workflow(self, workflows_dir):
        """Load and parse the pages.yml workflow file."""
        with open(workflows_dir / 'pages.yml', 'r') as f:
            return yaml.safe_load(f)
    
    def test_pages_workflow_uses_caching(self, pages_workflow):
        """Test if workflow could benefit from caching (informational)"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        step_names = [s.get('name', '').lower() for s in steps]
        
        # This is informational - caching could improve performance
        has_cache = any('cache' in name for name in step_names)
        has_install = any('install' in name or 'dependencies' in name for name in step_names)
        
        # If installing dependencies, consider caching (this is a suggestion, not requirement)
        if has_install and not has_cache:
            # This is just a warning, not a failure
            pass
    
    def test_pages_workflow_concurrency_control(self, pages_workflow):
        """Test that workflow has proper concurrency control"""
        assert 'concurrency' in pages_workflow, "Should have concurrency control"
        concurrency = pages_workflow['concurrency']
        
        assert 'group' in concurrency, "Should specify concurrency group"
        # For pages deployment, we don't want to cancel in-progress
        assert concurrency['cancel-in-progress'] is False, \
            "Pages deployment should complete, not cancel in-progress"