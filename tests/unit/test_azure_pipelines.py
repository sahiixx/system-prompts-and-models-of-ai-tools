#!/usr/bin/env python3
"""
Comprehensive unit tests for azure-pipelines.yml
Tests Azure Pipelines configuration, structure, and best practices
"""
import unittest
import sys
from pathlib import Path

# Handle the local yaml module conflict
# The repository has a custom yaml/ directory that shadows PyYAML
# We need to temporarily modify sys.path to import the real PyYAML
original_path = sys.path.copy()
# Remove current directory from path to avoid local yaml module
sys.path = [p for p in sys.path if not p.endswith('git')]
sys.path.insert(0, '/usr/local/lib/python3.11/dist-packages')

try:
    import yaml
except ImportError:
    # Fallback: use ruamel.yaml if available
    from ruamel.yaml import YAML
    yaml_loader = YAML(typ='safe')
    
    class yaml:
        """Wrapper for ruamel.yaml to match PyYAML API"""
        class YAMLError(Exception):
            pass
        
        @staticmethod
        def safe_load(stream):
            yaml_obj = YAML(typ='safe')
            return yaml_obj.load(stream)

# Restore original path
sys.path = original_path


class TestAzurePipelineStructure(unittest.TestCase):
    """Test suite for Azure Pipeline YAML structure validation"""
    
    @classmethod
    def setUpClass(cls):
        """Initialize class-level Path objects for the pipeline file."""
        cls.repo_root = Path(__file__).parent.parent.parent
        cls.pipeline_file = cls.repo_root / 'azure-pipelines.yml'
        cls.pipeline_data = None
        
        # Load the pipeline data once for all tests
        if cls.pipeline_file.exists():
            with open(cls.pipeline_file, 'r') as f:
                cls.pipeline_data = yaml.safe_load(f)
    
    def test_pipeline_file_exists(self):
        """Verify the azure-pipelines.yml file exists at the repository root."""
        self.assertTrue(self.pipeline_file.exists(), 
                       "azure-pipelines.yml should exist at repository root")
        self.assertTrue(self.pipeline_file.is_file(), 
                       "azure-pipelines.yml should be a file")
    
    def test_pipeline_is_valid_yaml(self):
        """Verify that azure-pipelines.yml contains valid YAML syntax."""
        try:
            with open(self.pipeline_file, 'r') as f:
                data = yaml.safe_load(f)
            self.assertIsNotNone(data, "YAML should parse to non-None value")
        except yaml.YAMLError as e:
            self.fail(f"azure-pipelines.yml is not valid YAML: {e}")
    
    def test_pipeline_not_empty(self):
        """Verify that azure-pipelines.yml is not empty."""
        self.assertIsNotNone(self.pipeline_data, 
                            "Pipeline YAML should not be empty")
        self.assertTrue(len(self.pipeline_data) > 0, 
                       "Pipeline YAML should contain configuration")


class TestAzurePipelineTrigger(unittest.TestCase):
    """Test suite for Azure Pipeline trigger configuration"""
    
    @classmethod
    def setUpClass(cls):
        """Load pipeline data for trigger tests"""
        cls.pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(cls.pipeline_file, 'r') as f:
            cls.pipeline_data = yaml.safe_load(f)
    
    def test_trigger_exists(self):
        """Verify that the pipeline defines a trigger configuration."""
        self.assertIn('trigger', self.pipeline_data, 
                     "Pipeline should define a trigger")
    
    def test_trigger_includes_main_branch(self):
        """Verify that the trigger includes the main branch."""
        trigger = self.pipeline_data.get('trigger')
        self.assertIsNotNone(trigger, "Trigger should not be None")
        
        # Trigger can be a list or a dict
        if isinstance(trigger, list):
            self.assertIn('main', trigger, 
                         "Trigger should include 'main' branch")
        elif isinstance(trigger, dict):
            branches = trigger.get('branches', {}).get('include', [])
            self.assertIn('main', branches, 
                         "Trigger branches should include 'main'")
    
    def test_trigger_configuration_valid(self):
        """Verify that trigger configuration is properly structured."""
        trigger = self.pipeline_data.get('trigger')
        self.assertTrue(
            isinstance(trigger, (list, dict)), 
            "Trigger should be a list or dict"
        )
        
        if isinstance(trigger, list):
            self.assertTrue(all(isinstance(b, str) for b in trigger), 
                          "All trigger branches should be strings")
        elif isinstance(trigger, dict):
            self.assertTrue('branches' in trigger or 'paths' in trigger or 'tags' in trigger,
                          "Trigger dict should contain branches, paths, or tags")


