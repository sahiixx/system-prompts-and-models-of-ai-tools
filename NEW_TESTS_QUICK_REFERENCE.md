# New Tests Quick Reference

## Test Files Added

1. **test_anthropic_model.py** - 19 tests
2. **test_memory_persistence.py** - 12 tests  
3. **test_tool_registry_validation.py** - 11 tests
4. **test_agent_streaming.py** - 7 tests
5. **test_cli_enhancements.py** - 17 tests
6. **test_openai_streaming.py** - 7 tests

### Total: 73 new tests across 6 files

## Combined with Existing Tests

- Previous: 54 tests (4 files)
- New: 73 tests (6 files)
- **Grand Total: 127 tests (10 files)**

## Quick Test Run

```bash
# Run just the new tests
cd /home/jailuser/git
python -m unittest discover tests/unit -p "test_anthropic*.py" -v
python -m unittest discover tests/unit -p "test_memory*.py" -v
python -m unittest discover tests/unit -p "test_tool_registry*.py" -v
python -m unittest discover tests/unit -p "test_agent_streaming*.py" -v
python -m unittest discover tests/unit -p "test_cli_enhancements*.py" -v
python -m unittest discover tests/unit -p "test_openai_streaming*.py" -v
```