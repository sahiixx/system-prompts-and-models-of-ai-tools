#\!/usr/bin/env python3
"""
Comprehensive unit tests for GitHub Actions workflows
Tests workflow YAML structure, security, and best practices
"""

import pytest
import yaml
import sys
from pathlib import Path
from typing import Dict, Any, List


class TestGitHubWorkflowStructure:
    """Test suite for GitHub Actions workflow file structure and validity"""
    
    @pytest.fixture
    def workflows_dir(self):
        """Get the workflows directory path"""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    @pytest.fixture
    def manual_workflow_path(self, workflows_dir):
        """Get the manual workflow file path"""
        return workflows_dir / 'manual.yml'
    
    @pytest.fixture
    def manual_workflow_content(self, manual_workflow_path):
        """Load and parse the manual workflow YAML"""
        with open(manual_workflow_path, 'r') as f:
            return yaml.safe_load(f)
    
    def test_manual_workflow_exists(self, manual_workflow_path):
        """Test that manual.yml workflow file exists"""
        assert manual_workflow_path.exists(), "manual.yml should exist"
        assert manual_workflow_path.is_file(), "manual.yml should be a file"
    
    def test_manual_workflow_valid_yaml(self, manual_workflow_path):
        """Test that manual.yml is valid YAML"""
        with open(manual_workflow_path, 'r') as f:
            content = yaml.safe_load(f)
        
        assert content is not None, "YAML content should not be None"
        assert isinstance(content, dict), "YAML content should be a dictionary"
    
    def test_manual_workflow_has_name(self, manual_workflow_content):
        """Test that workflow has a name field"""
        assert 'name' in manual_workflow_content, "Workflow must have a 'name' field"
        assert isinstance(manual_workflow_content['name'], str), "Workflow name must be a string"
        assert len(manual_workflow_content['name']) > 0, "Workflow name must not be empty"
    
    def test_manual_workflow_name_value(self, manual_workflow_content):
        """Test that workflow has the correct name"""
        assert manual_workflow_content['name'] == 'Manual workflow', \
            "Workflow name should be 'Manual workflow'"
    
    def test_manual_workflow_has_permissions(self, manual_workflow_content):
        """Test that workflow has permissions defined"""
        assert 'permissions' in manual_workflow_content, \
            "Workflow must have 'permissions' field for security"
    
    def test_manual_workflow_permissions_structure(self, manual_workflow_content):
        """Test that permissions field has correct structure"""
        permissions = manual_workflow_content.get('permissions')
        
        assert permissions is not None, "Permissions should not be None"
        assert isinstance(permissions, dict), "Permissions should be a dictionary"
    
    def test_manual_workflow_permissions_contents_read(self, manual_workflow_content):
        """Test that permissions includes contents: read"""
        permissions = manual_workflow_content.get('permissions', {})
        
        assert 'contents' in permissions, "Permissions must include 'contents'"
        assert permissions['contents'] == 'read', \
            "Contents permission should be set to 'read'"
    
    def test_manual_workflow_has_on_trigger(self, manual_workflow_content):
        """Test that workflow has 'on' trigger defined (parsed as True in YAML)"""
        # YAML parses 'on' as boolean True, so check for True key
        assert True in manual_workflow_content, "Workflow must have 'on' trigger (parsed as True)"
    
    def test_manual_workflow_trigger_type(self, manual_workflow_content):
        """Test that workflow uses workflow_dispatch trigger"""
        # YAML parses 'on' key as boolean True
        on_config = manual_workflow_content.get(True, {})
        
        assert 'workflow_dispatch' in on_config, \
            "Workflow should use 'workflow_dispatch' trigger for manual execution"
    
    def test_manual_workflow_dispatch_inputs(self, manual_workflow_content):
        """Test workflow_dispatch inputs configuration"""
        dispatch_config = manual_workflow_content.get(True, {}).get('workflow_dispatch', {})
        
        assert 'inputs' in dispatch_config, "workflow_dispatch should have inputs"
        inputs = dispatch_config.get('inputs', {})
        assert isinstance(inputs, dict), "Inputs should be a dictionary"
    
    def test_manual_workflow_input_name(self, manual_workflow_content):
        """Test that 'name' input is properly configured"""
        inputs = manual_workflow_content.get(True, {}).get('workflow_dispatch', {}).get('inputs', {})
        
        assert 'name' in inputs, "Inputs should contain 'name' parameter"
        name_input = inputs['name']
        
        assert 'description' in name_input, "Input 'name' should have description"
        assert 'default' in name_input, "Input 'name' should have default value"
        assert 'required' in name_input, "Input 'name' should have required field"
        assert 'type' in name_input, "Input 'name' should have type field"
    
    def test_manual_workflow_input_name_values(self, manual_workflow_content):
        """Test specific values of 'name' input configuration"""
        name_input = manual_workflow_content.get(True, {}).get('workflow_dispatch', {}).get('inputs', {}).get('name', {})
        
        assert name_input['description'] == 'Person to greet', \
            "Name input description should be 'Person to greet'"
        assert name_input['default'] == 'World', \
            "Name input default should be 'World'"
        assert name_input['required'] is True, \
            "Name input should be required"
        assert name_input['type'] == 'string', \
            "Name input type should be 'string'"
    
    def test_manual_workflow_has_jobs(self, manual_workflow_content):
        """Test that workflow has jobs defined"""
        assert 'jobs' in manual_workflow_content, "Workflow must have 'jobs' section"
        jobs = manual_workflow_content.get('jobs', {})
        assert isinstance(jobs, dict), "Jobs should be a dictionary"
        assert len(jobs) > 0, "Workflow should have at least one job"
    
    def test_manual_workflow_greet_job(self, manual_workflow_content):
        """Test that 'greet' job exists and is configured"""
        jobs = manual_workflow_content.get('jobs', {})
        
        assert 'greet' in jobs, "Workflow should have 'greet' job"
        greet_job = jobs['greet']
        assert isinstance(greet_job, dict), "Greet job should be a dictionary"
    
    def test_manual_workflow_greet_job_runner(self, manual_workflow_content):
        """Test that greet job has correct runner configuration"""
        greet_job = manual_workflow_content.get('jobs', {}).get('greet', {})
        
        assert 'runs-on' in greet_job, "Greet job must specify 'runs-on'"
        assert greet_job['runs-on'] == 'ubuntu-latest', \
            "Greet job should run on 'ubuntu-latest'"
    
    def test_manual_workflow_greet_job_steps(self, manual_workflow_content):
        """Test that greet job has steps defined"""
        greet_job = manual_workflow_content.get('jobs', {}).get('greet', {})
        
        assert 'steps' in greet_job, "Greet job must have 'steps'"
        steps = greet_job.get('steps', [])
        assert isinstance(steps, list), "Steps should be a list"
        assert len(steps) > 0, "Job should have at least one step"
    
    def test_manual_workflow_send_greeting_step(self, manual_workflow_content):
        """Test that send greeting step is properly configured"""
        steps = manual_workflow_content.get('jobs', {}).get('greet', {}).get('steps', [])
        
        # Find the send greeting step
        greeting_step = None
        for step in steps:
            if step.get('name') == 'Send greeting':
                greeting_step = step
                break
        
        assert greeting_step is not None, "Should have 'Send greeting' step"
        assert 'run' in greeting_step, "Send greeting step should have 'run' command"
    
    def test_manual_workflow_greeting_uses_input(self, manual_workflow_content):
        """Test that greeting step uses the input parameter"""
        steps = manual_workflow_content.get('jobs', {}).get('greet', {}).get('steps', [])
        
        greeting_step = next((s for s in steps if s.get('name') == 'Send greeting'), None)
        assert greeting_step is not None
        
        run_command = greeting_step.get('run', '')
        assert 'inputs.name' in run_command, \
            "Greeting step should reference inputs.name parameter"
        assert '${{' in run_command and '}}' in run_command, \
            "Should use GitHub Actions expression syntax"


