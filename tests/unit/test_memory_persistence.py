"""
Comprehensive Unit Tests for agent/core/memory.py - Persistence Features
Tests JSON serialization and deserialization of Memory
"""

import unittest
import json
import sys
import os

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.memory import Memory


class TestMemoryPersistence(unittest.TestCase):
    """Test suite for Memory persistence (to_json/from_json)"""
    
    def test_to_json_empty_memory(self):
        """Test serializing empty memory"""
        mem = Memory()
        result = mem.to_json()
        self.assertEqual(result, '[]')
    
    def test_to_json_single_message(self):
        """Test serializing memory with one message"""
        mem = Memory()
        mem.add("user", "Hello")
        result = mem.to_json()
        data = json.loads(result)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['role'], 'user')
        self.assertEqual(data[0]['content'], 'Hello')
    
    def test_to_json_multiple_messages(self):
        """Test serializing memory with multiple messages"""
        mem = Memory()
        mem.add("user", "Hello")
        mem.add("assistant", "Hi there")
        mem.add("user", "How are you?")
        result = mem.to_json()
        data = json.loads(result)
        self.assertEqual(len(data), 3)
        self.assertEqual(data[0]['content'], 'Hello')
        self.assertEqual(data[1]['content'], 'Hi there')
        self.assertEqual(data[2]['content'], 'How are you?')
    
    def test_to_json_with_tool_name(self):
        """Test serializing tool messages with tool_name"""
        mem = Memory()
        mem.add("tool", '{"result": "success"}', tool_name="test_tool")
        result = mem.to_json()
        data = json.loads(result)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['role'], 'tool')
        self.assertEqual(data[0]['tool_name'], 'test_tool')
    
    def test_from_json_empty_string(self):
        """Test deserializing empty JSON array"""
        mem = Memory.from_json('[]')
        self.assertEqual(len(mem.as_list()), 0)
    
    def test_from_json_single_message(self):
        """Test deserializing single message"""
        json_data = '[{"role": "user", "content": "Hello"}]'
        mem = Memory.from_json(json_data)
        messages = mem.as_list()
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]['role'], 'user')
        self.assertEqual(messages[0]['content'], 'Hello')
    
    def test_from_json_multiple_messages(self):
        """Test deserializing multiple messages"""
        json_data = '[{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi"}]'
        mem = Memory.from_json(json_data)
        messages = mem.as_list()
        self.assertEqual(len(messages), 2)
    
    def test_from_json_with_tool_name(self):
        """Test deserializing tool messages"""
        json_data = '[{"role": "tool", "content": "result", "tool_name": "my_tool"}]'
        mem = Memory.from_json(json_data)
        messages = mem.as_list()
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]['tool_name'], 'my_tool')
    
    def test_from_json_respects_max_messages(self):
        """Test that from_json respects max_messages limit"""
        json_data = '[' + ','.join([f'{{"role": "user", "content": "msg{i}"}}' for i in range(10)]) + ']'
        mem = Memory.from_json(json_data, max_messages=5)
        messages = mem.as_list()
        self.assertLessEqual(len(messages), 5)
    
    def test_from_json_invalid_json(self):
        """Test that invalid JSON is handled gracefully"""
        mem = Memory.from_json('invalid json')
        self.assertEqual(len(mem.as_list()), 0)
    
    def test_from_json_malformed_structure(self):
        """Test that malformed structure is handled"""
        json_data = '[{"invalid": "structure"}]'
        mem = Memory.from_json(json_data)
        # Should create message with default role
        messages = mem.as_list()
        self.assertEqual(len(messages), 1)
    
    def test_roundtrip_serialization(self):
        """Test that serialization round-trips correctly"""
        mem1 = Memory()
        mem1.add("system", "You are helpful")
        mem1.add("user", "Hello")
        mem1.add("assistant", "Hi there!")
        mem1.add("tool", '{"result": 42}', tool_name="calculator")
        
        json_str = mem1.to_json()
        mem2 = Memory.from_json(json_str)
        
        messages1 = mem1.as_list()
        messages2 = mem2.as_list()
        
        self.assertEqual(len(messages1), len(messages2))
        for m1, m2 in zip(messages1, messages2, strict=True):
            self.assertEqual(m1['role'], m2['role'])
            self.assertEqual(m1['content'], m2['content'])
            self.assertEqual(m1.get('tool_name'), m2.get('tool_name'))


if __name__ == '__main__':
    unittest.main()