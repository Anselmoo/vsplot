---
name: rrt-user-commit-quality
description: >-
  Helps rrt users write conventional commits with clear intent and fewer rejected
  commits. Use when shaping commit messages or triaging commit lint failures.
  DO NOT USE for changelog authoring without a commit-quality decision.
---

# rrt-user-commit-quality

## User problem statement

I want commit messages that pass policy checks and still explain the change well.

## Quick start commands

```bash
rrt git commit --type fix "repair version sync"
rrt-hooks commit-msg .git/COMMIT_EDITMSG
git log -1 --format=%s
```

## When to use

- Writing a new Conventional Commit message
- Fixing commit-msg hook failures
- Choosing the right type and optional scope for a change

## Do not use for

- Editing changelog structure without a commit message decision
- General git history rewriting or repository policy exceptions

## Install surfaces

| Surface | Local root | Global root |
|---|---|---|
| Claude | `./.claude` | `~/.claude` |
| Codex | `./.codex` | `~/.codex` |
| Gemini | `./.gemini` | `~/.gemini` |
| Copilot | `./.github` | `~/.copilot` |

## Expected outcome / success criteria

- The first-line commit subject matches Conventional Commits
- The selected type reflects release and changelog intent
- Commit policy hooks pass without manual guesswork
