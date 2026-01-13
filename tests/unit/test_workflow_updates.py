"""
Comprehensive unit tests for updated GitHub Actions workflows
Tests the changes in pages.yml and deprecation of deploy.yml
"""

import pytest
import yaml
from pathlib import Path


class TestPagesWorkflowUpdates:
    """Test suite for pages.yml workflow updates"""

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

    def test_pages_workflow_has_python_setup(self, pages_workflow):
        """Test that workflow includes Python setup step"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']

        python_step = next((s for s in steps if 'python' in s.get('name', '').lower()), None)
        assert python_step is not None, "Should have Python setup step"
        assert 'uses' in python_step, "Python step should use an action"
        assert 'setup-python' in python_step['uses'], "Should use setup-python action"
        assert 'with' in python_step, "Should specify Python configuration"
        assert 'python-version' in python_step['with'], "Should specify Python version"
        assert python_step['with']['python-version'] == '3.11', "Should use Python 3.11"

    def test_pages_workflow_generates_metadata(self, pages_workflow):
        """Test that workflow generates metadata"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']

        metadata_step = next((s for s in steps if 'metadata' in s.get('name', '').lower()), None)
        assert metadata_step is not None, "Should have metadata generation step"
        assert 'run' in metadata_step, "Metadata step should have run command"
        assert 'generate-metadata.py' in metadata_step['run'], "Should run generate-metadata.py"
        assert '--all' in metadata_step['run'], "Should generate all metadata"

    def test_pages_workflow_generates_api(self, pages_workflow):
        """Test that workflow generates API endpoints"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']

        api_step = next((s for s in steps if 'api' in s.get('name', '').lower() and 'generate' in s.get('name', '').lower()), None)
        assert api_step is not None, "Should have API generation step"
        assert 'run' in api_step, "API step should have run command"
        assert 'generate-api.py' in api_step['run'], "Should run generate-api.py"

    def test_pages_workflow_includes_api_in_artifact(self, pages_workflow):
        """Test that workflow includes API files in the artifact"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']

        api_include_step = next((s for s in steps if 'api' in s.get('name', '').lower() and 'artifact' in s.get('name', '').lower()), None)
        assert api_include_step is not None, "Should have step to include API in artifact"
        assert 'run' in api_include_step, "Should have run command"
        assert 'cp' in api_include_step['run'], "Should copy API files"
        assert 'api/*' in api_include_step['run'], "Should copy all API files"
        assert 'site/dist/api' in api_include_step['run'], "Should copy to dist/api"

    def test_pages_workflow_builds_enhanced_site(self, pages_workflow):
        """Test that workflow builds enhanced site"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']

        build_step = next((s for s in steps if 'build' in s.get('name', '').lower() and 'enhanced' in s.get('name', '').lower()), None)
        assert build_step is not None, "Should have enhanced site build step"
        assert 'run' in build_step, "Build step should have run command"
        assert 'build-enhanced.js' in build_step['run'], "Should run build-enhanced.js"

    def test_pages_workflow_step_order(self, pages_workflow):
        """Test that build steps are in correct order"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']
        step_names = [s.get('name', '').lower() for s in steps if 'name' in s]

        # Find indices of key steps
        python_idx = next((i for i, name in enumerate(step_names) if 'python' in name), -1)
        metadata_idx = next((i for i, name in enumerate(step_names) if 'metadata' in name), -1)
        api_idx = next((i for i, name in enumerate(step_names) if 'api' in name and 'generate' in name), -1)
        build_idx = next((i for i, name in enumerate(step_names) if 'build' in name and 'enhanced' in name), -1)

        # Verify order
        assert python_idx < metadata_idx, "Python setup should come before metadata generation"
        assert metadata_idx < api_idx, "Metadata should be generated before API"
        assert api_idx < build_idx, "API should be generated before site build"

    def test_pages_workflow_has_setup_pages(self, pages_workflow):
        """Test that workflow has Setup Pages step"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']

        setup_pages_step = next((s for s in steps if 'setup' in s.get('name', '').lower() and 'pages' in s.get('name', '').lower()), None)
        assert setup_pages_step is not None, "Should have Setup Pages step"
        assert 'uses' in setup_pages_step, "Setup Pages should use an action"
        assert 'configure-pages' in setup_pages_step['uses'], "Should use configure-pages action"


class TestDeprecatedDeployWorkflow:
    """Test suite for deprecated deploy.yml workflow"""

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
        """Test that deploy.yml still exists for backward compatibility"""
        deploy_yml = workflows_dir / 'deploy.yml'
        assert deploy_yml.exists(), "deploy.yml should exist"

    def test_deploy_workflow_marked_deprecated(self, deploy_workflow):
        """Test that workflow name indicates deprecation"""
        assert 'name' in deploy_workflow, "Workflow must have a name"
        name = deploy_workflow['name'].lower()
        assert 'deprecated' in name, "Deploy workflow should be marked as deprecated"

    def test_deploy_workflow_no_automatic_triggers(self, deploy_workflow):
        """Test that deprecated workflow doesn't trigger automatically"""
        on_config = deploy_workflow.get('on', deploy_workflow.get(True, {}))
        assert 'push' not in on_config, "Should not trigger on push"
        assert 'pull_request' not in on_config, "Should not trigger on PR"
        assert 'workflow_dispatch' in on_config, "Should allow manual trigger only"

    def test_deploy_workflow_is_noop(self, deploy_workflow):
        """Test that deprecated workflow is a no-op"""
        jobs = deploy_workflow['jobs']
        assert 'noop' in jobs, "Should have noop job"

        noop_job = jobs['noop']
        steps = noop_job.get('steps', [])
        assert len(steps) <= 1, "Should have minimal steps"

        if len(steps) == 1:
            step = steps[0]
            assert 'run' in step, "Should have run command"
            assert 'deprecated' in step['run'].lower() or 'pages.yml' in step['run'].lower(), \
                "Should mention deprecation or pages.yml"

    def test_deploy_workflow_no_build_steps(self, deploy_workflow):
        """Test that deprecated workflow has no actual build logic"""
        jobs = deploy_workflow['jobs']
        noop_job = jobs['noop']
        steps = noop_job.get('steps', [])

        # Serialize all step content
        step_content = ' '.join([str(s) for s in steps]).lower()

        # Should not have build-related actions
        assert 'checkout' not in step_content or 'uses' not in step_content, "Should not checkout code"
        assert 'npm install' not in step_content, "Should not install dependencies"
        assert 'python' not in step_content or 'generate' not in step_content, "Should not generate content"
        assert 'deploy-pages' not in step_content, "Should not deploy"


