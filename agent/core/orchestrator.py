from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .agent import Agent, AgentConfig
from .memory import Memory
from .tool_registry import ToolRegistry
from ..models.base import ModelProvider


@dataclass
class AgentRole:
    """Defines a specialized agent role in the orchestration."""

    name: str
    description: str
    system_prompt: str
    tools: Optional[List[str]] = None  # Tool name whitelist; None = all tools


class Orchestrator:
    """Multi-agent orchestrator that delegates tasks to specialized agents."""

    def __init__(
        self,
        model: ModelProvider,
        tools: ToolRegistry,
        roles: Optional[List[AgentRole]] = None,
    ) -> None:
        self.model = model
        self.tools = tools
        self.roles: Dict[str, AgentRole] = {r.name: r for r in (roles or [])}
        self._agents: Dict[str, Agent] = {}
        self.shared_memory = Memory(max_messages=500)

    def add_role(self, role: AgentRole) -> None:
        """Register a new agent role."""
        self.roles[role.name] = role

    def _get_or_create_agent(self, role_name: str) -> Agent:
        """Get or create an agent for the given role."""
        if role_name not in self._agents:
            role = self.roles.get(role_name)
            if not role:
                raise KeyError(f"Unknown role: {role_name}")
            config = AgentConfig(system_prompt=role.system_prompt)
            agent = Agent(model=self.model, tools=self.tools, memory=Memory(), config=config)
            self._agents[role_name] = agent
        return self._agents[role_name]

    def delegate(self, role_name: str, task: str) -> str:
        """Delegate a task to a specific agent role and return the response."""
        agent = self._get_or_create_agent(role_name)
        result = agent.ask(task)
        # Record in shared memory
        self.shared_memory.add("user", f"[{role_name}] Task: {task}")
        self.shared_memory.add("assistant", f"[{role_name}] Result: {result}")
        return result

    def coordinate(
        self, task: str, role_sequence: Optional[List[str]] = None
    ) -> Dict[str, str]:
        """Coordinate a task across multiple agent roles in sequence.

        Each role receives the task plus previous roles' outputs as context.
        """
        if role_sequence is None:
            role_sequence = list(self.roles.keys())

        results: Dict[str, str] = {}
        context_parts: List[str] = [f"Main task: {task}"]

        for role_name in role_sequence:
            full_prompt = "\n\n".join(
                context_parts + [f"Your role ({role_name}): Complete your part of this task."]
            )
            result = self.delegate(role_name, full_prompt)
            results[role_name] = result
            context_parts.append(f"[{role_name} output]: {result}")

        return results

    def list_roles(self) -> List[Dict[str, str]]:
        """Return a summary of all registered roles."""
        return [{"name": r.name, "description": r.description} for r in self.roles.values()]
