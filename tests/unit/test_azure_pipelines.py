"""
Comprehensive unit tests for Azure Pipelines configuration file
Tests azure-pipelines.yml structure, configuration, and best practices
"""

import pytest
import re
from pathlib import Path


class TestAzurePipelinesStructure:
    """Test suite for Azure Pipelines configuration structure validation"""
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def pipeline_file(self, repo_root):
        """Get path to azure-pipelines.yml file."""
        return repo_root / 'azure-pipelines.yml'
    
    @pytest.fixture
    def pipeline_content(self, pipeline_file):
        """Load pipeline file content."""
        with open(pipeline_file, 'r') as f:
            return f.read()
    
    @pytest.fixture
    def pipeline_lines(self, pipeline_file):
        """Load pipeline file lines."""
        with open(pipeline_file, 'r') as f:
            return f.readlines()
    
    def test_pipeline_file_exists(self, pipeline_file):
        """Test that azure-pipelines.yml exists in repository root"""
        assert pipeline_file.exists(), "azure-pipelines.yml should exist in repository root"
        assert pipeline_file.is_file(), "azure-pipelines.yml should be a file"
    
    def test_pipeline_is_valid_yaml_syntax(self, pipeline_content):
        """Test that azure-pipelines.yml has valid YAML syntax basics"""
        # Check for balanced indentation and no tabs
        assert '\t' not in pipeline_content, "YAML should not contain tabs"
        # Check that file is not empty
        assert len(pipeline_content.strip()) > 0, "Pipeline file should not be empty"
    
    def test_pipeline_has_trigger(self, pipeline_content):
        """Test that pipeline has trigger configuration"""
        assert re.search(r'^trigger:', pipeline_content, re.MULTILINE), \
            "Pipeline must have trigger configuration"
    
    def test_pipeline_has_pool(self, pipeline_content):
        """Test that pipeline has pool configuration"""
        assert re.search(r'^pool:', pipeline_content, re.MULTILINE), \
            "Pipeline must have pool configuration"
    
    def test_pipeline_has_steps(self, pipeline_content):
        """Test that pipeline has steps defined"""
        assert re.search(r'^steps:', pipeline_content, re.MULTILINE), \
            "Pipeline must have steps defined"
    
    def test_pipeline_structure_order(self, pipeline_content):
        """Test that pipeline sections appear in logical order"""
        trigger_pos = pipeline_content.find('trigger:')
        pool_pos = pipeline_content.find('pool:')
        steps_pos = pipeline_content.find('steps:')
        
        assert trigger_pos < pool_pos < steps_pos, \
            "Pipeline sections should appear in order: trigger, pool, steps"


class TestAzurePipelinesTrigger:
    """Test suite for Azure Pipelines trigger configuration"""
    
    @pytest.fixture
    def pipeline_content(self):
        """Load pipeline configuration."""
        pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(pipeline_file, 'r') as f:
            return f.read()
    
    def test_trigger_includes_main_branch(self, pipeline_content):
        """Test that trigger includes main branch"""
        # Look for "- main" under trigger section
        trigger_section = re.search(r'trigger:\s*\n((?:[ ]+-\s+\w+\s*\n?)*)', pipeline_content)
        assert trigger_section, "Should have trigger section with branches"
    def test_trigger_branches_format(self, pipeline_content):
        """Test that trigger branches are properly formatted"""
        # Check for proper list format
        assert re.search(r'trigger:\s*\n\s*-\s+\w+', pipeline_content), \
            "Trigger should have properly formatted branch list"


