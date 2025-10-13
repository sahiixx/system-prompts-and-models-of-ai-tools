from __future__ import annotations
import json
import os
import re
import subprocess
import webbrowser
from typing import Any, Dict, List, Optional

from ..core.tool_registry import ToolRegistry, ToolSpec


class CompatTools:
    """Compatibility tools inspired by JSON specs in the repo."""

    def __init__(self, registry: ToolRegistry) -> None:
        self.registry = registry

    def register_all(self) -> None:
        self.registry.register(ToolSpec(
            name="view",
            description="View a file or directory; optional line range and regex.",
            parameters={"type": "file|directory", "path": "string", "view_range": "[start,end]", "search_query_regex": "string", "case_sensitive": "bool"},
            fn=self._view,
        ))
        self.registry.register(ToolSpec(
            name="grep-search",
            description="Ripgrep-like search across files; supports globs.",
            parameters={"query": "string", "paths": "[...paths]", "include_globs": "[...]", "exclude_globs": "[...]", "case_sensitive": "bool"},
            fn=self._grep_search,
        ))
        self.registry.register(ToolSpec(
            name="save-file",
            description="Create a new file with provided contents.",
            parameters={"path": "string", "file_content": "string", "add_last_line_newline": "bool"},
            fn=self._save_file,
        ))
        self.registry.register(ToolSpec(
            name="str-replace-editor",
            description="In-place string replace or insert.",
            parameters={"command": "str_replace|insert", "path": "string", "insert_line_1": "int", "new_str_1": "string", "old_str_1": "string", "old_str_start_line_number_1": "int", "old_str_end_line_number_1": "int"},
            fn=self._str_replace_editor,
        ))
        self.registry.register(ToolSpec(
            name="remove-files",
            description="Delete files from the workspace.",
            parameters={"file_paths": "[...paths]"},
            fn=self._remove_files,
        ))
        self.registry.register(ToolSpec(
            name="open-browser",
            description="Open a URL in the default browser.",
            parameters={"url": "string"},
            fn=self._open_browser,
        ))
        self.registry.register(ToolSpec(
            name="web-search",
            description="Stub web search; returns structured echo of query.",
            parameters={"query": "string", "num_results": "int"},
            fn=self._web_search,
        ))
        self.registry.register(ToolSpec(
            name="codebase-retrieval",
            description="Simple heuristic search for filenames and symbols.",
            parameters={"information_request": "string"},
            fn=self._codebase_retrieval,
        ))
        self.registry.register(ToolSpec(
            name="git-commit-retrieval",
            description="Search git log for a query string.",
            parameters={"information_request": "string"},
            fn=self._git_commit_retrieval,
        ))

    def _view(self, args: Dict[str, Any]) -> Dict[str, Any]:
        target_type = args.get("type")
        path = args.get("path")
        if not target_type or not path:
            return {"error": "type and path are required"}
        if target_type == "directory":
            try:
                entries = sorted(os.listdir(path))
                return {"entries": entries[:200]}
            except FileNotFoundError:
                return {"error": f"not found: {path}"}
        # file
        if not os.path.exists(path):
            return {"error": f"not found: {path}"}
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        view_range = args.get("view_range")
        if view_range and isinstance(view_range, list) and len(view_range) == 2:
            start, end = int(view_range[0]), int(view_range[1])
            lines = content.splitlines()
            selected = "\n".join(lines[max(1, start) - 1 : max(1, end)])
        else:
            selected = content
        regex = args.get("search_query_regex")
        if regex:
            flags = 0 if args.get("case_sensitive") else re.IGNORECASE
            matches = [m.group(0) for m in re.finditer(regex, selected, flags)]
            return {"content": selected, "matches": matches[:200]}
        return {"content": selected}

    def _grep_search(self, args: Dict[str, Any]) -> Dict[str, Any]:
        query: str = args.get("query", "")
        if not query:
            return {"error": "query is required"}
        include_globs = args.get("include_globs") or ["**/*"]
        exclude_globs = set((args.get("exclude_globs") or []) + ["**/node_modules/**", "**/.git/**"])  # basic excludes
        case_sensitive = bool(args.get("case_sensitive", False))
        # naive walk + regex
        flags = 0 if case_sensitive else re.IGNORECASE
        results: List[Dict[str, Any]] = []
        for root, dirs, files in os.walk("."):
            # exclude dirs
            if ".git" in dirs:
                dirs.remove(".git")
            for fname in files:
                path = os.path.join(root, fname)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                except Exception:
                    continue
                for m in re.finditer(query, text, flags):
                    start = max(0, m.start() - 80)
                    end = min(len(text), m.end() + 80)
                    snippet = text[start:end]
                    results.append({"file": path, "match": m.group(0), "context": snippet})
                    if len(results) >= 200:
                        return {"results": results}
        return {"results": results}

    def _save_file(self, args: Dict[str, Any]) -> Dict[str, Any]:
        path = args.get("path")
        content = args.get("file_content", "")
        ensure_nl = bool(args.get("add_last_line_newline", True))
        if not path:
            return {"error": "path is required"}
        if os.path.exists(path):
            return {"error": f"file exists: {path}"}
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        if ensure_nl and content and not content.endswith("\n"):
            content = content + "\n"
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"ok": True, "bytes": len(content)}

    def _str_replace_editor(self, args: Dict[str, Any]) -> Dict[str, Any]:
        command = args.get("command")
        path = args.get("path")
        if not command or not path:
            return {"error": "command and path are required"}
        if not os.path.exists(path):
            return {"error": f"not found: {path}"}
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        if command == "insert":
            insert_after = int(args.get("insert_line_1", 0))
            new_str = args.get("new_str_1", "")
            lines = text.splitlines()
            if insert_after <= 0:
                new_text = new_str + ("\n" if not new_str.endswith("\n") else "") + "\n".join(lines)
            else:
                idx = insert_after
                new_text = "\n".join(lines[:idx]) + "\n" + new_str + ("" if new_str.endswith("\n") else "\n") + "\n".join(lines[idx:])
        else:
            old = args.get("old_str_1", "")
            new = args.get("new_str_1", "")
            start_line = int(args.get("old_str_start_line_number_1", 1))
            end_line = int(args.get("old_str_end_line_number_1", start_line))
            lines = text.splitlines()
            segment = "\n".join(lines[start_line - 1 : end_line])
            if old not in segment:
                return {"error": "old_str_1 not found in the specified range"}
            replaced = segment.replace(old, new, 1)
            new_text = "\n".join(lines[: start_line - 1] + [replaced] + lines[end_line:])
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_text)
        return {"ok": True}

    def _remove_files(self, args: Dict[str, Any]) -> Dict[str, Any]:
        paths = args.get("file_paths") or []
        removed: List[str] = []
        for p in paths:
            try:
                os.remove(p)
                removed.append(p)
            except FileNotFoundError:
                continue
            except IsADirectoryError:
                try:
                    os.rmdir(p)
                    removed.append(p)
                except Exception:
                    pass
        return {"removed": removed}

    def _open_browser(self, args: Dict[str, Any]) -> Dict[str, Any]:
        url = args.get("url")
        if not url:
            return {"error": "url is required"}
        try:
            webbrowser.open(url)
            return {"ok": True}
        except Exception as e:
            return {"error": str(e)}

    def _web_search(self, args: Dict[str, Any]) -> Dict[str, Any]:
        query = args.get("query", "")
        num = int(args.get("num_results", 5))
        # Stub: echo results
        return {"results": [{"title": f"Result {i+1}", "url": "https://example.com", "snippet": query} for i in range(max(1, min(10, num))) ]}

    def _codebase_retrieval(self, args: Dict[str, Any]) -> Dict[str, Any]:
        request = args.get("information_request", "")
        if not request:
            return {"error": "information_request is required"}
        hints: List[Dict[str, Any]] = []
        # Look for filename-like tokens
        for token in re.findall(r"[\w\-/]+\.[a-zA-Z0-9]+", request):
            if os.path.exists(token):
                hints.append({"file": token, "exists": True})
        return {"hints": hints}

    def _git_commit_retrieval(self, args: Dict[str, Any]) -> Dict[str, Any]:
        query = args.get("information_request", "")
        if not query:
            return {"error": "information_request is required"}
        try:
            completed = subprocess.run(["git", "log", "--pretty=format:%h %s"], capture_output=True, text=True, timeout=10)
            lines = completed.stdout.splitlines()
            matched = [ln for ln in lines if query.lower() in ln.lower()]
            return {"matches": matched[:50]}
        except Exception as e:
            return {"error": str(e)}