class TestGitHubWorkflowSecurity:
    """Test suite for GitHub Actions workflow security best practices"""
    
    @pytest.fixture
    def manual_workflow_content(self):
        """Load manual workflow YAML"""
        repo_root = Path(__file__).parent.parent.parent
        workflow_path = repo_root / '.github' / 'workflows' / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)
    
    def test_permissions_are_minimal(self, manual_workflow_content):
        """Test that permissions follow least privilege principle"""
        permissions = manual_workflow_content.get('permissions', {})
        
        # Check that only necessary permissions are granted
        for scope, level in permissions.items():
            assert level in ['read', 'write', 'none'], \
                f"Permission level for '{scope}' should be 'read', 'write', or 'none'"
    
    def test_no_excessive_permissions(self, manual_workflow_content):
        """Test that workflow doesn't have excessive permissions"""
        permissions = manual_workflow_content.get('permissions', {})
        
        # For a simple greeting workflow, should not need write permissions
        for scope, level in permissions.items():
            if scope == 'contents':
                assert level == 'read', \
                    "Simple greeting workflow should only need read access to contents"
    
    def test_permissions_explicitly_defined(self, manual_workflow_content):
        """Test that permissions are explicitly defined, not inherited"""
        assert 'permissions' in manual_workflow_content, \
            "Permissions should be explicitly defined for security"
        
        permissions = manual_workflow_content.get('permissions')
        assert permissions is not None, \
            "Permissions should not be None (inherit all)"
    
    def test_no_dangerous_commands_in_steps(self, manual_workflow_content):
        """Test that workflow steps don't contain dangerous commands"""
        dangerous_patterns = [
            'curl | bash',
            'wget | sh',
            'eval',
            'rm -rf /',
        ]
        
        jobs = manual_workflow_content.get('jobs', {})
        for job_name, job_config in jobs.items():
            steps = job_config.get('steps', [])
            for step in steps:
                run_command = step.get('run', '')
                for pattern in dangerous_patterns:
                    assert pattern not in run_command.lower(), \
                        f"Job '{job_name}' contains potentially dangerous command: {pattern}"
    
    def test_workflow_uses_safe_expressions(self, manual_workflow_content):
        """Test that workflow expressions are properly formatted"""
        jobs = manual_workflow_content.get('jobs', {})
        for job_name, job_config in jobs.items():
            steps = job_config.get('steps', [])
            for step in steps:
                run_command = step.get('run', '')
                # Check for proper expression syntax if used
                if '${{' in run_command:
                    assert '}}' in run_command, \
                        f"Malformed expression in job '{job_name}'"