class TestAzurePipelinePool(unittest.TestCase):
    """Test suite for Azure Pipeline pool/agent configuration"""
    
    @classmethod
    def setUpClass(cls):
        """Load pipeline data for pool tests"""
        cls.pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(cls.pipeline_file, 'r') as f:
            cls.pipeline_data = yaml.safe_load(f)
    
    def test_pool_exists(self):
        """Verify that the pipeline defines a pool configuration."""
        self.assertIn('pool', self.pipeline_data, 
                     "Pipeline should define a pool configuration")
    
    def test_pool_has_vm_image(self):
        """Verify that pool configuration specifies a vmImage."""
        pool = self.pipeline_data.get('pool', {})
        self.assertIn('vmImage', pool, 
                     "Pool should specify a vmImage")
    
    def test_pool_uses_ubuntu_latest(self):
        """Verify that the pool uses ubuntu-latest as the VM image."""
        pool = self.pipeline_data.get('pool', {})
        vm_image = pool.get('vmImage')
        self.assertEqual(vm_image, 'ubuntu-latest', 
                        "Pool should use 'ubuntu-latest' vmImage")
    
    def test_pool_vm_image_is_valid(self):
        """Verify that the vmImage is a recognized Azure Pipelines image."""
        valid_images = [
            'ubuntu-latest', 'ubuntu-22.04', 'ubuntu-20.04',
            'windows-latest', 'windows-2022', 'windows-2019',
            'macos-latest', 'macos-13', 'macos-12', 'macos-11'
        ]
        pool = self.pipeline_data.get('pool', {})
        vm_image = pool.get('vmImage')
        self.assertIn(vm_image, valid_images, 
                     f"vmImage should be one of {valid_images}")


class TestAzurePipelineSteps(unittest.TestCase):
    """Test suite for Azure Pipeline steps configuration"""
    
    @classmethod
    def setUpClass(cls):
        """Load pipeline data for steps tests"""
        cls.pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(cls.pipeline_file, 'r') as f:
            cls.pipeline_data = yaml.safe_load(f)
    
    def test_steps_exist(self):
        """Verify that the pipeline defines steps."""
        self.assertIn('steps', self.pipeline_data, 
                     "Pipeline should define steps")
    
    def test_steps_is_list(self):
        """Verify that steps is a list."""
        steps = self.pipeline_data.get('steps')
        self.assertIsInstance(steps, list, 
                            "Steps should be a list")
    
    def test_steps_not_empty(self):
        """Verify that the pipeline has at least one step."""
        steps = self.pipeline_data.get('steps', [])
        self.assertTrue(len(steps) > 0, 
                       "Pipeline should have at least one step")
    
    def test_all_steps_have_valid_structure(self):
        """Verify that all steps have valid structure (task or script)."""
        steps = self.pipeline_data.get('steps', [])
        for i, step in enumerate(steps):
            self.assertIsInstance(step, dict, 
                                f"Step {i} should be a dict")
            self.assertTrue(
                'task' in step or 'script' in step or 'bash' in step or 'pwsh' in step,
                f"Step {i} should have 'task', 'script', 'bash', or 'pwsh' key"
            )
    
    def test_all_steps_have_display_name(self):
        """Verify that all steps have a displayName for readability."""
        steps = self.pipeline_data.get('steps', [])
        for i, step in enumerate(steps):
            self.assertIn('displayName', step, 
                         f"Step {i} should have a displayName")
            self.assertIsInstance(step['displayName'], str,
                                f"Step {i} displayName should be a string")
            self.assertTrue(len(step['displayName']) > 0,
                          f"Step {i} displayName should not be empty")


