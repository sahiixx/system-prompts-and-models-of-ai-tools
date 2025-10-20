"""Configuration for Azure Pipeline tests to use system PyYAML"""
import sys

# Remove repo root from sys.path before importing yaml to avoid local yaml module
_repo_root = '/home/jailuser/git'
sys.path = [p for p in sys.path if not p.startswith(_repo_root) or 'tests' in p]

# Now import yaml (should get system PyYAML)
import yaml as _yaml

# Make it available as pyyaml
pyyaml = _yaml