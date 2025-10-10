#!/usr/bin/env python3
"""Unit Tests for GitHub Actions Workflow Files"""
import unittest
import yaml
from pathlib import Path


class TestWorkflowValidation(unittest.TestCase):
    """Test suite for GitHub Actions workflow validation"""
    
    @classmethod
    def setUpClass(cls):
        """
        Initialize class-level paths used by the tests.
        
        Sets:
            workflow_dir (pathlib.Path): Path to the `.github/workflows` directory.
            manual_workflow (pathlib.Path): Path to the `manual.yml` workflow file inside `workflow_dir`.
        """
        cls.workflow_dir = Path('.github/workflows')
        cls.manual_workflow = cls.workflow_dir / 'manual.yml'
        
    def test_manual_workflow_exists(self):
        """Test that manual.yml exists"""
        self.assertTrue(self.manual_workflow.exists())
        
    def test_yaml_loads(self):
        """
        Verify the workflow YAML at self.manual_workflow parses into a Python object.
        
        Asserts that loading the workflow file yields a non-None value, indicating valid YAML content.
        """
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        self.assertIsNotNone(data)
        
    def test_permissions_defined(self):
        """
        Verify the workflow YAML defines a top-level 'permissions' key.
        
        Opens the workflow file at self.manual_workflow, parses it as YAML, and asserts that the parsed mapping contains the 'permissions' key.
        """
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        self.assertIn('permissions', data)
        
    def test_permissions_read_only(self):
        """Test read-only permissions"""
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        perms = data.get('permissions', {})
        if isinstance(perms, dict):
            self.assertEqual(perms.get('contents'), 'read')


if __name__ == '__main__':
    unittest.main(verbosity=2)