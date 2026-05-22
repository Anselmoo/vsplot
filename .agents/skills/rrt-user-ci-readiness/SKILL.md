---
name: rrt-user-ci-readiness
description: >-
  Helps rrt users run local preflight checks that mirror common CI gates for
  branch, changelog, docs, and release readiness. Use when you want fewer CI
  surprises before opening a PR. DO NOT USE for editing CI pipeline internals.
---

# rrt-user-ci-readiness

## User problem statement

I want to catch the failures that CI will catch before I push or open a PR.

## Quick start commands

```bash
rrt doctor
rrt release check
rrt docs check
```

## When to use

- Running a local preflight before push or PR creation
- Triaging a policy failure that only showed up in CI
- Sequencing docs, release, and workflow checks in one pass

## Do not use for

- Designing CI workflows or action YAML from scratch
- Replacing project-specific build or test commands that `rrt` does not own

## Install surfaces

| Surface | Local root | Global root |
|---|---|---|
| Claude | `./.claude` | `~/.claude` |
| Codex | `./.codex` | `~/.codex` |
| Gemini | `./.gemini` | `~/.gemini` |
| Copilot | `./.github` | `~/.copilot` |

## Expected outcome / success criteria

- The user has a practical local preflight sequence
- Common policy failures are found before CI reports them
- Docs, release, and hook-facing checks are run in the right order
