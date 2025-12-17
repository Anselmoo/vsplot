# Change Log

All notable changes to the "vsplot" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.2] - 2025-12-17

### Fixed
- Fixed scatter plot incorrectly displaying all points at the same X position when X-axis contains numeric values (fixes #30)
- Improved `isTimeColumn()` detection to skip pure numbers, preventing false positive date detection

## [0.2.1] - 2025-12-14

### Added
- Comprehensive CI/CD pipeline with parallel job execution
- Security audit stage for dependency vulnerability scanning
- Multi-version Node.js testing (20, 22)
- Sigstore artifact signing for supply chain security
- OIDC authentication for Codecov uploads
- Automated marketplace publishing on version tags
- GitHub release creation with signed artifacts
- Detailed CI/CD pipeline documentation

### Changed
- Improved error messages and workflow summaries

## [0.2.0] - 2025-10-10

### Changed
- Refactored webview providers to use external HTML templates for better maintainability
- Extracted webview utilities into shared `webviewUtils.ts` module
- Improved code organization and AI/Copilot friendliness

### Added
- Architecture documentation in `docs/WEBVIEW_ARCHITECTURE.md`
- Refactoring summary in `docs/REFACTORING_SUMMARY.md`

## [0.1.0] - 2025-09-28

- Initial release: Data Preview (search/sort/pagination, delimiter auto-detect/override, export filtered, stats with compact/icons toggles) and Chart View (Chart.js v4, legend/color, zoom and drag-zoom, categorical aggregation, Y2 axis, formatting controls, stats/meta cards). Added global defaults and per-file persistence.
