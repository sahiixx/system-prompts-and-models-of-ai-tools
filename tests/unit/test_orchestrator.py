"""
Comprehensive Unit Tests for agent/core/orchestrator.py
Tests Orchestrator multi-agent coordination
"""

import unittest
import sys
import os
from unittest.mock import patch, Mock, MagicMock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.orchestrator import Orchestrator, AgentRole
from agent.core.tool_registry import ToolRegistry
from agent.models.base import ModelProvider


class TestOrchestratorInitialization(unittest.TestCase):
    """Test suite for Orchestrator initialization"""

    def test_init_with_roles(self):
        """Test initialization with predefined roles"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        roles = [
            AgentRole(name="researcher", description="Research agent", system_prompt="You research."),
            AgentRole(name="writer", description="Writing agent", system_prompt="You write."),
        ]

        orch = Orchestrator(model=model, tools=tools, roles=roles)

        self.assertEqual(len(orch.roles), 2)
        self.assertIn("researcher", orch.roles)
        self.assertIn("writer", orch.roles)

    def test_init_without_roles(self):
        """Test initialization without roles"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()

        orch = Orchestrator(model=model, tools=tools)

        self.assertEqual(len(orch.roles), 0)

    def test_init_creates_shared_memory(self):
        """Test that shared memory is created on init"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()

        orch = Orchestrator(model=model, tools=tools)

        self.assertIsNotNone(orch.shared_memory)

    def test_init_stores_model_and_tools(self):
        """Test that model and tools are stored"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()

        orch = Orchestrator(model=model, tools=tools)

        self.assertIs(orch.model, model)
        self.assertIs(orch.tools, tools)


class TestOrchestratorAddRole(unittest.TestCase):
    """Test suite for Orchestrator.add_role method"""

    def test_add_role(self):
        """Test adding a new role"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools)

        role = AgentRole(name="coder", description="Coding agent", system_prompt="You code.")
        orch.add_role(role)

        self.assertIn("coder", orch.roles)
        self.assertEqual(orch.roles["coder"].description, "Coding agent")

    def test_add_multiple_roles(self):
        """Test adding multiple roles"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools)

        orch.add_role(AgentRole(name="a", description="A", system_prompt="A"))
        orch.add_role(AgentRole(name="b", description="B", system_prompt="B"))
        orch.add_role(AgentRole(name="c", description="C", system_prompt="C"))

        self.assertEqual(len(orch.roles), 3)

    def test_add_role_overwrites_existing(self):
        """Test that adding a role with existing name overwrites it"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools)

        orch.add_role(AgentRole(name="x", description="Old", system_prompt="old"))
        orch.add_role(AgentRole(name="x", description="New", system_prompt="new"))

        self.assertEqual(orch.roles["x"].description, "New")


class TestOrchestratorListRoles(unittest.TestCase):
    """Test suite for Orchestrator.list_roles method"""

    def test_list_roles(self):
        """Test listing all roles"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        roles = [
            AgentRole(name="researcher", description="Research agent", system_prompt="You research."),
            AgentRole(name="writer", description="Writing agent", system_prompt="You write."),
        ]
        orch = Orchestrator(model=model, tools=tools, roles=roles)

        role_list = orch.list_roles()

        self.assertEqual(len(role_list), 2)
        names = [r["name"] for r in role_list]
        self.assertIn("researcher", names)
        self.assertIn("writer", names)

    def test_list_roles_empty(self):
        """Test listing roles when none are registered"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools)

        role_list = orch.list_roles()

        self.assertEqual(role_list, [])

    def test_list_roles_format(self):
        """Test that list_roles returns correct format"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools)
        orch.add_role(AgentRole(name="test", description="Test desc", system_prompt="sp"))

        role_list = orch.list_roles()

        self.assertEqual(role_list[0]["name"], "test")
        self.assertEqual(role_list[0]["description"], "Test desc")


class TestOrchestratorDelegate(unittest.TestCase):
    """Test suite for Orchestrator.delegate method"""

    @patch('agent.core.orchestrator.Agent')
    def test_delegate_creates_agent_and_returns_response(self, mock_agent_class):
        """Test that delegate creates an agent and returns its response"""
        mock_agent_instance = Mock()
        mock_agent_instance.ask.return_value = "Research result: AI is evolving"
        mock_agent_class.return_value = mock_agent_instance

        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools, roles=[
            AgentRole(name="researcher", description="Research", system_prompt="You research."),
        ])

        result = orch.delegate("researcher", "What is AI?")

        self.assertEqual(result, "Research result: AI is evolving")
        mock_agent_instance.ask.assert_called_once_with("What is AI?")

    @patch('agent.core.orchestrator.Agent')
    def test_delegate_reuses_agent(self, mock_agent_class):
        """Test that delegate reuses the same agent for the same role"""
        mock_agent_instance = Mock()
        mock_agent_instance.ask.return_value = "Result"
        mock_agent_class.return_value = mock_agent_instance

        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools, roles=[
            AgentRole(name="researcher", description="R", system_prompt="R"),
        ])

        orch.delegate("researcher", "Task 1")
        orch.delegate("researcher", "Task 2")

        # Agent class should only be instantiated once
        mock_agent_class.assert_called_once()

    def test_delegate_unknown_role_raises_key_error(self):
        """Test that delegating to an unknown role raises KeyError"""
        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools)

        with self.assertRaises(KeyError) as context:
            orch.delegate("nonexistent", "Task")

        self.assertIn("Unknown role", str(context.exception))

    @patch('agent.core.orchestrator.Agent')
    def test_delegate_tracks_in_shared_memory(self, mock_agent_class):
        """Test that delegations are tracked in shared memory"""
        mock_agent_instance = Mock()
        mock_agent_instance.ask.return_value = "Done"
        mock_agent_class.return_value = mock_agent_instance

        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools, roles=[
            AgentRole(name="worker", description="Worker", system_prompt="Work"),
        ])

        orch.delegate("worker", "Do something")

        messages = orch.shared_memory.as_list()
        self.assertEqual(len(messages), 2)  # user + assistant
        self.assertIn("[worker] Task: Do something", messages[0]["content"])
        self.assertIn("[worker] Result: Done", messages[1]["content"])


