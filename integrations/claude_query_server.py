#!/usr/bin/env python3
"""
claude_query_server.py — HTTP server exposing the AI Tools knowledge base.

Run with: python3 integrations/claude_query_server.py [--port 8200]

Endpoints:
  GET  /health                         — liveness check
  GET  /.well-known/agent.json         — A2A Agent Card (discoverable by agency-agents)
  GET  /tools                          — full tool index
  GET  /tools/{slug}                   — single tool metadata
  GET  /tools/{slug}/prompt            — raw system prompt text
  POST /search  {"query": "..."}       — keyword search
  POST /query   {"question": "..."}    — Claude-powered Q&A
"""
import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import uvicorn
    from starlette.applications import Starlette
    from starlette.requests import Request
    from starlette.responses import JSONResponse, PlainTextResponse
    from starlette.routing import Route
except ImportError:
    print("Missing deps — run: pip install uvicorn starlette")
    raise

from integrations.agency_bridge import (
    get_index,
    get_tool,
    get_statistics,
    get_system_prompt_text,
    search_tools,
    query_knowledge_base,
)

SERVER_PORT = int(os.environ.get("KNOWLEDGE_SERVER_PORT", 8200))

AGENT_CARD = {
    "name": "AI-Tools-Knowledge-Base",
    "description": (
        "Knowledge base of 37 AI tools' system prompts, features, and metadata. "
        "Supports natural-language queries powered by Claude Sonnet 4.6."
    ),
    "version": "1.0.0",
    "url": f"http://localhost:{SERVER_PORT}",
    "provider": {
        "organization": "sahiixx",
        "url": "https://github.com/sahiixx/system-prompts-and-models-of-ai-tools",
    },
    "capabilities": {"streaming": False, "a2aVersion": "0.3"},
    "skills": [
        {"id": "query",      "name": "query",      "description": "Natural language Q&A about AI tools"},
        {"id": "search",     "name": "search",     "description": "Keyword search across all tools"},
        {"id": "get_tool",   "name": "get_tool",   "description": "Get metadata for a specific tool by slug"},
        {"id": "get_prompt", "name": "get_prompt", "description": "Get raw system prompt text for a tool"},
    ],
    "metadata": {"model": "claude-3-5-sonnet-latest", "tools_count": len(get_index())},
}


async def health(request: Request) -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "ai-tools-knowledge-base"})


async def agent_card(request: Request) -> JSONResponse:
    return JSONResponse(AGENT_CARD)


async def list_tools(request: Request) -> JSONResponse:
    tools = get_index()
    return JSONResponse({"tools": tools, "count": len(tools)})


async def tool_detail(request: Request) -> JSONResponse:
    slug = request.path_params["slug"]
    data = get_tool(slug)
    if not data:
        return JSONResponse({"error": f"Tool '{slug}' not found"}, status_code=404)
    return JSONResponse(data)


async def tool_prompt(request: Request) -> PlainTextResponse:
    slug = request.path_params["slug"]
    tool = get_tool(slug)
    if not tool:
        return PlainTextResponse(f"Tool '{slug}' not found", status_code=404)
    text = get_system_prompt_text(slug)
    if text.startswith("No system prompt") or text.startswith("System prompt file not found"):
        return PlainTextResponse(text, status_code=404)
    return PlainTextResponse(text)


async def search(request: Request) -> JSONResponse:
    body = await request.json()
    q    = body.get("query", "")
    if not q:
        return JSONResponse({"error": "query required"}, status_code=400)
    return JSONResponse({"results": search_tools(q)})


async def query(request: Request) -> JSONResponse:
    body     = await request.json()
    question = body.get("question", "")
    if not question:
        return JSONResponse({"error": "question required"}, status_code=400)
    from starlette.concurrency import run_in_threadpool
    answer = await run_in_threadpool(query_knowledge_base, question)
    return JSONResponse({"answer": answer, "question": question})


app = Starlette(
    routes=[
        Route("/health",                 health,      methods=["GET"]),
        Route("/.well-known/agent.json", agent_card,  methods=["GET"]),
        Route("/tools",                  list_tools,  methods=["GET"]),
        Route("/tools/{slug}",           tool_detail, methods=["GET"]),
        Route("/tools/{slug}/prompt",    tool_prompt, methods=["GET"]),
        Route("/search",                 search,      methods=["POST"]),
        Route("/query",                  query,       methods=["POST"]),
    ]
)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=SERVER_PORT)
    args = parser.parse_args()
    print(f"AI Tools Knowledge Base server — http://localhost:{args.port}")
    print(f"  Tools:   GET  http://localhost:{args.port}/tools")
    print(f"  A2A:     GET  http://localhost:{args.port}/.well-known/agent.json")
    print(f"  Query:   POST http://localhost:{args.port}/query")
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="info")
