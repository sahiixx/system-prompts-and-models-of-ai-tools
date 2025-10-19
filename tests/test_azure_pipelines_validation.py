"""
Unit Tests for Azure Pipelines Configuration File
Validates azure-pipelines.yml structure, syntax, and configuration
"""
import unittest
import yaml
from pathlib import Path


class TestAzurePipelinesValidation(unittest.TestCase):
    """Test suite for Azure Pipelines YAML validation"""
    
    @classmethod
    def setUpClass(cls):
        """
        Initialize class-level Path objects for the Azure Pipelines configuration.
        
        Sets `cls.azure_pipeline_file` to Path('azure-pipelines.yml').
        """
        cls.azure_pipeline_file = Path('azure-pipelines.yml')
        
    def test_azure_pipeline_exists(self):
        """
        Verify the repository's Azure Pipelines configuration file (azure-pipelines.yml) exists.
        
        Asserts that the path prepared in setUpClass points to an existing file.
        """
        self.assertTrue(self.azure_pipeline_file.exists(), 
                       "azure-pipelines.yml should exist in repository root")
        
    def test_yaml_loads(self):
        """
        Verify that the Azure Pipelines YAML file loads successfully.
        
        Asserts that parsing azure-pipelines.yml with yaml.safe_load produces a non-None value.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        self.assertIsNotNone(data, "YAML should parse successfully")
        
    def test_yaml_is_dictionary(self):
        """
        Verify that parsed YAML is a dictionary structure.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        self.assertIsInstance(data, dict, "Parsed YAML should be a dictionary")
        
    def test_trigger_defined(self):
        """
        Test that trigger configuration is defined.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        self.assertIn('trigger', data, "Pipeline should have 'trigger' configuration")
        
    def test_trigger_includes_main(self):
        """
        Verify that trigger configuration includes the main branch.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        trigger = data.get('trigger')
        
        if isinstance(trigger, list):
            self.assertIn('main', trigger, "Trigger should include 'main' branch")
        elif isinstance(trigger, dict):
            branches = trigger.get('branches', {})
            include = branches.get('include', [])
            self.assertIn('main', include, "Trigger should include 'main' branch")
            
    def test_pool_defined(self):
        """
        Test that pool configuration is defined.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        self.assertIn('pool', data, "Pipeline should have 'pool' configuration")
        
    def test_pool_has_vm_image(self):
        """
        Verify that pool configuration specifies a vmImage.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        pool = data.get('pool', {})
        self.assertIn('vmImage', pool, "Pool should specify 'vmImage'")
        
    def test_vm_image_is_ubuntu(self):
        """
        Verify that vmImage uses Ubuntu.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        pool = data.get('pool', {})
        vm_image = pool.get('vmImage', '')
        self.assertIn('ubuntu', vm_image.lower(), 
                     "vmImage should be Ubuntu-based")
        
    def test_steps_defined(self):
        """
        Test that steps are defined in the pipeline.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        self.assertIn('steps', data, "Pipeline should have 'steps'")
        
    def test_steps_is_list(self):
        """
        Verify that steps is a list.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps')
        self.assertIsInstance(steps, list, "Steps should be a list")
        self.assertGreater(len(steps), 0, "Steps list should not be empty")
        
    def test_first_step_is_node_setup(self):
        """
        Verify that first step sets up Node.js environment.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps', [])
        self.assertGreater(len(steps), 0, "Should have at least one step")
        
        first_step = steps[0]
        self.assertIn('task', first_step, "First step should be a task")
        self.assertEqual(first_step['task'], 'NodeTool@0', 
                        "First step should be NodeTool@0")
        
    def test_node_tool_has_version(self):
        """
        Verify that NodeTool task specifies a Node.js version.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps', [])
        node_tool_step = steps[0]
        
        self.assertIn('inputs', node_tool_step, 
                     "NodeTool task should have inputs")
        inputs = node_tool_step['inputs']
        self.assertIn('versionSpec', inputs, 
                     "NodeTool inputs should specify versionSpec")
        
    def test_node_version_format(self):
        """
        Verify that Node.js version is in correct format.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps', [])
        node_tool_step = steps[0]
        version_spec = node_tool_step['inputs']['versionSpec']
        
        self.assertIsInstance(version_spec, str, 
                            "versionSpec should be a string")
        self.assertTrue(len(version_spec) > 0, 
                       "versionSpec should not be empty")
        
    def test_has_build_script(self):
        """
        Verify that pipeline includes a build script.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps', [])
        
        # Look for a script step
        has_script = any('script' in step for step in steps)
        self.assertTrue(has_script, "Pipeline should have at least one script step")
        
    def test_build_includes_npm_install(self):
        """
        Verify that build script includes npm install.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps', [])
        
        # Find script steps and check for npm install
        script_steps = [step.get('script', '') for step in steps if 'script' in step]
        combined_script = ' '.join(script_steps)
        self.assertIn('npm install', combined_script, 
                     "Build script should include 'npm install'")
        
    def test_build_includes_npm_build(self):
        """
        Verify that build script includes npm run build.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps', [])
        
        # Find script steps and check for npm build
        script_steps = [step.get('script', '') for step in steps if 'script' in step]
        combined_script = ' '.join(script_steps)
        self.assertTrue('npm run build' in combined_script or 'npm build' in combined_script,
                       "Build script should include npm build command")
        
    def test_steps_have_display_names(self):
        """
        Verify that steps have display names for better readability.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps', [])
        
        for step in steps:
            self.assertIn('displayName', step, 
                         f"Step {step} should have a displayName")
            
    def test_display_names_not_empty(self):
        """
        Verify that display names are not empty strings.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps', [])
        
        for step in steps:
            if 'displayName' in step:
                display_name = step['displayName']
                self.assertTrue(len(display_name) > 0, 
                              "displayName should not be empty")
                
    def test_no_syntax_errors(self):
        """
        Verify that YAML has no syntax errors.
        """
        try:
            with open(self.azure_pipeline_file) as f:
                yaml.safe_load(f)
        except yaml.YAMLError as e:
            self.fail(f"YAML syntax error: {e}")
            
    def test_file_not_empty(self):
        """
        Verify that the file is not empty.
        """
        with open(self.azure_pipeline_file) as f:
            content = f.read()
        self.assertTrue(len(content) > 0, "File should not be empty")
        
    def test_file_has_content(self):
        """
        Verify that file has substantial content.
        """
        with open(self.azure_pipeline_file) as f:
            content = f.read()
        self.assertGreater(len(content), 100, 
                          "File should have substantial content")
        
    def test_minimum_steps_count(self):
        """
        Verify that pipeline has minimum required steps.
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps', [])
        self.assertGreaterEqual(len(steps), 2, 
                               "Pipeline should have at least 2 steps (setup and build)")
        
    def test_task_versions_specified(self):
        """
        Verify that tasks specify versions (not using @latest).
        """
        with open(self.azure_pipeline_file) as f:
            data = yaml.safe_load(f)
        steps = data.get('steps', [])
        
        for step in steps:
            if 'task' in step:
                task = step['task']
                self.assertIn('@', task, 
                            f"Task '{task}' should specify a version")
                self.assertNotIn('@latest', task.lower(), 
                               f"Task '{task}' should not use @latest")


