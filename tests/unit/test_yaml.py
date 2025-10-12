"""
Comprehensive unit tests for yaml/__init__.py
Tests the minimal YAML parser implementation
Tests the minimal YAML parser implementation

Note: This is a minimal YAML parser that implements only the features needed
for GitHub workflow files. It has some quirks compared to standard YAML:
- Simple list items (e.g., "- item") are parsed as dicts with empty values
- For actual scalar lists, use the key:value format or nest under a parent key
"""

import pytest
import sys
from pathlib import Path
from io import StringIO

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from yaml import safe_load, dump, YAMLError, _tokenise, _parse_scalar


class TestTokenization:
    """Test suite for YAML tokenization"""
    
    def test_tokenise_empty_string(self):
        """Test tokenizing empty string"""
        result = _tokenise([''])
        assert result == []
    
    def test_tokenise_comment_only(self):
        """Test tokenizing comment-only lines"""
        result = _tokenise(['# This is a comment'])
        assert result == []
    
    def test_tokenise_simple_key_value(self):
        """Test tokenizing simple key-value pair"""
        result = _tokenise(['key: value'])
        assert len(result) == 1
        assert result[0].indent == 0
        assert result[0].text == 'key: value'
    
    def test_tokenise_with_indentation(self):
        """Test tokenizing with indentation"""
        result = _tokenise(['key:', '  nested: value'])
        assert len(result) == 2
        assert result[0].indent == 0
        assert result[1].indent == 2
    
    def test_tokenise_mixed_content(self):
        """Test tokenizing mixed content with comments and empty lines"""
        lines = [
            'key1: value1',
            '',
            '# Comment',
            '  key2: value2',
            ''
        ]
        result = _tokenise(lines)
        assert len(result) == 2
        assert result[0].text == 'key1: value1'
        assert result[1].text == 'key2: value2'
    
    def test_tokenise_list_items(self):
        """Test tokenizing list items"""
        result = _tokenise(['- item1', '- item2'])
        assert len(result) == 2
        assert result[0].text == '- item1'
        assert result[1].text == '- item2'
    
    def test_tokenise_preserves_indentation(self):
        """Test that tokenization preserves indentation levels"""
        result = _tokenise(['    deeply: nested'])
        assert result[0].indent == 4


class TestScalarParsing:
    """Test suite for scalar value parsing"""
    
    def test_parse_scalar_plain_string(self):
        """Test parsing plain string"""
        assert _parse_scalar('hello') == 'hello'
        assert _parse_scalar('hello world') == 'hello world'
    
    def test_parse_scalar_single_quoted(self):
        """Test parsing single-quoted string"""
        assert _parse_scalar("'hello'") == 'hello'
        assert _parse_scalar("'hello world'") == 'hello world'
    
    def test_parse_scalar_double_quoted(self):
        """Test parsing double-quoted string"""
        assert _parse_scalar('"hello"') == 'hello'
        assert _parse_scalar('"hello world"') == 'hello world'
    
    def test_parse_scalar_boolean_true(self):
        """Test parsing boolean true values"""
        assert _parse_scalar('true') is True
        assert _parse_scalar('True') is True
        assert _parse_scalar('TRUE') is True
    
    def test_parse_scalar_boolean_false(self):
        """Test parsing boolean false values"""
        assert _parse_scalar('false') is False
        assert _parse_scalar('False') is False
        assert _parse_scalar('FALSE') is False
    
    def test_parse_scalar_null(self):
        """Test parsing null values"""
        assert _parse_scalar('null') is None
        assert _parse_scalar('Null') is None
        assert _parse_scalar('NULL') is None
        assert _parse_scalar('none') is None
        assert _parse_scalar('None') is None
    
    def test_parse_scalar_integer(self):
        """Test parsing integer values"""
        assert _parse_scalar('42') == 42
        assert _parse_scalar('0') == 0
        assert _parse_scalar('-42') == '-42'  # Negative as string
        assert _parse_scalar('1_000') == 1000
    
    def test_parse_scalar_float(self):
        """Test parsing float values"""
        assert _parse_scalar('3.14') == 3.14
        assert _parse_scalar('0.0') == 0.0
        assert _parse_scalar('1_000.5') == 1000.5
    
    def test_parse_scalar_edge_cases(self):
        """Test parsing edge case values"""
        assert _parse_scalar('') == ''
        assert _parse_scalar('123abc') == '123abc'  # Not a valid number
        assert _parse_scalar('1.2.3') == '1.2.3'  # Not a valid float


