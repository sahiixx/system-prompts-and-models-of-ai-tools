from __future__ import annotations

import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional

from ..core.tool_registry import ToolRegistry, ToolSpec

_HF_API = "https://huggingface.co/api/models"
_ARXIV_API = "http://export.arxiv.org/api/query"


def _hf_get(url: str, timeout: int = 15) -> Any:
    """Perform a GET request and decode JSON from the HuggingFace API."""
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "agent-tools/1.0")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


def _arxiv_get(url: str, timeout: int = 15) -> str:
    """Perform a GET request and return the raw XML from the arXiv API."""
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "agent-tools/1.0")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


class RealtimeTools:
    """Tools for querying real-time external data sources."""

    def __init__(self, registry: ToolRegistry) -> None:
        self.registry = registry

    def register_all(self) -> None:
        self.registry.register(
            ToolSpec(
                name="huggingface.search_models",
                description="Search the HuggingFace Hub for machine-learning models.",
                parameters={"query": "string", "limit": "int", "sort": "string"},
                fn=self._tool_hf_search,
                parallel_safe=True,
            )
        )
        self.registry.register(
            ToolSpec(
                name="huggingface.model_info",
                description="Get detailed information about a specific HuggingFace model.",
                parameters={"model_id": "string"},
                fn=self._tool_hf_model_info,
                parallel_safe=True,
            )
        )
        self.registry.register(
            ToolSpec(
                name="arxiv.search",
                description="Search arXiv for academic papers (primarily AI/ML).",
                parameters={"query": "string", "max_results": "int"},
                fn=self._tool_arxiv_search,
                parallel_safe=True,
            )
        )

    # ------------------------------------------------------------------
    # HuggingFace
    # ------------------------------------------------------------------
    def _tool_hf_search(self, args: Dict[str, Any]) -> Dict[str, Any]:
        query = args.get("query", "")
        if not query:
            return {"error": "query is required"}
        limit = int(args.get("limit", 5))
        sort = args.get("sort", "downloads")

        params = urllib.parse.urlencode({"search": query, "limit": limit, "sort": sort})
        url = f"{_HF_API}?{params}"
        try:
            data = _hf_get(url)
        except Exception as exc:
            return {"error": f"HuggingFace API request failed: {exc}"}

        results: List[Dict[str, Any]] = []
        for item in data if isinstance(data, list) else []:
            results.append({
                "id": item.get("id", ""),
                "author": item.get("author", ""),
                "downloads": item.get("downloads", 0),
                "likes": item.get("likes", 0),
                "tags": item.get("tags", []),
                "pipeline_tag": item.get("pipeline_tag", ""),
                "last_modified": item.get("lastModified", ""),
            })
        return {"models": results}

    def _tool_hf_model_info(self, args: Dict[str, Any]) -> Dict[str, Any]:
        model_id = args.get("model_id", "")
        if not model_id:
            return {"error": "model_id is required"}
        url = f"{_HF_API}/{urllib.parse.quote(model_id, safe='/')}"
        try:
            data = _hf_get(url)
        except Exception as exc:
            return {"error": f"HuggingFace API request failed: {exc}"}
        return {"model": data}

    # ------------------------------------------------------------------
    # arXiv
    # ------------------------------------------------------------------
    _ATOM_NS = "{http://www.w3.org/2005/Atom}"

    def _tool_arxiv_search(self, args: Dict[str, Any]) -> Dict[str, Any]:
        query = args.get("query", "")
        if not query:
            return {"error": "query is required"}
        max_results = int(args.get("max_results", 5))

        params = urllib.parse.urlencode({
            "search_query": f"all:{query}",
            "max_results": max_results,
        })
        url = f"{_ARXIV_API}?{params}"
        try:
            xml_text = _arxiv_get(url)
        except Exception as exc:
            return {"error": f"arXiv API request failed: {exc}"}

        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as exc:
            return {"error": f"failed to parse arXiv XML: {exc}"}

        ns = self._ATOM_NS
        papers: List[Dict[str, Any]] = []
        for entry in root.findall(f"{ns}entry"):
            title_el = entry.find(f"{ns}title")
            summary_el = entry.find(f"{ns}summary")
            published_el = entry.find(f"{ns}published")
            link_el = entry.find(f"{ns}id")
            authors = [
                a.find(f"{ns}name").text  # type: ignore[union-attr]
                for a in entry.findall(f"{ns}author")
                if a.find(f"{ns}name") is not None
            ]
            papers.append({
                "title": (title_el.text or "").strip() if title_el is not None else "",
                "authors": authors,
                "summary": (summary_el.text or "").strip() if summary_el is not None else "",
                "published": (published_el.text or "").strip() if published_el is not None else "",
                "link": (link_el.text or "").strip() if link_el is not None else "",
            })
        return {"papers": papers}
