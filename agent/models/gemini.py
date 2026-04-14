from __future__ import annotations
from typing import Any, Dict, Iterable, List, Optional
import os

try:
    import google.generativeai as genai  # type: ignore
except Exception:  # pragma: no cover
    genai = None

from .base import ModelMessage, ModelProvider


class GeminiModel(ModelProvider):
    """Google Gemini model provider using the google-generativeai SDK."""

    def __init__(self, model: str = "gemini-1.5-pro") -> None:
        super().__init__(name=model)
        self.model = model
        self.api_key = os.getenv("GOOGLE_API_KEY")

    def _format_contents(self, messages: Iterable[ModelMessage]) -> list:
        """Convert ModelMessages to Gemini Content dicts.

        Gemini uses 'user' and 'model' roles.  System messages are
        prepended to the first user message.
        """
        contents: list = []
        system_parts: List[str] = []
        for m in messages:
            if m.role == "system":
                system_parts.append(m.content)
                continue
            role = "model" if m.role == "assistant" else "user"
            text = m.content
            if system_parts and role == "user":
                text = "\n\n".join(system_parts) + "\n\n" + text
                system_parts = []
            contents.append({"role": role, "parts": [{"text": text}]})
        return contents

    def complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if genai is None:
            raise RuntimeError("google-generativeai package not installed. `pip install google-generativeai`.")
        if not self.api_key:
            raise RuntimeError("GOOGLE_API_KEY not set in environment")

        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(self.model)
        contents = self._format_contents(messages)
        response = model.generate_content(contents)
        text = response.text or ""
        return {"role": "assistant", "content": text, "tool_calls": []}

    def stream_complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None):
        if genai is None:
            raise RuntimeError("google-generativeai package not installed. `pip install google-generativeai`.")
        if not self.api_key:
            raise RuntimeError("GOOGLE_API_KEY not set in environment")

        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(self.model)
        contents = self._format_contents(messages)
        response = model.generate_content(contents, stream=True)
        full_text = ""
        for chunk in response:
            delta = chunk.text or ""
            if delta:
                full_text += delta
                yield {"delta": delta}
        yield {"done": True, "role": "assistant", "content": full_text, "tool_calls": []}
