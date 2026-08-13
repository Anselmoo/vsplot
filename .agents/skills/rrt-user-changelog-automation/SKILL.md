---
name: rrt-user-changelog-automation
description: >-
  Helps rrt users keep `[Unreleased]` current with less manual changelog work.
  Use when deciding between automated and manual changelog flows with rrt hooks.
  DO NOT USE for maintainers redesigning changelog internals or section mapping.
---

# rrt-user-changelog-automation

## User problem statement

I want my changelog to stay useful without turning every commit into a manual
documentation chore.

## Quick start commands

```bash
rrt-hooks update-unreleased --message-file .git/COMMIT_EDITMSG
rrt-hooks check-changelog --subject "feat: add release hints"
rrt release check
```

## When to use

- Choosing between auto-written and manually reviewed changelog entries
- Fixing missing `[Unreleased]` or missing changelog bullet issues
- Aligning commit types with changelog expectations

## Do not use for

- Free-form release note writing outside Keep-a-Changelog structure
- Repository-maintainer changes to `SECTION_MAP` or changelog parser code

## Install surfaces

| Surface | Local root | Global root |
|---|---|---|
| Claude | `./.claude` | `~/.claude` |
| Codex | `./.codex` | `~/.codex` |
| Gemini | `./.gemini` | `~/.gemini` |
| Copilot | `./.github` | `~/.copilot` |

## Expected outcome / success criteria

- `[Unreleased]` exists and stays actionable
- Changelog-relevant commits are captured consistently
- The user knows when automation is enough and when manual curation is still needed
