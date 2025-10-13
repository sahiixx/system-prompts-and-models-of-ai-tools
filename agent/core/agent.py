from __future__ import annotations
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .memory import Memory
from .tool_registry import ToolRegistry
from ..models.base import ModelMessage, ModelProvider


@dataclass
class AgentConfig:
    model_name: str = "echo"
    max_steps: int = 10
    allow_parallel_tools: bool = True


class Agent:
    def __init__(self, model: ModelProvider, tools: ToolRegistry, memory: Optional[Memory] = None, config: Optional[AgentConfig] = None) -> None:
        self.model = model
        self.tools = tools
        self.memory = memory or Memory()
        self.config = config or AgentConfig()

    def ask(self, user_message: str) -> str:
        self.memory.add("user", user_message)
        # Prepare tools schema for the model if needed
        tools_schema = [
            {
                "type": "function",
                "function": {
                    "name": spec["name"],
                    "description": spec["description"],
                    "parameters": {"type": "object", "additionalProperties": True},
                },
            }
            for spec in self.tools.list_specs()
        ]

        messages = [ModelMessage(role=m["role"], content=m["content"]) for m in self.memory.as_list()]
        completion = self.model.complete(messages, tools=tools_schema)
        content = completion.get("content") or ""
        tool_calls = completion.get("tool_calls") or []

        # Simple loop for tool calls
        step = 0
        while tool_calls and step < self.config.max_steps:
            step += 1
            for call in tool_calls:
                name = call.get("name")
                try:
                    args = call.get("arguments")
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except Exception:
                            args = {"raw": args}
                    result = self.tools.call(name, args or {})
                except Exception as e:  # pragma: no cover
                    result = {"error": str(e)}
                self.memory.add("tool", json.dumps({"name": name, "result": result}), tool_name=name)
            # Ask model again with tool results
            messages = [ModelMessage(role=m["role"], content=m["content"]) for m in self.memory.as_list()]
            completion = self.model.complete(messages, tools=tools_schema)
            content = completion.get("content") or content
            tool_calls = completion.get("tool_calls") or []

        self.memory.add("assistant", content)
        return content
