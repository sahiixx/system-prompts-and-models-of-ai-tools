#\!/usr/bin/env python3
"""
Unit Tests for GitHub Actions Workflow Validation
Tests workflow structure, permissions, and security configurations
"""

import unittest
import sys
import os
import yaml
import tempfile
from pathlib import Path

class TestGitHubWorkflowValidation(unittest.TestCase):
    """Test suite for GitHub Actions workflow files"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.workflows_dir = Path(__file__).parent.parent / '.github' / 'workflows'
        self.manual_workflow = self.workflows_dir / 'manual.yml'
        
    def test_workflows_directory_exists(self):
        """Test that workflows directory exists"""
        self.assertTrue(self.workflows_dir.exists())
        self.assertTrue(self.workflows_dir.is_dir())
    
    def test_manual_workflow_exists(self):
        """Test that manual.yml workflow file exists"""
        self.assertTrue(self.manual_workflow.exists())
        self.assertTrue(self.manual_workflow.is_file())
    
    def test_manual_workflow_valid_yaml(self):
        """Test that manual.yml is valid YAML"""
        with open(self.manual_workflow, 'r') as f:
            try:
                workflow = yaml.safe_load(f)
                self.assertIsNotNone(workflow)
                self.assertIsInstance(workflow, dict)
            except yaml.YAMLError as e:
                self.fail(f"Invalid YAML in manual.yml: {e}")
    
    def test_manual_workflow_has_name(self):
        """Test that workflow has a name field"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        self.assertIn('name', workflow)
        self.assertIsInstance(workflow['name'], str)
        self.assertGreater(len(workflow['name']), 0)
    
    def test_manual_workflow_has_permissions(self):
        """Test that workflow has permissions field"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        self.assertIn('permissions', workflow, 
                     "Workflow must have permissions field for security")
    
    def test_manual_workflow_permissions_structure(self):
        """Test that permissions field has correct structure"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        permissions = workflow.get('permissions')
        self.assertIsNotNone(permissions)
        
        # Permissions should be a dict or a string
        self.assertTrue(
            isinstance(permissions, dict) or isinstance(permissions, str),
            "Permissions must be a dict or string"
        )
    
    def test_manual_workflow_permissions_contents_read(self):
        """Test that workflow has contents: read permission"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        permissions = workflow.get('permissions')
        
        # If permissions is a dict, check for contents key
        if isinstance(permissions, dict):
            self.assertIn('contents', permissions)
            self.assertEqual(permissions['contents'], 'read',
                           "Contents permission should be 'read' for security")
    
    def test_manual_workflow_permissions_minimal(self):
        """Test that workflow uses minimal permissions (security best practice)"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        permissions = workflow.get('permissions')
        
        if isinstance(permissions, dict):
            # Check that no write permissions are granted unnecessarily
            for key, value in permissions.items():
                self.assertNotEqual(value, 'write',
                                   f"{key} permission should not be 'write' for manual workflow")
    
    def test_manual_workflow_has_on_trigger(self):
        """Test that workflow has 'on' trigger configuration"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        # YAML may parse 'on' as boolean True
        has_on = 'on' in workflow or True in workflow
        self.assertTrue(has_on, "Workflow must have 'on' trigger configuration")
        
        on_config = workflow.get('on') or workflow.get(True)
        self.assertIsNotNone(on_config)
    
    def test_manual_workflow_dispatch_trigger(self):
        """Test that workflow has workflow_dispatch trigger"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        # YAML may parse 'on' as boolean True
        on_config = workflow.get('on') or workflow.get(True)
        
        # workflow_dispatch can be a key in dict or in list
        if isinstance(on_config, dict):
            self.assertIn('workflow_dispatch', on_config)
        elif isinstance(on_config, list):
            self.assertIn('workflow_dispatch', on_config)
        else:
            self.assertEqual(on_config, 'workflow_dispatch')
    
    def test_manual_workflow_inputs_defined(self):
        """Test that workflow_dispatch has inputs defined"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        # YAML may parse 'on' as boolean True
        on_config = workflow.get('on', {}) or workflow.get(True, {})
        if isinstance(on_config, dict) and 'workflow_dispatch' in on_config:
            dispatch_config = on_config['workflow_dispatch']
            if dispatch_config:
                self.assertIn('inputs', dispatch_config)
    
    def test_manual_workflow_input_name_field(self):
        """Test that workflow input 'name' is properly configured"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        # YAML may parse 'on' as boolean True
        on_config = workflow.get('on', {}) or workflow.get(True, {})
        if isinstance(on_config, dict) and 'workflow_dispatch' in on_config:
            dispatch = on_config['workflow_dispatch']
            if dispatch and 'inputs' in dispatch:
                inputs = dispatch['inputs']
                self.assertIn('name', inputs)
                
                name_input = inputs['name']
                self.assertIn('description', name_input)
                self.assertIn('required', name_input)
                self.assertIn('type', name_input)
                self.assertEqual(name_input['type'], 'string')
    
    def test_manual_workflow_has_jobs(self):
        """Test that workflow has jobs section"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        self.assertIn('jobs', workflow)
        self.assertIsInstance(workflow['jobs'], dict)
        self.assertGreater(len(workflow['jobs']), 0)
    
    def test_manual_workflow_greet_job_exists(self):
        """Test that 'greet' job exists"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        jobs = workflow.get('jobs', {})
        self.assertIn('greet', jobs)
    
    def test_manual_workflow_job_has_runs_on(self):
        """Test that job specifies runs-on"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        greet_job = workflow['jobs']['greet']
        self.assertIn('runs-on', greet_job)
        self.assertIsInstance(greet_job['runs-on'], str)
    
    def test_manual_workflow_job_has_steps(self):
        """Test that job has steps"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        greet_job = workflow['jobs']['greet']
        self.assertIn('steps', greet_job)
        self.assertIsInstance(greet_job['steps'], list)
        self.assertGreater(len(greet_job['steps']), 0)
    
    def test_manual_workflow_step_structure(self):
        """Test that steps have required structure"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        steps = workflow['jobs']['greet']['steps']
        for i, step in enumerate(steps):
            # Each step should be a dict
            self.assertIsInstance(step, dict, f"Step {i} should be a dict")
            
            # Each step should have either 'run' or 'uses'
            has_run_or_uses = 'run' in step or 'uses' in step
            self.assertTrue(has_run_or_uses, 
                          f"Step {i} should have 'run' or 'uses' field")
    
    def test_manual_workflow_uses_input_correctly(self):
        """Test that workflow correctly references the input parameter"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        # Check if the run command uses the input
        steps = workflow['jobs']['greet']['steps']
        found_input_usage = False
        
        for step in steps:
            if 'run' in step:
                # Check if it references inputs.name
                if 'inputs.name' in step['run']:
                    found_input_usage = True
                    break
        
        self.assertTrue(found_input_usage, 
                       "Workflow should use inputs.name in run command")
    
    def test_workflow_file_not_empty(self):
        """Test that workflow file is not empty"""
        with open(self.manual_workflow, 'r') as f:
            content = f.read()
        
        self.assertGreater(len(content.strip()), 0)
    
    def test_workflow_yaml_indentation(self):
        """Test that workflow YAML has consistent indentation"""
        with open(self.manual_workflow, 'r') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Check that indentation is consistent (multiples of 2)
        for i, line in enumerate(lines, 1):
            if line and not line.strip().startswith('#'):
                # Count leading spaces
                leading_spaces = len(line) - len(line.lstrip(' '))
                if leading_spaces > 0:
                    self.assertEqual(leading_spaces % 2, 0,
                                   f"Line {i} has inconsistent indentation")


