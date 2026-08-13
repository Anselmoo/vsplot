---
name: rrt-user-docs-consistency
description: >-
  Helps rrt users keep generated docs, command references, and source-owned docs
  aligned. Use when docs drift from command behavior or source assets change.
  DO NOT USE for long-form product writing unrelated to rrt automation.
---

# rrt-user-docs-consistency

## User problem statement

I want command docs and generated docs to stay in sync so contributors are not
following stale instructions.

## Quick start commands

```bash
rrt docs check
rrt docs publish
poe sync-assets
```

## When to use

- Source-owned command docs changed and generated docs must catch up
- Skill, agent, or hook assets changed and docs should mention them
- A help screen and its published docs disagree

## Do not use for

- Writing standalone tutorials that are not sourced from the repo
- Repo-maintainer-only docs pipeline experiments

## Install surfaces

| Surface | Local root | Global root |
|---|---|---|
| Claude | `./.claude` | `~/.claude` |
| Codex | `./.codex` | `~/.codex` |
| Gemini | `./.gemini` | `~/.gemini` |
| Copilot | `./.github` | `~/.copilot` |

## Expected outcome / success criteria

- Source-owned docs and generated docs describe the same interface
- Asset inventories in docs match the shipped files
- `rrt docs check` passes after the update
