---
name: rrt-user-branch-strategy
description: >-
  Helps rrt users create, validate, and repair semantic branch names that match
  their workflow. Use when starting or renaming work with `rrt branch`. DO NOT USE
  for arbitrary git branching conventions unrelated to rrt.
---

# rrt-user-branch-strategy

## User problem statement

I want my branch names to be predictable, policy-compliant, and fast to create.

## Quick start commands

```bash
rrt branch new feat "add release audit"
rrt branch rename --type fix "repair changelog parser"
rrt-hooks check-branch
```

## When to use

- Starting a new feature, fix, or maintenance branch
- Repairing a branch name after local experimentation
- Teaching teammates the allowed branch prefixes and slug shape

## Do not use for

- Replacing general git branching education
- Enforcing repository-specific branch rules outside `rrt` semantics

## Install surfaces

| Surface | Local root | Global root |
|---|---|---|
| Claude | `./.claude` | `~/.claude` |
| Codex | `./.codex` | `~/.codex` |
| Gemini | `./.gemini` | `~/.gemini` |
| Copilot | `./.github` | `~/.copilot` |

## Expected outcome / success criteria

- The user can create a valid semantic branch without memorizing the format
- Invalid branch names are repaired with `rrt` instead of ad-hoc git commands
- Branch policy checks pass before commit or push
