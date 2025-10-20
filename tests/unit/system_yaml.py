"""
Helper module to import system PyYAML instead of local minimal parser.
This must be imported before the local yaml module is loaded.
"""
import sys
import subprocess
import json

def load_yaml_file(filepath):
    """Load YAML file using system PyYAML via subprocess to avoid import conflicts"""
    result = subprocess.run(
        ['python3', '-c', f'''
import sys
sys.path = [p for p in sys.path if not p.startswith("/home/jailuser/git")]
import yaml
with open("{filepath}", "r") as f:
    data = yaml.safe_load(f)
import json
print(json.dumps(data))
'''],
        capture_output=True,
        text=True,
        cwd='/tmp'
    )
    
    if result.returncode != 0:
        raise Exception(f"Failed to load YAML: {result.stderr}")
    
    return json.loads(result.stdout)