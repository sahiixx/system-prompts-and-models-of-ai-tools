#!/usr/bin/env python3
"""
agency_bridge.py — Bridge between the AI Tools knowledge base and agency-agents.

Loads static JSON from /api/ and exposes query functions that agency-agents
can call directly (file-path import) or via the HTTP endpoint.

Depends only on stdlib + anthropic (pip install anthropic).
"""
import json
import os
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
API_DIR   = REPO_ROOT / "api"


# ── Loaders ────────────────────────────────────────────────────────────────────

def _load(filename: str):
    path = API_DIR / filename
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def get_index() -> list:
    data = _load("index.json")
    return data.get("tools", []) if isinstance(data, dict) else []


def get_statistics() -> dict:
    return _load("statistics.json")


def get_tool(slug: str) -> dict:
    path = API_DIR / "tools" / f"{slug}.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def get_system_prompt_text(slug: str) -> str:
    """Read the raw system prompt text for a tool from its documentation folder."""
    meta    = get_tool(slug)
    doc     = meta.get("documentation", {})
    folder  = doc.get("folder")
    files   = doc.get("files", {})
    sp_file = files.get("systemPrompt")
    if not folder or not sp_file:
        return f"No system prompt file recorded for '{slug}'."
    path = REPO_ROOT / folder / sp_file
    if not path.exists():
        return f"System prompt file not found: {path}"
    content = path.read_text(encoding="utf-8", errors="replace")
    if len(content) > 6000:
        content = content[:6000] + f"\n\n[truncated — {len(content)} total chars]"
    return content


def search_tools(query: str) -> list:
    """Keyword search over the search index."""
    q     = query.lower()
    data  = _load("search.json")
    index = data.get("index", []) if isinstance(data, dict) else []
    results = []
    for entry in index:
        keywords = entry.get("keywords", [])
        name     = entry.get("name", "").lower()
        desc     = entry.get("description", "").lower()
        if any(q in kw for kw in keywords) or q in name or q in desc:
            results.append(entry)
    return results[:10]


def list_all_slugs() -> list:
    return [t["slug"] for t in get_index() if "slug" in t]


# ── Claude-powered intelligent query ──────────────────────────────────────────

CLAUDE_MODEL = "claude-3-5-sonnet-latest"


def query_knowledge_base(question: str, max_tools_context: int = 5) -> str:
    """
    Answer a natural language question about AI tools using Claude.
    Loads relevant tool metadata and system prompts into context, then queries Claude.
    Returns the answer as a string.
    """
    try:
        from anthropic import Anthropic
    except ImportError:
        return "anthropic package not installed. Run: pip install anthropic"

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return "ANTHROPIC_API_KEY not set."

    stats     = get_statistics()
    all_tools = get_index()

    relevant = search_tools(question)
    if not relevant:
        relevant = all_tools[:max_tools_context]

    tool_contexts = []
    for entry in relevant[:max_tools_context]:
        slug = entry.get("slug", "")
        meta = get_tool(slug)
        sp   = get_system_prompt_text(slug)
        tool_contexts.append(
            f"=== {meta.get('name', slug)} ({meta.get('type', '?')}) ===\n"
            f"Features: {json.dumps(meta.get('features', {}))}\n"
            f"Models: {json.dumps(meta.get('models', {}))}\n"
            f"System Prompt (excerpt):\n{sp[:1500]}\n"
        )

    context = (
        f"AI TOOLS KNOWLEDGE BASE\n"
        f"Total tools: {stats.get('total_tools', len(all_tools))}\n"
        f"Types: {json.dumps(stats.get('by_type', {}))}\n\n"
        + "\n\n".join(tool_contexts)
    )

    client   = Anthropic(api_key=api_key)
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=1024,
        system=(
            "You are an expert analyst of AI coding tools. "
            "Answer questions using only the knowledge base context provided. "
            "Be specific, cite tool names, and compare features when relevant."
        ),
        messages=[
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ],
    )
    return response.content[0].text


if __name__ == "__main__":
    print("AI Tools Knowledge Base — available slugs:")
    slugs = list_all_slugs()
    print(f"  {len(slugs)} tools: {', '.join(slugs[:10])}{'...' if len(slugs) > 10 else ''}")
