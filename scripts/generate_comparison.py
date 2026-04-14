#!/usr/bin/env python3
"""Generate comparison tables from YAML profile files.

Reads all YAML files from the profiles/ directory, separates them into
foundation models and AI coding tools, and generates:
  - COMPARISON_TABLE.md  (Markdown comparison tables)
  - api/comparison.json  (JSON version for programmatic access)
"""

import json
import os
import sys
from pathlib import Path

import yaml


def load_profiles(profiles_dir: Path) -> list[dict]:
    """Load all YAML profiles from the given directory."""
    profiles = []
    for filepath in sorted(profiles_dir.glob("*.yaml")):
        with open(filepath, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            if data:
                profiles.append(data)
    return profiles


def format_bool(value: bool) -> str:
    """Format a boolean as a checkmark or cross."""
    return "✅" if value else "❌"


def format_number(value) -> str:
    """Format a number with commas for readability."""
    if isinstance(value, (int, float)):
        if isinstance(value, float) and value == int(value):
            return f"{int(value):,}"
        if isinstance(value, float):
            return f"{value:,.2f}"
        return f"{value:,}"
    return str(value)


def format_price(value) -> str:
    """Format a price value."""
    if isinstance(value, (int, float)):
        if value == 0:
            return "Free"
        return f"${value:.2f}"
    return str(value)


def generate_foundation_model_table(models: list[dict]) -> str:
    """Generate Markdown table for foundation models."""
    headers = [
        "Name", "Provider", "Context Window", "Vision", "Audio",
        "Function Calling", "Code Gen", "Reasoning",
        "Input$/1M", "Output$/1M", "Open Source",
    ]
    separator = ["-" * len(h) for h in headers]

    rows = []
    for m in models:
        caps = m.get("capabilities", {})
        pricing = m.get("pricing", {})
        rows.append([
            m.get("name", ""),
            m.get("provider", ""),
            format_number(m.get("context_window", "")),
            format_bool(caps.get("vision", False)),
            format_bool(caps.get("audio", False)),
            format_bool(caps.get("function_calling", False)),
            format_bool(caps.get("code_generation", False)),
            format_bool(caps.get("reasoning", False)),
            format_price(pricing.get("input_per_1m_tokens", "")),
            format_price(pricing.get("output_per_1m_tokens", "")),
            format_bool(m.get("open_source", False)),
        ])

    lines = []
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("| " + " | ".join("---" for _ in headers) + " |")
    for row in rows:
        lines.append("| " + " | ".join(str(c) for c in row) + " |")

    return "\n".join(lines)


def generate_coding_tool_table(tools: list[dict]) -> str:
    """Generate Markdown table for AI coding tools."""
    headers = [
        "Name", "Provider", "Code Gen", "Completion", "Chat",
        "Agent Mode", "Multi-File", "Test Gen",
        "Models Used", "Free Tier", "Pro Price",
    ]

    rows = []
    for t in tools:
        caps = t.get("capabilities", {})
        pricing = t.get("pricing", {})
        models = t.get("models_used", [])
        rows.append([
            t.get("name", ""),
            t.get("provider", ""),
            format_bool(caps.get("code_generation", False)),
            format_bool(caps.get("code_completion", False)),
            format_bool(caps.get("chat_interface", False)),
            format_bool(caps.get("agent_mode", False)),
            format_bool(caps.get("multi_file_editing", False)),
            format_bool(caps.get("test_generation", False)),
            ", ".join(models) if models else "N/A",
            format_bool(pricing.get("free_tier", False)),
            format_price(pricing.get("pro_monthly", "")),
        ])

    lines = []
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("| " + " | ".join("---" for _ in headers) + " |")
    for row in rows:
        lines.append("| " + " | ".join(str(c) for c in row) + " |")

    return "\n".join(lines)


def generate_benchmark_table(models: list[dict]) -> str:
    """Generate Markdown table for benchmark scores."""
    headers = ["Name", "MMLU", "HumanEval", "MATH", "Arena ELO"]

    rows = []
    for m in models:
        bench = m.get("benchmarks", {})
        if not bench:
            continue
        rows.append([
            m.get("name", ""),
            str(bench.get("mmlu", "N/A")),
            str(bench.get("humaneval", "N/A")),
            str(bench.get("math", "N/A")),
            str(bench.get("arena_elo", "N/A")),
        ])

    lines = []
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("| " + " | ".join("---" for _ in headers) + " |")
    for row in rows:
        lines.append("| " + " | ".join(row) + " |")

    return "\n".join(lines)


def generate_markdown(foundation_models: list[dict], coding_tools: list[dict]) -> str:
    """Generate the full Markdown comparison document."""
    sections = []

    sections.append("# AI Tools Comparison Tables")
    sections.append("")
    sections.append("> Auto-generated from YAML profiles in `profiles/`. "
                    "Do not edit manually.")
    sections.append("")

    sections.append("## Foundation Models Comparison")
    sections.append("")
    sections.append(generate_foundation_model_table(foundation_models))
    sections.append("")

    sections.append("## Benchmark Scores")
    sections.append("")
    sections.append(generate_benchmark_table(foundation_models))
    sections.append("")

    sections.append("## AI Coding Tools Comparison")
    sections.append("")
    sections.append(generate_coding_tool_table(coding_tools))
    sections.append("")

    return "\n".join(sections)


def generate_json(foundation_models: list[dict], coding_tools: list[dict]) -> dict:
    """Generate the JSON comparison data."""
    return {
        "generated_by": "scripts/generate_comparison.py",
        "foundation_models": foundation_models,
        "coding_tools": coding_tools,
    }


def main() -> None:
    """Entry point: load profiles, generate outputs."""
    repo_root = Path(__file__).resolve().parent.parent
    profiles_dir = repo_root / "profiles"
    md_output = repo_root / "COMPARISON_TABLE.md"
    json_output = repo_root / "api" / "comparison.json"

    if not profiles_dir.is_dir():
        print(f"Error: profiles directory not found at {profiles_dir}", file=sys.stderr)
        sys.exit(1)

    profiles = load_profiles(profiles_dir)
    if not profiles:
        print("Error: no YAML profiles found", file=sys.stderr)
        sys.exit(1)

    foundation_models = [p for p in profiles if p.get("type") == "foundation_model"]
    coding_tools = [p for p in profiles if p.get("type") == "ai_coding_tool"]

    # Sort foundation models by name for consistent output
    foundation_models.sort(key=lambda p: p.get("name", ""))
    coding_tools.sort(key=lambda p: p.get("name", ""))

    # Generate Markdown
    md_content = generate_markdown(foundation_models, coding_tools)
    md_output.write_text(md_content, encoding="utf-8")
    print(f"✅ Generated {md_output}")

    # Generate JSON
    json_output.parent.mkdir(parents=True, exist_ok=True)
    json_data = generate_json(foundation_models, coding_tools)
    json_output.write_text(
        json.dumps(json_data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"✅ Generated {json_output}")

    print(f"\nProcessed {len(foundation_models)} foundation models "
          f"and {len(coding_tools)} coding tools.")


if __name__ == "__main__":
    main()