class TestGitHubWorkflowEdgeCases:
    """Test edge cases and validation scenarios"""
    
    @pytest.fixture
    def workflows_dir(self):
        """Get workflows directory"""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    def test_workflow_file_encoding(self, workflows_dir):
        """Test that workflow file uses UTF-8 encoding"""
        manual_workflow = workflows_dir / 'manual.yml'
        
        try:
            with open(manual_workflow, 'r', encoding='utf-8') as f:
                content = f.read()
            assert len(content) > 0, "Workflow file should not be empty"
        except UnicodeDecodeError:
            pytest.fail("Workflow file should be UTF-8 encoded")
    
    def test_workflow_no_syntax_errors(self, workflows_dir):
        """Test that workflow has no YAML syntax errors"""
        manual_workflow = workflows_dir / 'manual.yml'
        
        try:
            with open(manual_workflow, 'r') as f:
                yaml.safe_load(f)
        except yaml.YAMLError as e:
            pytest.fail(f"YAML syntax error in workflow: {e}")
    
    def test_workflow_no_tabs(self, workflows_dir):
        """Test that workflow uses spaces, not tabs (YAML best practice)"""
        manual_workflow = workflows_dir / 'manual.yml'
        
        with open(manual_workflow, 'r') as f:
            content = f.read()
        
        assert '\t' not in content, \
            "Workflow should use spaces for indentation, not tabs"
    
    def test_workflow_consistent_indentation(self, workflows_dir):
        """Test that workflow has consistent indentation"""
        manual_workflow = workflows_dir / 'manual.yml'
        
        with open(manual_workflow, 'r') as f:
            lines = f.readlines()
        
        # Check that indentation is consistent (typically 2 spaces in YAML)
        indents = []
        for line in lines:
            if line.strip() and not line.strip().startswith('#'):
                indent = len(line) - len(line.lstrip(' '))
                if indent > 0:
                    indents.append(indent)
        
        if indents:
            # Check if all indents are multiples of 2
            for indent in indents:
                assert indent % 2 == 0, \
                    f"Indentation should be in multiples of 2 spaces, found {indent}"
    
    def test_workflow_comments_preserved(self, workflows_dir):
        """Test that workflow maintains helpful comments"""
        manual_workflow = workflows_dir / 'manual.yml'
        
        with open(manual_workflow, 'r') as f:
            content = f.read()
        
        # Should have comments explaining the workflow
        assert '#' in content, "Workflow should include explanatory comments"
    
    def test_workflow_on_key_in_raw_yaml(self, workflows_dir):
        """Test that 'on' key exists in raw YAML file"""
        manual_workflow = workflows_dir / 'manual.yml'
        
        with open(manual_workflow, 'r') as f:
            raw_content = f.read()
        
        # Check for 'on:' in raw file (even though it parses as True)
        assert 'on:' in raw_content, \
            "Workflow should have 'on:' key in raw YAML (parsed as boolean True)"


