# Execute Agent

An interactive execute agent with a simple planning loop, tool registry, built-in tools (shell, filesystem, http, python eval), and pluggable model providers (echo, OpenAI, Ollama). Supports streaming and an optional web UI over Server-Sent Events (SSE).

## Install

```bash
pip install -e .
```

For OpenAI provider:

```bash
pip install -e .[openai]
export OPENAI_API_KEY=... 
```

## Usage

- One-shot (streaming):

```bash
execute-agent --provider echo --stream "Use math.calc to compute 2*(3+4)/5"
```

- REPL:

```bash
execute-agent --provider echo --stream
```

OpenAI:

```bash
export OPENAI_API_KEY=...
execute-agent --provider openai --model gpt-4o-mini --stream "Fetch https://example.com via web.get"
```

Ollama:

```bash
execute-agent --provider ollama --model llama3.1 --stream "Hello"
```

## Web (SSE)

Install extras and run:

```bash
pip install -e .[web,openai,ollama]
uvicorn agent.runtime.web:app --reload --host 0.0.0.0 --port 8000
```

Open http://localhost:8000

Type `exit` to quit.