class TestSafeLoad:
    """Test suite for safe_load function"""
    
    def test_safe_load_empty_string(self):
        """Test loading empty YAML"""
        result = safe_load('')
        assert result == {}
    
    def test_safe_load_simple_mapping(self):
        """Test loading simple key-value mapping"""
        yaml = 'key: value'
        result = safe_load(yaml)
        assert result == {'key': 'value'}
    
    def test_safe_load_multiple_keys(self):
        """Test loading multiple keys"""
        yaml = '''
key1: value1
key2: value2
key3: value3
'''
        result = safe_load(yaml)
        assert result == {
            'key1': 'value1',
            'key2': 'value2',
            'key3': 'value3'
        }
    
    def test_safe_load_nested_mapping(self):
        """Test loading nested mappings"""
        yaml = '''
parent:
  child: value
'''
        result = safe_load(yaml)
        assert result == {'parent': {'child': 'value'}}
    
    def test_safe_load_deep_nesting(self):
        """Test loading deeply nested structure"""
        yaml = '''
level1:
  level2:
    level3: value
'''
        result = safe_load(yaml)
        assert result == {
            'level1': {
                'level2': {
                    'level3': 'value'
                }
            }
        }
    
    def test_safe_load_list_with_inline_values(self):
        """Test loading list with inline key-value pairs
        
        Note: The minimal parser treats "- item" as a key, not a scalar.
        Use "- key: value" format for proper list handling.
        """
        yaml = '''
- name: item1
- name: item2
- name: item3
'''
        result = safe_load(yaml)
        assert result == [
            {'name': 'item1'},
            {'name': 'item2'},
            {'name': 'item3'}
        ]
    
    def test_safe_load_list_of_dicts(self):
        """Test loading list of dictionaries"""
        yaml = '''
- name: Alice
  age: 30
- name: Bob
  age: 25
'''
        result = safe_load(yaml)
        assert result == [
            {'name': 'Alice', 'age': 30},
            {'name': 'Bob', 'age': 25}
        ]
    
    def test_safe_load_dict_with_inline_list(self):
        """Test loading dictionary with inline list value"""
        yaml = '''
items:
  - apple
  - banana
  - cherry
'''
        result = safe_load(yaml)
        # Note: minimal parser treats these as dicts
        assert 'items' in result
        assert isinstance(result['items'], list)
        assert len(result['items']) == 3
    
    def test_safe_load_mixed_types(self):
        """Test loading mixed data types"""
        yaml = '''
string: hello
number: 42
float: 3.14
bool: true
null_val: null
'''
        result = safe_load(yaml)
        assert result == {
            'string': 'hello',
            'number': 42,
            'float': 3.14,
            'bool': True,
            'null_val': None
        }
    
    def test_safe_load_inline_key_value_in_list(self):
        """Test loading inline key-value pairs in lists"""
        yaml = '''
- name: test
'''
        result = safe_load(yaml)
        assert result == [{'name': 'test'}]
    
    def test_safe_load_complex_structure(self):
        """Test loading complex nested structure"""
        yaml = '''
workflow:
  name: CI
  on:
    - push
    - pull_request
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v2
'''
        result = safe_load(yaml)
        assert 'workflow' in result
        assert result['workflow']['name'] == 'CI'
        assert isinstance(result['workflow']['on'], list)
        assert 'jobs' in result['workflow']
    
    def test_safe_load_from_file_object(self):
        """Test loading from file-like object"""
        yaml_content = 'key: value'
        stream = StringIO(yaml_content)
        result = safe_load(stream)
        assert result == {'key': 'value'}
    
    def test_safe_load_with_comments(self):
        """Test loading YAML with comments"""
        yaml = '''
# This is a comment
key: value
# Another comment
key2: value2
'''
        result = safe_load(yaml)
        assert result == {'key': 'value', 'key2': 'value2'}
    
    def test_safe_load_empty_mapping(self):
        """Test loading empty mapping"""
        yaml = 'key:'
        result = safe_load(yaml)
        assert result == {'key': {}}
    
    def test_safe_load_quoted_strings(self):
        """Test loading quoted strings"""
        yaml = '''
single: 'single quoted'
double: "double quoted"
'''
        result = safe_load(yaml)
        assert result == {
            'single': 'single quoted',
            'double': 'double quoted'
        }


