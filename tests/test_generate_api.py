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


class TestAPIGeneratorRefactoredMethods(unittest.TestCase):
    """Test suite for refactored methods in APIGenerator focusing on simplified logic"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.generator = APIGenerator(self.temp_dir)
    
    def tearDown(self):
        """Clean up test fixtures"""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    # Tests for load_metadata() - now returns unsorted data
    
    def test_load_metadata_preserves_insertion_order(self):
        """Test that load_metadata returns data in file system order (unsorted)"""
        metadata_dir = Path(self.temp_dir) / 'metadata'
        metadata_dir.mkdir(exist_ok=True)
        
        # Create files in specific order
        tools = [
            {'slug': 'zebra-tool', 'name': 'Zebra Tool', 'type': 'IDE Plugin'},
            {'slug': 'alpha-tool', 'name': 'Alpha Tool', 'type': 'IDE Plugin'},
            {'slug': 'beta-tool', 'name': 'Beta Tool', 'type': 'Web Platform'}
        ]
        
        for tool in tools:
            with open(metadata_dir / f"{tool['slug']}.json", 'w') as f:
                json.dump(tool, f)
        
        metadata = self.generator.load_metadata()
        
        # Should return 3 tools
        self.assertEqual(len(metadata), 3)
        # Data should not be alphabetically sorted by slug
        slugs = [tool['slug'] for tool in metadata]
        self.assertEqual(len(slugs), 3)
        # Verify all expected slugs are present
        self.assertIn('zebra-tool', slugs)
        self.assertIn('alpha-tool', slugs)
        self.assertIn('beta-tool', slugs)
    
    def test_load_metadata_multiple_files_unordered(self):
        """Test loading multiple metadata files without assuming order"""
        metadata_dir = Path(self.temp_dir) / 'metadata'
        metadata_dir.mkdir(exist_ok=True)
        
        # Create 10 files with various naming
        for i in range(10):
            tool_data = {
                'slug': f'tool-{i:02d}',
                'name': f'Tool {i}',
                'type': 'IDE Plugin'
            }
            with open(metadata_dir / f"tool-{i:02d}.json", 'w') as f:
                json.dump(tool_data, f)
        
        metadata = self.generator.load_metadata()
        
        self.assertEqual(len(metadata), 10)
        # Verify all tools are present regardless of order
        slugs = {tool['slug'] for tool in metadata}
        expected = {f'tool-{i:02d}' for i in range(10)}
        self.assertEqual(slugs, expected)
    
    # Tests for generate_by_type() - simplified type handling
    
    def test_generate_by_type_no_type_stripping(self):
        """Test that type values are used as-is without stripping"""
        test_metadata = [
            {'slug': 'tool1', 'name': 'Tool 1', 'type': '  IDE Plugin  ', 'description': 'Desc 1'},
            {'slug': 'tool2', 'name': 'Tool 2', 'type': 'IDE Plugin', 'description': 'Desc 2'}
        ]
        
        by_type = self.generator.generate_by_type(test_metadata)
        
        # Should have two separate type categories (with and without spaces)
        self.assertIn('  IDE Plugin  ', by_type['types'])
        self.assertIn('IDE Plugin', by_type['types'])
        self.assertEqual(len(by_type['types']['  IDE Plugin  ']), 1)
        self.assertEqual(len(by_type['types']['IDE Plugin']), 1)
    
    def test_generate_by_type_empty_type_uses_other(self):
        """Test that empty string type gets default 'Other' value"""
        test_metadata = [
            {'slug': 'tool1', 'name': 'Tool 1', 'type': '', 'description': 'Desc 1'}
        ]
        
        by_type = self.generator.generate_by_type(test_metadata)
        
        # Empty type should result in 'Other'
        self.assertIn('Other', by_type['types'])
        self.assertEqual(len(by_type['types']['Other']), 1)
    
    def test_generate_by_type_missing_type_uses_other(self):
        """Test that missing type field defaults to 'Other'"""
        test_metadata = [
            {'slug': 'tool1', 'name': 'Tool 1', 'description': 'Desc 1'}
        ]
        
        by_type = self.generator.generate_by_type(test_metadata)
        
        self.assertIn('Other', by_type['types'])
        self.assertEqual(len(by_type['types']['Other']), 1)
        self.assertEqual(by_type['types']['Other'][0]['slug'], 'tool1')
    
    def test_generate_by_type_no_sorting_within_types(self):
        """Test that tools within each type are not sorted"""
        test_metadata = [
            {'slug': 'zebra', 'name': 'Zebra Tool', 'type': 'IDE Plugin', 'description': 'Z'},
            {'slug': 'alpha', 'name': 'Alpha Tool', 'type': 'IDE Plugin', 'description': 'A'},
            {'slug': 'beta', 'name': 'Beta Tool', 'type': 'IDE Plugin', 'description': 'B'}
        ]
        
        by_type = self.generator.generate_by_type(test_metadata)
        
        tools = by_type['types']['IDE Plugin']
        self.assertEqual(len(tools), 3)
        
        # Verify all tools are present
        slugs = [tool['slug'] for tool in tools]
        self.assertIn('zebra', slugs)
        self.assertIn('alpha', slugs)
        self.assertIn('beta', slugs)
    
    def test_generate_by_type_case_sensitive(self):
        """Test that type comparison is case-sensitive"""
        test_metadata = [
            {'slug': 'tool1', 'name': 'Tool 1', 'type': 'IDE Plugin', 'description': 'Desc 1'},
            {'slug': 'tool2', 'name': 'Tool 2', 'type': 'ide plugin', 'description': 'Desc 2'},
            {'slug': 'tool3', 'name': 'Tool 3', 'type': 'IDE PLUGIN', 'description': 'Desc 3'}
        ]
        
        by_type = self.generator.generate_by_type(test_metadata)
        
        # Should create three separate type categories
        self.assertIn('IDE Plugin', by_type['types'])
        self.assertIn('ide plugin', by_type['types'])
        self.assertIn('IDE PLUGIN', by_type['types'])
        self.assertEqual(len(by_type['types']), 3)
    
    # Tests for generate_features_matrix() - restructured logic
    
    def test_generate_features_matrix_basic(self):
        """Test basic feature matrix generation"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool 1',
                'features': {
                    'codeGeneration': True,
                    'agentMode': False
                }
            },
            {
                'slug': 'tool2',
                'name': 'Tool 2',
                'features': {
                    'codeGeneration': True,
                    'agentMode': True
                }
            }
        ]
        
        matrix = self.generator.generate_features_matrix(test_metadata)
        
        self.assertIn('features', matrix)
        self.assertIn('codeGeneration', matrix['features'])
        self.assertIn('agentMode', matrix['features'])
        self.assertEqual(len(matrix['features']['codeGeneration']), 2)
        self.assertEqual(len(matrix['features']['agentMode']), 1)
    
    def test_generate_features_matrix_disabled_features_included(self):
        """Test that disabled features are tracked in the structure"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool 1',
                'features': {
                    'featureA': True,
                    'featureB': False,
                    'featureC': False
                }
            }
        ]
        
        matrix = self.generator.generate_features_matrix(test_metadata)
        
        # Only enabled features should have tools listed
        self.assertIn('featureA', matrix['features'])
        self.assertEqual(len(matrix['features']['featureA']), 1)
        
        # Disabled features should exist but be empty
        self.assertIn('featureB', matrix['features'])
        self.assertIn('featureC', matrix['features'])
        self.assertEqual(len(matrix['features']['featureB']), 0)
        self.assertEqual(len(matrix['features']['featureC']), 0)
    
    def test_generate_features_matrix_empty_features(self):
        """Test handling tools with no features"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool 1',
                'features': {}
            }
        ]
        
        matrix = self.generator.generate_features_matrix(test_metadata)
        
        self.assertIn('features', matrix)
        self.assertEqual(len(matrix['features']), 0)
    
    def test_generate_features_matrix_missing_features(self):
        """Test handling tools without features field"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool 1'
            }
        ]
        
        matrix = self.generator.generate_features_matrix(test_metadata)
        
        self.assertIn('features', matrix)
        self.assertEqual(len(matrix['features']), 0)
    
    def test_generate_features_matrix_mixed_features(self):
        """Test feature matrix with mixed enabled/disabled across tools"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool 1',
                'features': {
                    'featureX': True,
                    'featureY': False,
                    'featureZ': True
                }
            },
            {
                'slug': 'tool2',
                'name': 'Tool 2',
                'features': {
                    'featureX': False,
                    'featureY': True,
                    'featureZ': True
                }
            },
            {
                'slug': 'tool3',
                'name': 'Tool 3',
                'features': {
                    'featureX': True,
                    'featureY': True,
                    'featureZ': False
                }
            }
        ]
        
        matrix = self.generator.generate_features_matrix(test_metadata)
        
        # featureX: tool1, tool3
        self.assertEqual(len(matrix['features']['featureX']), 2)
        self.assertIn('tool1', [t['slug'] for t in matrix['features']['featureX']])
        self.assertIn('tool3', [t['slug'] for t in matrix['features']['featureX']])
        
        # featureY: tool2, tool3
        self.assertEqual(len(matrix['features']['featureY']), 2)
        self.assertIn('tool2', [t['slug'] for t in matrix['features']['featureY']])
        self.assertIn('tool3', [t['slug'] for t in matrix['features']['featureY']])
        
        # featureZ: tool1, tool2
        self.assertEqual(len(matrix['features']['featureZ']), 2)
        self.assertIn('tool1', [t['slug'] for t in matrix['features']['featureZ']])
        self.assertIn('tool2', [t['slug'] for t in matrix['features']['featureZ']])
    
    def test_generate_features_matrix_feature_initialization(self):
        """Test that features are properly initialized before checking enabled status"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool 1',
                'features': {
                    'uniqueFeature': True
                }
            },
            {
                'slug': 'tool2',
                'name': 'Tool 2',
                'features': {
                    'uniqueFeature': False
                }
            }
        ]
        
        matrix = self.generator.generate_features_matrix(test_metadata)
        
        self.assertIn('uniqueFeature', matrix['features'])
        self.assertEqual(len(matrix['features']['uniqueFeature']), 1)
        self.assertEqual(matrix['features']['uniqueFeature'][0]['slug'], 'tool1')
    
    # Tests for generate_search_index() - simplified keyword generation
    
    def test_generate_search_index_basic_keywords(self):
        """Test basic keyword generation without complex parsing"""
        test_metadata = [
            {
                'slug': 'test-tool',
                'name': 'Test Tool',
                'type': 'IDE Plugin',
                'description': 'A test tool',
                'tags': ['testing', 'development']
            }
        ]
        
        index = self.generator.generate_search_index(test_metadata)
        
        self.assertIn('index', index)
        self.assertEqual(len(index['index']), 1)
        
        keywords = index['index'][0]['keywords']
        
        # Should contain simplified keywords
        self.assertIn('test tool', keywords)  # name lowercased
        self.assertIn('test-tool', keywords)  # slug as-is
        self.assertIn('ide plugin', keywords)  # type lowercased
        self.assertIn('testing', keywords)  # tag lowercased
        self.assertIn('development', keywords)  # tag lowercased
    
    def test_generate_search_index_no_regex_splitting(self):
        """Test that keywords are NOT split by regex (simplified approach)"""
        test_metadata = [
            {
                'slug': 'my-awesome-tool',
                'name': 'My Awesome Tool',
                'type': 'IDE-Plugin',
                'description': 'Tool description',
                'tags': ['multi-word-tag']
            }
        ]
        
        index = self.generator.generate_search_index(test_metadata)
        keywords = index['index'][0]['keywords']
        
        # With simplified logic, should NOT have individual word parts
        # Keywords should be: name.lower(), slug, type.lower(), tag.lower()
        self.assertIn('my awesome tool', keywords)
        self.assertIn('my-awesome-tool', keywords)
        self.assertIn('ide-plugin', keywords)
        self.assertIn('multi-word-tag', keywords)
        
        # Should NOT contain split parts from old regex logic
        self.assertNotIn('awesome', keywords)
        self.assertNotIn('multi', keywords)
        self.assertNotIn('word', keywords)
    
    def test_generate_search_index_empty_tags(self):
        """Test search index generation with no tags"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool One',
                'type': 'CLI Tool',
                'description': 'Description',
                'tags': []
            }
        ]
        
        index = self.generator.generate_search_index(test_metadata)
        keywords = index['index'][0]['keywords']
        
        # Should have name, slug, type but no tag-derived keywords
        self.assertEqual(len(keywords), 3)
        self.assertIn('tool one', keywords)
        self.assertIn('tool1', keywords)
        self.assertIn('cli tool', keywords)
    
    def test_generate_search_index_missing_tags(self):
        """Test search index generation when tags field is missing"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool One',
                'type': 'CLI Tool',
                'description': 'Description'
            }
        ]
        
        index = self.generator.generate_search_index(test_metadata)
        keywords = index['index'][0]['keywords']
        
        # Should still work with default empty list for tags
        self.assertGreaterEqual(len(keywords), 3)
        self.assertIn('tool one', keywords)
    
    def test_generate_search_index_special_characters_preserved(self):
        """Test that special characters in names/types are preserved in keywords"""
        test_metadata = [
            {
                'slug': 'tool-1',
                'name': 'Tool™ & Co.',
                'type': 'IDE/Plugin',
                'description': 'Desc',
                'tags': ['tag-with-dash', 'tag_with_underscore']
            }
        ]
        
        index = self.generator.generate_search_index(test_metadata)
        keywords = index['index'][0]['keywords']
        
        # Special characters should be preserved (not split)
        self.assertIn('tool™ & co.', keywords)
        self.assertIn('ide/plugin', keywords)
        self.assertIn('tag-with-dash', keywords)
        self.assertIn('tag_with_underscore', keywords)
    
    def test_generate_search_index_multiple_tools(self):
        """Test search index with multiple tools"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'First Tool',
                'type': 'Type A',
                'tags': ['tag1']
            },
            {
                'slug': 'tool2',
                'name': 'Second Tool',
                'type': 'Type B',
                'tags': ['tag2', 'tag3']
            }
        ]
        
        index = self.generator.generate_search_index(test_metadata)
        
        self.assertEqual(len(index['index']), 2)
        
        # First tool keywords
        keywords1 = index['index'][0]['keywords']
        self.assertIn('first tool', keywords1)
        self.assertIn('tool1', keywords1)
        self.assertIn('type a', keywords1)
        self.assertIn('tag1', keywords1)
        
        # Second tool keywords
        keywords2 = index['index'][1]['keywords']
        self.assertIn('second tool', keywords2)
        self.assertIn('tool2', keywords2)
        self.assertIn('type b', keywords2)
        self.assertIn('tag2', keywords2)
        self.assertIn('tag3', keywords2)
    
    def test_generate_search_index_keyword_uniqueness(self):
        """Test that duplicate keywords are included as-is (no deduplication in new logic)"""
        test_metadata = [
            {
                'slug': 'test',
                'name': 'Test',
                'type': 'Test',
                'tags': ['test']
            }
        ]
        
        index = self.generator.generate_search_index(test_metadata)
        keywords = index['index'][0]['keywords']
        
        # Should include: name.lower()='test', slug='test', type.lower()='test', tag='test'
        # Count occurrences of 'test'
        test_count = keywords.count('test')
        self.assertEqual(test_count, 4)  # All four sources produce 'test'


