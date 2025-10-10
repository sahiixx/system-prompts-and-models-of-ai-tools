#!/usr/bin/env python3
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
from unittest.mock import patch, Mock

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
    
    def test_init_with_string_path(self):
        """Test initialization with string path"""
        comparer = VersionComparer('.')
        
        assert isinstance(comparer.repo_path, Path)
    
    def test_find_versions_empty_directory(self, comparer):
        """Test finding versions in empty directory"""
        versions = comparer.find_versions('NonExistent')
        
        assert versions == []
    
    def test_find_versions_no_prompts(self, comparer, temp_repo):
        """Test finding versions when directory has no prompt files"""
        tool_dir = temp_repo / 'TestTool'
        (tool_dir / 'readme.md').write_text('Not a prompt')
        (tool_dir / 'config.json').write_text('{}')
        
        versions = comparer.find_versions('TestTool')
        
        assert versions == []
    
    def test_find_versions_with_prompts(self, comparer, temp_repo):
        """Test finding prompt versions"""
        tool_dir = temp_repo / 'TestTool'
        
        # Create prompt files
        (tool_dir / 'prompt-v1.txt').write_text('Version 1')
        (tool_dir / 'agent-prompt.txt').write_text('Agent prompt')
        (tool_dir / 'system-prompt.txt').write_text('System')
        (tool_dir / 'readme.txt').write_text('Not a prompt')
        
        versions = comparer.find_versions('TestTool')
        
        assert len(versions) == 3
        assert all('name' in v for v in versions)
        assert all('path' in v for v in versions)
        assert all('size' in v for v in versions)
        assert all('modified' in v for v in versions)
    
    def test_find_versions_sorted_by_modified(self, comparer, temp_repo):
        """Test versions are sorted by modification time"""
        tool_dir = temp_repo / 'TestTool'
        
        # Create files
        file1 = tool_dir / 'prompt-v1.txt'
        file2 = tool_dir / 'prompt-v2.txt'
        
        file1.write_text('Version 1')
        file2.write_text('Version 2')
        
        versions = comparer.find_versions('TestTool')
        
        # Should be sorted by modification time
        assert len(versions) == 2
        assert versions[0]['modified'] <= versions[1]['modified']
    
    def test_find_versions_case_insensitive(self, comparer, temp_repo):
        """Test that prompt detection is case insensitive"""
        tool_dir = temp_repo / 'TestTool'
        
        (tool_dir / 'PROMPT.txt').write_text('Upper')
        (tool_dir / 'Prompt.txt').write_text('Mixed')
        (tool_dir / 'prompt.txt').write_text('Lower')
        
        versions = comparer.find_versions('TestTool')
        
        assert len(versions) == 3
    
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
    
    def test_compare_files_with_context(self, comparer, temp_repo):
        """Test diff with different context line counts"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\n')
        file2.write_text('Line 1\nLine 2 changed\nLine 3\nLine 4\nLine 5\n')
        
        diff_short = comparer.compare_files(file1, file2, context_lines=0)
        diff_long = comparer.compare_files(file1, file2, context_lines=5)
        
        assert len(diff_long) >= len(diff_short)
    
    def test_compare_identical_files(self, comparer, temp_repo):
        """Test comparing identical files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        content = 'Same content\nLine 2\nLine 3\n'
        file1.write_text(content)
        file2.write_text(content)
        
        diff = comparer.compare_files(file1, file2)
        
        # Should only have header lines
        non_header_diff = [l for l in diff if not (l.startswith('---') or l.startswith('+++') or l.startswith('@@'))]
        assert len(non_header_diff) == 0
    
    def test_compare_files_completely_different(self, comparer, temp_repo):
        """Test comparing completely different files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('File 1 content\n' * 10)
        file2.write_text('File 2 content\n' * 10)
        
        diff = comparer.compare_files(file1, file2)
        
        # Should have many changes
        assert len(diff) > 20
    
    def test_compare_files_empty_files(self, comparer, temp_repo):
        """Test comparing empty files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('')
        file2.write_text('')
        
        diff = comparer.compare_files(file1, file2)
        
        # Should be minimal diff
        assert len(diff) <= 3
    
    def test_calculate_similarity_identical(self, comparer, temp_repo):
        """Test similarity calculation for identical files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        content = 'Identical content\nWith multiple lines\n'
        file1.write_text(content)
        file2.write_text(content)
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert similarity == 1.0
    
    def test_calculate_similarity_different(self, comparer, temp_repo):
        """Test similarity calculation for different files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Completely different content\nNothing in common\n')
        file2.write_text('Totally unrelated text\nNo matches here\n')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert 0.0 <= similarity < 1.0
    
    def test_calculate_similarity_partial(self, comparer, temp_repo):
        """Test similarity calculation for partially similar files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Line 1\nLine 2\nLine 3\nLine 4\n')
        file2.write_text('Line 1\nLine 2 modified\nLine 3\nLine 5\n')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert 0.5 < similarity < 1.0
    
    def test_calculate_similarity_empty_files(self, comparer, temp_repo):
        """Test similarity of empty files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('')
        file2.write_text('')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert similarity == 1.0
    
    def test_calculate_similarity_one_empty(self, comparer, temp_repo):
        """Test similarity when one file is empty"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Some content')
        file2.write_text('')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert 0.0 <= similarity < 0.5
    
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
    
    def test_count_changes_only_additions(self, comparer):
        """Test counting only additions"""
        diff = [
            '--- file1.txt',
            '+++ file2.txt',
            '+New line 1',
            '+New line 2',
            '+New line 3'
        ]
        
        changes = comparer.count_changes(diff)
        
        assert changes['added'] == 3
        assert changes['removed'] == 0
        assert changes['total'] == 3
    
    def test_count_changes_only_removals(self, comparer):
        """Test counting only removals"""
        diff = [
            '--- file1.txt',
            '+++ file2.txt',
            '-Old line 1',
            '-Old line 2'
        ]
        
        changes = comparer.count_changes(diff)
        
        assert changes['added'] == 0
        assert changes['removed'] == 2
        assert changes['total'] == 2
    
    def test_count_changes_ignores_headers(self, comparer):
        """Test that headers are not counted as changes"""
        diff = [
            '--- file1.txt',
            '+++ file2.txt',
            '@@@ context @@@'
        ]
        
        changes = comparer.count_changes(diff)
        
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
    
    def test_generate_html_diff_structure(self, comparer, temp_repo):
        """Test HTML diff has proper structure"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Content 1')
        file2.write_text('Content 2')
        
        html = comparer.generate_html_diff(file1, file2, 'Tool')
        
        # Check for HTML structure
        assert '<html' in html
        assert '<head>' in html
        assert '<body>' in html
        assert '</html>' in html
        
        # Check for stats
        assert 'stat-card' in html
        assert 'diff-container' in html
    
    def test_generate_html_diff_css_styling(self, comparer, temp_repo):
        """Test HTML diff includes CSS"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Test')
        file2.write_text('Test')
        
        html = comparer.generate_html_diff(file1, file2, 'Tool')
        
        assert '<style>' in html
        assert 'background' in html
        assert '.added' in html or '.removed' in html
    
    def test_generate_html_diff_escapes_html(self, comparer, temp_repo):
        """Test that HTML characters are escaped"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('<div>HTML content</div>')
        file2.write_text('<span>Different HTML</span>')
        
        html = comparer.generate_html_diff(file1, file2, 'Tool')
        
        # Should escape HTML entities
        assert '&lt;' in html or '&gt;' in html
    
    def test_compare_tool_versions_insufficient_versions(self, comparer, temp_repo, capfd):
        """Test comparing when fewer than 2 versions exist"""
        tool_dir = temp_repo / 'TestTool'
        (tool_dir / 'prompt.txt').write_text('Only one version')
        
        comparer.compare_tool_versions('TestTool')
        captured = capfd.readouterr()
        
        assert 'Need at least 2 versions' in captured.out
    
    def test_compare_tool_versions_multiple(self, comparer, temp_repo, capfd):
        """Test comparing multiple versions"""
        tool_dir = temp_repo / 'TestTool'
        
        (tool_dir / 'prompt-v1.txt').write_text('Version 1 content')
        (tool_dir / 'prompt-v2.txt').write_text('Version 2 content')
        (tool_dir / 'prompt-v3.txt').write_text('Version 3 content')
        
        comparer.compare_tool_versions('TestTool', output_format='text')
        captured = capfd.readouterr()
        
        assert 'Comparing' in captured.out
        assert 'Similarity' in captured.out
        assert 'Lines added' in captured.out
    
    def test_compare_tool_versions_html_output(self, comparer, temp_repo):
        """Test HTML output generation for version comparison"""
        tool_dir = temp_repo / 'TestTool'
        
        (tool_dir / 'prompt-v1.txt').write_text('Version 1')
        (tool_dir / 'prompt-v2.txt').write_text('Version 2')
        
        comparer.compare_tool_versions('TestTool', output_format='html')
        
        # Check that HTML file was created
        html_files = list(temp_repo.glob('*.html'))
        assert len(html_files) > 0
    
    def test_main_with_all_flag(self, temp_repo, monkeypatch, capfd):
        """Test main function with --all flag"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir(exist_ok=True)
        
        (tool_dir / 'prompt-v1.txt').write_text('V1')
        (tool_dir / 'prompt-v2.txt').write_text('V2')
        
        monkeypatch.chdir(temp_repo)
        
        with patch('sys.argv', ['compare-versions.py', '--tool', 'TestTool', '--all', '--repo', str(temp_repo)]):
            from compare_versions import main
            main()
        
        captured = capfd.readouterr()
        assert 'Comparing' in captured.out
    
    def test_main_list_versions(self, temp_repo, monkeypatch, capfd):
        """Test main function lists versions when no comparison specified"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir(exist_ok=True)
        
        (tool_dir / 'prompt-v1.txt').write_text('V1')
        (tool_dir / 'prompt-v2.txt').write_text('V2')
        
        with patch('sys.argv', ['compare-versions.py', '--tool', 'TestTool', '--repo', str(temp_repo)]):
            from compare_versions import main
            main()
        
        captured = capfd.readouterr()
        assert 'Found' in captured.out
        assert 'version(s)' in captured.out
    
    def test_main_compare_specific_versions(self, temp_repo, monkeypatch, capfd):
        """Test comparing specific version files"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir(exist_ok=True)
        
        (tool_dir / 'v1.txt').write_text('V1 content')
        (tool_dir / 'v2.txt').write_text('V2 content')
        
        with patch('sys.argv', ['compare-versions.py', '--tool', 'TestTool', '--v1', 'v1.txt', '--v2', 'v2.txt', '--repo', str(temp_repo)]):
            from compare_versions import main
            main()
        
        captured = capfd.readouterr()
        # Should output diff
        assert captured.out  # Should have some output
    
    def test_main_nonexistent_files(self, temp_repo, capfd):
        """Test main with nonexistent version files"""
        with patch('sys.argv', ['compare-versions.py', '--tool', 'TestTool', '--v1', 'none1.txt', '--v2', 'none2.txt', '--repo', str(temp_repo)]):
            from compare_versions import main
            main()
        
        captured = capfd.readouterr()
        assert 'Error' in captured.out or 'not found' in captured.out
    
    def test_unicode_in_diff(self, comparer, temp_repo):
        """Test handling Unicode characters in diffs"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Tëst with üñíçödé 中文')
        file2.write_text('Tëst with ûñïçödé 日本語')
        
        diff = comparer.compare_files(file1, file2)
        
        assert len(diff) > 0
    
    def test_large_file_comparison(self, comparer, temp_repo):
        """Test comparing large files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        # Create large files
        content1 = '\n'.join([f'Line {i}' for i in range(1000)])
        content2 = '\n'.join([f'Line {i}' if i % 10 != 0 else f'Modified {i}' for i in range(1000)])
        
        file1.write_text(content1)
        file2.write_text(content2)
        
        diff = comparer.compare_files(file1, file2, context_lines=1)
        changes = comparer.count_changes(diff)
        
        assert changes['total'] > 0
        assert changes['added'] == changes['removed']  # Same number of changes
    
    def test_binary_file_handling(self, comparer, temp_repo):
        """Test handling of binary-like files"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        # Write files with mixed encodings
        file1.write_bytes(b'Binary \x00 content')
        file2.write_bytes(b'Different \x00 content')
        
        # Should not crash, handles errors='ignore'
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert 0.0 <= similarity <= 1.0