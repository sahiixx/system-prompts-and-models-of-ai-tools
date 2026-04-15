# Execute Agent

An interactive execute agent with a planning loop, tool registry, 26 built-in tools, and 7 pluggable model providers. Supports streaming, multi-agent orchestration, and an optional web UI over Server-Sent Events (SSE).

## Features

- **7 Model Providers** — Echo (demo), OpenAI, Anthropic Claude, Google Gemini, Mistral, Groq, Ollama (local)
- **26 Built-in Tools** — Shell, filesystem, HTTP, math, code sandbox, vector store (RAG), memory, HuggingFace Hub, arXiv search
- **Multi-Agent Orchestration** — Delegate tasks across specialized agent roles
- **Streaming** — Real-time token streaming for all providers
- **Plan-and-Build** — Two-phase execution: generate a plan, then execute each step
- **Web UI** — SSE-based browser interface with provider selection

## System Prompt Collection

This repository also serves as a curated collection of system prompts and models from 30+ AI tools:

| Prompt Collection | Description |
| --- | --- |
| [GPT-4o](GPT-4o/) | OpenAI GPT-4o system prompt with structured metadata |
| [Gemini](Gemini/) | Google Gemini 1.5 Pro system prompt |
| [Grok](Grok/) | xAI Grok-3 system prompt |
| [Mistral](Mistral/) | Mistral Large system prompt |
| [Llama](Llama/) | Meta Llama 3.1 405B system prompt |
| [Anthropic](Anthropic/) | Anthropic Claude prompts |
| [Cursor Prompts](Cursor%20Prompts/) | Cursor IDE agent prompts |
| [Claude Code](Claude%20Code/) | Claude Code system prompt and tools |
| [Windsurf](Windsurf/) | Windsurf AI coding assistant |
| [Devin AI](Devin%20AI/) | Devin autonomous agent prompt |
| ... | [30+ more collections](.) |

## Model Comparison

See [COMPARISON_TABLE.md](COMPARISON_TABLE.md) for auto-generated comparison tables, or query [api/comparison.json](api/comparison.json) programmatically.

## Install

```bash
pip install -e .
```

Install with specific providers:

```bash
pip install -e .[openai]          # OpenAI GPT models
pip install -e .[anthropic]       # Anthropic Claude models
pip install -e .[gemini]          # Google Gemini models
pip install -e .[mistral]         # Mistral AI models
pip install -e .[groq]            # Groq (fast Llama inference)
pip install -e .[ollama]          # Ollama (local models)
pip install -e .[web]             # Web UI (FastAPI + SSE)
```

## Usage

### One-shot

```bash
execute-agent --provider echo --stream "Use math.calc to compute 2*(3+4)/5"
```

### REPL

```bash
execute-agent --provider echo --stream
```

### Provider examples

```bash
# OpenAI
export OPENAI_API_KEY=...
execute-agent --provider openai --model gpt-4o-mini --stream "Hello"

# Anthropic Claude
export ANTHROPIC_API_KEY=...
execute-agent --provider anthropic --model claude-3-5-sonnet-latest --stream "Hello"

# Google Gemini
export GOOGLE_API_KEY=...
execute-agent --provider gemini --model gemini-1.5-pro --stream "Hello"

# Mistral
export MISTRAL_API_KEY=...
execute-agent --provider mistral --model mistral-large-latest --stream "Hello"

# Groq (fast Llama)
export GROQ_API_KEY=...
execute-agent --provider groq --model llama-3.1-70b-versatile --stream "Hello"

# Ollama (local)
execute-agent --provider ollama --model llama3.1 --stream "Hello"
```

### Plan-and-Build Mode

```bash
execute-agent --provider openai --plan "Build a REST API for managing tasks"
```

### List Available Tools

```bash
execute-agent --list-tools
```

## Tools

| Category | Tools |
| --- | --- |
| **Core** | `shell`, `math.calc`, `python.eval` |
| **Filesystem** | `fs.read`, `fs.write`, `view`, `save-file`, `str-replace-editor`, `remove-files` |
| **HTTP** | `http.fetch`, `web.get`, `web.search`, `web-search`, `open-browser` |
| **Code** | `grep-search`, `codebase-retrieval`, `git-commit-retrieval` |
| **RAG / Vector Store** | `vector_store.add`, `vector_store.query` |
| **Code Sandbox** | `code_sandbox.run` (Python, JavaScript, Bash) |
| **Memory** | `memory.store`, `memory.recall`, `memory.list` |
| **Real-time Data** | `huggingface.search_models`, `huggingface.model_info`, `arxiv.search` |

## Multi-Agent Orchestration

```python
from agent.core.orchestrator import Orchestrator, AgentRole
from agent.models.echo import EchoModel
from agent.core.tool_registry import ToolRegistry

orch = Orchestrator(model=EchoModel(), tools=ToolRegistry(), roles=[
    AgentRole(name="planner", description="Plans tasks", system_prompt="You are a planner."),
    AgentRole(name="coder", description="Writes code", system_prompt="You are a coder."),
])
results = orch.coordinate("Build a REST API", role_sequence=["planner", "coder"])
```

## Web UI (SSE)

```bash
pip install -e .[web,openai]
uvicorn agent.runtime.web:app --reload --host 0.0.0.0 --port 8000
```

Open http://localhost:8000 — select a provider from the dropdown and start chatting.

## Comparison / Benchmarking

Regenerate comparison tables from YAML profiles:

```bash
pip install pyyaml
python scripts/generate_comparison.py
```

This reads `profiles/*.yaml` and generates:
- `COMPARISON_TABLE.md` — Markdown comparison tables
- `api/comparison.json` — JSON for programmatic access

## Testing

```bash
pip install pytest
python -m pytest tests/unit/ -v
```