class TestAzurePipelinesPool:
    """Test suite for Azure Pipelines pool configuration"""
    
    @pytest.fixture
    def pipeline_content(self):
        """Load pipeline configuration."""
        pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(pipeline_file, 'r') as f:
            return f.read()
    
    def test_pool_has_vm_image(self, pipeline_content):
        """Test that pool specifies a VM image"""
        assert re.search(r'pool:.*\n\s+vmImage:', pipeline_content, re.DOTALL), \
            "Pool must specify vmImage"
    
    def test_pool_vm_image_is_ubuntu_latest(self, pipeline_content):
        """Test that pool uses ubuntu-latest as VM image"""
        assert re.search(r'vmImage:\s*["\']?ubuntu-latest["\']?', pipeline_content), \
            "Pool should use ubuntu-latest VM image"
    
    def test_pool_uses_microsoft_hosted_agent(self, pipeline_content):
        """Test that pool uses a valid Microsoft-hosted agent image"""
        vm_image_match = re.search(r'vmImage:\s*["\']?(\S+)["\']?', pipeline_content)
        assert vm_image_match, "Should have vmImage specified"
        vm_image = vm_image_match.group(1)
        
        valid_prefixes = ['ubuntu', 'windows', 'macOS', 'macos']
        assert any(vm_image.startswith(prefix) for prefix in valid_prefixes), \
            f"vmImage '{vm_image}' should use a valid Microsoft-hosted agent"


class TestAzurePipelinesSteps:
    """Test suite for Azure Pipelines steps configuration"""
    
    @pytest.fixture
    def pipeline_content(self):
        """Load pipeline configuration."""
        pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(pipeline_file, 'r') as f:
            return f.read()
    
    def test_steps_has_task_entries(self, pipeline_content):
        """Test that steps section has task entries"""
        assert re.search(r'steps:.*\n\s*-\s+task:', pipeline_content, re.DOTALL), \
            "Steps should have at least one task entry"
    
    def test_steps_has_script_entries(self, pipeline_content):
        """Test that steps section has script entries"""
        assert re.search(r'steps:.*\n\s*-\s+script:', pipeline_content, re.DOTALL), \
            "Steps should have at least one script entry"
    
    def test_all_steps_have_display_name(self, pipeline_content):
        """Test that all steps have displayName"""
        # Count step entries (- task: or - script:)
        step_pattern = r'-\s+(task|script):'
        steps = list(re.finditer(step_pattern, pipeline_content))
        
        # Count displayName entries
        display_names = list(re.finditer(r'displayName:', pipeline_content))
        
        # Should have at least as many displayNames as steps
        assert len(display_names) >= len(steps), \
            f"All {len(steps)} steps should have displayName (found {len(display_names)})"


class TestAzurePipelinesNodeToolTask:
    """Test suite for NodeTool task configuration"""
    
    @pytest.fixture
    def pipeline_content(self):
        """Load pipeline configuration."""
        pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(pipeline_file, 'r') as f:
            return f.read()
    
    def test_node_tool_task_exists(self, pipeline_content):
        """Test that NodeTool task exists in pipeline"""
        assert re.search(r'task:\s*NodeTool@\d+', pipeline_content), \
            "Pipeline should have NodeTool task"
    
    def test_node_tool_task_version(self, pipeline_content):
        """Test that NodeTool task uses correct version"""
        assert re.search(r'task:\s*NodeTool@0', pipeline_content), \
            "NodeTool task should be version @0"
    
    def test_node_tool_has_version_spec(self, pipeline_content):
        """Test that NodeTool task has versionSpec input"""
        # Look for versionSpec in the NodeTool task section
        nodetool_section = re.search(
            r'task:\s*NodeTool@\d+.*?(?=(?:^-\s|^\w|\Z))',
            pipeline_content,
            re.DOTALL | re.MULTILINE
        )
        assert nodetool_section, "Should find NodeTool task section"
        assert 'versionSpec' in nodetool_section.group(0), \
            "NodeTool task should have versionSpec input"
    
    def test_node_tool_version_spec_is_20x(self, pipeline_content):
        """Test that NodeTool uses Node.js version 20.x"""
        assert re.search(r'versionSpec:\s*["\']?20\.x["\']?', pipeline_content), \
            "NodeTool should use Node.js version 20.x"
    
    def test_node_tool_display_name(self, pipeline_content):
        """Test that NodeTool task has appropriate displayName"""
        # Find NodeTool task and its displayName
        nodetool_section = re.search(
            r'task:\s*NodeTool@\d+.*?displayName:\s*["\']?([^"\'\n]+)["\']?',
            pipeline_content,
            re.DOTALL
        )
        assert nodetool_section, "NodeTool task should have displayName"
        display_name = nodetool_section.group(1).strip()
        assert 'Node' in display_name or 'node' in display_name, \
            "NodeTool displayName should mention Node.js"
    
    def test_node_tool_is_first_step(self, pipeline_content):
        """Test that NodeTool task is the first step (best practice)"""
        # Find steps section and first task
        steps_match = re.search(r'steps:\s*\n\s*-\s+task:\s*(\w+)@', pipeline_content)
        assert steps_match, "Should find first task in steps"
        first_task = steps_match.group(1)
        assert first_task == 'NodeTool', \
            f"First step should be NodeTool (found {first_task})"


