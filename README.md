# 🤖 System Prompts & Models of AI Tools

> **The largest open collection of real system prompts, tool definitions, and model configurations from 30+ AI coding assistants and agents.**

*Last Updated: April 2026*

---

## 📖 What Is This Repository?

This repository collects and documents the **actual system prompts**, **tool schemas**, and **model configurations** used by commercial and open-source AI coding tools. These are the hidden instructions that shape how AI assistants behave — extracted through reverse engineering, official documentation, and community contributions.

Whether you're building your own AI tool, studying prompt engineering, or comparing how different products approach AI-assisted development, this is your definitive reference.

---

## 🗂️ Tools Covered (37 Tools)

### 🏢 Commercial IDE-Based
| Tool | Directory | Content |
|------|-----------|---------|
| [Cursor](Cursor%20Prompts/) | `Cursor Prompts/` | Agent, Chat, Memory prompts + Tools JSON |
| [Windsurf](Windsurf/) | `Windsurf/` | Wave 11 architecture prompts + Tools |
| [Amp](Amp/) | `Amp/` | Claude 4 Sonnet & GPT-5 YAML configs |
| [Xcode (Apple)](Xcode/) | `Xcode/` | Action-based system prompts |
| [Kiro (AWS)](Kiro/) | `Kiro/` | Mode classifier, Spec, Vibe prompts |

### 🔌 IDE Extensions
| Tool | Directory | Content |
|------|-----------|---------|
| [GitHub Copilot](GitHub%20Copilot/) | `GitHub Copilot/` | See [VSCode Agent](VSCode%20Agent/) for prompts; README covers features & pricing |
| [Augment Code](Augment%20Code/) | `Augment Code/` | Claude 4 Sonnet & GPT-5 agent prompts + Tools |
| [VSCode Agent](VSCode%20Agent/) | `VSCode Agent/` | Multi-model prompts (Claude, Gemini, GPT) |
| [CodeBuddy](CodeBuddy%20Prompts/) | `CodeBuddy Prompts/` | Chat + Craft mode prompts |
| [Junie](Junie/) | `Junie/` | System prompt |

### 🖥️ Terminal / CLI
| Tool | Directory | Content |
|------|-----------|---------|
| [Claude Code](Claude%20Code/) | `Claude Code/` | System prompt + Tools JSON |
| [Anthropic](Anthropic/) | `Anthropic/` | Claude Code 2.0 + Sonnet 4.5 prompts |
| [Warp.dev](Warp.dev/) | `Warp.dev/` | AI terminal prompt |

### 🌐 Web Platforms
| Tool | Directory | Content |
|------|-----------|---------|
| [Replit](Replit/) | `Replit/` | System prompt + Tools JSON |
| [v0 (Vercel)](v0%20Prompts%20and%20Tools/) | `v0 Prompts and Tools/` | Prompt + Tools JSON |
| [Lovable](Lovable/) | `Lovable/` | Agent prompt + Tools JSON |
| [Leap.new](Leap.new/) | `Leap.new/` | Prompts + Tools JSON |
| [Same.dev](Same.dev/) | `Same.dev/` | Prompt + Tools JSON |

### 🤖 Autonomous Agents
| Tool | Directory | Content |
|------|-----------|---------|
| [Devin AI](Devin%20AI/) | `Devin AI/` | Autonomous agent prompt |
| [Manus Agent](Manus%20Agent%20Tools%20%26%20Prompt/) | `Manus Agent Tools & Prompt/` | Agent loop, Modules, Prompt + Tools |
| [Poke](Poke/) | `Poke/` | Multi-phase agent prompts (6 parts) |

### 🧩 Specialized & Others
| Tool | Directory | Content |
|------|-----------|---------|
| [Trae](Trae/) | `Trae/` | Builder + Chat mode prompts |
| [Traycer AI](Traycer%20AI/) | `Traycer AI/` | Phase + Plan mode prompts + Tools |
| [NotionAI](NotionAi/) | `NotionAi/` | Documentation-focused prompt + Tools |
| [Perplexity](Perplexity/) | `Perplexity/` | AI search prompt |
| [Qoder](Qoder/) | `Qoder/` | Quest-driven system prompts |
| [Cluely](Cluely/) | `Cluely/` | Default + Enterprise prompts |
| [Orchids.app](Orchids.app/) | `Orchids.app/` | Decision-making + System prompts |
| [Comet Assistant](Comet%20Assistant/) | `Comet Assistant/` | System prompt |
| [Z.ai Code](Z.ai%20Code/) | `Z.ai Code/` | System prompt |
| [dia](dia/) | `dia/` | System prompt |

