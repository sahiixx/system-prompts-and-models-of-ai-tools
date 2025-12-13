"""
Unit tests for PowerShell deployment scripts.

This module tests:
- Deployment script structure and syntax
- Script parameters and functions
- Error handling in scripts
"""

import pytest
from pathlib import Path
import re


class TestDeploymentScripts:
    """Test PowerShell deployment scripts."""
    
    @pytest.fixture
    def deploy_simple_path(self):
        """Return path to deploy-simple.ps1."""
        return Path("unified-ai-platform/deploy-simple.ps1")
    
    @pytest.fixture
    def deploy_path(self):
        """Return path to deploy.ps1."""
        return Path("unified-ai-platform/deploy.ps1")
    
    def test_deploy_simple_exists(self, deploy_simple_path):
        """Test that deploy-simple.ps1 exists."""
        assert deploy_simple_path.exists(), \
            f"Deployment script not found: {deploy_simple_path}"
    
    def test_deploy_exists(self, deploy_path):
        """Test that deploy.ps1 exists."""
        assert deploy_path.exists(), \
            f"Deployment script not found: {deploy_path}"
    
    def test_scripts_not_empty(self, deploy_simple_path, deploy_path):
        """Test that deployment scripts are not empty."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                assert len(content) > 100, \
                    f"Script seems too short: {path}"
    
    def test_scripts_have_shebang_comment(self, deploy_simple_path, deploy_path):
        """Test that scripts have proper header comments."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                # PowerShell scripts should have header comments
                assert '#' in content[:200], \
                    f"Script should have header comments: {path}"
    
    def test_scripts_use_param_block(self, deploy_simple_path, deploy_path):
        """Test that scripts use proper param blocks."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                assert 'param(' in content.lower(), \
                    f"Script should have param block: {path}"
    
    def test_deploy_simple_has_action_parameter(self, deploy_simple_path):
        """Test that deploy-simple.ps1 has Action parameter."""
        if not deploy_simple_path.exists():
            pytest.skip("deploy-simple.ps1 not found")
        
        content = deploy_simple_path.read_text(encoding='utf-8')
        assert '$Action' in content, \
            "deploy-simple.ps1 should have $Action parameter"
    
    def test_deploy_has_action_parameter(self, deploy_path):
        """Test that deploy.ps1 has Action parameter."""
        if not deploy_path.exists():
            pytest.skip("deploy.ps1 not found")
        
        content = deploy_path.read_text(encoding='utf-8')
        assert '$Action' in content, \
            "deploy.ps1 should have $Action parameter"
    
    def test_scripts_handle_start_action(self, deploy_simple_path, deploy_path):
        """Test that scripts handle 'start' action."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                # Should handle start action
                assert re.search(r'["\']start["\']', content, re.IGNORECASE), \
                    f"Script should handle 'start' action: {path}"
    
    def test_scripts_handle_stop_action(self, deploy_simple_path, deploy_path):
        """Test that scripts handle 'stop' action."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                # Should handle stop action
                assert re.search(r'["\']stop["\']', content, re.IGNORECASE), \
                    f"Script should handle 'stop' action: {path}"
    
    def test_scripts_use_write_host(self, deploy_simple_path, deploy_path):
        """Test that scripts use Write-Host for output."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                assert 'Write-Host' in content, \
                    f"Script should use Write-Host for output: {path}"
    
    def test_scripts_have_error_handling(self, deploy_simple_path, deploy_path):
        """Test that scripts have error handling."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                # Should have try-catch or ErrorAction
                has_error_handling = (
                    'try' in content.lower() or 
                    'catch' in content.lower() or
                    'ErrorAction' in content
                )
                assert has_error_handling, \
                    f"Script should have error handling: {path}"
    
    def test_scripts_use_colored_output(self, deploy_simple_path, deploy_path):
        """Test that scripts use colored output."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                # Should use ForegroundColor for better UX
                assert 'ForegroundColor' in content, \
                    f"Script should use colored output: {path}"
    
    def test_deploy_simple_starts_node(self, deploy_simple_path):
        """Test that deploy-simple.ps1 starts Node.js."""
        if not deploy_simple_path.exists():
            pytest.skip("deploy-simple.ps1 not found")
        
        content = deploy_simple_path.read_text(encoding='utf-8')
        assert 'node' in content.lower(), \
            "deploy-simple.ps1 should start Node.js"
        assert 'Start-Process' in content or 'node ' in content, \
            "deploy-simple.ps1 should use Start-Process or direct node command"
    
    def test_deploy_simple_references_server_file(self, deploy_simple_path):
        """Test that deploy-simple.ps1 references server file."""
        if not deploy_simple_path.exists():
            pytest.skip("deploy-simple.ps1 not found")
        
        content = deploy_simple_path.read_text(encoding='utf-8')
        assert 'simple-server.js' in content or 'index.js' in content, \
            "deploy-simple.ps1 should reference server file"
    
    def test_scripts_check_process_status(self, deploy_simple_path, deploy_path):
        """Test that scripts check process status."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                # Should use Get-Process to check node status
                assert 'Get-Process' in content, \
                    f"Script should use Get-Process: {path}"
    
    def test_scripts_handle_port_configuration(self, deploy_path):
        """Test that deploy.ps1 handles port configuration."""
        if not deploy_path.exists():
            pytest.skip("deploy.ps1 not found")
        
        content = deploy_path.read_text(encoding='utf-8')
        # Should handle port parameter
        assert '$Port' in content or 'port' in content.lower(), \
            "deploy.ps1 should handle port configuration"
    
    def test_deploy_has_test_action(self, deploy_simple_path, deploy_path):
        """Test that scripts have test action."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                assert re.search(r'["\']test["\']', content, re.IGNORECASE), \
                    f"Script should have 'test' action: {path}"
    
    def test_deploy_has_status_action(self, deploy_simple_path, deploy_path):
        """Test that scripts have status action."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                assert re.search(r'["\']status["\']', content, re.IGNORECASE), \
                    f"Script should have 'status' action: {path}"
    
    def test_scripts_use_invoke_webrequest(self, deploy_simple_path, deploy_path):
        """Test that scripts use Invoke-WebRequest for health checks."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                # Should test endpoints with Invoke-WebRequest
                if 'test' in content.lower():
                    assert 'Invoke-WebRequest' in content, \
                        f"Script should use Invoke-WebRequest for testing: {path}"
    
    def test_scripts_reference_localhost(self, deploy_simple_path, deploy_path):
        """Test that scripts reference localhost URLs."""
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8')
                assert 'localhost' in content.lower() or '127.0.0.1' in content, \
                    f"Script should reference localhost: {path}"
    
    def test_deploy_has_functions(self, deploy_path):
        """Test that deploy.ps1 has function definitions."""
        if not deploy_path.exists():
            pytest.skip("deploy.ps1 not found")
        
        content = deploy_path.read_text(encoding='utf-8')
        # Should have functions for different actions
        assert 'function ' in content.lower(), \
            "deploy.ps1 should define functions"
    
    def test_scripts_no_hardcoded_credentials(self, deploy_simple_path, deploy_path):
        """Test that scripts don't contain hardcoded credentials."""
        sensitive_patterns = [
            'password', 'api_key', 'secret', 'token', 'credential'
        ]
        
        for path in [deploy_simple_path, deploy_path]:
            if path.exists():
                content = path.read_text(encoding='utf-8').lower()
                for pattern in sensitive_patterns:
                    # Should not have actual credentials
                    assert not re.search(rf'{pattern}\s*=\s*["\'][^"\']+["\']', 
                                        content), \
                        f"Script should not have hardcoded {pattern}: {path}"