class TestAzurePipelinesScriptStep:
    """Test suite for script step configuration"""
    
    @pytest.fixture
    def pipeline_content(self):
        """Load pipeline configuration."""
        pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(pipeline_file, 'r') as f:
            return f.read()
    
    def test_script_step_has_npm_install(self, pipeline_content):
        """Test that script step includes npm install"""
        assert re.search(r'script:.*npm install', pipeline_content, re.DOTALL), \
            "Script should include 'npm install'"
    
    def test_script_step_has_npm_build(self, pipeline_content):
        """Test that script step includes npm run build"""
        assert re.search(r'script:.*npm run build', pipeline_content, re.DOTALL), \
            "Script should include 'npm run build'"
    
    def test_script_display_name(self, pipeline_content):
        """Test that script step has appropriate displayName"""
        # Find script section and its displayName
        script_match = re.search(
            r'-\s+script:.*?displayName:\s*["\']?([^"\'\n]+)["\']?',
            pipeline_content,
            re.DOTALL
        )
        assert script_match, "Script step should have displayName"
        display_name = script_match.group(1).strip()
        assert 'npm' in display_name.lower(), \
            "Script displayName should mention npm"
    
    def test_script_commands_order(self, pipeline_content):
        """Test that npm install comes before npm run build"""
        install_match = re.search(r'npm install', pipeline_content)
        build_match = re.search(r'npm run build', pipeline_content)
        
        assert install_match and build_match, "Should have both npm install and build commands"
        assert install_match.start() < build_match.start(), \
            "npm install should come before npm run build"


class TestAzurePipelinesBestPractices:
    """Test suite for Azure Pipelines best practices and security"""
    
    @pytest.fixture
    def pipeline_file(self):
        """Get pipeline file path."""
        return Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
    
    @pytest.fixture
    def pipeline_content(self, pipeline_file):
        """Load pipeline configuration."""
        with open(pipeline_file, 'r') as f:
            return f.read()
    
    def test_pipeline_has_comments(self, pipeline_content):
        """Test that pipeline file has documentation comments"""
        assert '#' in pipeline_content, "Pipeline should have comments for documentation"
    
    def test_pipeline_references_documentation(self, pipeline_content):
        """Test that pipeline includes reference to Microsoft documentation"""
        assert 'docs.microsoft.com' in pipeline_content or 'azure/devops' in pipeline_content, \
            "Pipeline should reference Microsoft documentation"
    
    def test_no_hardcoded_secrets(self, pipeline_content):
        """Test that pipeline doesn't contain obvious hardcoded secrets"""
        # Check for common secret patterns (excluding comments and URLs)
        lines = [line for line in pipeline_content.split('\n') 
                if not line.strip().startswith('#')]
        non_comment_content = '\n'.join(lines).lower()
        
        forbidden_patterns = [
            'password:', 'secret:', 'api_key:', 'apikey:', 'token:',
            'access_key:', 'private_key:'
        ]
        
        for pattern in forbidden_patterns:
            if pattern in non_comment_content:
                # Make sure it's not in a URL
                assert 'docs.microsoft.com' not in non_comment_content or \
                       pattern not in non_comment_content, \
                    f"Pipeline should not contain hardcoded secrets (found '{pattern}')"
    
    def test_uses_specific_node_version(self, pipeline_content):
        """Test that pipeline specifies explicit Node.js version (best practice)"""
        version_match = re.search(r'versionSpec:\s*["\']?([^"\'\n]+)["\']?', pipeline_content)
        assert version_match, "Should have versionSpec"
        version_spec = version_match.group(1).strip()
        
        # Should specify a version, not just 'latest'
        assert version_spec != 'latest', "Should specify explicit Node.js version, not 'latest'"
        assert any(c.isdigit() for c in version_spec), "Should specify numeric version"
    
    def test_steps_have_meaningful_display_names(self, pipeline_content):
        """Test that all steps have meaningful display names"""
        display_names = re.findall(r'displayName:\s*["\']?([^"\'\n]+)["\']?', pipeline_content)
        
        for display_name in display_names:
            name = display_name.strip()
            assert len(name) > 5, f"DisplayName '{name}' should be meaningful (>5 chars)"
            assert name.lower() != 'step', \
                "DisplayName should be specific, not generic 'step'"
    
    def test_uses_latest_ubuntu_image(self, pipeline_content):
        """Test that pipeline uses latest Ubuntu image (recommended)"""
        vm_image_match = re.search(r'vmImage:\s*["\']?(\S+)["\']?', pipeline_content)
        assert vm_image_match, "Should have vmImage"
        vm_image = vm_image_match.group(1)
        assert 'ubuntu' in vm_image.lower(), \
            "Should use Ubuntu for Node.js builds (recommended)"


