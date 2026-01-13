"""
Comprehensive Unit Tests for agent/core/memory.py enhancements
Tests Memory persistence methods and last_user_message
"""

import unittest
import json
import sys
import os

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.memory import Memory, Message


class TestMemoryPersistence(unittest.TestCase):
    """Test suite for Memory persistence methods"""
    
    def test_to_json_empty_memory(self):
        """Test serializing empty memory to JSON"""
        memory = Memory()
        result = memory.to_json()
        
        data = json.loads(result)
        self.assertEqual(data, [])
    
    def test_to_json_with_messages(self):
        """Test serializing memory with messages to JSON"""
        memory = Memory()
        memory.add("user", "Hello")
        memory.add("assistant", "Hi there")
        memory.add("tool", "Result", tool_name="test_tool")
        
        result = memory.to_json()
        data = json.loads(result)
        
        self.assertEqual(len(data), 3)
        self.assertEqual(data[0]["role"], "user")
        self.assertEqual(data[0]["content"], "Hello")
        self.assertEqual(data[1]["role"], "assistant")
        self.assertEqual(data[1]["content"], "Hi there")
        self.assertEqual(data[2]["role"], "tool")
        self.assertEqual(data[2]["tool_name"], "test_tool")
    
    def test_from_json_empty_string(self):
        """Test deserializing empty JSON array"""
        memory = Memory.from_json("[]")
        
        self.assertEqual(len(memory.messages), 0)
    
    def test_from_json_with_messages(self):
        """Test deserializing memory from JSON"""
        json_data = json.dumps([
            {"role": "user", "content": "Hello", "tool_name": None},
            {"role": "assistant", "content": "Hi", "tool_name": None}
        ])
        
        memory = Memory.from_json(json_data)
        
        self.assertEqual(len(memory.messages), 2)
        self.assertEqual(memory.messages[0].role, "user")
        self.assertEqual(memory.messages[0].content, "Hello")
        self.assertEqual(memory.messages[1].role, "assistant")
        self.assertEqual(memory.messages[1].content, "Hi")
    
    def test_from_json_with_tool_name(self):
        """Test deserializing memory with tool_name field"""
        json_data = json.dumps([
            {"role": "tool", "content": "Result", "tool_name": "test_tool"}
        ])
        
        memory = Memory.from_json(json_data)
        
        self.assertEqual(len(memory.messages), 1)
        self.assertEqual(memory.messages[0].tool_name, "test_tool")
    
    def test_from_json_invalid_json(self):
        """Test from_json handles invalid JSON gracefully"""
        memory = Memory.from_json("not valid json")
        
        # Should return empty memory
        self.assertEqual(len(memory.messages), 0)
    
    def test_from_json_with_max_messages(self):
        """Test from_json respects max_messages limit"""
        json_data = json.dumps([
            {"role": "user", "content": f"Message {i}", "tool_name": None}
            for i in range(10)
        ])
        
        memory = Memory.from_json(json_data, max_messages=5)
        
        # Should only keep last 5 messages
        self.assertEqual(len(memory.messages), 5)
        self.assertEqual(memory.max_messages, 5)
    
    def test_to_json_from_json_roundtrip(self):
        """Test roundtrip serialization/deserialization"""
        original = Memory()
        original.add("system", "System prompt")
        original.add("user", "Question")
        original.add("assistant", "Answer")
        original.add("tool", "Tool output", tool_name="calculator")
        
        json_str = original.to_json()
        restored = Memory.from_json(json_str)
        
        self.assertEqual(len(restored.messages), len(original.messages))
        for orig_msg, rest_msg in zip(original.messages, restored.messages, strict=True):
            self.assertEqual(orig_msg.role, rest_msg.role)
            self.assertEqual(orig_msg.content, rest_msg.content)
            self.assertEqual(orig_msg.tool_name, rest_msg.tool_name)


class TestMemoryLastUserMessage(unittest.TestCase):
    """Test suite for Memory.last_user_message method"""
    
    def test_last_user_message_empty_memory(self):
        """Test last_user_message on empty memory"""
        memory = Memory()
        result = memory.last_user_message()
        
        self.assertIsNone(result)
    
    def test_last_user_message_single_user_message(self):
        """Test last_user_message with single user message"""
        memory = Memory()
        memory.add("user", "Hello world")
        
        result = memory.last_user_message()
        
        self.assertEqual(result, "Hello world")
    
    def test_last_user_message_multiple_user_messages(self):
        """Test last_user_message returns most recent"""
        memory = Memory()
        memory.add("user", "First message")
        memory.add("assistant", "Response")
        memory.add("user", "Second message")
        memory.add("assistant", "Another response")
        
        result = memory.last_user_message()
        
        self.assertEqual(result, "Second message")
    
    def test_last_user_message_no_user_messages(self):
        """Test last_user_message when only system/assistant messages"""
        memory = Memory()
        memory.add("system", "System prompt")
        memory.add("assistant", "Response")
        memory.add("tool", "Tool result")
        
        result = memory.last_user_message()
        
        self.assertIsNone(result)
    
    def test_last_user_message_mixed_roles(self):
        """Test last_user_message with mixed message roles"""
        memory = Memory()
        memory.add("system", "System")
        memory.add("user", "Question 1")
        memory.add("assistant", "Answer 1")
        memory.add("tool", "Tool result")
        memory.add("user", "Question 2")
        memory.add("assistant", "Answer 2")
        
        result = memory.last_user_message()
        
        self.assertEqual(result, "Question 2")
    
    def test_last_user_message_after_max_messages_limit(self):
        """Test last_user_message when messages have been evicted"""
        memory = Memory(max_messages=3)
        memory.add("user", "First")
        memory.add("user", "Second")
        memory.add("user", "Third")
        memory.add("user", "Fourth")  # This should evict "First"
        
        result = memory.last_user_message()
        
        self.assertEqual(result, "Fourth")


if __name__ == '__main__':
    unittest.main()