class TestWorkflowSecurityBestPractices(unittest.TestCase):
    """Test suite for security best practices in workflows"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.workflows_dir = Path(__file__).parent.parent / '.github' / 'workflows'
        self.manual_workflow = self.workflows_dir / 'manual.yml'
    
    def test_no_hardcoded_secrets(self):
        """Test that workflow doesn't contain hardcoded secrets"""
        with open(self.manual_workflow, 'r') as f:
            content = f.read().lower()
        
        # Common secret patterns to avoid
        forbidden_patterns = [
            'password:',
            'api_key:',
            'token:',
            'secret:',
        ]
        
        for pattern in forbidden_patterns:
            # Allow if it's referencing secrets properly (with ${{ secrets. }})
            if pattern in content:
                # Make sure it's not a hardcoded value
                self.assertIn('${{', content,
                            f"Found {pattern} without secret reference")
    
    def test_runner_ubuntu_latest(self):
        """Test that workflow uses ubuntu-latest for consistency"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        for job_name, job in workflow.get('jobs', {}).items():
            if 'runs-on' in job:
                # Prefer ubuntu-latest for manual workflows
                self.assertIn('ubuntu', job['runs-on'].lower(),
                            f"Job {job_name} should use Ubuntu runner")
    
    def test_workflow_permissions_explicit(self):
        """Test that workflow has explicit permissions (not implicit)"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        # Workflow should explicitly define permissions
        self.assertIn('permissions', workflow,
                     "Workflow should explicitly define permissions for security")
        
        # Permissions should not be empty
        permissions = workflow.get('permissions')
        if isinstance(permissions, dict):
            self.assertGreater(len(permissions), 0,
                             "Permissions should not be empty dict")
    
    def test_no_shell_injection_risks(self):
        """Test that workflow steps don't have shell injection risks"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        for job_name, job in workflow.get('jobs', {}).items():
            for i, step in enumerate(job.get('steps', [])):
                if 'run' in step:
                    run_cmd = step['run']
                    # If using user inputs, should use proper syntax
                    if 'inputs.' in run_cmd:
                        # Should use ${{ }} syntax for safe interpolation
                        self.assertIn('${{', run_cmd,
                                    f"Job {job_name}, step {i}: Use ${{{{ }}}} for input interpolation")


class TestWorkflowComparison(unittest.TestCase):
    """Test suite for comparing workflow configurations"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.workflows_dir = Path(__file__).parent.parent / '.github' / 'workflows'
    
    def test_all_workflows_valid_yaml(self):
        """Test that all workflow files are valid YAML"""
        workflow_files = list(self.workflows_dir.glob('*.yml')) + \
                        list(self.workflows_dir.glob('*.yaml'))
        
        self.assertGreater(len(workflow_files), 0, 
                          "Should have at least one workflow file")
        
        for workflow_file in workflow_files:
            with self.subTest(workflow=workflow_file.name):
                with open(workflow_file, 'r') as f:
                    try:
                        workflow = yaml.safe_load(f)
                        self.assertIsNotNone(workflow)
                    except yaml.YAMLError as e:
                        self.fail(f"Invalid YAML in {workflow_file.name}: {e}")
    
    def test_all_workflows_have_names(self):
        """Test that all workflows have descriptive names"""
        workflow_files = list(self.workflows_dir.glob('*.yml')) + \
                        list(self.workflows_dir.glob('*.yaml'))
        
        for workflow_file in workflow_files:
            with self.subTest(workflow=workflow_file.name):
                with open(workflow_file, 'r') as f:
                    workflow = yaml.safe_load(f)
                
                self.assertIn('name', workflow,
                            f"{workflow_file.name} should have a name")
                self.assertIsInstance(workflow['name'], str)
                self.assertGreater(len(workflow['name']), 0)
    
    def test_workflows_with_write_permissions_justified(self):
        """Test that workflows with write permissions are justified"""
        workflow_files = list(self.workflows_dir.glob('*.yml')) + \
                        list(self.workflows_dir.glob('*.yaml'))
        
        for workflow_file in workflow_files:
            with self.subTest(workflow=workflow_file.name):
                with open(workflow_file, 'r') as f:
                    workflow = yaml.safe_load(f)
                
                permissions = workflow.get('permissions', {})
                if isinstance(permissions, dict):
                    for perm_type, perm_value in permissions.items():
                        if perm_value == 'write':
                            # Write permissions should be in deployment workflows
                            # or have clear justification
                            workflow_name = workflow.get('name', '').lower()
                            self.assertTrue(
                                'deploy' in workflow_name or 
                                'publish' in workflow_name or
                                'release' in workflow_name or
                                perm_type in ['pages', 'id-token'],
                                f"{workflow_file.name} has write permission for {perm_type} "
                                f"without clear justification"
                            )