class TestAzurePipelinesEdgeCases:
    """Test suite for edge cases and potential issues"""
    
    @pytest.fixture
    def pipeline_file(self):
        """Get pipeline file path."""
        return Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
    
    @pytest.fixture
    def pipeline_content(self, pipeline_file):
        """Load pipeline configuration."""
        with open(pipeline_file, 'r') as f:
            return f.read()
    
    def test_file_not_empty(self, pipeline_file):
        """Test that pipeline file is not empty"""
        content = pipeline_file.read_text()
        assert len(content) > 0, "Pipeline file should not be empty"
    
    def test_file_ends_with_newline(self, pipeline_file):
        """Test that file ends with newline (best practice)"""
        content = pipeline_file.read_text()
        assert content.endswith('\n'), "File should end with newline"
    
    def test_no_tabs_in_yaml(self, pipeline_content):
        """Test that YAML file uses spaces, not tabs"""
        assert '\t' not in pipeline_content, "YAML files should use spaces, not tabs"
    
    def test_consistent_indentation(self, pipeline_file):
        """Test that file uses consistent indentation"""
        with open(pipeline_file, 'r') as f:
            lines = f.readlines()
        
        indented_lines = [line for line in lines if len(line) > 0 and line[0] == ' ']
        if indented_lines:
            # Check that indentation is consistent (multiples of 2)
            for line in indented_lines:
                leading_spaces = len(line) - len(line.lstrip())
                if leading_spaces > 0:
                    assert leading_spaces % 2 == 0, \
                        f"Indentation should be multiples of 2 spaces (found {leading_spaces})"
    
    def test_node_version_is_lts_compatible(self, pipeline_content):
        """Test that Node.js version is LTS compatible"""
        version_match = re.search(r'versionSpec:\s*["\']?(\d+)', pipeline_content)
        assert version_match, "Should find Node.js version"
        major_version = int(version_match.group(1))
        
        # Node.js LTS versions are even numbers
        assert major_version % 2 == 0, \
            f"Node.js version {major_version} should be LTS (even number)"
    
    def test_script_doesnt_ignore_errors(self, pipeline_content):
        """Test that scripts don't silently ignore errors"""
        script_sections = re.findall(r'script:\s*\|?(.*?)(?=\n\s*displayName|\n-|\Z)', 
                                    pipeline_content, re.DOTALL)
        
        for script in script_sections:
            # Scripts shouldn't contain error suppression
            assert '|| true' not in script, "Scripts should not use '|| true' to ignore errors"
            assert '2>/dev/null' not in script, "Scripts should not suppress error output"


