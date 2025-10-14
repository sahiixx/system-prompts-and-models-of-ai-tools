"""
Comprehensive Unit Tests for Memory persistence methods
Tests to_json and from_json functionality in agent/core/memory.py
"""

import unittest
import json
import sys
import os

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.memory import Memory


class TestMemoryPersistence(unittest.TestCase):
    """Test suite for Memory persistence methods"""
    
    def test_to_json_empty_memory(self):
        """Test serializing empty memory to JSON"""
        memory = Memory()
        json_str = memory.to_json()
        data = json.loads(json_str)
        
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 0)
    
    def test_to_json_with_messages(self):
        """Test serializing memory with messages to JSON"""
        memory = Memory()
        memory.add("user", "Hello")
        memory.add("assistant", "Hi there")
        memory.add("tool", '{"result": "done"}', tool_name="test_tool")
        
        json_str = memory.to_json()
        data = json.loads(json_str)
        
        self.assertEqual(len(data), 3)
        self.assertEqual(data[0]["role"], "user")
        self.assertEqual(data[0]["content"], "Hello")
        self.assertEqual(data[1]["role"], "assistant")
        self.assertEqual(data[1]["content"], "Hi there")
        self.assertEqual(data[2]["role"], "tool")
        self.assertEqual(data[2]["tool_name"], "test_tool")
    
    def test_from_json_empty_data(self):
        """Test deserializing empty JSON"""
        json_str = "[]"
        memory = Memory.from_json(json_str)
        
        self.assertEqual(len(memory.messages), 0)
    
    def test_from_json_with_messages(self):
        """Test deserializing JSON with messages"""
        json_str = json.dumps([
            {"role": "user", "content": "Hello", "tool_name": None},
            {"role": "assistant", "content": "Hi", "tool_name": None}
        ])
        memory = Memory.from_json(json_str)
        
        self.assertEqual(len(memory.messages), 2)
        self.assertEqual(memory.messages[0].role, "user")
        self.assertEqual(memory.messages[0].content, "Hello")
        self.assertEqual(memory.messages[1].role, "assistant")
        self.assertEqual(memory.messages[1].content, "Hi")
    
    def test_from_json_with_tool_messages(self):
        """Test deserializing JSON with tool messages"""
        json_str = json.dumps([
            {"role": "user", "content": "Use tool", "tool_name": None},
            {"role": "tool", "content": '{"result": "ok"}', "tool_name": "my_tool"}
        ])
        memory = Memory.from_json(json_str)
        
        self.assertEqual(len(memory.messages), 2)
        self.assertEqual(memory.messages[1].role, "tool")
        self.assertEqual(memory.messages[1].tool_name, "my_tool")
    
    def test_from_json_invalid_json(self):
        """Test that invalid JSON is handled gracefully"""
        json_str = "not valid json"
        memory = Memory.from_json(json_str)
        
        # Should return empty memory without crashing
        self.assertEqual(len(memory.messages), 0)
    
    def test_from_json_with_max_messages(self):
        """Test that max_messages is respected"""
        json_str = json.dumps([
            {"role": "user", "content": f"Message {i}", "tool_name": None}
            for i in range(10)
        ])
        memory = Memory.from_json(json_str, max_messages=5)
        
        self.assertEqual(memory.max_messages, 5)
        # All 10 messages should be added, but only last 5 kept
        self.assertLessEqual(len(memory.messages), 5)
    
    def test_roundtrip_serialization(self):
        """Test that memory can be serialized and deserialized"""
        original = Memory(max_messages=100)
        original.add("system", "You are helpful")
        original.add("user", "Hello")
        original.add("assistant", "Hi!")
        original.add("tool", '{"data": "value"}', tool_name="test")
        
        json_str = original.to_json()
        restored = Memory.from_json(json_str, max_messages=100)
        
        self.assertEqual(len(restored.messages), len(original.messages))
        for i in range(len(original.messages)):
            self.assertEqual(restored.messages[i].role, original.messages[i].role)
            self.assertEqual(restored.messages[i].content, original.messages[i].content)
            self.assertEqual(restored.messages[i].tool_name, original.messages[i].tool_name)
    
    def test_from_json_missing_fields(self):
        """Test handling of messages with missing fields"""
        json_str = json.dumps([
            {"role": "user"},  # Missing content
            {"content": "Hello"},  # Missing role
            {}  # Missing everything
        ])
        memory = Memory.from_json(json_str)
        
        # Should handle gracefully
        self.assertEqual(len(memory.messages), 3)
        self.assertEqual(memory.messages[0].content, "")
        self.assertEqual(memory.messages[1].role, "user")


class TestMemoryIntegration(unittest.TestCase):
    """Integration tests for memory persistence"""
    
    def test_conversation_persistence(self):
        """Test persisting and restoring a full conversation"""
        # Build a conversation
        mem1 = Memory()
        mem1.add("system", "You are a helpful assistant")
        mem1.add("user", "What is 2+2?")
        mem1.add("assistant", "4")
        mem1.add("user", "What about 3+3?")
        mem1.add("assistant", "6")
        
        # Persist
        json_data = mem1.to_json()
        
        # Restore
        mem2 = Memory.from_json(json_data)
        
        # Verify conversation is intact
        messages = mem2.as_list()
        self.assertEqual(len(messages), 5)
        self.assertEqual(messages[0]["role"], "system")
        self.assertEqual(messages[1]["content"], "What is 2+2?")
        self.assertEqual(messages[2]["content"], "4")


if __name__ == '__main__':
    unittest.main()