class TestGitHubWorkflowInputValidation:
    """Test input parameter validation and configuration"""
    
    @pytest.fixture
    def manual_workflow_content(self):
        """Load manual workflow"""
        repo_root = Path(__file__).parent.parent.parent
        workflow_path = repo_root / '.github' / 'workflows' / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)
    
    def test_input_types_are_valid(self, manual_workflow_content):
        """Test that all input types are valid GitHub Actions types"""
        valid_types = ['string', 'choice', 'boolean', 'environment']
        
        # YAML parses 'on' as True
        inputs = manual_workflow_content.get(True, {}).get('workflow_dispatch', {}).get('inputs', {})
        
        for input_name, input_config in inputs.items():
            input_type = input_config.get('type')
            assert input_type in valid_types, \
                f"Input '{input_name}' has invalid type '{input_type}'"
    
    def test_required_inputs_have_defaults(self, manual_workflow_content):
        """Test that required inputs have appropriate defaults"""
        inputs = manual_workflow_content.get(True, {}).get('workflow_dispatch', {}).get('inputs', {})
        
        for input_name, input_config in inputs.items():
            is_required = input_config.get('required', False)
            has_default = 'default' in input_config
            
            if is_required:
                assert has_default, \
                    f"Required input '{input_name}' should have a default value"
    
    def test_input_descriptions_are_meaningful(self, manual_workflow_content):
        """Test that input descriptions are helpful"""
        inputs = manual_workflow_content.get(True, {}).get('workflow_dispatch', {}).get('inputs', {})
        
        for input_name, input_config in inputs.items():
            description = input_config.get('description', '')
            assert len(description) > 0, \
                f"Input '{input_name}' should have a description"
            assert len(description) > 10, \
                f"Input '{input_name}' description should be meaningful"
    
    def test_string_inputs_have_reasonable_defaults(self, manual_workflow_content):
        """Test that string inputs have reasonable default values"""
        inputs = manual_workflow_content.get(True, {}).get('workflow_dispatch', {}).get('inputs', {})
        
        for input_name, input_config in inputs.items():
            if input_config.get('type') == 'string':
                default = input_config.get('default')
                assert default is not None, \
                    f"String input '{input_name}' should have a default"
                assert isinstance(default, str), \
                    f"Default for string input '{input_name}' should be a string"


class TestGitHubWorkflowJobConfiguration:
    """Test job configuration and structure"""
    
    @pytest.fixture
    def manual_workflow_content(self):
        """Load manual workflow"""
        repo_root = Path(__file__).parent.parent.parent
        workflow_path = repo_root / '.github' / 'workflows' / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)
    
    def test_all_jobs_have_runners(self, manual_workflow_content):
        """Test that all jobs specify a runner"""
        jobs = manual_workflow_content.get('jobs', {})
        
        for job_name, job_config in jobs.items():
            assert 'runs-on' in job_config, \
                f"Job '{job_name}' must specify 'runs-on'"
    
    def test_runners_are_valid(self, manual_workflow_content):
        """Test that all runners are valid GitHub-hosted runners"""
        valid_runners = [
            'ubuntu-latest', 'ubuntu-22.04', 'ubuntu-20.04',
            'macos-latest', 'macos-12', 'macos-11',
            'windows-latest', 'windows-2022', 'windows-2019'
        ]
        
        jobs = manual_workflow_content.get('jobs', {})
        
        for job_name, job_config in jobs.items():
            runner = job_config.get('runs-on')
            assert runner in valid_runners, \
                f"Job '{job_name}' uses invalid runner '{runner}'"
    
    def test_all_steps_are_properly_structured(self, manual_workflow_content):
        """Test that all steps have proper structure"""
        jobs = manual_workflow_content.get('jobs', {})
        
        for job_name, job_config in jobs.items():
            steps = job_config.get('steps', [])
            
            for i, step in enumerate(steps):
                assert isinstance(step, dict), \
                    f"Step {i} in job '{job_name}' should be a dictionary"
                
                # Each step should have either 'run' or 'uses'
                has_run = 'run' in step
                has_uses = 'uses' in step
                
                assert has_run or has_uses, \
                    f"Step {i} in job '{job_name}' must have 'run' or 'uses'"
    
    def test_steps_have_names(self, manual_workflow_content):
        """Test that steps have descriptive names"""
        jobs = manual_workflow_content.get('jobs', {})
        
        for job_name, job_config in jobs.items():
            steps = job_config.get('steps', [])
            
            for i, step in enumerate(steps):
                assert 'name' in step, \
                    f"Step {i} in job '{job_name}' should have a 'name'"
                
                name = step.get('name', '')
                assert len(name) > 0, \
                    f"Step {i} in job '{job_name}' name should not be empty"


