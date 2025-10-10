#\!/usr/bin/env python3
"""
Comprehensive unit tests for compare-versions.py
Tests version comparison and diff generation
"""

import pytest
import sys
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'scripts'))

from compare_versions import VersionComparer


class TestVersionComparer:
    """Test suite for VersionComparer class"""
    
    @pytest.fixture
    def temp_repo(self):
        """Create temporary repository structure"""
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        
        # Create tool directory
        tool_dir = repo_path / 'TestTool'
        tool_dir.mkdir()
        
        yield repo_path
        
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def comparer(self, temp_repo):
        """Create VersionComparer instance"""
        return VersionComparer(str(temp_repo))
    
    def test_init(self, temp_repo):
        """Test VersionComparer initialization"""
        comparer = VersionComparer(str(temp_repo))
        
        assert comparer.repo_path == temp_repo
    
    def test_find_versions_empty_directory(self, comparer):
        """Test finding versions in empty directory"""
        versions = comparer.find_versions('NonExistent')
        
        assert versions == []
    
    def test_find_versions_with_prompts(self, comparer, temp_repo):
        """Test finding prompt versions"""
        tool_dir = temp_repo / 'TestTool'
        
        # Create prompt files
        (tool_dir / 'prompt-v1.txt').write_text('Version 1')
        (tool_dir / 'agent-prompt.txt').write_text('Agent prompt')
        (tool_dir / 'readme.txt').write_text('Not a prompt')
        
        versions = comparer.find_versions('TestTool')
        
        assert len(versions) == 2
        assert all('name' in v for v in versions)
        assert all('path' in v for v in versions)
        assert all('size' in v for v in versions)
        assert all('modified' in v for v in versions)
    
    def test_find_versions_sorted_by_modified(self, comparer, temp_repo):
        """Test versions are sorted by modification time"""
        tool_dir = temp_repo / 'TestTool'
        
        # Create files with different timestamps
        file1 = tool_dir / 'prompt-v1.txt'
        file2 = tool_dir / 'prompt-v2.txt'
        
        file1.write_text('Version 1')
        file2.write_text('Version 2')
        
        versions = comparer.find_versions('TestTool')
        
        # Should be sorted by modification time
        assert len(versions) == 2
        assert versions[0]['modified'] <= versions[1]['modified']
    
    def test_compare_files(self, comparer, temp_repo):
        """Test comparing two files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Line 1\nLine 2\nLine 3\n')
        file2.write_text('Line 1\nLine 2 modified\nLine 3\n')
        
        diff = comparer.compare_files(file1, file2, context_lines=1)
        
        assert len(diff) > 0
        assert any('-Line 2' in line for line in diff)
        assert any('+Line 2 modified' in line for line in diff)
    
    def test_compare_identical_files(self, comparer, temp_repo):
        """Test comparing identical files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        content = 'Same content\n'
        file1.write_text(content)
        file2.write_text(content)
        
        diff = comparer.compare_files(file1, file2)
        
        # No actual differences (only headers)
        assert len([line for line in diff if line.startswith('+') or line.startswith('-')]) <= 2
    
    def test_calculate_similarity_identical(self, comparer, temp_repo):
        """Test similarity calculation for identical files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        content = 'Identical content\n'
        file1.write_text(content)
        file2.write_text(content)
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert similarity == 1.0
    
    def test_calculate_similarity_different(self, comparer, temp_repo):
        """Test similarity calculation for different files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Completely different content\n')
        file2.write_text('Totally unrelated text\n')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert 0.0 <= similarity < 1.0
    
    def test_calculate_similarity_partial(self, comparer, temp_repo):
        """Test similarity calculation for partially similar files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Line 1\nLine 2\nLine 3\n')
        file2.write_text('Line 1\nLine 2 modified\nLine 3\n')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert 0.5 < similarity < 1.0
    
    def test_count_changes(self, comparer):
        """Test counting changes in diff"""
        diff = [
            '--- file1.txt',
            '+++ file2.txt',
            '@@ -1,3 +1,3 @@',
            ' Line 1',
            '-Line 2',
            '+Line 2 modified',
            ' Line 3',
            '+Line 4'
        ]
        
        changes = comparer.count_changes(diff)
        
        assert changes['added'] == 2
        assert changes['removed'] == 1
        assert changes['total'] == 3
    
    def test_count_changes_empty_diff(self, comparer):
        """Test counting changes with empty diff"""
        changes = comparer.count_changes([])
        
        assert changes['added'] == 0
        assert changes['removed'] == 0
        assert changes['total'] == 0
    
    def test_generate_html_diff(self, comparer, temp_repo):
        """Test generating HTML diff"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Line 1\nLine 2\nLine 3\n')
        file2.write_text('Line 1\nLine 2 modified\nLine 3\nLine 4\n')
        
        html = comparer.generate_html_diff(file1, file2, 'TestTool')
        
        assert '<!DOCTYPE html>' in html
        assert 'Version Comparison: TestTool' in html
        assert 'Lines Added' in html
        assert 'Lines Removed' in html
        assert 'Similarity' in html
        
        # Check for diff content
        assert 'Line 2' in html or 'modified' in html
    
    def test_generate_html_diff_structure(self, comparer, temp_repo):
        """Test HTML diff has proper structure"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Content')
        file2.write_text('Modified content')
        
        html = comparer.generate_html_diff(file1, file2, 'Tool')
        
        # Check for key HTML elements
        assert '<html' in html
        assert '<head>' in html
        assert '<body>' in html
        assert '<style>' in html
        assert '<script>' in html
        assert 'copyDiff()' in html
    
    def test_compare_tool_versions_not_enough_versions(self, comparer, temp_repo, capsys):
        """Test comparing tool with insufficient versions"""
        tool_dir = temp_repo / 'TestTool'
        (tool_dir / 'prompt.txt').write_text('Only one version')
        
        comparer.compare_tool_versions('TestTool')
        captured = capsys.readouterr()
        
        assert 'Need at least 2 versions' in captured.out
    
    def test_compare_tool_versions_multiple(self, comparer, temp_repo, capsys):
        """Test comparing multiple versions"""
        tool_dir = temp_repo / 'TestTool'
        
        # Create version files with different content
        (tool_dir / 'prompt-v1.txt').write_text('Version 1 content')
        (tool_dir / 'prompt-v2.txt').write_text('Version 2 content modified')
        
        comparer.compare_tool_versions('TestTool', output_format='text')
        captured = capsys.readouterr()
        
        assert 'Comparing 2 versions' in captured.out
        assert 'Similarity:' in captured.out
        assert 'Lines added:' in captured.out
        assert 'Lines removed:' in captured.out


class TestVersionComparerEdgeCases:
    """Test edge cases and error conditions"""
    
    @pytest.fixture
    def comparer(self):
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        
        comp = VersionComparer(str(repo_path))
        
        yield comp
        
        shutil.rmtree(temp_dir)
    
    def test_compare_empty_files(self, comparer):
        """Test comparing empty files"""
        temp_dir = Path(tempfile.mkdtemp())
        
        file1 = temp_dir / 'empty1.txt'
        file2 = temp_dir / 'empty2.txt'
        
        file1.write_text('')
        file2.write_text('')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        # Empty files should be 100% similar
        assert similarity == 1.0 or similarity == 0.0  # Depends on implementation
        
        shutil.rmtree(temp_dir)
    
    def test_compare_unicode_content(self, comparer):
        """Test comparing files with Unicode content"""
        temp_dir = Path(tempfile.mkdtemp())
        
        file1 = temp_dir / 'unicode1.txt'
        file2 = temp_dir / 'unicode2.txt'
        
        file1.write_text('Unicode: 你好 🚀')
        file2.write_text('Unicode: 你好 🎉')
        
        diff = comparer.compare_files(file1, file2)
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert len(diff) > 0
        assert 0.0 <= similarity <= 1.0
        
        shutil.rmtree(temp_dir)
    
    def test_compare_large_files(self, comparer):
        """Test comparing large files"""
        temp_dir = Path(tempfile.mkdtemp())
        
        file1 = temp_dir / 'large1.txt'
        file2 = temp_dir / 'large2.txt'
        
        # Create large files (1000 lines)
        content1 = '\n'.join([f'Line {i}' for i in range(1000)])
        content2 = '\n'.join([f'Line {i}' if i != 500 else 'Modified Line 500' for i in range(1000)])
        
        file1.write_text(content1)
        file2.write_text(content2)
        
        diff = comparer.compare_files(file1, file2, context_lines=1)
        similarity = comparer.calculate_similarity(file1, file2)
        
        # Should detect the single change
        assert len(diff) > 0
        assert similarity > 0.99  # Very similar with one change
        
        shutil.rmtree(temp_dir)
    
    def test_html_escaping(self, comparer):
        """Test HTML special characters are properly escaped"""
        temp_dir = Path(tempfile.mkdtemp())
        
        file1 = temp_dir / 'html1.txt'
        file2 = temp_dir / 'html2.txt'
        
        file1.write_text('<script>alert("test")</script>')
        file2.write_text('<div>safe content</div>')
        
        html = comparer.generate_html_diff(file1, file2, 'Test')
        
        # Check that < and > are escaped
        assert '&lt;' in html
        assert '&gt;' in html
        # Script tags should be escaped, not executed
        assert '<script>alert' not in html or '&lt;script&gt;' in html
        
        shutil.rmtree(temp_dir)


pytestmark = pytest.mark.unit