class TestDeploymentDocumentation:
    """Test deployment documentation."""
    
    @pytest.fixture
    def deployment_md_path(self):
        """Return path to DEPLOYMENT.md."""
        return Path("unified-ai-platform/DEPLOYMENT.md")
    
    def test_deployment_doc_exists(self, deployment_md_path):
        """Test that DEPLOYMENT.md exists."""
        assert deployment_md_path.exists(), \
            "DEPLOYMENT.md not found"
    
    def test_deployment_doc_not_empty(self, deployment_md_path):
        """Test that DEPLOYMENT.md is not empty."""
        if not deployment_md_path.exists():
            pytest.skip("DEPLOYMENT.md not found")
        
        content = deployment_md_path.read_text(encoding='utf-8')
        assert len(content) > 200, \
            "DEPLOYMENT.md seems too short"
    
    def test_deployment_doc_has_structure(self, deployment_md_path):
        """Test that DEPLOYMENT.md has proper markdown structure."""
        if not deployment_md_path.exists():
            pytest.skip("DEPLOYMENT.md not found")
        
        content = deployment_md_path.read_text(encoding='utf-8')
        assert '#' in content, \
            "DEPLOYMENT.md should have markdown headings"
    
    def test_deployment_doc_mentions_scripts(self, deployment_md_path):
        """Test that DEPLOYMENT.md mentions deployment scripts."""
        if not deployment_md_path.exists():
            pytest.skip("DEPLOYMENT.md not found")
        
        content = deployment_md_path.read_text(encoding='utf-8')
        assert 'deploy' in content.lower(), \
            "DEPLOYMENT.md should mention deployment"
        assert '.ps1' in content or 'powershell' in content.lower(), \
            "DEPLOYMENT.md should mention PowerShell scripts"


class TestDeploymentREADME:
    """Test unified-ai-platform README."""
    
    @pytest.fixture
    def readme_path(self):
        """Return path to unified-ai-platform README."""
        return Path("unified-ai-platform/README.md")
    
    def test_unified_readme_exists(self, readme_path):
        """Test that unified-ai-platform README exists."""
        assert readme_path.exists(), \
            "unified-ai-platform README.md not found"
    
    def test_unified_readme_not_empty(self, readme_path):
        """Test that README is not empty."""
        if not readme_path.exists():
            pytest.skip("README.md not found")
        
        content = readme_path.read_text(encoding='utf-8')
        assert len(content) > 200, \
            "README.md seems too short"
    
    def test_unified_readme_describes_platform(self, readme_path):
        """Test that README describes the platform."""
        if not readme_path.exists():
            pytest.skip("README.md not found")
        
        content = readme_path.read_text(encoding='utf-8')
        assert 'unified' in content.lower() or 'platform' in content.lower(), \
            "README should describe the unified platform"
    
    def test_unified_readme_has_installation_instructions(self, readme_path):
        """Test that README has installation instructions."""
        if not readme_path.exists():
            pytest.skip("README.md not found")
        
        content = readme_path.read_text(encoding='utf-8')
        installation_keywords = ['install', 'setup', 'getting started', 'quick start']
        has_installation = any(keyword in content.lower() 
                              for keyword in installation_keywords)
        assert has_installation, \
            "README should have installation instructions"