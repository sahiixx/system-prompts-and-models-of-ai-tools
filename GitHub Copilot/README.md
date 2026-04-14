# GitHub Copilot

**Type:** IDE Extension + Agent Mode
**Developer:** GitHub (Microsoft)
**Status:** Active (Production)
**Last Updated:** April 2026

## Overview

GitHub Copilot is the most widely adopted AI coding assistant, used by 90% of Fortune 100 companies. It operates as an IDE extension across VS Code, JetBrains, Neovim, and Visual Studio, offering inline code completion, chat, and autonomous agent mode.

## Models Supported

| Model | Provider | Use Case |
|-------|----------|----------|
| GPT-5 | OpenAI | Primary model for completions and chat |
| GPT-5-mini | OpenAI | Fast completions |
| GPT-4.1 | OpenAI | Long context operations |
| Claude Sonnet 4 | Anthropic | Alternative model for complex reasoning |
| Gemini 2.5 Pro | Google | Alternative model option |

## Key Features (2026)

- **Agent Mode**: Autonomous multi-step task execution across multiple files
- **Auto-Approve Mode**: Execute entire plans without manual step-by-step approval
- **Inline Diff Review**: See proposed changes directly in the IDE before applying
- **Checkpoint/Undo**: Rollback points before large changes
- **Multi-file & Multi-repo**: Operates across monorepos and related projects
- **Context Awareness**: Parses codebase relationships and dependencies
- **Code Review**: AI-powered pull request reviews
- **Tab Completion**: Real-time inline suggestions (fastest response time)
- **Chat Interface**: Natural language coding assistance
- **GitHub Integration**: Deep integration with Issues, PRs, Actions, and Codespaces

## Pricing (2026)

| Plan | Price | Features |
|------|-------|----------|
| Free | $0/mo | Limited completions and chat |
| Pro | $10/mo | Unlimited completions, chat, agent mode |
| Pro+ | $39/mo | Advanced features, priority access |
| Business | $19/user/mo | Organization management, policy controls |
| Enterprise | $39/user/mo | SSO, audit logs, IP indemnity |

## IDE Support

- VS Code
- Visual Studio
- JetBrains IDEs (IntelliJ, PyCharm, WebStorm, etc.)
- Neovim
- Xcode (limited)
- Eclipse (limited)

## Files in This Directory

- `README.md` - This documentation file

> **Note:** GitHub Copilot system prompts are partially documented in the [VSCode Agent](../VSCode%20Agent/) directory, which contains model-specific prompts used by the VS Code Copilot extension. Community contributions of additional Copilot prompts are welcome.

## Links

- Website: https://github.com/features/copilot
- Documentation: https://docs.github.com/copilot
