---
name: rrt-user-bootstrap
description: >-
  Helps rrt users bootstrap install targets, local workflow checks, and day-one
  automation safely. Use when setting up rrt in a new repository or workstation.
  DO NOT USE for repo-maintainer-only automation changes or for cloning `.claude/*`
  runtime assets into source control.
---

# rrt-user-bootstrap

## User problem statement

I want to start using `rrt` quickly without guessing which install surface,
command sequence, or safety checks I should run first.

## Quick start commands

```bash
rrt install --target copilot-local
rrt skill install --target copilot-local --dry-run
rrt doctor
```

## When to use

- First-time `rrt` setup on a repo or machine
- Choosing between local and global install targets
- Bootstrapping skills, agents, and hooks before everyday work starts

## Do not use for

- Designing new custom skills, agents, or hooks from scratch
- Editing repo-maintainer-only Claude automation for this repository

## Install surfaces

| Surface | Local root | Global root |
|---|---|---|
| Claude | `./.claude` | `~/.claude` |
| Codex | `./.codex` | `~/.codex` |
| Gemini | `./.gemini` | `~/.gemini` |
| Copilot | `./.github` | `~/.copilot` |

## Expected outcome / success criteria

- The user picks the correct install target for their toolchain
- `rrt install`, `rrt skill install`, `rrt agents install`, and `rrt hooks install` are understood
- The repository passes the initial `rrt doctor` bootstrap check
