# Change Log

All notable changes to the "vsplot" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.1.0] - 2024-10-04

### Enhanced Data Parser 🚀

This release significantly expands the data parsing capabilities of VSPlot with robust support for multiple file formats, delimiters, and edge cases.

#### Added

**File Format Support:**
- Support for `.out` files (output/result files)
- Support for `.data` files (generic data files)
- Support for `.tsv` files (tab-separated values) with automatic tab delimiter detection
- Support for `.tab` files (tab-delimited files)
- All formats now support comment line filtering and delimiter auto-detection

**Delimiter Detection:**
- Comprehensive auto-detection for 6 common delimiters: comma (`,`), pipe (`|`), semicolon (`;`), colon (`:`), tab (`\t`), space (` `)
- Smart consistency scoring algorithm that evaluates delimiter candidates across multiple lines
- User override capability via `options.delimiter` parameter for programmatic usage
- Fallback to comma delimiter when no multi-column delimiter is detected
- TSV files automatically default to tab delimiter while allowing override

**Comment Line Handling:**
- Filter lines starting with `#` (hash), `%` (percent), or `//` (double slash) by default
- Custom comment marker support via `options.commentMarkers` parameter
- Comment filtering applied to all parsers: CSV, TXT, DAT, TSV, TAB, OUT, DATA
- Proper error handling when files contain only comments or empty lines
- Preserves data integrity and row order when filtering comments

**Test Coverage:**
- 42+ comprehensive test cases across delimiter detection, comment handling, and edge cases
- Tests for empty files, whitespace-only files, mixed delimiters, and inconsistent columns
- Large dataset testing (10,000+ rows) for performance validation
- Special character handling (Unicode, emojis, symbols)
- BOM (Byte Order Mark) compatibility
- Header detection for numeric vs. text data
- Coverage thresholds enforced: 70% lines, 70% functions, 65% branches, 70% statements

**Documentation:**
- New `docs/DELIMITER_DETECTION.md` - comprehensive guide to delimiter detection with examples
- New `docs/COMMENT_HANDLING.md` - complete documentation of comment filtering features
- New `docs/TESTING_COVERAGE.md` - test suite overview and coverage metrics
- Updated `docs/SUPPORTED_FORMATS.md` - reference table for all supported formats and delimiters
- Updated `README.md` - expanded feature descriptions and format compatibility table
- Test data setup script (`scripts/setup-test-data.sh`) generates all fixtures automatically

#### Changed

**Architecture Improvements:**
- Refactored webview providers to use external HTML templates for better maintainability
- Extracted webview utilities into shared `webviewUtils.ts` module
- Improved code organization and AI/Copilot friendliness
- Enhanced JSDoc documentation for all parsing functions

**Documentation:**
- New `docs/WEBVIEW_ARCHITECTURE.md` - architectural overview of webview implementation
- New `docs/REFACTORING_SUMMARY.md` - summary of code organization improvements

#### Technical Details

**Parser Features:**
- `parseDataFile(uri, options?)` - Main entry point with optional delimiter and comment marker overrides
- `parseDelimited()` - Unified parser for TXT, DAT, TSV, TAB, OUT, DATA with auto-detection
- `isCommentLine()` - Configurable comment detection supporting multiple marker types
- Consistency scoring evaluates delimiter candidates across first 6 lines for robustness

**Edge Case Handling:**
- Empty files and whitespace-only files throw descriptive errors
- Mixed delimiters detected by consistency algorithm
- Malformed data with inconsistent columns parsed gracefully
- Quoted CSV values containing delimiters handled correctly
- Leading/trailing empty lines automatically filtered
- BOM markers handled transparently

## [0.0.1] - Initial Release

- Initial release: Data Preview (search/sort/pagination, delimiter auto-detect/override, export filtered, stats with compact/icons toggles) and Chart View (Chart.js v4, legend/color, zoom and drag-zoom, categorical aggregation, Y2 axis, formatting controls, stats/meta cards). Added global defaults and per-file persistence.