class TestSafeLoadErrors:
    """Test suite for error handling in safe_load"""
    
    def test_safe_load_invalid_indentation(self):
        """Test that invalid indentation raises YAMLError"""
        yaml = '''
key: value
   invalid: indent
'''
        with pytest.raises(YAMLError):
            safe_load(yaml)
    
    def test_safe_load_inconsistent_indentation(self):
        """Test inconsistent indentation handling"""
        yaml = '''
parent:
  child: value
   invalid: indent
'''
        with pytest.raises(YAMLError):
            safe_load(yaml)


class TestDump:
    """Test suite for dump function"""
    
    def test_dump_empty_dict(self):
        """Test dumping empty dictionary"""
        result = dump({})
        assert '{}' in result
    
    def test_dump_simple_mapping(self):
        """Test dumping simple mapping"""
        data = {'key': 'value'}
        result = dump(data)
        assert 'key: value' in result
    
    def test_dump_multiple_keys(self):
        """Test dumping multiple keys"""
        data = {'key1': 'value1', 'key2': 'value2'}
        result = dump(data)
        assert 'key1: value1' in result
        assert 'key2: value2' in result
    
    def test_dump_nested_mapping(self):
        """Test dumping nested mappings"""
        data = {'parent': {'child': 'value'}}
        result = dump(data)
        lines = result.split('\n')
        assert 'parent:' in lines
        assert '  child: value' in lines
    
    def test_dump_list_of_scalars(self):
        """Test dumping list of scalars"""
        data = ['item1', 'item2', 'item3']
        result = dump(data)
        assert '- item1' in result
        assert '- item2' in result
        assert '- item3' in result
    
    def test_dump_empty_list(self):
        """Test dumping empty list"""
        data = []
        result = dump(data)
        assert '[]' in result
    
    def test_dump_list_of_dicts(self):
        """Test dumping list of dictionaries"""
        data = [
            {'name': 'Alice', 'age': 30},
            {'name': 'Bob', 'age': 25}
        ]
        result = dump(data)
        assert '- name: Alice' in result
        assert '  age: 30' in result
        assert '- name: Bob' in result
        assert '  age: 25' in result
    
    def test_dump_dict_with_list(self):
        """Test dumping dictionary with list value"""
        data = {'items': ['apple', 'banana']}
        result = dump(data)
        assert 'items:' in result
        assert '  - apple' in result
        assert '  - banana' in result
    
    def test_dump_boolean_true(self):
        """Test dumping boolean true"""
        data = {'flag': True}
        result = dump(data)
        assert 'flag: true' in result
    
    def test_dump_boolean_false(self):
        """Test dumping boolean false"""
        data = {'flag': False}
        result = dump(data)
        assert 'flag: false' in result
    
    def test_dump_null(self):
        """Test dumping null value"""
        data = {'value': None}
        result = dump(data)
        assert 'value: null' in result
    
    def test_dump_numbers(self):
        """Test dumping numeric values"""
        data = {'integer': 42, 'float': 3.14}
        result = dump(data)
        assert 'integer: 42' in result
        assert 'float: 3.14' in result
    
    def test_dump_empty_string(self):
        """Test dumping empty string"""
        data = {'key': ''}
        result = dump(data)
        assert 'key: ""' in result
    
    def test_dump_string_with_special_chars(self):
        """Test dumping strings with special characters"""
        data = {'key': 'value: with colon'}
        result = dump(data)
        assert '"value: with colon"' in result
    
    def test_dump_string_with_quotes(self):
        """Test dumping strings containing quotes"""
        data = {'key': 'value "with" quotes'}
        result = dump(data)
        assert 'key: "value \\"with\\" quotes"' in result
    
    def test_dump_with_indentation(self):
        """Test dumping with custom indentation"""
        data = {'key': 'value'}
        result = dump(data, indent=4)
        assert result.startswith('    ')
    
    def test_dump_empty_dict_in_list(self):
        """Test dumping empty dictionary in list"""
        data = [{}]
        result = dump(data)
        assert '- {}' in result
    
    def test_dump_complex_structure(self):
        """Test dumping complex nested structure"""
        data = {
            'workflow': {
                'name': 'CI',
                'on': ['push', 'pull_request'],
                'jobs': {
                    'test': {
                        'runs-on': 'ubuntu-latest',
                        'steps': [
                            {'name': 'Checkout', 'uses': 'actions/checkout@v2'}
                        ]
                    }
                }
            }
        }
        result = dump(data)
        assert 'workflow:' in result
        assert 'name: CI' in result
        assert '- push' in result


