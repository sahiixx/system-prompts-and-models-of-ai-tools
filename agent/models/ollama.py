from __future__ import annotations
from typing import Any, Dict, Iterable, List, Optional

import os

try:
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None

from .base import ModelMessage, ModelProvider


class OllamaModel(ModelProvider):
    """Minimal Ollama chat client for local server.

    Requires a running Ollama daemon. Set OLLAMA_BASE_URL (default http://localhost:11434).
    """

    def __init__(self, model: str = "llama3.1", base_url: Optional[str] = None) -> None:
        super().__init__(name=model)
        self.model = model
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    def complete(
        self,
        messages: Iterable[ModelMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        if requests is None:
            raise RuntimeError("requests package not installed. `pip install requests`.")

        formatted: List[Dict[str, str]] = []
        for m in messages:
            role = m.role if m.role in {"system", "user", "assistant"} else "user"
            formatted.append({"role": role, "content": m.content})

        url = f"{self.base_url}/api/chat"
        payload = {"model": self.model, "messages": formatted, "stream": False}
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        message = data.get("message", {})
        content = message.get("content", "")
        return {"role": "assistant", "content": content, "tool_calls": []}

    def stream_complete(
        self,
        messages: Iterable[ModelMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
    ):
        # Ollama provides a streaming chat API, but to keep dependencies minimal and
        # avoid handling chunk framing here, we fallback to non-streaming behavior.
        result = self.complete(messages, tools=tools)
        yield {"delta": result.get("content", "")}
        yield {"done": True, **result}