class TestWorkflowSecurity:
    """Security tests for workflow updates"""

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

    def test_pages_workflow_permissions(self, pages_workflow):
        """Test that pages workflow has appropriate permissions"""
        assert 'permissions' in pages_workflow, "Should define permissions"
        permissions = pages_workflow['permissions']

        # Required for Pages deployment
        assert 'contents' in permissions, "Should have contents permission"
        assert 'pages' in permissions, "Should have pages permission"
        assert permissions['pages'] == 'write', "Pages permission should be write"
        assert 'id-token' in permissions, "Should have id-token for OIDC"

    def test_pages_workflow_trusted_actions(self, pages_workflow):
        """Test that workflow uses trusted GitHub Actions"""
        build_job = pages_workflow['jobs']['build']
        steps = build_job['steps']

        for step in steps:
            if 'uses' in step:
                action = step['uses']
                # Should use official actions or pinned versions
                assert action.startswith('actions/') or '@v' in action or '@' in action, \
                    f"Action {action} should be trusted or pinned"

    def test_pages_workflow_no_secrets_in_code(self, workflows_dir):
        """Test that pages.yml doesn't contain hardcoded secrets"""
        with open(workflows_dir / 'pages.yml', 'r') as f:
            content = f.read().lower()

        # Check for common secret patterns
        suspicious = ['password:', 'api_key:', 'api-key:', 'secret_key:', 'token:']
        for pattern in suspicious:
            if pattern in content:
                # Make sure it's in a secrets context
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if pattern in line and 'secrets.' not in line:
                        pytest.fail(f"Line {i+1}: Potential hardcoded secret: {pattern}")


class TestWorkflowBestPractices:
    """Best practices tests for workflow updates"""

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

    def test_pages_workflow_concurrency(self, pages_workflow):
        """Test that workflow has concurrency control"""
        assert 'concurrency' in pages_workflow, "Should have concurrency control"
        concurrency = pages_workflow['concurrency']
        assert 'group' in concurrency, "Should specify concurrency group"
        assert 'cancel-in-progress' in concurrency, "Should specify cancel-in-progress"
        # For pages deployment, we typically don't want to cancel
        assert concurrency['cancel-in-progress'] is False, \
            "Pages deployment should complete, not cancel"

    def test_pages_workflow_deploy_dependency(self, pages_workflow):
        """Test that deploy job depends on build"""
        deploy_job = pages_workflow['jobs']['deploy']
        assert 'needs' in deploy_job, "Deploy should have dependencies"
        assert 'build' in deploy_job['needs'], "Deploy should depend on build"

    def test_pages_workflow_environment(self, pages_workflow):
        """Test that deploy job specifies environment"""
        deploy_job = pages_workflow['jobs']['deploy']
        assert 'environment' in deploy_job, "Should specify deployment environment"
        environment = deploy_job['environment']
        assert environment['name'] == 'github-pages', "Should deploy to github-pages"
        assert 'url' in environment, "Should specify deployment URL"

    def test_all_workflows_valid_syntax(self, workflows_dir):
        """Test that all workflow files have valid YAML syntax"""
        workflow_files = list(workflows_dir.glob('*.yml')) + list(workflows_dir.glob('*.yaml'))
        assert len(workflow_files) > 0, "Should have workflow files"

        for workflow_file in workflow_files:
            try:
                with open(workflow_file, 'r') as f:
                    yaml.safe_load(f)
            except yaml.YAMLError as e:
                pytest.fail(f"{workflow_file.name} has invalid YAML: {e}")


pytestmark = pytest.mark.unit