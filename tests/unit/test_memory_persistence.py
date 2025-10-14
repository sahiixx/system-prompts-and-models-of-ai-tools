"""
Unit Tests for agent/core/memory.py persistence methods
Tests to_json() and from_json() serialization
"""

import unittest
import sys
import os
import json

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.memory import Memory


class TestMemoryPersistence(unittest.TestCase):
    """Test suite for Memory persistence methods"""
    
    def test_to_json_empty_memory(self):
        """Test serializing empty memory"""
        memory = Memory()
        result = memory.to_json()
        
        data = json.loads(result)
        self.assertEqual(data, [])
    
    def test_to_json_with_messages(self):
        """Test serializing memory with messages"""
        memory = Memory()
        memory.add("user", "Hello")
        memory.add("assistant", "Hi there")
        
        result = memory.to_json()
        data = json.loads(result)
        
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["role"], "user")
        self.assertEqual(data[0]["content"], "Hello")
        self.assertEqual(data[1]["role"], "assistant")
        self.assertEqual(data[1]["content"], "Hi there")
    
    def test_to_json_with_tool_name(self):
        """Test serializing messages with tool names"""
        memory = Memory()
        memory.add("tool", '{"result": "ok"}', tool_name="test_tool")
        
        result = memory.to_json()
        data = json.loads(result)
        
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["tool_name"], "test_tool")
    
    def test_from_json_empty_data(self):
        """Test deserializing empty JSON"""
        memory = Memory.from_json("[]")
        
        self.assertEqual(len(memory.messages), 0)
    
    def test_from_json_with_messages(self):
        """Test deserializing JSON with messages"""
        json_data = json.dumps([
            {"role": "user", "content": "Hello", "tool_name": None},
            {"role": "assistant", "content": "Hi", "tool_name": None}
        ])
        
        memory = Memory.from_json(json_data)
        
        self.assertEqual(len(memory.messages), 2)
        self.assertEqual(memory.messages[0].role, "user")
        self.assertEqual(memory.messages[0].content, "Hello")
        self.assertEqual(memory.messages[1].role, "assistant")
    
    def test_from_json_with_tool_names(self):
        """Test deserializing messages with tool names"""
        json_data = json.dumps([
            {"role": "tool", "content": "result", "tool_name": "my_tool"}
        ])
        
        memory = Memory.from_json(json_data)
        
        self.assertEqual(memory.messages[0].tool_name, "my_tool")
    
    def test_from_json_invalid_json(self):
        """Test that invalid JSON doesn't crash"""
        memory = Memory.from_json("invalid json")
        
        self.assertEqual(len(memory.messages), 0)
    
    def test_from_json_respects_max_messages(self):
        """Test that from_json respects max_messages limit"""
        messages = [{"role": "user", "content": f"Message {i}"} for i in range(250)]
        json_data = json.dumps(messages)
        
        memory = Memory.from_json(json_data, max_messages=200)
        
        # Should be limited to 200
        self.assertEqual(len(memory.messages), 200)
    
    def test_round_trip_serialization(self):
        """Test that serialization and deserialization work correctly"""
        original = Memory()
        original.add("system", "You are helpful")
        original.add("user", "Hello")
        original.add("assistant", "Hi there")
        original.add("tool", '{"status": "ok"}', tool_name="test_tool")
        
        json_str = original.to_json()
        restored = Memory.from_json(json_str)
        
        self.assertEqual(len(restored.messages), 4)
        self.assertEqual(restored.messages[0].role, "system")
        self.assertEqual(restored.messages[3].tool_name, "test_tool")


if __name__ == '__main__':
    unittest.main()