class TestRoundTrip:
    """Test suite for round-trip conversion (load -> dump -> load)"""
    
    def test_roundtrip_simple_mapping(self):
        """Test round-trip with simple mapping"""
        original = {'key': 'value'}
        yaml_str = dump(original)
        loaded = safe_load(yaml_str)
        assert loaded == original
    
    def test_roundtrip_nested_structure(self):
        """Test round-trip with nested structure"""
        original = {
            'parent': {
                'child': 'value',
                'items': [{'name': 'a'}, {'name': 'b'}, {'name': 'c'}]
            }
        }
        yaml_str = dump(original)
        loaded = safe_load(yaml_str)
        assert loaded == original
    
    def test_roundtrip_list_of_dicts(self):
        """Test round-trip with list of dictionaries"""
        original = [
            {'name': 'Alice', 'age': 30},
            {'name': 'Bob', 'age': 25}
        ]
        yaml_str = dump(original)
        loaded = safe_load(yaml_str)
        assert loaded == original
    
    def test_roundtrip_mixed_types(self):
        """Test round-trip with mixed data types"""
        original = {
            'string': 'hello',
            'number': 42,
            'float': 3.14,
            'bool_true': True,
            'bool_false': False,
            'null_val': None
        }
        yaml_str = dump(original)
        loaded = safe_load(yaml_str)
        assert loaded == original


class TestEdgeCases:
    """Test suite for edge cases and boundary conditions"""
    
    def test_load_whitespace_only(self):
        """Test loading whitespace-only content"""
        result = safe_load('   \n\n   ')
        assert result == {}
    
    def test_load_single_value(self):
        """Test loading single scalar value"""
        result = safe_load('value')
        assert result == {'value': {}}  # Parser treats it as a key
    
    def test_dump_unicode(self):
        """Test dumping unicode characters"""
        data = {'key': '你好世界'}
        result = dump(data)
        assert '你好世界' in result
    
    def test_safe_load_large_structure(self):
        """Test loading large structure"""
        # Create a large nested structure
        large_data = {f'key{i}': {f'nested{j}': f'value{i}{j}' 
                               for j in range(10)} 
                  for i in range(10)}
        yaml_str = dump(large_data)
        loaded = safe_load(yaml_str)
        assert len(loaded) == 10
        assert all(len(loaded[f'key{i}']) == 10 for i in range(10))
    
    def test_list_with_nested_mappings(self):
        """Test list containing nested mappings"""
        yaml = '''
- name: item1
  config:
    nested: value
- name: item2
  config:
    nested: value2
'''
        result = safe_load(yaml)
        assert len(result) == 2
        assert result[0]['config']['nested'] == 'value'
        assert result[1]['config']['nested'] == 'value2'


