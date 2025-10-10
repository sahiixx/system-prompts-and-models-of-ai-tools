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
        Initialize class-level filesystem paths for the workflow directory and the manual workflow file.
        
        Sets `cls.workflow_dir` to the `.github/workflows` directory Path and `cls.manual_workflow` to the `manual.yml` file inside that directory.
        """
        cls.workflow_dir = Path('.github/workflows')
        cls.manual_workflow = cls.workflow_dir / 'manual.yml'
        
    def test_manual_workflow_exists(self):
        """Test that manual.yml exists"""
        self.assertTrue(self.manual_workflow.exists())
        
    def test_yaml_loads(self):
        """Test YAML parsing"""
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        self.assertIsNotNone(data)
        
    def test_permissions_defined(self):
        """
        Verify the workflow file defines a top-level "permissions" key.
        
        This test loads the workflow YAML at the configured path and asserts that a top-level
        'permissions' mapping is present.
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