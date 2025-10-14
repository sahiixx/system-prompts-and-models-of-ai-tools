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
    # High-level guidance for the assistant. Kept concise to avoid verbosity.
    system_prompt: Optional[str] = (
        "You are a helpful, concise assistant. "
        "Use tools when they will improve accuracy or provide concrete data. "
        "Always return strictly valid JSON for tool arguments."
    )


class Agent:
    def __init__(self, model: ModelProvider, tools: ToolRegistry, memory: Optional[Memory] = None, config: Optional[AgentConfig] = None) -> None:
        self.model = model
        self.tools = tools
        self.memory = memory or Memory()
        self.config = config or AgentConfig()

    def ask(self, user_message: str) -> str:
        # Ensure a single system prompt at the start of the conversation
        if self.config.system_prompt:
            existing = self.memory.as_list()
            if not any(m.get("role") == "system" for m in existing):
                self.memory.add("system", self.config.system_prompt)
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

        messages = [
            ModelMessage(role=m["role"], content=m["content"], name=m.get("tool_name"))
            for m in self.memory.as_list()
        ]
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
                    # Normalize args into dict
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except Exception:
                            # Allow raw string arguments as {"input": "..."}
                            args = {"input": args}
                    elif args is None:
                        args = {}
                    if not isinstance(args, dict):
                        # Last resort: wrap as generic
                        args = {"input": args}
                    result = self.tools.call(name, args)
                except Exception as e:  # pragma: no cover
                    result = {"error": str(e)}
                self.memory.add("tool", json.dumps({"name": name, "result": result}), tool_name=name)
            # Ask model again with tool results
            messages = [
                ModelMessage(role=m["role"], content=m["content"], name=m.get("tool_name"))
                for m in self.memory.as_list()
            ]
            completion = self.model.complete(messages, tools=tools_schema)
            content = completion.get("content") or content
            tool_calls = completion.get("tool_calls") or []

        self.memory.add("assistant", content)
        return content
