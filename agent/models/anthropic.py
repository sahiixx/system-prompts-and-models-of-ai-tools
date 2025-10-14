from __future__ import annotations
from typing import Any, Dict, Iterable, List, Optional
import os

try:
    from anthropic import Anthropic  # type: ignore
except Exception:  # pragma: no cover
    Anthropic = None  # type: ignore

from .base import ModelMessage, ModelProvider


class AnthropicModel(ModelProvider):
    """Anthropic Messages API wrapper. Tools not implemented in this minimal version.
    Streaming support provided via the SDK's streaming client.
    """

    def __init__(self, model: str = "claude-3-5-sonnet-latest") -> None:
        super().__init__(name=model)
        self.model = model
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    def _format_messages(self, messages: Iterable[ModelMessage]) -> List[Dict[str, str]]:
        formatted: List[Dict[str, str]] = []
        system_parts: List[str] = []
        for m in messages:
            if m.role == "system":
                system_parts.append(m.content)
            elif m.role in ("user", "assistant"):
                formatted.append({"role": m.role, "content": m.content})
        # Anthropic takes system as a single string
        self._system_text = "\n\n".join(system_parts) if system_parts else None
        return formatted

    def complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if Anthropic is None:
            raise RuntimeError("anthropic package not installed. `pip install anthropic`.")
        if not self.api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set in environment")
        client = Anthropic(api_key=self.api_key)
        formatted = self._format_messages(messages)
        msg = client.messages.create(model=self.model, max_tokens=1024, system=self._system_text, messages=formatted)
        # content is an array of content blocks
        text = "".join([b.text for b in msg.content if getattr(b, "type", None) == "text"])  # type: ignore
        return {"role": "assistant", "content": text, "tool_calls": []}

    def stream_complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None):
        if Anthropic is None:
            raise RuntimeError("anthropic package not installed. `pip install anthropic`.")
        if not self.api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set in environment")
        client = Anthropic(api_key=self.api_key)
        formatted = self._format_messages(messages)
        with client.messages.stream(model=self.model, max_tokens=1024, system=self._system_text, messages=formatted) as stream:
            for event in stream:
                t = getattr(event, "type", None)
                if t == "content_block_delta":
                    delta = getattr(event.delta, "text", "")
                    if delta:
                        yield {"delta": delta}
                elif t == "message_stop":
                    # Need to fetch final message to get full content
                    final = stream.get_final_message()
                    text = "".join([b.text for b in final.content if getattr(b, "type", None) == "text"])  # type: ignore
                    yield {"done": True, "role": "assistant", "content": text, "tool_calls": []}
                    return
