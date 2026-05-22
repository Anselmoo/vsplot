---
name: rrt-user-release-flow
description: >-
  Helps rrt users run a safer release flow from dry-run planning through readiness
  checks and final bump execution. Use when preparing a release with changelog and
  version validation. DO NOT USE for maintainers changing GitHub Action internals.
---

# rrt-user-release-flow

## User problem statement

I want a repeatable release path that catches branch, changelog, and version
issues before I ship.

## Quick start commands

```bash
rrt doctor
rrt release check
rrt bump patch --dry-run
```

## When to use

- Preparing a release candidate from a working branch
- Running release safety checks before a final bump
- Coordinating branch naming, changelog state, and version targets together

## Do not use for

- Editing repository CI internals or release automation implementation
- Replacing project-specific deployment or publish steps outside `rrt`

## Install surfaces

| Surface | Local root | Global root |
|---|---|---|
| Claude | `./.claude` | `~/.claude` |
| Codex | `./.codex` | `~/.codex` |
| Gemini | `./.gemini` | `~/.gemini` |
| Copilot | `./.github` | `~/.copilot` |

## Expected outcome / success criteria

- Release prechecks are run before any write step
- The user has an ordered release sequence they can follow safely
- Version and changelog state are ready for the selected release bump