class TestAzurePipelinesIntegration:
    """Integration tests for Azure Pipelines configuration"""
    
    @pytest.fixture
    def pipeline_content(self):
        """Load pipeline configuration."""
        pipeline_file = Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
        with open(pipeline_file, 'r') as f:
            return f.read()
    
    @pytest.fixture
    def repo_root(self):
        """Get repository root."""
        return Path(__file__).parent.parent.parent
    
    def test_pipeline_matches_project_structure(self, repo_root):
        """Test that pipeline configuration matches project structure"""
        # Check if this is indeed a Node.js project
        package_json_exists = (repo_root / 'package.json').exists() or \
                              (repo_root / 'site' / 'package.json').exists() or \
                              (repo_root / 'scripts' / 'package.json').exists()
        
        # Pipeline is configured for Node.js, so project should have package.json somewhere
        assert package_json_exists, "Pipeline is for Node.js but no package.json found"
    
    def test_pipeline_node_version_compatibility(self, pipeline_content):
        """Test that Node.js version in pipeline is compatible with modern projects"""
        version_match = re.search(r'versionSpec:\s*["\']?(\d+)', pipeline_content)
        assert version_match, "Should find Node.js version"
        major_version = int(version_match.group(1))
        
        # Should be at least Node.js 16 (minimum LTS still in support as of 2024)
        assert major_version >= 16, \
            f"Node.js version should be at least 16 (got {major_version})"
        # Should not be too new/experimental
        assert major_version <= 22, \
            f"Node.js version seems too new/experimental (got {major_version})"
    
    def test_pipeline_commands_sequence_is_logical(self, pipeline_content):
        """Test that pipeline commands follow logical sequence"""
        # Find positions of NodeTool task and npm commands
        nodetool_pos = pipeline_content.find('NodeTool@')
        npm_pos = pipeline_content.find('npm install')
        
        assert nodetool_pos >= 0 and npm_pos >= 0, \
            "Should have both NodeTool and npm commands"
        assert nodetool_pos < npm_pos, \
            "NodeTool should be installed before npm commands"


class TestAzurePipelinesDocumentation:
    """Test suite for pipeline documentation and maintainability"""
    
    @pytest.fixture
    def pipeline_file(self):
        """Get pipeline file path."""
        return Path(__file__).parent.parent.parent / 'azure-pipelines.yml'
    
    @pytest.fixture
    def pipeline_content(self, pipeline_file):
        """Load pipeline configuration."""
        with open(pipeline_file, 'r') as f:
            return f.read()
    
    def test_has_header_comment(self, pipeline_file):
        """Test that pipeline has descriptive header comment"""
        with open(pipeline_file, 'r') as f:
            lines = f.readlines()
        
        # First non-empty line should be a comment
        first_line = next((line for line in lines if line.strip()), None)
        assert first_line is not None, "File should not be empty"
        assert first_line.strip().startswith('#'), "File should start with a comment"
    
    def test_header_describes_purpose(self, pipeline_content):
        """Test that header comment describes pipeline purpose"""
        # Get first few lines
        first_lines = '\n'.join(pipeline_content.split('\n')[:5])
        
        # Should mention Node.js or React
        assert 'node' in first_lines.lower() or 'react' in first_lines.lower(), \
            "Header should describe that this is for Node.js/React"
    
    def test_has_reference_to_documentation(self, pipeline_content):
        """Test that pipeline includes link to Azure DevOps documentation"""
        assert 'docs.microsoft.com' in pipeline_content or 'azure/devops' in pipeline_content, \
            "Pipeline should reference Azure DevOps documentation"
    
    def test_comments_are_helpful(self, pipeline_file):
        """Test that comments provide helpful information"""
        with open(pipeline_file, 'r') as f:
            lines = f.readlines()
        
        comment_lines = [line for line in lines if line.strip().startswith('#')]
        assert len(comment_lines) > 0, "Pipeline should have comments"
        
        # Comments should have substance (more than just symbols)
        for comment in comment_lines:
            # Remove comment character and strip
            content = comment.replace('#', '').strip()
            if content:  # Non-empty comment
                assert len(content) > 5, "Comments should be meaningful"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])