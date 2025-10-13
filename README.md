# Execute Agent

An interactive execute agent with a simple planning loop, tool registry, built-in tools (shell, filesystem, http, python eval), and pluggable model providers (echo, OpenAI).

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

- One-shot:

```bash
execute-agent "list files" --provider echo
```

- REPL:

```bash
execute-agent --provider echo
```

Type `exit` to quit.
