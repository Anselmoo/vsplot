---
name: rrt-user-migration-uvx-to-installed
description: >-
  Helps rrt users migrate from `uvx --from repo-release-tools ...` one-off usage
  to an installed workflow with local or global assets. Use when moving from
  zero-install experimentation to a maintained setup. DO NOT USE for package
  publishing or maintainers changing installer internals.
---

# rrt-user-migration-uvx-to-installed

## User problem statement

I started with `uvx` because it was fast, but now I want a durable installed
workflow without breaking my daily habits.

## Quick start commands

```bash
uvx --from repo-release-tools rrt doctor
rrt install --target claude-local --dry-run
rrt install --target claude-local
```

## When to use

- Standardizing a previously ad-hoc `uvx` workflow
- Choosing whether skills, agents, and hooks belong in local or global roots
- Replacing copy-pasted examples with installed commands and assets

## Do not use for

- Packaging or publishing `repo-release-tools` releases
- Writing custom migration utilities for other CLIs

## Install surfaces

| Surface | Local root | Global root |
|---|---|---|
| Claude | `./.claude` | `~/.claude` |
| Codex | `./.codex` | `~/.codex` |
| Gemini | `./.gemini` | `~/.gemini` |
| Copilot | `./.github` | `~/.copilot` |

## Expected outcome / success criteria

- The user has a clear move from `uvx` commands to installed `rrt` commands
- Asset installation targets are chosen intentionally instead of copied blindly
- The installed workflow is documented, repeatable, and easier to maintain