class TestOrchestratorCoordinate(unittest.TestCase):
    """Test suite for Orchestrator.coordinate method"""

    @patch('agent.core.orchestrator.Agent')
    def test_coordinate_calls_roles_in_sequence(self, mock_agent_class):
        """Test that coordinate calls roles in the specified sequence"""
        call_order = []

        def mock_ask(task):
            # Extract which role is currently being addressed from "Your role (X):"
            if "Your role (researcher)" in task:
                call_order.append("researcher")
                return "Research findings"
            elif "Your role (writer)" in task:
                call_order.append("writer")
                return "Written report"
            return "Unknown"

        mock_agent_instance = Mock()
        mock_agent_instance.ask.side_effect = mock_ask
        mock_agent_class.return_value = mock_agent_instance

        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools, roles=[
            AgentRole(name="researcher", description="Research", system_prompt="You research."),
            AgentRole(name="writer", description="Write", system_prompt="You write."),
        ])

        results = orch.coordinate("Write a report", role_sequence=["researcher", "writer"])

        self.assertIn("researcher", results)
        self.assertIn("writer", results)
        self.assertEqual(call_order, ["researcher", "writer"])

    @patch('agent.core.orchestrator.Agent')
    def test_coordinate_passes_context_between_roles(self, mock_agent_class):
        """Test that each role receives previous roles' output as context"""
        received_prompts = []

        def mock_ask(task):
            received_prompts.append(task)
            return f"Output from this role"

        mock_agent_instance = Mock()
        mock_agent_instance.ask.side_effect = mock_ask
        mock_agent_class.return_value = mock_agent_instance

        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools, roles=[
            AgentRole(name="step1", description="Step 1", system_prompt="S1"),
            AgentRole(name="step2", description="Step 2", system_prompt="S2"),
        ])

        orch.coordinate("Main task", role_sequence=["step1", "step2"])

        # Second prompt should contain output from first role
        self.assertEqual(len(received_prompts), 2)
        self.assertIn("Main task", received_prompts[0])
        self.assertIn("Main task", received_prompts[1])
        self.assertIn("[step1 output]", received_prompts[1])

    @patch('agent.core.orchestrator.Agent')
    def test_coordinate_uses_all_roles_when_no_sequence(self, mock_agent_class):
        """Test that coordinate uses all roles when no sequence specified"""
        mock_agent_instance = Mock()
        mock_agent_instance.ask.return_value = "Result"
        mock_agent_class.return_value = mock_agent_instance

        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools, roles=[
            AgentRole(name="a", description="A", system_prompt="A"),
            AgentRole(name="b", description="B", system_prompt="B"),
        ])

        results = orch.coordinate("Task")

        self.assertIn("a", results)
        self.assertIn("b", results)

    @patch('agent.core.orchestrator.Agent')
    def test_coordinate_returns_dict_of_results(self, mock_agent_class):
        """Test that coordinate returns a dict mapping role name to result"""
        mock_agent_instance = Mock()
        mock_agent_instance.ask.return_value = "Result"
        mock_agent_class.return_value = mock_agent_instance

        model = Mock(spec=ModelProvider)
        tools = ToolRegistry()
        orch = Orchestrator(model=model, tools=tools, roles=[
            AgentRole(name="only", description="Only", system_prompt="Only"),
        ])

        results = orch.coordinate("Task")

        self.assertIsInstance(results, dict)
        self.assertEqual(len(results), 1)
        self.assertEqual(results["only"], "Result")


class TestAgentRole(unittest.TestCase):
    """Test suite for AgentRole dataclass"""

    def test_agent_role_creation(self):
        """Test creating an AgentRole"""
        role = AgentRole(
            name="tester",
            description="Testing agent",
            system_prompt="You test things.",
        )

        self.assertEqual(role.name, "tester")
        self.assertEqual(role.description, "Testing agent")
        self.assertEqual(role.system_prompt, "You test things.")
        self.assertIsNone(role.tools)

    def test_agent_role_with_tools(self):
        """Test creating an AgentRole with tool whitelist"""
        role = AgentRole(
            name="coder",
            description="Coding agent",
            system_prompt="You code.",
            tools=["code_sandbox.run", "memory.store"],
        )

        self.assertEqual(role.tools, ["code_sandbox.run", "memory.store"])


if __name__ == '__main__':
    unittest.main()