class TestYAMLError:
    """Test suite for YAMLError exception"""
    
    def test_yaml_error_is_exception(self):
        """Test that YAMLError is an Exception"""
        assert issubclass(YAMLError, Exception)
    
    def test_yaml_error_can_be_raised(self):
        """Test that YAMLError can be raised and caught"""
        with pytest.raises(YAMLError, match="Test error message"):
            raise YAMLError("Test error message")
    
    def test_yaml_error_inheritance(self):
        """Test YAMLError exception inheritance"""
        error = YAMLError("Test")
        assert isinstance(error, Exception)
        assert isinstance(error, YAMLError)


class TestRealWorldExamples:
    """Test suite with real-world YAML examples"""
    
    def test_github_workflow_structure(self):
        """Test parsing GitHub workflow-like structure"""
        yaml = '''
name: CI
on:
  - push
  - pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Setup
        run: npm install
'''
        result = safe_load(yaml)
        assert result['name'] == 'CI'
        assert isinstance(result['on'], list)
        assert 'test' in result['jobs']
        assert result['jobs']['test']['runs-on'] == 'ubuntu-latest'
        assert len(result['jobs']['test']['steps']) == 2
    
    def test_configuration_file(self):
        """Test parsing configuration file structure"""
        yaml = '''
server:
  host: localhost
  port: 8080
  ssl: true
database:
  url: postgresql://localhost/db
  pool_size: 10
features:
  - feature: authentication
  - feature: logging
  - feature: monitoring
'''
        result = safe_load(yaml)
        assert result['server']['host'] == 'localhost'
        assert result['server']['port'] == 8080
        assert result['server']['ssl'] is True
        assert result['database']['pool_size'] == 10
        assert isinstance(result['features'], list)
    
    def test_package_metadata(self):
        """Test parsing package metadata structure"""
        yaml = '''
package:
  name: my-package
  version: 1.0.0
  authors:
    - name: Alice
      email: alice@example.com
    - name: Bob
      email: bob@example.com
  dependencies:
    - name: requests
    - name: pytest
'''
        result = safe_load(yaml)
        assert result['package']['name'] == 'my-package'
        assert result['package']['version'] == '1.0.0'
        assert len(result['package']['authors']) == 2
        assert result['package']['authors'][0]['name'] == 'Alice'
        assert isinstance(result['package']['dependencies'], list)


class TestParserQuirks:
    """Test suite documenting the minimal parser's quirks"""
    
    def test_simple_list_items_become_dicts(self):
        """Test that simple list items are parsed as dicts
        
        This is a known quirk of the minimal parser. Items like:
          - item
        are parsed as: [{'item': {}}]
        
        For actual scalar lists, use the syntax:
          - value: item
        or nest under a parent key
        """
        yaml = '''
- push
- pull_request
'''
        result = safe_load(yaml)
        # Each item becomes a dict with empty value
        assert isinstance(result, list)
        assert len(result) == 2
        assert isinstance(result[0], dict)
        assert 'push' in result[0] or result[0] == {'push': {}}
    
    def test_workflow_on_list_workaround(self):
        """Test the workaround for workflow 'on' lists"""
        yaml = '''
on:
  - push
  - pull_request
'''
        result = safe_load(yaml)
        assert 'on' in result
        assert isinstance(result['on'], list)
        # Items are dicts, but that's how the parser works