class TestGitHubWorkflowRegressions:
    """Test for potential regressions and breaking changes"""
    
    @pytest.fixture
    def manual_workflow_content(self):
        """Load manual workflow"""
        repo_root = Path(__file__).parent.parent.parent
        workflow_path = repo_root / '.github' / 'workflows' / 'manual.yml'
        with open(workflow_path, 'r') as f:
            return yaml.safe_load(f)
    
    def test_workflow_name_not_changed(self, manual_workflow_content):
        """Test that workflow name remains consistent"""
        expected_name = 'Manual workflow'
        assert manual_workflow_content.get('name') == expected_name, \
            f"Workflow name should be '{expected_name}'"
    
    def test_trigger_mechanism_preserved(self, manual_workflow_content):
        """Test that workflow_dispatch trigger is preserved"""
        # YAML parses 'on' as True
        on_config = manual_workflow_content.get(True, {})
        assert 'workflow_dispatch' in on_config, \
            "Workflow should still use workflow_dispatch trigger"
    
    def test_input_parameters_preserved(self, manual_workflow_content):
        """Test that input parameters are not removed or changed"""
        inputs = manual_workflow_content.get(True, {}).get('workflow_dispatch', {}).get('inputs', {})
        
        # Ensure 'name' input still exists
        assert 'name' in inputs, "Input 'name' should be preserved"
        
        # Ensure key properties are preserved
        name_input = inputs['name']
        assert 'description' in name_input, "Input 'name' should have description"
        assert 'default' in name_input, "Input 'name' should have default"
        assert 'required' in name_input, "Input 'name' should have required field"
    
    def test_job_functionality_preserved(self, manual_workflow_content):
        """Test that greet job functionality is preserved"""
        jobs = manual_workflow_content.get('jobs', {})
        assert 'greet' in jobs, "Greet job should be preserved"
        
        greet_job = jobs['greet']
        steps = greet_job.get('steps', [])
        
        # Find greeting step
        greeting_found = False
        for step in steps:
            if 'Send greeting' in step.get('name', ''):
                greeting_found = True
                assert 'run' in step, "Greeting step should have run command"
                assert 'echo' in step['run'].lower(), \
                    "Greeting step should echo a message"
        
        assert greeting_found, "Greeting step should be preserved"
    
    def test_new_permissions_added_correctly(self, manual_workflow_content):
        """Test that new permissions field was added correctly"""
        # This test validates the actual change made in the PR
        assert 'permissions' in manual_workflow_content, \
            "Permissions field should be added"
        
        permissions = manual_workflow_content.get('permissions', {})
        assert 'contents' in permissions, \
            "Permissions should include contents scope"
        assert permissions['contents'] == 'read', \
            "Contents permission should be set to 'read'"


class TestYAMLBooleanKeyHandling:
    """Test suite specifically for YAML boolean key handling"""
    
    @pytest.fixture
    def workflows_dir(self):
        """Get workflows directory"""
        repo_root = Path(__file__).parent.parent.parent
        return repo_root / '.github' / 'workflows'
    
    def test_on_key_parsed_as_boolean(self, workflows_dir):
        """Test that 'on' key is correctly parsed as boolean True by YAML"""
        manual_workflow = workflows_dir / 'manual.yml'
        
        with open(manual_workflow, 'r') as f:
            content = yaml.safe_load(f)
        
        # YAML interprets 'on' as boolean True
        assert True in content, \
            "'on' key should be parsed as boolean True by PyYAML"
        assert isinstance(content[True], dict), \
            "Value for 'on' (True) key should be a dictionary"
    
    def test_on_key_contains_workflow_dispatch(self, workflows_dir):
        """Test that the boolean True key contains workflow_dispatch"""
        manual_workflow = workflows_dir / 'manual.yml'
        
        with open(manual_workflow, 'r') as f:
            content = yaml.safe_load(f)
        
        on_section = content.get(True, {})
        assert 'workflow_dispatch' in on_section, \
            "The 'on' section (parsed as True) should contain workflow_dispatch"


pytestmark = pytest.mark.unit