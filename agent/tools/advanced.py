from __future__ import annotations

import math
import subprocess
import sys
import tempfile
import os
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ..core.tool_registry import ToolRegistry, ToolSpec


@dataclass
class _Document:
    text: str
    metadata: Dict[str, Any]


def _tokenize(text: str) -> List[str]:
    """Simple whitespace + lowercase tokenizer."""
    return [w for w in text.lower().split() if w]


def _term_freq(tokens: List[str]) -> Dict[str, float]:
    """Compute normalised term-frequency vector for a token list."""
    counts: Dict[str, int] = {}
    for t in tokens:
        counts[t] = counts.get(t, 0) + 1
    total = len(tokens) or 1
    return {t: c / total for t, c in counts.items()}


def _cosine_similarity(a: Dict[str, float], b: Dict[str, float]) -> float:
    """Cosine similarity between two sparse TF vectors."""
    common = set(a) & set(b)
    if not common:
        return 0.0
    dot = sum(a[k] * b[k] for k in common)
    mag_a = math.sqrt(sum(v * v for v in a.values()))
    mag_b = math.sqrt(sum(v * v for v in b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ---------------------------------------------------------------------------
# In-memory stores (module-level so they survive across calls)
# ---------------------------------------------------------------------------
_vector_collections: Dict[str, List[_Document]] = defaultdict(list)
_memory_store: Dict[str, Dict[str, str]] = defaultdict(dict)


class AdvancedTools:
    """Advanced agent tools: vector store, code sandbox, and memory."""

    def __init__(self, registry: ToolRegistry) -> None:
        self.registry = registry

    def register_all(self) -> None:  # noqa: C901 – registration method is long by design
        # -- vector store --
        self.registry.register(
            ToolSpec(
                name="vector_store.add",
                description="Add a text chunk to an in-memory TF-IDF vector store collection.",
                parameters={"collection": "string", "text": "string", "metadata": "object"},
                fn=self._tool_vector_store_add,
                parallel_safe=True,
            )
        )
        self.registry.register(
            ToolSpec(
                name="vector_store.query",
                description="Query the in-memory vector store using TF-IDF cosine similarity.",
                parameters={"collection": "string", "query": "string", "top_k": "int"},
                fn=self._tool_vector_store_query,
                parallel_safe=True,
            )
        )
        # -- code sandbox --
        self.registry.register(
            ToolSpec(
                name="code_sandbox.run",
                description="Execute code in a subprocess sandbox with a timeout. Supported languages: python, javascript, bash.",
                parameters={"language": "string", "code": "string", "timeout_seconds": "int"},
                fn=self._tool_code_sandbox_run,
                parallel_safe=True,
            )
        )
        # -- memory --
        self.registry.register(
            ToolSpec(
                name="memory.store",
                description="Store a key-value pair in persistent agent memory with optional namespace.",
                parameters={"key": "string", "value": "string", "namespace": "string"},
                fn=self._tool_memory_store,
                parallel_safe=True,
            )
        )
        self.registry.register(
            ToolSpec(
                name="memory.recall",
                description="Recall a value from agent memory by key and optional namespace.",
                parameters={"key": "string", "namespace": "string"},
                fn=self._tool_memory_recall,
                parallel_safe=True,
            )
        )
        self.registry.register(
            ToolSpec(
                name="memory.list",
                description="List all keys stored in a memory namespace.",
                parameters={"namespace": "string"},
                fn=self._tool_memory_list,
                parallel_safe=True,
            )
        )

    # ------------------------------------------------------------------
    # Vector store
    # ------------------------------------------------------------------
    def _tool_vector_store_add(self, args: Dict[str, Any]) -> Dict[str, Any]:
        collection = args.get("collection", "default")
        text = args.get("text", "")
        metadata = args.get("metadata") or {}
        if not text:
            return {"error": "text is required"}
        _vector_collections[collection].append(_Document(text=text, metadata=metadata))
        return {"ok": True, "collection": collection, "size": len(_vector_collections[collection])}

    def _tool_vector_store_query(self, args: Dict[str, Any]) -> Dict[str, Any]:
        collection = args.get("collection", "default")
        query = args.get("query", "")
        top_k = int(args.get("top_k", 5))
        if not query:
            return {"error": "query is required"}
        docs = _vector_collections.get(collection, [])
        if not docs:
            return {"results": [], "message": f"collection '{collection}' is empty or does not exist"}

        query_tf = _term_freq(_tokenize(query))
        scored: List[Dict[str, Any]] = []
        for idx, doc in enumerate(docs):
            doc_tf = _term_freq(_tokenize(doc.text))
            score = _cosine_similarity(query_tf, doc_tf)
            scored.append({"index": idx, "score": round(score, 4), "text": doc.text, "metadata": doc.metadata})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return {"results": scored[: max(1, top_k)]}

    # ------------------------------------------------------------------
    # Code sandbox
    # ------------------------------------------------------------------
    _LANG_CONFIG: Dict[str, Dict[str, Any]] = {
        "python": {"cmd": [sys.executable, "{file}"], "ext": ".py"},
        "javascript": {"cmd": ["node", "{file}"], "ext": ".js"},
        "bash": {"cmd": ["bash", "{file}"], "ext": ".sh"},
    }

    def _tool_code_sandbox_run(self, args: Dict[str, Any]) -> Dict[str, Any]:
        language = (args.get("language") or "").lower()
        code = args.get("code", "")
        timeout = int(args.get("timeout_seconds", 30))
        if not code:
            return {"error": "code is required"}
        if language not in self._LANG_CONFIG:
            return {"error": f"unsupported language '{language}'. Supported: python, javascript, bash"}

        cfg = self._LANG_CONFIG[language]
        fd, path = tempfile.mkstemp(suffix=cfg["ext"])
        try:
            with os.fdopen(fd, "w") as f:
                f.write(code)
            cmd = [part.replace("{file}", path) for part in cfg["cmd"]]
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            return {"exit_code": proc.returncode, "stdout": proc.stdout, "stderr": proc.stderr}
        except subprocess.TimeoutExpired:
            return {"error": f"execution timed out after {timeout}s"}
        except FileNotFoundError:
            return {"error": f"runtime not found for language '{language}'"}
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    # ------------------------------------------------------------------
    # Memory
    # ------------------------------------------------------------------
    def _tool_memory_store(self, args: Dict[str, Any]) -> Dict[str, Any]:
        key = args.get("key", "")
        value = args.get("value", "")
        namespace = args.get("namespace", "default")
        if not key:
            return {"error": "key is required"}
        _memory_store[namespace][key] = value
        return {"ok": True, "namespace": namespace, "key": key}

    def _tool_memory_recall(self, args: Dict[str, Any]) -> Dict[str, Any]:
        key = args.get("key", "")
        namespace = args.get("namespace", "default")
        if not key:
            return {"error": "key is required"}
        if namespace not in _memory_store or key not in _memory_store[namespace]:
            return {"error": f"key '{key}' not found in namespace '{namespace}'"}
        return {"value": _memory_store[namespace][key], "namespace": namespace, "key": key}

    def _tool_memory_list(self, args: Dict[str, Any]) -> Dict[str, Any]:
        namespace = args.get("namespace", "default")
        keys = list(_memory_store.get(namespace, {}).keys())
        return {"namespace": namespace, "keys": keys}
