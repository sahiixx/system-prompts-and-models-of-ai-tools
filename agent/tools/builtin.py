from __future__ import annotations
import json
import os
import re
import shlex
import subprocess
import sys
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from ..core.tool_registry import ToolRegistry, ToolSpec


@dataclass
class CommandResult:
    code: int
    stdout: str
    stderr: str


def _run_shell(command: str, timeout: int = 30000, cwd: Optional[str] = None) -> CommandResult:
    proc = subprocess.Popen(
        command,
        cwd=cwd or os.getcwd(),
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        executable="/bin/bash",
    )
    try:
        out, err = proc.communicate(timeout=timeout / 1000)
    except subprocess.TimeoutExpired:
        proc.kill()
        out, err = proc.communicate()
        return CommandResult(code=124, stdout=out, stderr=err + "\nTIMEOUT")
    return CommandResult(code=proc.returncode, stdout=out, stderr=err)


def _http_fetch(url: str, method: str = "GET", headers: Optional[Dict[str, str]] = None, body: Optional[str] = None, timeout: int = 20000) -> Dict[str, Any]:
    import urllib.request

    req = urllib.request.Request(url=url, method=method, data=body.encode("utf-8") if body else None)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout / 1000) as resp:
        content = resp.read().decode("utf-8", errors="replace")
        return {"status": resp.status, "headers": dict(resp.headers), "body": content}


class BuiltinTools:
    def __init__(self, registry: ToolRegistry) -> None:
        self.registry = registry

    def register_all(self) -> None:
        self.registry.register(
            ToolSpec(
                name="shell",
                description="Run a shell command. Avoid long-lived processes.",
                parameters={"command": "string", "timeout_ms": "int", "cwd": "string"},
                fn=self._tool_shell,
                parallel_safe=False,
            )
        )
        self.registry.register(
            ToolSpec(
                name="fs.read",
                description="Read a text file.",
                parameters={"path": "string", "offset": "int", "limit": "int"},
                fn=self._tool_fs_read,
            )
        )
        self.registry.register(
            ToolSpec(
                name="fs.write",
                description="Write a text file (overwrite).",
                parameters={"path": "string", "content": "string"},
                fn=self._tool_fs_write,
            )
        )
        self.registry.register(
            ToolSpec(
                name="http.fetch",
                description="Fetch a URL and return status, headers, body.",
                parameters={"url": "string", "method": "string", "headers": "object", "body": "string", "timeout_ms": "int"},
                fn=self._tool_http_fetch,
            )
        )
        self.registry.register(
            ToolSpec(
                name="python.eval",
                description="Execute a short Python expression in a sandboxed namespace.",
                parameters={"expr": "string"},
                fn=self._tool_python_eval,
            )
        )

    # Tool implementations
    def _tool_shell(self, args: Dict[str, Any]) -> Dict[str, Any]:
        command: str = args.get("command", "")
        timeout_ms: int = int(args.get("timeout_ms", 30000))
        cwd: Optional[str] = args.get("cwd")
        if not command:
            return {"error": "command is required"}
        result = _run_shell(command=command, timeout=timeout_ms, cwd=cwd)
        return {"code": result.code, "stdout": result.stdout, "stderr": result.stderr}

    def _tool_fs_read(self, args: Dict[str, Any]) -> Dict[str, Any]:
        path = args.get("path")
        if not path or not os.path.exists(path):
            return {"error": f"file not found: {path}"}
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            data = f.read()
        offset = int(args.get("offset", 0))
        limit = args.get("limit")
        if limit is not None:
            limit = int(limit)
            data = data[offset : offset + limit]
        else:
            data = data[offset:]
        return {"content": data}

    def _tool_fs_write(self, args: Dict[str, Any]) -> Dict[str, Any]:
        path = args.get("path")
        content = args.get("content", "")
        if not path:
            return {"error": "path is required"}
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"ok": True, "bytes": len(content)}

    def _tool_http_fetch(self, args: Dict[str, Any]) -> Dict[str, Any]:
        url = args.get("url")
        if not url:
            return {"error": "url is required"}
        method = args.get("method", "GET")
        headers = args.get("headers") or {}
        body = args.get("body")
        timeout_ms = int(args.get("timeout_ms", 20000))
        try:
            resp = _http_fetch(url=url, method=method, headers=headers, body=body, timeout=timeout_ms)
            return resp
        except Exception as e:  # pragma: no cover
            return {"error": str(e)}

    def _tool_python_eval(self, args: Dict[str, Any]) -> Dict[str, Any]:
        expr: str = args.get("expr", "")
        if not expr:
            return {"error": "expr is required"}
        safe_globals: Dict[str, Any] = {"__builtins__": {"len": len, "sum": sum, "min": min, "max": max}}
        safe_locals: Dict[str, Any] = {}
        try:
            result = eval(expr, safe_globals, safe_locals)
            return {"result": result}
        except Exception as e:  # pragma: no cover
            return {"error": str(e)}
