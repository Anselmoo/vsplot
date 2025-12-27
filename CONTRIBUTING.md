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
- Setup test data:
```bash
bash scripts/setup-test-data.sh
```

## Linting & Formatting
We use **Biome** for linting and formatting. Run locally:

```bash
# Run linting
npm run lint

# Auto-format files
npm run format
```

We provide Husky + lint-staged for pre-commit checks. After installing dev dependencies, enable Git hooks with:

```bash
npm run prepare
```

CI: a GitHub Actions job (`.github/workflows/biome.yml`) runs Biome on pushes and PRs and will fail when Biome reports diagnostics.

## Coding Standards
- TypeScript strict mode
- Keep webview code CSP-safe (nonce, no inline event handlers)
- Prefer minimal, focused changes; avoid broad refactors unless discussed

## Architecture
- See [`docs/WEBVIEW_ARCHITECTURE.md`](docs/WEBVIEW_ARCHITECTURE.md) for webview implementation details
- Webview UI uses template-based architecture with `{{PLACEHOLDER}}` syntax
- HTML/CSS/JS are in separate files under `media/` directories

## Release
- Update `CHANGELOG.md` with the new version changes
- Ensure `package.json` metadata points to `Anselmoo/vsplot`
- Create a tag **from the main branch** to trigger CI publish:
  ```bash
  # Ensure you're on main and up to date
  git checkout main
  git pull origin main
  
  # Create and push the tag (e.g., v0.2.1)
  git tag v0.2.1
  git push origin v0.2.1
  ```

### Release Requirements
The automated release workflow requires:
1. **Tag from main**: The release tag must be created from the main branch
2. **VSCE_PAT secret**: A Personal Access Token for VS Code Marketplace publishing
   - Create at: https://dev.azure.com
   - Required scope: `Marketplace (Manage)`
   - Add to repository secrets as `VSCE_PAT`
3. **Workflow permissions**: The repository must have workflow permissions to create releases (configured in workflow file)

## Communication
- Open issues or PRs on GitHub: https://github.com/Anselmoo/vsplot