class TestWorkflowInputValidation(unittest.TestCase):
    """Test suite for workflow input validation"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.workflows_dir = Path(__file__).parent.parent / '.github' / 'workflows'
        self.manual_workflow = self.workflows_dir / 'manual.yml'
    
    def test_input_has_description(self):
        """Test that all inputs have descriptions"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        # YAML may parse 'on' as boolean True
        on_config = workflow.get('on', {}) or workflow.get(True, {})
        dispatch = on_config.get('workflow_dispatch', {})
        inputs = dispatch.get('inputs', {})
        
        for input_name, input_config in inputs.items():
            with self.subTest(input=input_name):
                self.assertIn('description', input_config,
                            f"Input '{input_name}' should have a description")
                self.assertIsInstance(input_config['description'], str)
                self.assertGreater(len(input_config['description']), 0)
    
    def test_input_has_type(self):
        """Test that all inputs have explicit types"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        # YAML may parse 'on' as boolean True
        on_config = workflow.get('on', {}) or workflow.get(True, {})
        dispatch = on_config.get('workflow_dispatch', {})
        inputs = dispatch.get('inputs', {})
        
        valid_types = ['string', 'choice', 'boolean', 'environment']
        
        for input_name, input_config in inputs.items():
            with self.subTest(input=input_name):
                self.assertIn('type', input_config,
                            f"Input '{input_name}' should have explicit type")
                self.assertIn(input_config['type'], valid_types,
                            f"Input '{input_name}' has invalid type")
    
    def test_required_inputs_have_defaults(self):
        """Test that required inputs have default values"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        # YAML may parse 'on' as boolean True
        on_config = workflow.get('on', {}) or workflow.get(True, {})
        dispatch = on_config.get('workflow_dispatch', {})
        inputs = dispatch.get('inputs', {})
        
        for input_name, input_config in inputs.items():
            with self.subTest(input=input_name):
                if input_config.get('required', False):
                    self.assertIn('default', input_config,
                                f"Required input '{input_name}' should have a default value")
    
    def test_input_default_values_match_type(self):
        """Test that input default values match declared types"""
        with open(self.manual_workflow, 'r') as f:
            workflow = yaml.safe_load(f)
        
        # YAML may parse 'on' as boolean True
        on_config = workflow.get('on', {}) or workflow.get(True, {})
        dispatch = on_config.get('workflow_dispatch', {})
        inputs = dispatch.get('inputs', {})
        
        for input_name, input_config in inputs.items():
            with self.subTest(input=input_name):
                if 'default' in input_config and 'type' in input_config:
                    default_value = input_config['default']
                    input_type = input_config['type']
                    
                    if input_type == 'string':
                        self.assertIsInstance(default_value, str)
                    elif input_type == 'boolean':
                        self.assertIsInstance(default_value, bool)


