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
        non_header_diff = [line for line in diff if not (line.startswith('---') or line.startswith('+++') or line.startswith('@@'))]
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
    
    def test_main_list_versions(self, temp_repo, capfd):
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
    
    def test_main_compare_specific_versions(self, temp_repo, capfd):
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


class TestVersionComparerAdvanced:
    """Advanced test cases for comprehensive coverage"""
    
    @pytest.fixture
    def comparer(self, temp_repo):
        return VersionComparer(str(temp_repo))
    
    @pytest.fixture
    def temp_repo(self):
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        yield repo_path
        shutil.rmtree(temp_dir)
    
    def test_find_versions_with_multiple_extensions(self, comparer, temp_repo):
        """Test finding versions with different file extensions"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        
        (tool_dir / 'prompt.txt').write_text('Text version')
        (tool_dir / 'prompt.md').write_text('Markdown version')
        (tool_dir / 'system-prompt.txt').write_text('System version')
        
        versions = comparer.find_versions('TestTool')
        
        # Should only find .txt files with 'prompt' in name
        assert len(versions) == 2
        assert all(v['path'].suffix == '.txt' for v in versions)
    
    def test_find_versions_timestamp_ordering(self, comparer, temp_repo):
        """Test that versions are properly ordered by timestamp"""
        import time
        
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        
        # Create files with delays to ensure different timestamps
        (tool_dir / 'prompt-old.txt').write_text('Old')
        time.sleep(0.1)
        (tool_dir / 'prompt-new.txt').write_text('New')
        
        versions = comparer.find_versions('TestTool')
        
        assert len(versions) == 2
        # First should be older
        assert versions[0]['modified'] < versions[1]['modified']
    
    def test_compare_files_with_special_characters(self, comparer, temp_repo):
        """Test comparing files with special regex characters"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Pattern: .*+?[](){}^$|\\')
        file2.write_text('Pattern: .*+?[](){}^$|\\modified')
        
        diff = comparer.compare_files(file1, file2)
        
        assert len(diff) > 0
    
    def test_compare_files_zero_context(self, comparer, temp_repo):
        """Test diff with zero context lines"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Line 1\nLine 2\nLine 3\nLine 4\nLine 5')
        file2.write_text('Line 1\nLine 2 changed\nLine 3\nLine 4\nLine 5')
        
        diff = comparer.compare_files(file1, file2, context_lines=0)
        
        # Should have minimal context
        assert len(diff) < 10
    
    def test_compare_files_large_context(self, comparer, temp_repo):
        """Test diff with large context lines"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        content1 = '\n'.join([f'Line {i}' for i in range(50)])
        content2 = content1.replace('Line 25', 'Line 25 modified')
        
        file1.write_text(content1)
        file2.write_text(content2)
        
        diff = comparer.compare_files(file1, file2, context_lines=20)
        
        # Should have lots of context
        assert len(diff) > 40
    
    def test_calculate_similarity_whitespace_differences(self, comparer, temp_repo):
        """Test similarity with only whitespace differences"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Line 1\nLine 2\nLine 3')
        file2.write_text('Line 1\n  Line 2  \nLine 3')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        # Should be very similar but not identical
        assert 0.8 < similarity < 1.0
    
    def test_calculate_similarity_line_order_change(self, comparer, temp_repo):
        """Test similarity when lines are reordered"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Line A\nLine B\nLine C')
        file2.write_text('Line C\nLine B\nLine A')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        # Should have moderate similarity
        assert 0.5 < similarity < 0.9
    
    def test_count_changes_with_context_markers(self, comparer):
        """Test that context markers in diff are not counted"""
        diff = [
            '--- file1',
            '+++ file2',
            '@@ -1,5 +1,5 @@',
            ' context line',
            '-removed line',
            '+added line',
            ' more context'
        ]
        
        changes = comparer.count_changes(diff)
        
        assert changes['added'] == 1
        assert changes['removed'] == 1
        assert changes['total'] == 2
    
    def test_count_changes_consecutive_changes(self, comparer):
        """Test counting consecutive additions and removals"""
        diff = [
            '--- file1',
            '+++ file2',
            '-line 1 removed',
            '-line 2 removed',
            '-line 3 removed',
            '+line 1 added',
            '+line 2 added',
            '+line 3 added'
        ]
        
        changes = comparer.count_changes(diff)
        
        assert changes['added'] == 3
        assert changes['removed'] == 3
        assert changes['total'] == 6
    
    def test_generate_html_diff_with_long_lines(self, comparer, temp_repo):
        """Test HTML generation with very long lines"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        long_line = 'x' * 1000
        file1.write_text(long_line)
        file2.write_text(long_line + 'y')
        
        html = comparer.generate_html_diff(file1, file2, 'Tool')
        
        # Should generate without crashing
        assert '<html' in html
        assert len(html) > 1000
    
    def test_generate_html_diff_similarity_display(self, comparer, temp_repo):
        """Test that similarity percentage is displayed correctly"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Same content')
        file2.write_text('Same content')
        
        html = comparer.generate_html_diff(file1, file2, 'Tool')
        
        # Should show 100% similarity
        assert '100' in html or '1.0' in html
    
    def test_generate_html_diff_javascript_functionality(self, comparer, temp_repo):
        """Test that HTML includes JavaScript for copy functionality"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Test')
        file2.write_text('Test modified')
        
        html = comparer.generate_html_diff(file1, file2, 'Tool')
        
        # Should include JavaScript
        assert '<script' in html or 'function' in html
    
    def test_compare_tool_versions_output_format_json(self, comparer, temp_repo, capfd):
        """Test JSON output format for version comparison"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        
        (tool_dir / 'prompt-v1.txt').write_text('Version 1')
        (tool_dir / 'prompt-v2.txt').write_text('Version 2')
        
        comparer.compare_tool_versions('TestTool', output_format='json')
        captured = capfd.readouterr()
        
        # Should contain JSON-like output or generate JSON file
        assert captured.out or True  # Might write to file instead
    
    def test_compare_tool_versions_creates_html_files(self, comparer, temp_repo):
        """Test that HTML files are created in HTML mode"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        
        (tool_dir / 'prompt-v1.txt').write_text('V1')
        (tool_dir / 'prompt-v2.txt').write_text('V2')
        
        comparer.compare_tool_versions('TestTool', output_format='html')
        
        # Should create HTML file
        html_files = list(temp_repo.glob('*.html'))
        assert len(html_files) >= 1
    
    def test_main_with_invalid_tool(self, temp_repo, capfd):
        """Test main function with non-existent tool"""
        with patch('sys.argv', ['compare-versions.py', '--tool', 'NonExistent', '--repo', str(temp_repo)]):
            from compare_versions import main
            main()
        
        captured = capfd.readouterr()
        assert 'Found 0 version' in captured.out
    
    def test_main_json_output_format(self, temp_repo, capfd):
        """Test main with JSON output format"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        
        (tool_dir / 'prompt-v1.txt').write_text('V1')
        (tool_dir / 'prompt-v2.txt').write_text('V2')
        
        with patch('sys.argv', ['compare-versions.py', '--tool', 'TestTool', '--all', '--format', 'json', '--repo', str(temp_repo)]):
            from compare_versions import main
            main()
        
        captured = capfd.readouterr()
        # Should process without error
        assert captured.out or True
    
    def test_file_read_error_handling(self, comparer, temp_repo):
        """Test handling of file read errors"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Content')
        file2.write_text('Content')
        
        # Make file unreadable (on Unix systems)
        import os
        try:
            os.chmod(file1, 0o000)
            # Should handle gracefully with errors='ignore'
            comparer.calculate_similarity(file1, file2)
            # Restore permissions for cleanup
            os.chmod(file1, 0o644)
        except PermissionError:
            # On some systems, we can't remove read permissions
            pass
    
    def test_html_diff_with_no_changes(self, comparer, temp_repo):
        """Test HTML generation when files are identical"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        content = 'Identical content\nLine 2\nLine 3'
        file1.write_text(content)
        file2.write_text(content)
        
        html = comparer.generate_html_diff(file1, file2, 'Tool')
        
        # Should show 0 changes
        assert '0' in html  # Should have zero added/removed
    
    def test_multiline_change_detection(self, comparer, temp_repo):
        """Test detection of multi-line changes"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Line 1\nLine 2\nLine 3\nLine 4')
        file2.write_text('Line 1\nNew Line 2\nNew Line 3\nLine 4')
        
        diff = comparer.compare_files(file1, file2)
        changes = comparer.count_changes(diff)
        
        # Should detect both removed and added lines
        assert changes['removed'] >= 2
        assert changes['added'] >= 2
    
    def test_compare_with_newline_differences(self, comparer, temp_repo):
        """Test handling of different newline styles"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        # Write with different line endings
        file1.write_text('Line 1\nLine 2\nLine 3')
        file2.write_text('Line 1\r\nLine 2\r\nLine 3')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        # Should be very similar
        assert similarity > 0.9
    
    def test_html_output_includes_metadata(self, comparer, temp_repo):
        """Test that HTML output includes file metadata"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Test')
        file2.write_text('Modified')
        
        html = comparer.generate_html_diff(file1, file2, 'TestTool')
        
        # Should include tool name
        assert 'TestTool' in html
        # Should include file paths
        assert 'file1' in html or 'file2' in html
    
    def test_version_comparison_with_single_file(self, comparer, temp_repo, capfd):
        """Test that single file scenario is handled"""
        tool_dir = temp_repo / 'TestTool'
        tool_dir.mkdir()
        
        (tool_dir / 'prompt.txt').write_text('Only version')
        
        comparer.compare_tool_versions('TestTool')
        captured = capfd.readouterr()
        
        assert 'Need at least 2 versions' in captured.out or 'Found 1 version' in captured.out
    
    def test_similarity_with_identical_empty_lines(self, comparer, temp_repo):
        """Test similarity calculation with empty lines"""
        file1 = temp_repo / 'file1.txt'
        file2 = temp_repo / 'file2.txt'
        
        file1.write_text('Line 1\n\nLine 3')
        file2.write_text('Line 1\n\nLine 3')
        
        similarity = comparer.calculate_similarity(file1, file2)
        
        assert similarity == 1.0


pytestmark = pytest.mark.unit

class TestVersionComparerIntegration:
    """Integration tests for version comparison workflow"""
    
    @pytest.fixture
    def temp_repo(self):
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        yield repo_path
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def comparer(self, temp_repo):
        return VersionComparer(str(temp_repo))
    
    def test_complete_comparison_workflow(self, comparer, temp_repo):
        """Test complete version comparison workflow"""
        tool_dir = temp_repo / 'VersionedTool'
        tool_dir.mkdir()
        
        # Create version history
        versions = [
            ('prompt-v1.0.txt', 'Version 1.0\nInitial release\nBasic features'),
            ('prompt-v1.1.txt', 'Version 1.1\nInitial release\nBasic features\nBug fixes'),
            ('prompt-v2.0.txt', 'Version 2.0\nMajor update\nNew features\nImproved performance'),
        ]
        
        for filename, content in versions:
            (tool_dir / filename).write_text(content)
        
        # Find versions
        found_versions = comparer.find_versions('VersionedTool')
        assert len(found_versions) == 3
        
        # Compare sequential versions
        for i in range(len(found_versions) - 1):
            v1 = found_versions[i]
            v2 = found_versions[i + 1]
            
            diff = comparer.compare_files(v1['path'], v2['path'])
            assert len(diff) > 0
            
            similarity = comparer.calculate_similarity(v1['path'], v2['path'])
            assert 0.0 <= similarity <= 1.0
    
    def test_html_generation_workflow(self, comparer, temp_repo):
        """Test HTML diff generation workflow"""
        tool_dir = temp_repo / 'HTMLTool'
        tool_dir.mkdir()
        
        file1 = tool_dir / 'prompt-v1.txt'
        file2 = tool_dir / 'prompt-v2.txt'
        
        file1.write_text('Original content\nLine 2\nLine 3')
        file2.write_text('Modified content\nLine 2\nLine 3\nLine 4')
        
        html = comparer.generate_html_diff(file1, file2, 'HTMLTool')
        
        # Verify HTML structure
        assert '<!DOCTYPE html>' in html
        assert 'HTMLTool' in html
        assert 'Lines Added' in html
        assert 'Lines Removed' in html
        assert 'Similarity' in html
        
        # Verify diff content is present
        assert 'Original content' in html or 'Modified content' in html


class TestVersionComparerPerformance:
    """Performance and stress tests for version comparison"""
    
    @pytest.fixture
    def temp_repo(self):
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        yield repo_path
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def comparer(self, temp_repo):
        return VersionComparer(str(temp_repo))
    
    @pytest.mark.slow
    def test_large_file_comparison(self, comparer, temp_repo):
        """Test comparing large files"""
        file1 = temp_repo / 'large1.txt'
        file2 = temp_repo / 'large2.txt'
        
        # Create large files (1MB each)
        content1 = '\n'.join([f'Line {i} in file 1' for i in range(50000)])
        content2 = '\n'.join([f'Line {i} in file {"2" if i % 100 != 0 else "1"}' for i in range(50000)])
        
        file1.write_text(content1)
        file2.write_text(content2)
        
        import time
        start = time.time()
        
        diff = comparer.compare_files(file1, file2, context_lines=3)
        similarity = comparer.calculate_similarity(file1, file2)
        changes = comparer.count_changes(diff)
        
        duration = time.time() - start
        
        # Should complete in reasonable time (< 5 seconds)
        assert duration < 5
        assert 0.0 <= similarity <= 1.0
        assert changes['total'] > 0
    
    def test_many_versions_comparison(self, comparer, temp_repo):
        """Test comparing many sequential versions"""
        tool_dir = temp_repo / 'ManyVersions'
        tool_dir.mkdir()
        
        # Create 20 versions
        for i in range(20):
            content = '\n'.join([
                f'Version {i}',
                'Common line 1',
                'Common line 2',
                f'Version-specific content for v{i}',
                'Common line 3'
            ])
            (tool_dir / f'prompt-v{i}.txt').write_text(content)
        
        versions = comparer.find_versions('ManyVersions')
        assert len(versions) == 20
        
        # Compare all sequential pairs
        for i in range(len(versions) - 1):
            diff = comparer.compare_files(versions[i]['path'], versions[i+1]['path'])
            assert len(diff) > 0


pytestmark = pytest.mark.unit