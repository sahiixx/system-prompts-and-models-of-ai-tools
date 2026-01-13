from __future__ import annotations
import argparse
import json
import os
from typing import Optional

from .core.agent import Agent, AgentConfig
from .core.memory import Memory
from .core.tool_registry import ToolRegistry
from .models.echo import EchoModel
from .models.openai import OpenAIModel
from .models.ollama import OllamaModel
from .models.anthropic import AnthropicModel
from .tools.builtin import BuiltinTools
from .tools.compat import CompatTools


def _safe_session_path(path_str: Optional[str]) -> Optional[str]:
    """Sanitize user-provided session path to avoid path traversal.

    - Only allow filename component (basename)
    - Store within a dedicated .agent_sessions directory in CWD
    - Fallback to None if input is empty
    """
    if not path_str:
        return None
    base = os.path.basename(path_str)
    # Restrict filename characters; fallback to default name if invalid
    if not base or any(ch in base for ch in ("/", "\\")):
        base = "session.json"
    # Optionally enforce a simple whitelist
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-")
    if not all(c in allowed for c in base):
        base = "session.json"
    safe_dir = os.path.abspath(os.path.join(os.getcwd(), ".agent_sessions"))
    os.makedirs(safe_dir, exist_ok=True)
    return os.path.join(safe_dir, base)


def build_agent(provider: str = "echo", model_name: Optional[str] = None, session_path: Optional[str] = None, system_prompt: Optional[str] = None) -> Agent:
    # Model
    if provider == "openai":
        model = OpenAIModel(model=model_name or "gpt-4o-mini")
    elif provider == "ollama":
        model = OllamaModel(model=model_name or "llama3.1")
    elif provider == "anthropic":
        model = AnthropicModel(model=model_name or "claude-3-5-sonnet-latest")
    else:
        model = EchoModel()

    # Tools
    registry = ToolRegistry()
    BuiltinTools(registry).register_all()
    CompatTools(registry).register_all()

    # Memory and config
    # Session persistence (sanitized path)
    memory = Memory(max_messages=200)
    safe_session_path = _safe_session_path(session_path)
    if safe_session_path and os.path.exists(safe_session_path):
        try:
            with open(safe_session_path, "r", encoding="utf-8") as f:
                memory = Memory.from_json(f.read(), max_messages=200)
        except Exception:
            pass
    config = AgentConfig(model_name=model.name)
    if system_prompt:
        config.system_prompt = system_prompt

    return Agent(model=model, tools=registry, memory=memory, config=config)


def main() -> None:
    parser = argparse.ArgumentParser(description="Interactive Execute Agent")
    parser.add_argument("prompt", nargs="*", help="One-shot message to the agent. If omitted, enters REPL mode.")
    parser.add_argument("--provider", default="echo", choices=["echo", "openai", "ollama", "anthropic"], help="Model provider")
    parser.add_argument("--model", default=None, help="Model name for provider")
    parser.add_argument("--list-tools", action="store_true", help="List available tools and exit")
    parser.add_argument("--stream", action="store_true", help="Stream output (if provider supports)")
    parser.add_argument("--session", default=None, help="Path to JSON file to persist conversation")
    parser.add_argument("--system", default=None, help="Override system prompt for the assistant")
    args = parser.parse_args()

    agent = build_agent(provider=args.provider, model_name=args.model, session_path=args.session, system_prompt=args.system or os.getenv("AGENT_SYSTEM_PROMPT"))

    if args.list_tools:
        # Build registry to list tools
        registry = ToolRegistry()
        BuiltinTools(registry).register_all()
        CompatTools(registry).register_all()
        for spec in registry.list_specs():
            print(f"- {spec['name']}: {spec['description']}")
        return

    if args.prompt:
        text = " ".join(args.prompt)
        if args.stream:
            for chunk in agent.ask_stream(text):
                if "delta" in chunk:
                    print(chunk["delta"], end="", flush=True)
                elif "tool_result" in chunk:
                    print(f"\n[tool {chunk['tool_result']['name']}] => {chunk['tool_result']['result']}")
            print()
        else:
            out = agent.ask(text)
            print(out)
        # Persist session (sanitized path)
        safe_session_path = _safe_session_path(args.session)
        if safe_session_path:
            try:
                with open(safe_session_path, "w", encoding="utf-8") as f:
                    f.write(agent.memory.to_json())
            except Exception:
                pass
        return

    # REPL
    print("Interactive Execute Agent. Type 'exit' or Ctrl-D to quit.")
    while True:
        try:
            line = input("you> ").strip()
        except EOFError:
            break
        if line.lower() in {"exit", "quit"}:
            break
        if not line:
            continue
        if args.stream:
            print("agent>", end=" ", flush=True)
            for chunk in agent.ask_stream(line):
                if "delta" in chunk:
                    print(chunk["delta"], end="", flush=True)
                elif "tool_result" in chunk:
                    print(f"\n[tool {chunk['tool_result']['name']}] => {chunk['tool_result']['result']}")
            print()
        else:
            result = agent.ask(line)
            print(f"agent> {result}")
        if args.session:
            safe_session_path = _safe_session_path(args.session)
            if safe_session_path:
                try:
                    with open(safe_session_path, "w", encoding="utf-8") as f:
                        f.write(agent.memory.to_json())
                except Exception:
                    pass


if __name__ == "__main__":
    main()
