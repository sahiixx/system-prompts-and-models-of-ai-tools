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
from .tools.builtin import BuiltinTools
from .tools.compat import CompatTools


def build_agent(provider: str = "echo", model_name: Optional[str] = None) -> Agent:
    # Model
    if provider == "openai":
        model = OpenAIModel(model=model_name or "gpt-4o-mini")
    elif provider == "ollama":
        model = OllamaModel(model=model_name or "llama3.1")
    else:
        model = EchoModel()

    # Tools
    registry = ToolRegistry()
    BuiltinTools(registry).register_all()
    CompatTools(registry).register_all()

    # Memory and config
    memory = Memory(max_messages=200)
    config = AgentConfig(model_name=model.name)

    return Agent(model=model, tools=registry, memory=memory, config=config)


def main() -> None:
    parser = argparse.ArgumentParser(description="Interactive Execute Agent")
    parser.add_argument("prompt", nargs="*", help="One-shot message to the agent. If omitted, enters REPL mode.")
    parser.add_argument("--provider", default="echo", choices=["echo", "openai", "ollama"], help="Model provider")
    parser.add_argument("--model", default=None, help="Model name for provider")
    parser.add_argument("--list-tools", action="store_true", help="List available tools and exit")
    args = parser.parse_args()

    agent = build_agent(provider=args.provider, model_name=args.model)

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
        out = agent.ask(text)
        print(out)
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
        result = agent.ask(line)
        print(f"agent> {result}")


if __name__ == "__main__":
    main()