### 🔓 Open Source
| Tool | Directory | Content |
|------|-----------|---------|
| [Bolt](Open%20Source%20prompts/Bolt/) | `Open Source prompts/Bolt/` | Full-stack dev prompts |
| [Cline](Open%20Source%20prompts/Cline/) | `Open Source prompts/Cline/` | VSCode extension prompts |
| [Codex CLI](Open%20Source%20prompts/Codex%20CLI/) | `Open Source prompts/Codex CLI/` | OpenAI CLI prompts |
| [Gemini CLI](Open%20Source%20prompts/Gemini%20CLI/) | `Open Source prompts/Gemini CLI/` | Google CLI prompts |
| [RooCode](Open%20Source%20prompts/RooCode/) | `Open Source prompts/RooCode/` | VSCode extension prompts |
| [Lumo](Open%20Source%20prompts/Lumo/) | `Open Source prompts/Lumo/` | AI tool prompts |

---

## 🏗️ Repository Structure

```
├── <Tool Name>/              # Each tool has its own directory
│   ├── Prompt.txt            # Main system prompt
│   ├── Tools.json            # Tool/function definitions (if applicable)
│   └── README.md             # Tool-specific documentation (some tools)
├── Open Source prompts/      # Open-source tools grouped together
├── metadata/                 # JSON metadata for each tool (models, pricing, platforms)
├── COMPARISON.md             # Feature comparison matrix across all tools
├── MISSING_TOOLS.md          # Tracking notable tools not yet documented
├── BEST_PRACTICES.md         # Extracted best practices from prompts
├── TOOL_PATTERNS.md          # Common patterns found across tools
├── CONTRIBUTING.md           # How to contribute
└── CHANGELOG.md              # Version history
```

---

## 📊 Quick Stats (April 2026)

| Metric | Count |
|--------|-------|
| **Tools documented** | 31+ |
| **System prompts** | 60+ files |
| **Tool/function schemas** | 18+ JSON files |
| **Open source tools** | 6 |
| **Metadata entries** | 38 JSON files |

---

## 🔥 Latest AI Models (2026)

| Model | Provider | Context Window | Key Strength |
|-------|----------|---------------|--------------|
| **Claude Opus 4.6** | Anthropic | 1M tokens | Best reasoning, 128K output |
| **Claude Sonnet 4.6** | Anthropic | 1M tokens (extended) | Best value, near-Opus performance |
| **GPT-5** | OpenAI | 256K tokens | Multi-modal, strong coding |
| **GPT-5-mini** | OpenAI | 128K tokens | Fast, cost-effective |
| **GPT-4.1** | OpenAI | 1M tokens | Long context specialist |
| **Gemini 2.5 Pro** | Google | 1M tokens | Largest free context window |
| **Gemini 3** | Google | ~2M tokens *(estimated)* | Next-gen reasoning |

---

## 🚀 Key Trends in 2026

1. **Agentic workflows** are now standard — all major tools support autonomous multi-step operations
2. **1M+ token context windows** are the new norm (Opus 4.6, GPT-4.1, Gemini 2.5 Pro)
3. **Multi-agent orchestration** — tools like Claude Code, Cursor, and Amp support parallel sub-agents
4. **Persistent memory** across sessions (Cursor, Claude Code, Amp)
5. **Auto-approve modes** — Copilot, Gemini Code Assist, Claude Code all offer hands-off execution
6. **Checkpoints & rollbacks** — built-in safety nets for autonomous changes
7. **Cloud-native integration** — Kiro (AWS), Gemini (GCP), Copilot (GitHub/Azure)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [COMPARISON.md](COMPARISON.md) | Full feature comparison matrix |
| [MISSING_TOOLS.md](MISSING_TOOLS.md) | Tools we still need to document |
| [BEST_PRACTICES.md](BEST_PRACTICES.md) | Best practices extracted from prompts |
| [TOOL_PATTERNS.md](TOOL_PATTERNS.md) | Common patterns across tools |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute to this repo |
| [HOW_TO_EXTRACT_PROMPTS.md](HOW_TO_EXTRACT_PROMPTS.md) | Guide for extracting system prompts |
| [SECURITY_PATTERNS.md](SECURITY_PATTERNS.md) | Security patterns found in prompts |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

**High-priority contributions needed:**
- System prompts from tools listed in [MISSING_TOOLS.md](MISSING_TOOLS.md)
- Updated prompts when tools release new versions
- Tool definitions (JSON schemas) for tools missing them
- Corrections to existing prompts

### Quick Start

1. Fork this repository
2. Create a directory for the tool: `ToolName/`
3. Add: `Prompt.txt`, `Tools.json` (if applicable), `README.md`
4. Update `COMPARISON.md` and `metadata/`
5. Submit a pull request

---

## ⚖️ License

See [LICENSE.md](LICENSE.md) for details.

---

## ⭐ Star History

If this repository is useful to you, please give it a star! It helps others discover this resource.

---

*This repository contains system prompts obtained through reverse engineering and public documentation. All trademarks belong to their respective owners.*
