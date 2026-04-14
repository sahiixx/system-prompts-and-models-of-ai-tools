from __future__ import annotations
from typing import Any, Dict, Iterable, List, Optional
import os

try:
    from mistralai import Mistral  # type: ignore
except Exception:  # pragma: no cover
    Mistral = None  # type: ignore

from .base import ModelMessage, ModelProvider


class MistralModel(ModelProvider):
    """Mistral AI model provider using the mistralai SDK."""

    def __init__(self, model: str = "mistral-large-latest") -> None:
        super().__init__(name=model)
        self.model = model
        self.api_key = os.getenv("MISTRAL_API_KEY")

    def _format_messages(self, messages: Iterable[ModelMessage]) -> List[Dict[str, str]]:
        return [
            {"role": m.role, "content": m.content}
            for m in messages
        ]

    def complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if Mistral is None:
            raise RuntimeError("mistralai package not installed. `pip install mistralai`.")
        if not self.api_key:
            raise RuntimeError("MISTRAL_API_KEY not set in environment")

        client = Mistral(api_key=self.api_key)
        formatted = self._format_messages(messages)
        response = client.chat.complete(model=self.model, messages=formatted)
        choice = response.choices[0]
        content = choice.message.content or ""
        return {"role": "assistant", "content": content, "tool_calls": []}

    def stream_complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None):
        if Mistral is None:
            raise RuntimeError("mistralai package not installed. `pip install mistralai`.")
        if not self.api_key:
            raise RuntimeError("MISTRAL_API_KEY not set in environment")

        client = Mistral(api_key=self.api_key)
        formatted = self._format_messages(messages)
        stream = client.chat.stream(model=self.model, messages=formatted)
        full_text = ""
        for event in stream:
            delta = event.data.choices[0].delta.content or ""
            if delta:
                full_text += delta
                yield {"delta": delta}
        yield {"done": True, "role": "assistant", "content": full_text, "tool_calls": []}
