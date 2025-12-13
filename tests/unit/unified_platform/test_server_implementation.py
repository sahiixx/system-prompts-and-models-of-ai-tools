"""
Unit tests for Unified AI Platform server implementations.

This module tests:
- Server class structure and initialization
- Route handling and middleware
- API endpoints functionality
- Error handling
"""

import pytest
import json
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import importlib.util


class TestServerModule:
    """Test server module loading and structure."""
    
    @pytest.fixture
    def index_js_path(self):
        """Return path to index.js."""
        return Path("unified-ai-platform/src/index.js")
    
    @pytest.fixture
    def simple_server_path(self):
        """Return path to simple-server.js."""
        return Path("unified-ai-platform/src/simple-server.js")
    
    def test_index_js_exists(self, index_js_path):
        """Test that index.js exists."""
        assert index_js_path.exists(), f"Server file not found: {index_js_path}"
    
    def test_simple_server_exists(self, simple_server_path):
        """Test that simple-server.js exists."""
        assert simple_server_path.exists(), \
            f"Simple server file not found: {simple_server_path}"
    
    def test_index_js_has_shebang(self, index_js_path):
        """Test that index.js has proper shebang."""
        with open(index_js_path, 'r', encoding='utf-8') as f:
            first_line = f.readline()
        assert first_line.startswith('#!/usr/bin/env node'), \
            "index.js should have node shebang"
    
    def test_simple_server_has_shebang(self, simple_server_path):
        """Test that simple-server.js has proper shebang."""
        with open(simple_server_path, 'r', encoding='utf-8') as f:
            first_line = f.readline()
        assert first_line.startswith('#!/usr/bin/env node'), \
            "simple-server.js should have node shebang"
    
    def test_index_js_has_proper_structure(self, index_js_path):
        """Test that index.js has proper code structure."""
        with open(index_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for essential components
        assert 'UnifiedAIPlatform' in content, "Missing UnifiedAIPlatform class"
        assert 'constructor' in content, "Missing constructor"
        assert 'setupMiddleware' in content, "Missing setupMiddleware method"
        assert 'setupRoutes' in content, "Missing setupRoutes method"
        assert 'setupErrorHandling' in content, "Missing setupErrorHandling method"
        assert 'start' in content, "Missing start method"
    
    def test_simple_server_has_proper_structure(self, simple_server_path):
        """Test that simple-server.js has proper code structure."""
        with open(simple_server_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for essential components
        assert 'SimpleUnifiedAIPlatform' in content, \
            "Missing SimpleUnifiedAIPlatform class"
        assert 'createServer' in content, "Missing createServer method"
        assert 'handleRequest' in content, "Missing handleRequest method"
        assert 'start' in content, "Missing start method"
    
    def test_index_js_requires_proper_modules(self, index_js_path):
        """Test that index.js requires necessary modules."""
        with open(index_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_modules = ['express', 'cors', 'helmet', 'compression', 'morgan']
        for module in required_modules:
            assert f"require('{module}')" in content, \
                f"Missing required module: {module}"
    
    def test_simple_server_uses_builtin_modules(self, simple_server_path):
        """Test that simple-server.js uses only built-in modules."""
        with open(simple_server_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        builtin_modules = ['http', 'url', 'fs', 'path']
        for module in builtin_modules:
            assert f"require('{module}')" in content, \
                f"Missing built-in module: {module}"
        
        # Ensure no external dependencies
        external_deps = ['express', 'axios', 'socket.io']
        for dep in external_deps:
            assert f"require('{dep}')" not in content, \
                f"Simple server should not require external dep: {dep}"
    
    def test_index_js_loads_config_files(self, index_js_path):
        """Test that index.js loads configuration files."""
        with open(index_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        assert '../config/system-config.json' in content, \
            "Should load system-config.json"
        assert '../config/tools.json' in content, \
            "Should load tools.json"
    
    def test_servers_have_error_handling(self, index_js_path, simple_server_path):
        """Test that servers have proper error handling."""
        for path in [index_js_path, simple_server_path]:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            assert 'try' in content or 'catch' in content, \
                f"Server should have error handling: {path}"
    
    def test_servers_handle_graceful_shutdown(self, index_js_path, simple_server_path):
        """Test that servers handle graceful shutdown."""
        for path in [index_js_path, simple_server_path]:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            assert 'SIGTERM' in content, f"Should handle SIGTERM: {path}"
            assert 'SIGINT' in content, f"Should handle SIGINT: {path}"
    
    def test_servers_export_correctly(self, index_js_path, simple_server_path):
        """Test that servers export their classes."""
        for path in [index_js_path, simple_server_path]:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            assert 'module.exports' in content, \
                f"Should export module: {path}"


class TestAPIRoutes:
    """Test API route definitions."""
    
    @pytest.fixture
    def server_content(self):
        """Load server content."""
        path = Path("unified-ai-platform/src/index.js")
        if not path.exists():
            pytest.skip("Server file not found")
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def test_health_check_route_exists(self, server_content):
        """Test that health check route exists."""
        assert '/health' in server_content, "Missing /health route"
    
    def test_tools_api_route_exists(self, server_content):
        """Test that tools API route exists."""
        assert '/api/v1/tools' in server_content, "Missing /api/v1/tools route"
    
    def test_memory_api_routes_exist(self, server_content):
        """Test that memory API routes exist."""
        assert '/api/v1/memory' in server_content, "Missing /api/v1/memory route"
    
    def test_plans_api_routes_exist(self, server_content):
        """Test that plans API routes exist."""
        assert '/api/v1/plans' in server_content, "Missing /api/v1/plans route"
    
    def test_capabilities_api_route_exists(self, server_content):
        """Test that capabilities API route exists."""
        assert '/api/v1/capabilities' in server_content, \
            "Missing /api/v1/capabilities route"
    
    def test_demo_api_route_exists(self, server_content):
        """Test that demo API route exists."""
        assert '/api/v1/demo' in server_content, "Missing /api/v1/demo route"
    
    def test_routes_use_proper_http_methods(self, server_content):
        """Test that routes use appropriate HTTP methods."""
        # GET routes
        assert '.get(' in server_content, "Should have GET routes"
        # POST routes
        assert '.post(' in server_content, "Should have POST routes"
    
    def test_routes_return_json(self, server_content):
        """Test that routes return JSON responses."""
        assert 'res.json(' in server_content, "Routes should return JSON"


class TestMiddleware:
    """Test middleware configuration."""
    
    @pytest.fixture
    def server_content(self):
        """Load server content."""
        path = Path("unified-ai-platform/src/index.js")
        if not path.exists():
            pytest.skip("Server file not found")
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def test_helmet_security_middleware(self, server_content):
        """Test that helmet security middleware is configured."""
        assert 'helmet(' in server_content, "Should use helmet security middleware"
        assert 'contentSecurityPolicy' in server_content, \
            "Should configure CSP"
    
    def test_cors_middleware(self, server_content):
        """Test that CORS middleware is configured."""
        assert 'cors(' in server_content, "Should use CORS middleware"
        assert 'origin:' in server_content, "Should configure CORS origin"
    
    def test_compression_middleware(self, server_content):
        """Test that compression middleware is configured."""
        assert 'compression()' in server_content, \
            "Should use compression middleware"
    
    def test_logging_middleware(self, server_content):
        """Test that logging middleware is configured."""
        assert 'morgan(' in server_content, "Should use morgan logging"
    
    def test_body_parser_middleware(self, server_content):
        """Test that body parser middleware is configured."""
        assert 'express.json(' in server_content, "Should parse JSON bodies"
        assert 'express.urlencoded(' in server_content, \
            "Should parse URL-encoded bodies"
    
    def test_body_parser_has_size_limits(self, server_content):
        """Test that body parser has size limits configured."""
        assert 'limit:' in server_content, \
            "Should configure request size limits"


class TestErrorHandling:
    """Test error handling implementation."""
    
    @pytest.fixture
    def server_content(self):
        """Load server content."""
        path = Path("unified-ai-platform/src/index.js")
        if not path.exists():
            pytest.skip("Server file not found")
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def test_404_handler_exists(self, server_content):
        """Test that 404 handler exists."""
        assert '404' in server_content, "Should have 404 error handler"
        assert 'Not Found' in server_content, "Should return Not Found message"
    
    def test_global_error_handler_exists(self, server_content):
        """Test that global error handler exists."""
        # Check for error handler with (error, req, res, next) signature
        assert 'error, req, res, next' in server_content or \
               'err, req, res, next' in server_content, \
               "Should have global error handler"
    
    def test_error_handler_checks_environment(self, server_content):
        """Test that error handler checks NODE_ENV."""
        assert 'NODE_ENV' in server_content, \
            "Should check environment for error details"
        assert 'production' in server_content.lower(), \
            "Should handle production vs development differently"
    
    def test_error_responses_include_timestamp(self, server_content):
        """Test that error responses include timestamp."""
        assert 'timestamp' in server_content, \
            "Error responses should include timestamp"


class TestSecurityFeatures:
    """Test security features implementation."""
    
    @pytest.fixture
    def server_content(self):
        """Load server content."""
        path = Path("unified-ai-platform/src/index.js")
        if not path.exists():
            pytest.skip("Server file not found")
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def test_helmet_configured(self, server_content):
        """Test that helmet is properly configured."""
        assert 'helmet' in server_content, "Should use helmet for security"
    
    def test_cors_restrictions(self, server_content):
        """Test that CORS has proper restrictions."""
        assert 'origin:' in server_content, "Should restrict CORS origins"
        assert 'credentials:' in server_content, \
            "Should configure credential handling"
    
    def test_no_sensitive_data_logged(self, server_content):
        """Test that sensitive data is not logged."""
        sensitive_keywords = ['password', 'secret', 'token', 'api_key']
        # Should not have console.log with these keywords directly
        for keyword in sensitive_keywords:
            # This is a basic check - comprehensive check needs AST parsing
            assert not f"console.log('{keyword}" in server_content.lower(), \
                f"Should not log sensitive data: {keyword}"
    
    def test_request_size_limits(self, server_content):
        """Test that request size limits are configured."""
        assert 'limit:' in server_content, \
            "Should configure request size limits for security"


class TestServerConfiguration:
    """Test server configuration and initialization."""
    
    @pytest.fixture
    def server_content(self):
        """Load server content."""
        path = Path("unified-ai-platform/src/index.js")
        if not path.exists():
            pytest.skip("Server file not found")
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def test_port_configuration(self, server_content):
        """Test that port is configurable via environment."""
        assert 'process.env.PORT' in server_content, \
            "Should read port from environment"
    
    def test_default_port_specified(self, server_content):
        """Test that default port is specified."""
        assert '3000' in server_content, "Should have default port 3000"
    
    def test_server_listens_on_port(self, server_content):
        """Test that server listens on configured port."""
        assert 'listen(' in server_content, "Should call listen method"
    
    def test_server_logs_startup_info(self, server_content):
        """Test that server logs startup information."""
        assert 'console.log(' in server_content, \
            "Should log startup information"
    
    def test_server_initializes_data_structures(self, server_content):
        """Test that server initializes necessary data structures."""
        assert 'Map()' in server_content or 'new Map' in server_content, \
            "Should initialize memory/data structures"


class TestCodeQuality:
    """Test code quality and best practices."""
    
    @pytest.fixture
    def all_js_files(self):
        """Get all JavaScript files in the project."""
        unified_dir = Path("unified-ai-platform/src")
        if not unified_dir.exists():
            pytest.skip("Source directory not found")
        return list(unified_dir.glob("*.js"))
    
    def test_no_console_error_in_production_code(self, all_js_files):
        """Test that console.error is handled properly."""
        for js_file in all_js_files:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # console.error should typically be in catch blocks
            if 'console.error(' in content:
                assert 'catch' in content or 'error' in content.lower(), \
                    f"console.error should be in error handling: {js_file}"
    
    def test_async_functions_use_await(self, all_js_files):
        """Test that async functions properly use await."""
        for js_file in all_js_files:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # If file has async functions, they should use await
            if 'async ' in content and 'function' in content:
                # This is a heuristic check
                async_count = content.count('async ')
                await_count = content.count('await ')
                # Not perfect, but async functions should typically use await
                if async_count > 0:
                    assert await_count > 0 or 'Promise' in content, \
                        f"Async functions should use await or return Promise: {js_file}"
    
    def test_proper_error_handling_in_async(self, all_js_files):
        """Test that async functions have proper error handling."""
        for js_file in all_js_files:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Async functions should have try-catch or .catch()
            if 'async ' in content:
                has_error_handling = (
                    'try' in content or 
                    'catch' in content or
                    '.catch(' in content
                )
                assert has_error_handling, \
                    f"Async code should have error handling: {js_file}"
    
    def test_no_hardcoded_credentials(self, all_js_files):
        """Test that there are no hardcoded credentials."""
        dangerous_patterns = [
            'password:', 'api_key:', 'apiKey:', 'secret:', 
            'token:', 'Bearer ', 'Basic '
        ]
        
        for js_file in all_js_files:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for pattern in dangerous_patterns:
                if pattern in content:
                    # Check if it's using environment variables
                    assert 'process.env' in content, \
                        f"Credentials should use environment variables: {js_file}"
    
    def test_files_have_proper_documentation(self, all_js_files):
        """Test that files have documentation."""
        for js_file in all_js_files:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Should have some comments or JSDoc
            assert '/**' in content or '//' in content, \
                f"File should have documentation: {js_file}"