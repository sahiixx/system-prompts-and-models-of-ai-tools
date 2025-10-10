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
        Initialize class-level Path objects for the workflow directory and the manual workflow file.
        
        Sets `cls.workflow_dir` to Path('.github/workflows') and `cls.manual_workflow` to the 'manual.yml' path within that directory.
        """
        cls.workflow_dir = Path('.github/workflows')
        cls.manual_workflow = cls.workflow_dir / 'manual.yml'
        
    def test_manual_workflow_exists(self):
        """
        Verify the repository's manual GitHub Actions workflow file (.github/workflows/manual.yml) exists.
        
        Asserts that the path prepared in setUpClass points to an existing file.
        """
        self.assertTrue(self.manual_workflow.exists())
        
    def test_yaml_loads(self):
        """
        Verify that the workflow YAML file loads successfully.
        
        Asserts that parsing .github/workflows/manual.yml with yaml.safe_load produces a non-None value.
        """
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        self.assertIsNotNone(data)
        
    def test_permissions_defined(self):
        """Test permissions block exists"""
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        self.assertIn('permissions', data)
        
    def test_permissions_read_only(self):
        """
        Verify that when the workflow's top-level 'permissions' is a mapping, the 'contents' permission is set to 'read'.
        """
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        perms = data.get('permissions', {})
        if isinstance(perms, dict):
            self.assertEqual(perms.get('contents'), 'read')


if __name__ == '__main__':
    unittest.main(verbosity=2)