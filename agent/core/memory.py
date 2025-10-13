from __future__ import annotations
from dataclasses import dataclass, field
from typing import Deque, Dict, List, Optional, Tuple
from collections import deque


@dataclass
class Message:
    role: str
    content: str
    tool_name: Optional[str] = None


@dataclass
class Memory:
    max_messages: int = 200
    messages: Deque[Message] = field(default_factory=deque)

    def add(self, role: str, content: str, tool_name: Optional[str] = None) -> None:
        self.messages.append(Message(role=role, content=content, tool_name=tool_name))
        while len(self.messages) > self.max_messages:
            self.messages.popleft()

    def as_list(self) -> List[Dict[str, str]]:
        result: List[Dict[str, str]] = []
        for m in self.messages:
            entry = {"role": m.role, "content": m.content}
            if m.tool_name:
                entry["tool_name"] = m.tool_name
            result.append(entry)
        return result

    def last_user_message(self) -> Optional[str]:
        for m in reversed(self.messages):
            if m.role == "user":
                return m.content
        return None
