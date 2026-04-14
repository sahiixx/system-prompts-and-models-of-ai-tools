from __future__ import annotations
from typing import Any, Dict, Iterable, List, Optional
import os

try:
    import groq as groq_pkg  # type: ignore
except Exception:  # pragma: no cover
    groq_pkg = None

from .base import ModelMessage, ModelProvider


class GroqModel(ModelProvider):
    """Groq API model provider (OpenAI-compatible SDK)."""

    def __init__(self, model: str = "llama-3.1-70b-versatile") -> None:
        super().__init__(name=model)
        self.model = model
        self.api_key = os.getenv("GROQ_API_KEY")

    def _format_messages(self, messages: Iterable[ModelMessage]) -> List[Dict[str, str]]:
        return [
            {"role": m.role, "content": m.content}
            for m in messages
        ]

    def complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if groq_pkg is None:
            raise RuntimeError("groq package not installed. `pip install groq`.")
        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY not set in environment")

        client = groq_pkg.Groq(api_key=self.api_key)
        formatted = self._format_messages(messages)
        response = client.chat.completions.create(model=self.model, messages=formatted)
        choice = response.choices[0]
        content = choice.message.content or ""
        return {"role": "assistant", "content": content, "tool_calls": []}

    def stream_complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None):
        if groq_pkg is None:
            raise RuntimeError("groq package not installed. `pip install groq`.")
        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY not set in environment")

        client = groq_pkg.Groq(api_key=self.api_key)
        formatted = self._format_messages(messages)
        stream = client.chat.completions.create(model=self.model, messages=formatted, stream=True)
        full_text = ""
        for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                full_text += delta
                yield {"delta": delta}
        yield {"done": True, "role": "assistant", "content": full_text, "tool_calls": []}
