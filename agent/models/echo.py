from __future__ import annotations
from typing import Any, Dict, Iterable, List, Optional
from .base import ModelMessage, ModelProvider


class EchoModel(ModelProvider):
    def __init__(self) -> None:
        super().__init__(name="echo")

    def complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        # Simple echo: returns the last user message content.
        last_user = ""
        for m in messages:
            if m.role == "user":
                last_user = m.content
        if not last_user:
            last_user = "(no user message)"
        return {
            "role": "assistant",
            "content": f"Echo: {last_user}",
            "tool_calls": [],
        }