class TestAPIGeneratorStatisticsAndFeatures(unittest.TestCase):
    """Additional comprehensive tests for statistics and features functionality"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.generator = APIGenerator(self.temp_dir)
    
    def tearDown(self):
        """Clean up test fixtures"""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_generate_statistics_comprehensive(self):
        """Test comprehensive statistics generation"""
        test_metadata = [
            {
                'slug': 'tool1',
                'type': 'IDE Plugin',
                'pricing': {'model': 'free'},
                'features': {'codeGen': True, 'chat': True}
            },
            {
                'slug': 'tool2',
                'type': 'IDE Plugin',
                'pricing': {'model': 'paid'},
                'features': {'codeGen': True, 'chat': False}
            },
            {
                'slug': 'tool3',
                'type': 'Web Platform',
                'pricing': {'model': 'free'},
                'features': {'codeGen': False, 'chat': True}
            }
        ]
        
        stats = self.generator.generate_statistics(test_metadata)
        
        self.assertEqual(stats['total_tools'], 3)
        self.assertEqual(stats['by_type']['IDE Plugin'], 2)
        self.assertEqual(stats['by_type']['Web Platform'], 1)
        self.assertEqual(stats['by_pricing']['free'], 2)
        self.assertEqual(stats['by_pricing']['paid'], 1)
        self.assertEqual(stats['feature_adoption']['codeGen'], 2)
        self.assertEqual(stats['feature_adoption']['chat'], 2)
    
    def test_generate_statistics_most_common_features(self):
        """Test that most_common_features is properly sorted"""
        test_metadata = [
            {
                'slug': 'tool1',
                'features': {'rare': True, 'common': True, 'veryCommon': True}
            },
            {
                'slug': 'tool2',
                'features': {'rare': False, 'common': True, 'veryCommon': True}
            },
            {
                'slug': 'tool3',
                'features': {'rare': False, 'common': False, 'veryCommon': True}
            }
        ]
        
        stats = self.generator.generate_statistics(test_metadata)
        
        most_common = stats['most_common_features']
        self.assertEqual(len(most_common), 3)
        
        # Should be sorted by count descending
        self.assertEqual(most_common[0][0], 'veryCommon')
        self.assertEqual(most_common[0][1], 3)
        self.assertEqual(most_common[1][0], 'common')
        self.assertEqual(most_common[1][1], 2)
        self.assertEqual(most_common[2][0], 'rare')
        self.assertEqual(most_common[2][1], 1)
    
    def test_generate_statistics_limits_top_10_features(self):
        """Test that most_common_features is limited to top 10"""
        test_metadata = [
            {
                'slug': 'tool1',
                'features': {f'feature{i}': True for i in range(15)}
            }
        ]
        
        stats = self.generator.generate_statistics(test_metadata)
        
        # Should only return top 10
        self.assertEqual(len(stats['most_common_features']), 10)
    
    def test_generate_by_pricing_nested_structure(self):
        """Test handling of nested pricing structure"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool 1',
                'type': 'IDE',
                'pricing': {
                    'model': 'freemium',
                    'tiers': [
                        {'name': 'Free', 'price': 0},
                        {'name': 'Pro', 'price': 10}
                    ]
                }
            }
        ]
        
        by_pricing = self.generator.generate_by_pricing(test_metadata)
        
        self.assertIn('freemium', by_pricing['pricing_models'])
        self.assertEqual(len(by_pricing['pricing_models']['freemium']), 1)
    
    def test_generate_features_matrix_boolean_values_only(self):
        """Test that only boolean True values are included in feature lists"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool 1',
                'features': {
                    'featureA': True,
                    'featureB': False,
                    'featureC': None,
                    'featureD': 0,
                    'featureE': 1,
                    'featureF': ''
                }
            }
        ]
        
        matrix = self.generator.generate_features_matrix(test_metadata)
        
        # Only True values should include the tool
        self.assertEqual(len(matrix['features']['featureA']), 1)
        
        # False/falsy values should have empty lists
        for feature in ['featureB', 'featureC', 'featureD', 'featureE', 'featureF']:
            self.assertIn(feature, matrix['features'])
            # Truthy non-True values like 1 should be included
            if feature == 'featureE':
                self.assertEqual(len(matrix['features'][feature]), 1)
            else:
                self.assertEqual(len(matrix['features'][feature]), 0)


class TestAPIGeneratorIntegrationScenarios(unittest.TestCase):
    """Integration tests covering real-world scenarios"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.generator = APIGenerator(self.temp_dir)
    
    def tearDown(self):
        """Clean up test fixtures"""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_full_pipeline_with_real_world_data(self):
        """Test full data pipeline with realistic tool metadata"""
        metadata_dir = Path(self.temp_dir) / 'metadata'
        metadata_dir.mkdir(exist_ok=True)
        
        # Create realistic metadata
        tools = [
            {
                'slug': 'cursor',
                'name': 'Cursor',
                'type': 'IDE Plugin',
                'description': 'AI-powered code editor',
                'status': 'active',
                'pricing': {'model': 'freemium'},
                'features': {
                    'codeGeneration': True,
                    'codeCompletion': True,
                    'chatInterface': True,
                    'agentMode': True
                },
                'tags': ['IDE', 'AI', 'Premium']
            },
            {
                'slug': 'copilot',
                'name': 'GitHub Copilot',
                'type': 'IDE Plugin',
                'description': 'AI pair programmer',
                'status': 'active',
                'pricing': {'model': 'paid'},
                'features': {
                    'codeGeneration': True,
                    'codeCompletion': True,
                    'chatInterface': False,
                    'agentMode': False
                },
                'tags': ['IDE', 'GitHub']
            }
        ]
        
        for tool in tools:
            with open(metadata_dir / f"{tool['slug']}.json", 'w') as f:
                json.dump(tool, f)
        
        # Load and process
        metadata = self.generator.load_metadata()
        
        # Verify all endpoints work
        index = self.generator.generate_tools_index(metadata)
        by_type = self.generator.generate_by_type(metadata)
        by_pricing = self.generator.generate_by_pricing(metadata)
        features = self.generator.generate_features_matrix(metadata)
        stats = self.generator.generate_statistics(metadata)
        search = self.generator.generate_search_index(metadata)
        
        # Verify results
        self.assertEqual(index['count'], 2)
        self.assertEqual(len(by_type['types']['IDE Plugin']), 2)
        self.assertEqual(len(features['features']['codeGeneration']), 2)
        self.assertEqual(len(features['features']['agentMode']), 1)
        self.assertEqual(stats['total_tools'], 2)
        self.assertEqual(len(search['index']), 2)
    
    def test_error_recovery_mixed_valid_invalid_files(self):
        """Test graceful handling of mixed valid and invalid JSON files"""
        metadata_dir = Path(self.temp_dir) / 'metadata'
        metadata_dir.mkdir(exist_ok=True)
        
        # Valid file
        with open(metadata_dir / 'valid.json', 'w') as f:
            json.dump({'slug': 'valid', 'name': 'Valid Tool', 'type': 'IDE'}, f)
        
        # Invalid JSON
        with open(metadata_dir / 'invalid.json', 'w') as f:
            f.write('{invalid: json}')
        
        # Another valid file
        with open(metadata_dir / 'valid2.json', 'w') as f:
            json.dump({'slug': 'valid2', 'name': 'Valid Tool 2', 'type': 'CLI'}, f)
        
        # Should load only valid files
        metadata = self.generator.load_metadata()
        self.assertEqual(len(metadata), 2)
        
        slugs = {tool['slug'] for tool in metadata}
        self.assertEqual(slugs, {'valid', 'valid2'})
    
    def test_consistent_output_structure(self):
        """Test that all generated outputs have consistent structure"""
        test_metadata = [
            {
                'slug': 'tool1',
                'name': 'Tool 1',
                'type': 'IDE',
                'pricing': {'model': 'free'},
                'features': {'feat1': True},
                'tags': ['tag1']
            }
        ]
        
        # Generate all endpoints
        outputs = {
            'index': self.generator.generate_tools_index(test_metadata),
            'by_type': self.generator.generate_by_type(test_metadata),
            'by_pricing': self.generator.generate_by_pricing(test_metadata),
            'features': self.generator.generate_features_matrix(test_metadata),
            'statistics': self.generator.generate_statistics(test_metadata),
            'search': self.generator.generate_search_index(test_metadata)
        }
        
        # All should have version and generated timestamp
        for name, output in outputs.items():
            with self.subTest(endpoint=name):
                self.assertIn('version', output, f'{name} should have version')
                self.assertIn('generated', output, f'{name} should have generated timestamp')
                self.assertEqual(output['version'], '1.0')


def suite():
    """Create test suite"""
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestAPIGenerator))
    suite.addTest(unittest.makeSuite(TestAPIGeneratorEdgeCases))
    suite.addTest(unittest.makeSuite(TestAPIGeneratorRefactoredMethods))
    suite.addTest(unittest.makeSuite(TestAPIGeneratorStatisticsAndFeatures))
    suite.addTest(unittest.makeSuite(TestAPIGeneratorIntegrationScenarios))
    return suite

if __name__ == '__main__':
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite())
    sys.exit(0 if result.wasSuccessful() else 1)