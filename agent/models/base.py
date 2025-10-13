from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional


@dataclass
class ModelMessage:
    role: str
    content: str
    name: Optional[str] = None


class ModelProvider:
    def __init__(self, name: str) -> None:
        self.name = name

    def complete(self, messages: Iterable[ModelMessage], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        raise NotImplementedError