class TestWorkflowEdgeCases(unittest.TestCase):
    """Test suite for edge cases and error handling"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.workflows_dir = Path(__file__).parent.parent / '.github' / 'workflows'
        self.manual_workflow = self.workflows_dir / 'manual.yml'
    
    def test_workflow_parses_with_different_yaml_loaders(self):
        """Test that workflow can be parsed with different YAML loading methods"""
        with open(self.manual_workflow, 'r') as f:
            content = f.read()
        
        # Test safe_load
        workflow1 = yaml.safe_load(content)
        self.assertIsNotNone(workflow1)
        
        # Test load with SafeLoader explicitly
        workflow2 = yaml.load(content, Loader=yaml.SafeLoader)
        self.assertIsNotNone(workflow2)
        
        # Both should produce same result
        self.assertEqual(workflow1, workflow2)
    
    def test_workflow_handles_unicode(self):
        """Test that workflow handles unicode characters properly"""
        with open(self.manual_workflow, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Should not raise encoding errors
        workflow = yaml.safe_load(content)
        self.assertIsNotNone(workflow)
    
    def test_workflow_preserves_comments(self):
        """Test that workflow file contains meaningful comments"""
        with open(self.manual_workflow, 'r') as f:
            content = f.read()
        
        # Should have at least some comments for documentation
        comment_lines = [line for line in content.split('\n') 
                        if line.strip().startswith('#')]
        self.assertGreater(len(comment_lines), 0,
                          "Workflow should have comments for documentation")
    
    def test_workflow_no_trailing_whitespace(self):
        """Test that workflow lines don't have trailing whitespace"""
        with open(self.manual_workflow, 'r') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines, 1):
            # Allow empty lines
            if line.strip():
                self.assertEqual(line.rstrip('\n'), line.rstrip(),
                               f"Line {i} has trailing whitespace")
    
    def test_workflow_ends_with_newline(self):
        """Test that workflow file ends with a newline"""
        with open(self.manual_workflow, 'rb') as f:
            content = f.read()
        
        self.assertTrue(content.endswith(b'\n'),
                       "Workflow file should end with a newline")


if __name__ == '__main__':
    unittest.main()