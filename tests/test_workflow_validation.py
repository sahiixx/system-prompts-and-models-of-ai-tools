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
        Initialize class-level paths used by the test suite.
        
        Sets two class attributes:
        - workflow_dir: Path pointing to the `.github/workflows` directory.
        - manual_workflow: Path to the `manual.yml` file within `workflow_dir`.
        """
        cls.workflow_dir = Path('.github/workflows')
        cls.manual_workflow = cls.workflow_dir / 'manual.yml'
        
    def test_manual_workflow_exists(self):
        """
        Verify that the workflow file `.github/workflows/manual.yml` exists.
        """
        self.assertTrue(self.manual_workflow.exists())
        
    def test_yaml_loads(self):
        """Test YAML parsing"""
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        self.assertIsNotNone(data)
        
    def test_permissions_defined(self):
        """
        Check that the manual GitHub Actions workflow defines a top-level 'permissions' key.
        
        This test loads the workflow YAML at self.manual_workflow and asserts that a top-level 'permissions' mapping is present.
        """
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        self.assertIn('permissions', data)
        
    def test_permissions_read_only(self):
        """
        Assert that the workflow's permissions specify read access for `contents` when `permissions` is a mapping.
        
        If the top-level `permissions` key is a dict, the test verifies that `permissions['contents']` equals `'read'`.
        """
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        perms = data.get('permissions', {})
        if isinstance(perms, dict):
            self.assertEqual(perms.get('contents'), 'read')


if __name__ == '__main__':
    unittest.main(verbosity=2)