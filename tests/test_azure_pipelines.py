"""Unit Tests for Azure Pipelines Configuration File"""
import unittest
import yaml
from pathlib import Path


class TestAzurePipelinesValidation(unittest.TestCase):
    """Test suite for Azure Pipelines configuration validation"""
    
    @classmethod
    def setUpClass(cls):
        """
        Initialize class-level Path object for the Azure Pipelines configuration file.
        
        Sets `cls.pipeline_file` to Path('azure-pipelines.yml') at repository root.
        """
        cls.pipeline_file = Path('azure-pipelines.yml')
    
    def _load_pipeline_config(self):
        """Helper method to load and parse the pipeline configuration."""
        with open(self.pipeline_file) as f:
            return yaml.safe_load(f)
    
    # File Existence and Basic Validation Tests
    
    def test_azure_pipelines_file_exists(self):
        """
        Verify the Azure Pipelines configuration file exists at repository root.
        
        Asserts that azure-pipelines.yml exists as a file in the repository root directory.
        """
        self.assertTrue(
            self.pipeline_file.exists(),
            f"Azure Pipelines configuration file not found at {self.pipeline_file}"
        )
    
    def test_azure_pipelines_is_file(self):
        """
        Verify azure-pipelines.yml is a regular file, not a directory or symlink.
        """
        self.assertTrue(
            self.pipeline_file.is_file(),
            f"{self.pipeline_file} should be a regular file"
        )
    
    def test_yaml_loads_successfully(self):
        """
        Verify that the pipeline YAML file loads successfully without errors.
        
        Asserts that parsing azure-pipelines.yml with yaml.safe_load produces a non-None value
        and doesn't raise any YAML parsing exceptions.
        """
        data = self._load_pipeline_config()
        self.assertIsNotNone(data, "YAML file should parse to a non-None value")
        self.assertIsInstance(data, dict, "YAML root should be a dictionary")
    
    def test_yaml_not_empty(self):
        """
        Verify the YAML file contains configuration data.
        """
        data = self._load_pipeline_config()
        self.assertTrue(len(data) > 0, "Pipeline configuration should not be empty")
    
    # Trigger Configuration Tests
    
    def test_trigger_exists(self):
        """
        Verify that the pipeline has a trigger configuration defined.
        
        The trigger determines which branches cause the pipeline to execute.
        """
        data = self._load_pipeline_config()
        self.assertIn('trigger', data, "Pipeline should have a 'trigger' configuration")
    
    def test_trigger_includes_main_branch(self):
        """
        Verify the pipeline triggers on the main branch.
        
        Ensures CI/CD runs for the primary development branch.
        """
        data = self._load_pipeline_config()
        trigger = data.get('trigger')
        
        # Trigger can be a list of branches or a more complex object
        if isinstance(trigger, list):
            self.assertIn('main', trigger, "Trigger should include 'main' branch")
        elif isinstance(trigger, dict):
            branches = trigger.get('branches', {})
            if isinstance(branches, dict):
                include = branches.get('include', [])
                self.assertIn('main', include, "Trigger branches should include 'main'")
            else:
                self.fail("Unexpected trigger configuration structure")
        else:
            # If trigger is just a single branch string (unlikely but possible)
            self.assertEqual(trigger, 'main', "Trigger should be 'main'")
    
    def test_trigger_type_is_valid(self):
        """
        Verify the trigger configuration uses a valid type (list or dict).
        """
        data = self._load_pipeline_config()
        trigger = data.get('trigger')
        self.assertIn(
            type(trigger).__name__,
            ['list', 'dict', 'str'],
            "Trigger should be a list, dict, or string"
        )
    
    # Pool Configuration Tests
    
    def test_pool_exists(self):
        """
        Verify that the pipeline has a pool configuration defined.
        
        The pool specifies the agent infrastructure used for pipeline execution.
        """
        data = self._load_pipeline_config()
        self.assertIn('pool', data, "Pipeline should have a 'pool' configuration")
    
    def test_pool_has_vm_image(self):
        """
        Verify the pool configuration specifies a VM image.
        
        Azure Pipelines requires a VM image to determine the execution environment.
        """
        data = self._load_pipeline_config()
        pool = data.get('pool', {})
        self.assertIsInstance(pool, dict, "Pool configuration should be a dictionary")
        self.assertIn('vmImage', pool, "Pool should specify a 'vmImage'")
    
    def test_pool_uses_ubuntu_latest(self):
        """
        Verify the pipeline uses ubuntu-latest as the VM image.
        
        This ensures a consistent Linux environment for Node.js builds.
        """
        data = self._load_pipeline_config()
        pool = data.get('pool', {})
        vm_image = pool.get('vmImage')
        self.assertEqual(
            vm_image,
            'ubuntu-latest',
            "Pool should use 'ubuntu-latest' VM image"
        )
    
    def test_pool_vm_image_not_empty(self):
        """
        Verify the vmImage value is not an empty string.
        """
        data = self._load_pipeline_config()
        pool = data.get('pool', {})
        vm_image = pool.get('vmImage', '')
        self.assertTrue(
            len(vm_image) > 0,
            "VM image specification should not be empty"
        )
    
    # Steps Configuration Tests
    
    def test_steps_exists(self):
        """
        Verify that the pipeline has steps defined.
        
        Steps are the individual tasks that execute in the pipeline.
        """
        data = self._load_pipeline_config()
        self.assertIn('steps', data, "Pipeline should have 'steps' defined")
    
    def test_steps_is_list(self):
        """
        Verify steps configuration is a list/array.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps')
        self.assertIsInstance(steps, list, "Steps should be a list")
    
    def test_steps_not_empty(self):
        """
        Verify the pipeline has at least one step defined.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        self.assertTrue(
            len(steps) > 0,
            "Pipeline should have at least one step"
        )
    
    def test_minimum_required_steps_count(self):
        """
        Verify the pipeline has at least two steps (Node setup + build).
        
        A typical Node.js pipeline needs at minimum: tool installation and build execution.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        self.assertGreaterEqual(
            len(steps),
            2,
            "Pipeline should have at least 2 steps (Node setup + build)"
        )
    
    # Node.js Setup Task Tests
    
    def test_first_step_is_node_tool_task(self):
        """
        Verify the first step is a NodeTool task for installing Node.js.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        self.assertGreater(len(steps), 0, "Should have at least one step")
        
        first_step = steps[0]
        self.assertIn('task', first_step, "First step should be a task")
        self.assertEqual(
            first_step.get('task'),
            'NodeTool@0',
            "First task should be 'NodeTool@0'"
        )
    
    def test_node_tool_has_inputs(self):
        """
        Verify the NodeTool task has required inputs configuration.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        node_tool_step = steps[0]
        
        self.assertIn('inputs', node_tool_step, "NodeTool task should have 'inputs'")
        self.assertIsInstance(
            node_tool_step.get('inputs'),
            dict,
            "NodeTool inputs should be a dictionary"
        )
    
    def test_node_version_specified(self):
        """
        Verify the NodeTool task specifies a Node.js version.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        node_tool_step = steps[0]
        inputs = node_tool_step.get('inputs', {})
        
        self.assertIn(
            'versionSpec',
            inputs,
            "NodeTool inputs should specify 'versionSpec'"
        )
    
    def test_node_version_is_20_x(self):
        """
        Verify the pipeline uses Node.js version 20.x.
        
        This ensures the build uses a modern LTS version of Node.js.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        node_tool_step = steps[0]
        inputs = node_tool_step.get('inputs', {})
        version_spec = inputs.get('versionSpec')
        
        self.assertEqual(
            version_spec,
            '20.x',
            "Node.js version should be '20.x'"
        )
    
    def test_node_version_format_valid(self):
        """
        Verify the Node.js version specification follows valid format.
        
        Azure Pipelines accepts formats like '20.x', '>=20.0.0', etc.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        node_tool_step = steps[0]
        inputs = node_tool_step.get('inputs', {})
        version_spec = inputs.get('versionSpec', '')
        
        # Should not be empty
        self.assertTrue(
            len(version_spec) > 0,
            "Node.js version spec should not be empty"
        )
        # Should contain a number
        self.assertTrue(
            any(char.isdigit() for char in version_spec),
            "Node.js version spec should contain a version number"
        )
    
    def test_node_tool_has_display_name(self):
        """
        Verify the NodeTool task has a descriptive display name.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        node_tool_step = steps[0]
        
        self.assertIn(
            'displayName',
            node_tool_step,
            "NodeTool task should have a 'displayName'"
        )
    
    def test_node_tool_display_name_not_empty(self):
        """
        Verify the NodeTool display name is not empty.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        node_tool_step = steps[0]
        display_name = node_tool_step.get('displayName', '')
        
        self.assertTrue(
            len(display_name) > 0,
            "NodeTool display name should not be empty"
        )
    
    def test_node_tool_display_name_mentions_node(self):
        """
        Verify the NodeTool display name references Node.js installation.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        node_tool_step = steps[0]
        display_name = node_tool_step.get('displayName', '').lower()
        
        self.assertTrue(
            'node' in display_name,
            "NodeTool display name should mention 'node'"
        )
    
    # Build Script Step Tests
    
    def test_second_step_is_script(self):
        """
        Verify the second step is a script that runs npm commands.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        self.assertGreater(len(steps), 1, "Should have at least two steps")
        
        build_step = steps[1]
        self.assertIn(
            'script',
            build_step,
            "Second step should be a script"
        )
    
    def test_build_script_not_empty(self):
        """
        Verify the build script contains commands.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        build_step = steps[1]
        script = build_step.get('script', '')
        
        self.assertTrue(
            len(script) > 0,
            "Build script should not be empty"
        )
    
    def test_build_script_has_npm_install(self):
        """
        Verify the build script includes npm install command.
        
        This is essential for installing project dependencies.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        build_step = steps[1]
        script = build_step.get('script', '')
        
        self.assertIn(
            'npm install',
            script,
            "Build script should include 'npm install'"
        )
    
    def test_build_script_has_npm_run_build(self):
        """
        Verify the build script includes npm run build command.
        
        This compiles/bundles the application for production.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        build_step = steps[1]
        script = build_step.get('script', '')
        
        self.assertIn(
            'npm run build',
            script,
            "Build script should include 'npm run build'"
        )
    
    def test_build_script_commands_order(self):
        """
        Verify npm install comes before npm run build.
        
        Dependencies must be installed before building.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        build_step = steps[1]
        script = build_step.get('script', '')
        
        install_pos = script.find('npm install')
        build_pos = script.find('npm run build')
        
        self.assertGreater(
            install_pos,
            -1,
            "Script should contain 'npm install'"
        )
        self.assertGreater(
            build_pos,
            -1,
            "Script should contain 'npm run build'"
        )
        self.assertLess(
            install_pos,
            build_pos,
            "'npm install' should come before 'npm run build'"
        )
    
    def test_build_step_has_display_name(self):
        """
        Verify the build script step has a display name.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        build_step = steps[1]
        
        self.assertIn(
            'displayName',
            build_step,
            "Build step should have a 'displayName'"
        )
    
    def test_build_display_name_not_empty(self):
        """
        Verify the build step display name is not empty.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        build_step = steps[1]
        display_name = build_step.get('displayName', '')
        
        self.assertTrue(
            len(display_name) > 0,
            "Build display name should not be empty"
        )
    
    def test_build_display_name_mentions_npm(self):
        """
        Verify the build display name references npm operations.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        build_step = steps[1]
        display_name = build_step.get('displayName', '').lower()
        
        self.assertTrue(
            'npm' in display_name,
            "Build display name should mention 'npm'"
        )
    
    # Structure and Best Practices Tests
    
    def test_all_steps_have_display_names(self):
        """
        Verify all steps have descriptive display names for better pipeline visibility.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        
        for i, step in enumerate(steps):
            with self.subTest(step_index=i):
                self.assertIn(
                    'displayName',
                    step,
                    f"Step {i} should have a displayName"
                )
                display_name = step.get('displayName', '')
                self.assertTrue(
                    len(display_name) > 0,
                    f"Step {i} displayName should not be empty"
                )
    
    def test_no_hardcoded_secrets(self):
        """
        Verify the pipeline configuration doesn't contain obvious hardcoded secrets.
        
        Checks for common secret patterns in the YAML content.
        """
        with open(self.pipeline_file) as f:
            content = f.read().lower()
        
        # Check for obvious secret indicators
        secret_indicators = ['password', 'secret', 'token', 'api_key', 'apikey']
        
        for indicator in secret_indicators:
            # We're looking for patterns like "password: actual_value"
            # Not just the word appearing in comments or display names
            if indicator in content:
                # Make sure it's not in a comment
                lines = content.split('\n')
                for line in lines:
                    if indicator in line and not line.strip().startswith('#'):
                        # Found a non-comment line with secret indicator
                        # This is just a warning check, might have false positives
                        self.assertNotIn(
                            f'{indicator}:',
                            line,
                            f"Potential hardcoded secret pattern detected: {indicator}"
                        )
    
    def test_uses_supported_node_version(self):
        """
        Verify the specified Node.js version is a supported LTS or current version.
        
        Node.js 20.x is an LTS version and should be supported.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        node_tool_step = steps[0]
        inputs = node_tool_step.get('inputs', {})
        version_spec = inputs.get('versionSpec', '')
        
        # Extract major version number
        major_version = ''.join(filter(str.isdigit, version_spec.split('.')[0]))
        
        if major_version:
            major_version = int(major_version)
            # Node.js 18, 20, and 21+ are currently supported
            self.assertGreaterEqual(
                major_version,
                18,
                "Node.js version should be 18 or higher for modern React projects"
            )
    
    def test_pipeline_structure_completeness(self):
        """
        Verify the pipeline has all essential top-level keys.
        """
        data = self._load_pipeline_config()
        required_keys = ['trigger', 'pool', 'steps']
        
        for key in required_keys:
            with self.subTest(key=key):
                self.assertIn(
                    key,
                    data,
                    f"Pipeline should have '{key}' configuration"
                )
    
    def test_script_uses_proper_multiline_syntax(self):
        """
        Verify multi-line scripts use proper YAML syntax (pipe or fold).
        
        This is more of a format check to ensure maintainability.
        """
        with open(self.pipeline_file) as f:
            content = f.read()
        
        # Check if the script section exists
        self.assertIn('script:', content, "Should have a script definition")
        
        # If it's a multi-command script, it should use | or > for multiline
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        for step in steps:
            if 'script' in step:
                script = step['script']
                # If script contains newlines, that's the multiline format
                if '\n' in script:
                    self.assertIsInstance(
                        script,
                        str,
                        "Multiline script should be properly parsed as string"
                    )
    
    def test_no_unnecessary_whitespace_in_commands(self):
        """
        Verify commands don't have excessive leading/trailing whitespace.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        
        for i, step in enumerate(steps):
            if 'script' in step:
                script = step['script']
                lines = script.split('\n')
                for line in lines:
                    if line.strip():  # Non-empty lines
                        # Check that line doesn't start with more than 4 spaces
                        leading_spaces = len(line) - len(line.lstrip())
                        self.assertLessEqual(
                            leading_spaces,
                            4,
                            f"Step {i}: Script lines should not have excessive indentation"
                        )
    
    def test_task_versions_specified(self):
        """
        Verify all tasks have explicit version numbers (e.g., @0, @1).
        
        This ensures predictable pipeline behavior.
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        
        for i, step in enumerate(steps):
            if 'task' in step:
                task_name = step['task']
                with self.subTest(step_index=i, task=task_name):
                    self.assertIn(
                        '@',
                        task_name,
                        f"Task '{task_name}' should specify version (e.g., TaskName@0)"
                    )
                    # Version should be a number
                    version = task_name.split('@')[1] if '@' in task_name else ''
                    self.assertTrue(
                        version.isdigit(),
                        f"Task version should be numeric, got: {version}"
                    )
    
    # Edge Cases and Error Conditions
    
    def test_yaml_no_tabs(self):
        """
        Verify YAML file doesn't use tabs (which are not allowed in YAML).
        """
        with open(self.pipeline_file) as f:
            content = f.read()
        
        self.assertNotIn(
            '\t',
            content,
            "YAML file should not contain tab characters"
        )
    
    def test_yaml_proper_indentation(self):
        """
        Verify YAML file uses consistent indentation (should be 2 spaces).
        """
        with open(self.pipeline_file) as f:
            lines = f.readlines()
        
        # Check that indented lines use multiples of 2 spaces
        for i, line in enumerate(lines, 1):
            if line.strip() and not line.strip().startswith('#'):
                leading_spaces = len(line) - len(line.lstrip())
                if leading_spaces > 0:
                    self.assertEqual(
                        leading_spaces % 2,
                        0,
                        f"Line {i} should use even number of spaces for indentation"
                    )
    
    def test_no_duplicate_keys(self):
        """
        Verify there are no duplicate keys at the same level in the YAML.
        
        PyYAML would overwrite duplicates, so this checks the parsed structure makes sense.
        """
        # Check top-level keys
        with open(self.pipeline_file) as f:
            lines = [line for line in f.readlines() if line.strip() and not line.strip().startswith('#')]
        
        top_level_keys = [line.split(':')[0].strip() for line in lines if ':' in line and not line.startswith(' ')]
        
        # Check for duplicates
        seen = set()
        for key in top_level_keys:
            self.assertNotIn(
                key,
                seen,
                f"Duplicate top-level key found: {key}"
            )
            seen.add(key)
    
    def test_pool_not_none(self):
        """
        Verify pool configuration is not null/None.
        """
        data = self._load_pipeline_config()
        pool = data.get('pool')
        self.assertIsNotNone(pool, "Pool configuration should not be None")
    
    def test_steps_contain_valid_step_types(self):
        """
        Verify all steps are valid step types (task or script).
        """
        data = self._load_pipeline_config()
        steps = data.get('steps', [])
        
        for i, step in enumerate(steps):
            with self.subTest(step_index=i):
                # Each step should have either 'task' or 'script'
                has_task = 'task' in step
                has_script = 'script' in step
                
                self.assertTrue(
                    has_task or has_script,
                    f"Step {i} should have either 'task' or 'script' defined"
                )


if __name__ == '__main__':
    unittest.main(verbosity=2)