class TestAzurePipelinesSchema(unittest.TestCase):
    """Test suite for Azure Pipelines schema validation"""
    
    def setUp(self):
        """Load the Azure Pipelines configuration for each test."""
        self.azure_pipeline_file = Path('azure-pipelines.yml')
        with open(self.azure_pipeline_file) as f:
            self.config = yaml.safe_load(f)
    
    def test_top_level_keys(self):
        """Test that expected top-level keys are present."""
        expected_keys = ['trigger', 'pool', 'steps']
        for key in expected_keys:
            self.assertIn(key, self.config, 
                         f"Configuration should have '{key}' at top level")
    
    def test_pool_structure(self):
        """Test that pool has correct structure."""
        pool = self.config.get('pool', {})
        self.assertIsInstance(pool, dict, "Pool should be a dictionary")
        self.assertIn('vmImage', pool, "Pool should have vmImage")
    
    def test_steps_structure(self):
        """Test that steps have correct structure."""
        steps = self.config.get('steps', [])
        self.assertIsInstance(steps, list, "Steps should be a list")
        
        for step in steps:
            self.assertIsInstance(step, dict, "Each step should be a dictionary")
            # Each step should have either 'task' or 'script'
            has_task_or_script = 'task' in step or 'script' in step
            self.assertTrue(has_task_or_script, 
                          "Each step should have 'task' or 'script'")
    
    def test_node_tool_inputs_structure(self):
        """Test that NodeTool task inputs have correct structure."""
        steps = self.config.get('steps', [])
        node_tool_step = next((s for s in steps if s.get('task', '').startswith('NodeTool')), None)
        
        self.assertIsNotNone(node_tool_step, "Should have NodeTool task")
        self.assertIn('inputs', node_tool_step, "NodeTool should have inputs")
        
        inputs = node_tool_step['inputs']
        self.assertIsInstance(inputs, dict, "Inputs should be a dictionary")
        self.assertIn('versionSpec', inputs, "Inputs should have versionSpec")


class TestAzurePipelinesSecurity(unittest.TestCase):
    """Test suite for security best practices"""
    
    def setUp(self):
        """Load configuration for security tests."""
        self.azure_pipeline_file = Path('azure-pipelines.yml')
        with open(self.azure_pipeline_file) as f:
            self.content = f.read()
            f.seek(0)
            self.config = yaml.safe_load(f)
    
    def test_no_hardcoded_credentials(self):
        """Test that there are no hardcoded credentials."""
        sensitive_patterns = [
            'password=',
            'token=',
            'secret=',
            'api_key=',
            'apikey='
        ]
        
        content_lower = self.content.lower()
        for pattern in sensitive_patterns:
            self.assertNotIn(pattern, content_lower,
                           f"Should not contain hardcoded {pattern}")
    
    def test_no_private_keys(self):
        """Test that there are no private keys in the file."""
        self.assertNotIn('BEGIN PRIVATE KEY', self.content,
                        "Should not contain private keys")
        self.assertNotIn('BEGIN RSA PRIVATE KEY', self.content,
                        "Should not contain RSA private keys")


if __name__ == '__main__':
    unittest.main(verbosity=2)