class TestAzurePipelineNodeJsSetup(unittest.TestCase):
    """Test suite for Node.js setup step configuration"""
    
    @classmethod
    def setUpClass(cls):
        """Load pipeline data and identify Node.js step"""
        cls.pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(cls.pipeline_file, 'r') as f:
            cls.pipeline_data = yaml.safe_load(f)
        
        # Find the NodeTool step
        cls.node_step = None
        for step in cls.pipeline_data.get('steps', []):
            if step.get('task', '').startswith('NodeTool'):
                cls.node_step = step
                break
    
    def test_node_tool_step_exists(self):
        """Verify that a NodeTool task exists in the pipeline."""
        self.assertIsNotNone(self.node_step, 
                            "Pipeline should have a NodeTool task")
    
    def test_node_tool_version(self):
        """Verify that NodeTool task uses correct version format."""
        if self.node_step:
            task = self.node_step.get('task', '')
            self.assertEqual(task, 'NodeTool@0', 
                           "Node tool task should be 'NodeTool@0'")
    
    def test_node_tool_has_inputs(self):
        """Verify that NodeTool task has inputs configuration."""
        if self.node_step:
            self.assertIn('inputs', self.node_step, 
                         "NodeTool step should have inputs")
    
    def test_node_tool_version_spec(self):
        """Verify that NodeTool task specifies a version."""
        if self.node_step:
            inputs = self.node_step.get('inputs', {})
            self.assertIn('versionSpec', inputs, 
                         "NodeTool inputs should specify versionSpec")
    
    def test_node_tool_version_value(self):
        """Verify that Node.js version is set to '20.x'."""
        if self.node_step:
            inputs = self.node_step.get('inputs', {})
            version_spec = inputs.get('versionSpec')
            self.assertEqual(version_spec, '20.x', 
                           "Node.js version should be '20.x'")
    
    def test_node_tool_version_format(self):
        """Verify that version spec follows proper format."""
        if self.node_step:
            inputs = self.node_step.get('inputs', {})
            version_spec = inputs.get('versionSpec', '')
            self.assertIsInstance(version_spec, str, 
                                "versionSpec should be a string")
            # Should be in format like '20.x', '18.x', etc.
            self.assertRegex(version_spec, r'^\d+\.(x|\d+)(\.\d+)?$',
                           "versionSpec should follow version pattern")
    
    def test_node_tool_display_name(self):
        """Verify that NodeTool step has a meaningful displayName."""
        if self.node_step:
            display_name = self.node_step.get('displayName', '')
            self.assertIn('Node', display_name, 
                         "NodeTool displayName should mention 'Node'")


class TestAzurePipelineBuildStep(unittest.TestCase):
    """Test suite for build script step configuration"""
    
    @classmethod
    def setUpClass(cls):
        """Load pipeline data and identify build step"""
        cls.pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(cls.pipeline_file, 'r') as f:
            cls.pipeline_data = yaml.safe_load(f)
        
        # Find the script step
        cls.build_step = None
        for step in cls.pipeline_data.get('steps', []):
            if 'script' in step:
                cls.build_step = step
                break
    
    def test_build_step_exists(self):
        """Verify that a script step exists for building."""
        self.assertIsNotNone(self.build_step, 
                            "Pipeline should have a script step")
    
    def test_build_step_has_display_name(self):
        """Verify that build step has a displayName."""
        if self.build_step:
            self.assertIn('displayName', self.build_step, 
                         "Build step should have a displayName")
    
    def test_build_step_includes_npm_install(self):
        """Verify that build script includes npm install command."""
        if self.build_step:
            script = self.build_step.get('script', '')
            self.assertIn('npm install', script, 
                         "Build script should include 'npm install'")
    
    def test_build_step_includes_npm_build(self):
        """Verify that build script includes npm run build command."""
        if self.build_step:
            script = self.build_step.get('script', '')
            self.assertIn('npm run build', script, 
                         "Build script should include 'npm run build'")
    
    def test_build_step_script_is_multiline(self):
        """Verify that script supports multiline commands."""
        if self.build_step:
            script = self.build_step.get('script')
            self.assertIsInstance(script, str, 
                                "Script should be a string")
    
    def test_build_step_commands_in_order(self):
        """Verify that npm install comes before npm run build."""
        if self.build_step:
            script = self.build_step.get('script', '')
            install_pos = script.find('npm install')
            build_pos = script.find('npm run build')
            
            self.assertGreater(install_pos, -1, 
                             "'npm install' should be in script")
            self.assertGreater(build_pos, -1, 
                             "'npm run build' should be in script")
            self.assertLess(install_pos, build_pos, 
                          "'npm install' should come before 'npm run build'")


class TestAzurePipelineComments(unittest.TestCase):
    """Test suite for pipeline documentation via comments"""
    
    @classmethod
    def setUpClass(cls):
        """Load pipeline file content as text"""
        cls.pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(cls.pipeline_file, 'r') as f:
            cls.pipeline_content = f.read()
    
    def test_has_header_comments(self):
        """Verify that pipeline file has descriptive header comments."""
        lines = self.pipeline_content.strip().split('\n')
        first_line = lines[0] if lines else ''
        self.assertTrue(first_line.startswith('#'), 
                       "Pipeline should start with comment header")
    
    def test_mentions_nodejs(self):
        """Verify that comments mention Node.js."""
        self.assertIn('Node', self.pipeline_content, 
                     "Pipeline should mention Node.js in comments")
    
    def test_mentions_react(self):
        """Verify that comments mention React."""
        self.assertIn('React', self.pipeline_content, 
                     "Pipeline should mention React in comments")


if __name__ == '__main__':
    unittest.main(verbosity=2)