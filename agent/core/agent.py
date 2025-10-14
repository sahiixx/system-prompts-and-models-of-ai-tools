from __future__ import annotations
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

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
            # Optionally dispatch in parallel when safe
            futures = []
            with ThreadPoolExecutor(max_workers=len(tool_calls)) as executor:
                for call in tool_calls:
                    name = call.get("name")
                    try:
                        spec = self.tools.get_spec(name)
                    except Exception:
                        spec = None
                    def run_call(name=name, call=call):
                        try:
                            args = call.get("arguments")
                            if isinstance(args, str):
                                try:
                                    args = json.loads(args)
                                except Exception:
                                    args = {"input": args}
                            elif args is None:
                                args = {}
                            if not isinstance(args, dict):
                                args = {"input": args}
                            return name, self.tools.call(name, args)
                        except Exception as e:  # pragma: no cover
                            return name, {"error": str(e)}
                    if self.config.allow_parallel_tools and spec and getattr(spec, "parallel_safe", True):
                        futures.append(executor.submit(run_call))
                    else:
                        # Run synchronously for non-parallel-safe tools
                        name_sync, result_sync = run_call()
                        self.memory.add("tool", json.dumps({"name": name_sync, "result": result_sync}), tool_name=name_sync)
                # Collect parallel results
                for fut in as_completed(futures):
                    name_done, result_done = fut.result()
                    self.memory.add("tool", json.dumps({"name": name_done, "result": result_done}), tool_name=name_done)
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

    def ask_stream(self, user_message: str):
        # Ensure system prompt
        if self.config.system_prompt:
            existing = self.memory.as_list()
            if not any(m.get("role") == "system" for m in existing):
                self.memory.add("system", self.config.system_prompt)
        self.memory.add("user", user_message)

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

        # Stream initial assistant response
        content_accum = []
        for chunk in self.model.stream_complete(messages, tools=tools_schema):
            yield chunk
            delta = chunk.get("delta")
            if delta:
                content_accum.append(delta)
            if chunk.get("done"):
                final = chunk
                break
        else:
            final = {"content": ""}

        content = final.get("content") or "" if isinstance(final, dict) else ""
        tool_calls = final.get("tool_calls") if isinstance(final, dict) else None

        step = 0
        while tool_calls and step < self.config.max_steps:
            step += 1
            # Optionally dispatch in parallel when safe
            futures = []
            with ThreadPoolExecutor(max_workers=len(tool_calls)) as executor:
                for call in tool_calls:
                    name = call.get("name")
                    try:
                        spec = self.tools.get_spec(name)
                    except Exception:
                        spec = None
                    def run_call(name=name, call=call):
                        try:
                            args = call.get("arguments")
                            if isinstance(args, str):
                                try:
                                    args = json.loads(args)
                                except Exception:
                                    args = {"input": args}
                            elif args is None:
                                args = {}
                            if not isinstance(args, dict):
                                args = {"input": args}
                            return name, self.tools.call(name, args)
                        except Exception as e:  # pragma: no cover
                            return name, {"error": str(e)}
                    if self.config.allow_parallel_tools and spec and getattr(spec, "parallel_safe", True):
                        futures.append(executor.submit(run_call))
                    else:
                        name_sync, result_sync = run_call()
                        self.memory.add("tool", json.dumps({"name": name_sync, "result": result_sync}), tool_name=name_sync)
                        yield {"tool_result": {"name": name_sync, "result": result_sync}}
                for fut in as_completed(futures):
                    name_done, result_done = fut.result()
                    self.memory.add("tool", json.dumps({"name": name_done, "result": result_done}), tool_name=name_done)
                    yield {"tool_result": {"name": name_done, "result": result_done}}

            # Ask again and stream
            messages = [
                ModelMessage(role=m["role"], content=m["content"], name=m.get("tool_name"))
                for m in self.memory.as_list()
            ]
            for chunk in self.model.stream_complete(messages, tools=tools_schema):
                yield chunk
                final = chunk if chunk.get("done") else final
            content = final.get("content") or content
            tool_calls = final.get("tool_calls") or []

        self.memory.add("assistant", content)
