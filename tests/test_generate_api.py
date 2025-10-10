#!/usr/bin/env python3
"""
Unit Tests for scripts/generate-api.py
Tests the API endpoint generator
"""

import unittest
import sys
import os
import json
import tempfile
import shutil
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from generate_api import APIGenerator

class TestAPIGenerator(unittest.TestCase):
    """Test suite for APIGenerator class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.generator = APIGenerator(self.temp_dir)
        
    def tearDown(self):
        """Clean up test fixtures"""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_initialization(self):
        """Test APIGenerator initialization"""
        self.assertIsNotNone(self.generator)
        self.assertEqual(self.generator.repo_path, Path(self.temp_dir))
        self.assertTrue(hasattr(self.generator, 'api_dir'))
        self.assertTrue(hasattr(self.generator, 'metadata_dir'))
    
    def test_load_metadata_empty_directory(self):
        """Test loading metadata from empty directory"""
        metadata = self.generator.load_metadata()
        self.assertIsInstance(metadata, list)
        self.assertEqual(len(metadata), 0)
    
    def test_load_metadata_with_files(self):
        """Test loading metadata from directory with files"""
        # Create metadata directory and file
        metadata_dir = Path(self.temp_dir) / 'metadata'
        metadata_dir.mkdir(exist_ok=True)
        
        test_metadata = {
            'slug': 'test-tool',
            'name': 'Test Tool',
            'type': 'IDE Plugin'
        }
        
        with open(metadata_dir / 'test-tool.json', 'w') as f:
            json.dump(test_metadata, f)
        
        metadata = self.generator.load_metadata()
        self.assertEqual(len(metadata), 1)
        self.assertEqual(metadata[0]['slug'], 'test-tool')
    
    def test_load_metadata_invalid_json(self):
        """Test loading metadata with invalid JSON"""
        metadata_dir = Path(self.temp_dir) / 'metadata'
        metadata_dir.mkdir(exist_ok=True)
        
        # Create invalid JSON file
        with open(metadata_dir / 'invalid.json', 'w') as f:
            f.write('{invalid json}')
        
        # Should not raise exception, just skip invalid file
        metadata = self.generator.load_metadata()
        self.assertIsInstance(metadata, list)
    
    def test_generate_tools_index(self):
        """Test generating tools index"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool One',
                'type': 'IDE Plugin',
                'description': 'First tool',
                'status': 'active'
            },
            {
                'slug': 'tool2',
                'name': 'Tool Two',
                'type': 'Web Platform',
                'description': 'Second tool',
                'status': 'active'
            }
        ]
        
        index = self.generator.generate_tools_index(test_metadata)
        
        self.assertIn('version', index)
        self.assertIn('generated', index)
        self.assertIn('count', index)
        self.assertIn('tools', index)
        self.assertEqual(index['count'], 2)
        self.assertEqual(len(index['tools']), 2)
    
    def test_generate_tools_index_empty(self):
        """Test generating tools index with no tools"""
        index = self.generator.generate_tools_index([])
        
        self.assertEqual(index['count'], 0)
        self.assertEqual(len(index['tools']), 0)
    
    def test_generate_tool_detail(self):
        """Test generating tool detail endpoint"""
        test_tool = {
            'slug': 'test-tool',
            'name': 'Test Tool',
            'type': 'IDE Plugin',
            'description': 'A test tool'
        }
        
        detail = self.generator.generate_tool_detail(test_tool)
        
        self.assertIn('version', detail)
        self.assertIn('generated', detail)
        self.assertIn('slug', detail)
        self.assertEqual(detail['name'], 'Test Tool')
    
    def test_generate_by_type(self):
        """Test generating tools grouped by type"""
        test_metadata = [
            {'slug': 'tool1', 'name': 'Tool 1', 'type': 'IDE Plugin', 'description': 'Desc 1'},
            {'slug': 'tool2', 'name': 'Tool 2', 'type': 'IDE Plugin', 'description': 'Desc 2'},
            {'slug': 'tool3', 'name': 'Tool 3', 'type': 'Web Platform', 'description': 'Desc 3'}
        ]
        
        by_type = self.generator.generate_by_type(test_metadata)
        
        self.assertIn('types', by_type)
        self.assertIn('IDE Plugin', by_type['types'])
        self.assertIn('Web Platform', by_type['types'])
        self.assertEqual(len(by_type['types']['IDE Plugin']), 2)
        self.assertEqual(len(by_type['types']['Web Platform']), 1)
    
    def test_generate_by_type_with_other(self):
        """Test generating tools grouped by type with 'Other' category"""
        test_metadata = [
            {'slug': 'tool1', 'name': 'Tool 1', 'description': 'Desc 1'}  # No type specified
        ]
        
        by_type = self.generator.generate_by_type(test_metadata)
        
        self.assertIn('Other', by_type['types'])
        self.assertEqual(len(by_type['types']['Other']), 1)
    
    def test_generate_by_pricing(self):
        """Test generating tools grouped by pricing"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool 1',
                'type': 'IDE Plugin',
                'pricing': {'model': 'free'}
            },
            {
                'slug': 'tool2',
                'name': 'Tool 2',
                'type': 'IDE Plugin',
                'pricing': {'model': 'subscription'}
            },
            {
                'slug': 'tool3',
                'name': 'Tool 3',
                'type': 'Web Platform',
                'pricing': {'model': 'free'}
            }
        ]
        
        by_pricing = self.generator.generate_by_pricing(test_metadata)
        
        self.assertIn('pricing_models', by_pricing)
        self.assertIn('free', by_pricing['pricing_models'])
        self.assertIn('subscription', by_pricing['pricing_models'])
        self.assertEqual(len(by_pricing['pricing_models']['free']), 2)
        self.assertEqual(len(by_pricing['pricing_models']['subscription']), 1)
    
    def test_generate_by_pricing_unknown(self):
        """Test generating tools grouped by pricing with unknown model"""
        test_metadata = [
            {'slug': 'tool1', 'name': 'Tool 1', 'type': 'IDE Plugin'}  # No pricing specified
        ]
        
        by_pricing = self.generator.generate_by_pricing(test_metadata)
        
        self.assertIn('unknown', by_pricing['pricing_models'])
    
    def test_multiple_tools_same_type(self):
        """Test handling multiple tools of the same type"""
        test_metadata = [
            {'slug': f'tool{i}', 'name': f'Tool {i}', 'type': 'IDE Plugin', 'description': f'Desc {i}'}
            for i in range(5)
        ]
        
        by_type = self.generator.generate_by_type(test_metadata)
        
        self.assertEqual(len(by_type['types']['IDE Plugin']), 5)
    
    def test_empty_metadata_list(self):
        """Test handling empty metadata list"""
        index = self.generator.generate_tools_index([])
        by_type = self.generator.generate_by_type([])
        by_pricing = self.generator.generate_by_pricing([])
        
        self.assertEqual(index['count'], 0)
        self.assertEqual(len(by_type['types']), 0)
        self.assertEqual(len(by_pricing['pricing_models']), 0)
    
    def test_metadata_with_special_characters(self):
        """Test metadata with special characters"""
        test_metadata = [{
            'slug': 'test-tool',
            'name': 'Test Tool™ & Co.',
            'type': 'IDE Plugin',
            'description': 'A tool with <special> "characters"'
        }]
        
        index = self.generator.generate_tools_index(test_metadata)
        
        self.assertEqual(index['tools'][0]['name'], 'Test Tool™ & Co.')
    
    def test_metadata_with_unicode(self):
        """Test metadata with Unicode characters"""
        test_metadata = [{
            'slug': 'test-tool',
            'name': 'Test Tool 你好',
            'type': 'IDE Plugin',
            'description': '🚀 A tool with unicode'
        }]
        
        index = self.generator.generate_tools_index(test_metadata)
        
        self.assertEqual(index['tools'][0]['name'], 'Test Tool 你好')

class TestAPIGeneratorEdgeCases(unittest.TestCase):
    """Test edge cases for APIGenerator"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.generator = APIGenerator(self.temp_dir)
    
    def tearDown(self):
        """Clean up test fixtures"""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_large_metadata_set(self):
        """Test handling large metadata set"""
        test_metadata = [
            {
                'slug': f'tool-{i}',
                'name': f'Tool {i}',
                'type': 'IDE Plugin',
                'description': f'Description {i}',
                'status': 'active'
            }
            for i in range(100)
        ]
        
        index = self.generator.generate_tools_index(test_metadata)
        
        self.assertEqual(index['count'], 100)
        self.assertEqual(len(index['tools']), 100)
    
    def test_nested_metadata_structures(self):
        """Test handling nested metadata structures"""
        test_metadata = [{
            'slug': 'test-tool',
            'name': 'Test Tool',
            'type': 'IDE Plugin',
            'features': {
                'nested': {
                    'deeply': {
                        'value': 'test'
                    }
                }
            }
        }]
        
        detail = self.generator.generate_tool_detail(test_metadata[0])
        
        self.assertIn('features', detail)
        self.assertEqual(detail['features']['nested']['deeply']['value'], 'test')
    
    def test_missing_optional_fields(self):
        """Test handling missing optional fields"""
        test_metadata = [{
            'slug': 'test-tool',
            'name': 'Test Tool',
            'type': 'IDE Plugin'
            # Missing description and status
        }]
        
        index = self.generator.generate_tools_index(test_metadata)
        
        self.assertEqual(index['tools'][0]['description'], '')
        self.assertEqual(index['tools'][0]['status'], 'unknown')

def suite():
    """Create test suite"""
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestAPIGenerator))
    suite.addTest(unittest.makeSuite(TestAPIGeneratorEdgeCases))
    return suite

if __name__ == '__main__':
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite())
    sys.exit(0 if result.wasSuccessful() else 1)