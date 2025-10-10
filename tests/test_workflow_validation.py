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
        Prepare class-level paths used by the workflow tests.
        
        Attributes:
            workflow_dir (pathlib.Path): Path to the workflows directory (.github/workflows).
            manual_workflow (pathlib.Path): Path to the manual.yml workflow file within the workflows directory.
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
        """Test permissions block exists"""
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        self.assertIn('permissions', data)
        
    def test_permissions_read_only(self):
        """
        If the workflow's `permissions` field is a mapping, assert that its `contents` entry equals "read".
        """
        with open(self.manual_workflow) as f:
            data = yaml.safe_load(f)
        perms = data.get('permissions', {})
        if isinstance(perms, dict):
            self.assertEqual(perms.get('contents'), 'read')


if __name__ == '__main__':
    unittest.main(verbosity=2)