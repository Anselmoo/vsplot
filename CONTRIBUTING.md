# Contributing to VSPlot

Thanks for your interest in contributing!

## Getting Started
- Requirements: Node.js LTS, VS Code, `vsce` (optional for packaging)
- Install deps:
```fish
npm ci
```
- Build/watch:
```fish
npm run compile
npm run watch
```
- Run Extension Development Host: Press F5 in VS Code

## Testing
- Manual checklist in `TESTING.md` and `TESTING_RESULTS.md`
- Please add/update docs when changing defaults (e.g., pagination)

## Scripts
- Generate images:
```fish
npm run build:images
```
- Download sample data (bash):
```bash
bash scripts/download-data.sh
```
- Download sample data (fish):
```fish
fish scripts/download-data.fish
```

## Coding Standards
- TypeScript strict mode
- Keep webview code CSP-safe (nonce, no inline event handlers)
- Prefer minimal, focused changes; avoid broad refactors unless discussed

## Architecture
- See [`docs/WEBVIEW_ARCHITECTURE.md`](docs/WEBVIEW_ARCHITECTURE.md) for webview implementation details
- Webview UI uses template-based architecture with `{{PLACEHOLDER}}` syntax
- HTML/CSS/JS are in separate files under `media/` directories

## Release
- Update `CHANGELOG.md`
- Ensure `package.json` metadata points to `Anselmoo/vsplot`
- Create a tag to trigger CI publish

## Communication
- Open issues or PRs on GitHub: https://github.com/Anselmoo/vsplot
