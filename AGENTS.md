# Agent Instructions — system-prompts-and-models-of-ai-tools (fork)

> **This is a fork.** These instructions are local to this fork and are not
> intended for upstream. Exclude this file from any upstream pull request.

## Models (Azure Foundry — resource `admin-3443-resourche`)

| Purpose | Deployment | Endpoint |
|---|---|---|
| Default / general | `gpt-5.6-sol` | `/openai/v1/chat/completions` |
| Deep reasoning | `claude-opus-5` | `/openai/v1/responses` **only** |
| Legacy / stable | `gpt-5` | `/openai/v1/chat/completions` |
| Embeddings | `text-embedding-3-small` | `/openai/v1/embeddings` |

Base URL: `https://admin-3443-resourche.openai.azure.com/openai/v1`
Auth: `api-key` header from `$AZURE_FOUNDRY_API_KEY`. **Never hardcode the key.**

### Known constraint
`claude-opus-5` returns HTTP 404 `api_not_supported` on `/chat/completions`.
It answers **only** via the Responses API.

## Hermes usage

```
/model azure        # gpt-5.6-sol (default)
/model azure-opus   # claude-opus-5
/model azure-gpt5   # gpt-5
```

## Fork conventions

- Keep fork-local changes in separate commits from upstream-bound work.
- Rebase on upstream before opening a PR; drop this file from the PR branch.
- Secrets live in environment variables, never in tracked files.
