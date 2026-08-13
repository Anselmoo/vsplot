---
name: rrt-user-config-safety
description: >-
  Helps rrt users validate config files, version targets, and install paths
  before policy failures happen. Use when setting up or repairing rrt config.
  DO NOT USE for changing internal config loader implementation.
---

# rrt-user-config-safety

## User problem statement

I want to trust my `rrt` configuration instead of discovering mistakes only when
hooks or releases fail.

## Quick start commands

```bash
rrt config
rrt doctor
rrt release check
```

## When to use

- Adding or editing `[tool.rrt]` configuration
- Verifying version targets and pin targets after configuration changes
- Spotting install-root typos such as `.geminini` before they spread

## Do not use for

- Hand-maintaining parser internals inside `repo-release-tools`
- Replacing project-specific configuration validation unrelated to `rrt`

## Install surfaces

| Surface | Local root | Global root |
|---|---|---|
| Claude | `./.claude` | `~/.claude` |
| Codex | `./.codex` | `~/.codex` |
| Gemini | `./.gemini` | `~/.gemini` |
| Copilot | `./.github` | `~/.copilot` |

## Expected outcome / success criteria

- The active config source is understandable
- Version and install targets validate before release work proceeds
- Misconfigured paths and malformed config files are caught early
