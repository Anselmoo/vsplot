---
name: rrt-user-versioning
description: >-
  Guides rrt users through version bumps, semver decisions, and version target
  previews. Use when planning or applying a release bump with rrt. DO NOT USE for
  manual version-file surgery or for repository-maintainer-only release tooling changes.
---

# rrt-user-versioning

## User problem statement

I want to change versions with confidence and see exactly what `rrt` will bump
before I mutate any files.

## Quick start commands

```bash
rrt bump patch --dry-run
rrt bump minor --dry-run
rrt release check
```

## When to use

- Deciding between patch, minor, and major bumps
- Previewing version target updates before applying them
- Verifying that version targets stay in sync after edits

## Do not use for

- Hand-editing version files without `rrt`
- Maintaining packaging internals for the `repo-release-tools` project itself

## Install surfaces

| Surface | Local root | Global root |
|---|---|---|
| Claude | `./.claude` | `~/.claude` |
| Codex | `./.codex` | `~/.codex` |
| Gemini | `./.gemini` | `~/.gemini` |
| Copilot | `./.github` | `~/.copilot` |

## Expected outcome / success criteria

- A semver decision is made with a clear rationale
- The user previews the bump before applying it
- `rrt release check` passes after the chosen bump workflow
