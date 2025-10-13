from __future__ import annotations
from typing import Any, Dict, Iterable, List, Optional
import os

try:
    import openai  # type: ignore
except Exception:  # pragma: no cover
    openai = None

from .base import ModelMessage, ModelProvider


class OpenAIModel(ModelProvider):
    def __init__(self, model: str = "gpt-4o-mini") -> None:
        super().__init__(name=model)
        self.model = model
        self.api_key = os.getenv("OPENAI_API_KEY")

    def complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if openai is None:
            raise RuntimeError("openai package not installed. `pip install openai`. ")
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY not set in environment")

        client = openai.OpenAI(api_key=self.api_key)
        formatted = [
            {"role": m.role, "content": m.content} if m.name is None else {"role": m.role, "content": m.content, "name": m.name}
            for m in messages
        ]
        response = client.chat.completions.create(
            model=self.model,
            messages=formatted,
            tools=tools or None,
        )
        choice = response.choices[0]
        content = choice.message.content or ""
        tool_calls = []
        if choice.message.tool_calls:
            tool_calls = [
                {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                }
                for tc in choice.message.tool_calls
            ]
        return {"role": "assistant", "content": content, "tool_calls": tool_calls}
