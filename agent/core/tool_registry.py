from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional
import json


ToolFunc = Callable[[Dict[str, Any]], Any]


@dataclass
class ToolSpec:
    name: str
    description: str
    parameters: Optional[Dict[str, Any]] = None
    fn: Optional[ToolFunc] = None
    parallel_safe: bool = True


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: Dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec) -> None:
        if spec.name in self._tools:
            raise ValueError(f"Tool already registered: {spec.name}")
        if spec.fn is None:
            raise ValueError(f"Tool function is required: {spec.name}")
        self._tools[spec.name] = spec

    def _validate(self, name: str, args: Dict[str, Any]) -> Optional[str]:
        spec = self.get_spec(name)
        params = spec.parameters or {}
        # Very lightweight validation: ensure provided keys exist if params provided as simple shape
        for key in args.keys():
            if params and key not in params and not isinstance(params, dict):
                return f"unexpected parameter '{key}' for tool {name}"
        return None

    def call(self, name: str, args: Dict[str, Any]) -> Any:
        if name not in self._tools:
            raise KeyError(f"Unknown tool: {name}")
        err = self._validate(name, args)
        if err:
            return {"error": err}
        return self._tools[name].fn(args)

    def list_specs(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": spec.name,
                "description": spec.description,
                "parameters": spec.parameters or {},
                "parallel_safe": spec.parallel_safe,
            }
            for spec in self._tools.values()
        ]

    def get_spec(self, name: str) -> ToolSpec:
        if name not in self._tools:
            raise KeyError(f"Unknown tool: {name}")
        return self._tools[name]
