# Test Coverage for VSPlot

## Overview

This document describes the comprehensive test coverage for VSPlot, including the testing strategy, coverage metrics, and known limitations.

## Testing Strategy

VSPlot uses a **dependency injection pattern** for testability, separating:
1. **Unit Tests** - Test extracted business logic with mocked dependencies
2. **Integration Tests** - Test VS Code command execution and webview integration

### Unit Testing with Dependency Injection

Core logic is extracted into testable functions that accept injectable dependencies:

```typescript
// Example: Command logic with dependency injection
export interface CommandDependencies {
    getActiveEditorUri: () => vscode.Uri | undefined;
    parseDataFile: (uri: vscode.Uri) => Promise<ParsedData | null>;
    showErrorMessage: (msg: string) => void;
    // ... other dependencies
}

export async function executePreviewData(
    uri: vscode.Uri | undefined,
    deps: CommandDependencies,
    previewProvider: { showPreview: (uri: vscode.Uri, data: ParsedData) => Promise<void> }
): Promise<CommandResult> {
    // Testable logic
}
```

This pattern allows testing all code paths without requiring VS Code runtime.

## Test Suites

### 1. Command Logic Tests (`commandLogic.test.ts`)

- **18 tests** covering extracted command functions
- `resolveUri()` - URI resolution with fallback to active editor
- `executePreviewData()` - Data preview command logic
- `executePlotData()` - Chart plotting command logic
- `executeOpenDataViewer()` - File picker and preview workflow
- All error paths and edge cases fully covered

### 2. Message Handler Tests (`messageHandlers.test.ts`)

- **35 tests** covering webview message handling
- `handleExportData()` - CSV export from filtered data
- `handleCreateChart()` - Chart creation from preview
- `handleReparse()` - Re-parse with different delimiter
- `toCSV()` - CSV generation with proper escaping
- Default dependency factory coverage

### 3. Comment Line Handling Tests (`comment.test.ts`)

- **8 tests** covering comment line filtering functionality
- Tests for hash (#), percent (%), and slash (//) comment markers
- Custom comment marker configuration
- Mixed comment markers in same file
- Files with only comments
- Comments in middle of data

### 4. Delimiter Detection Tests (`delimiter.test.ts`)

- **8 tests** covering delimiter auto-detection
- Tests for common delimiters: comma, pipe, semicolon, colon, tab, space
- Delimiter override functionality
- Consistency-based delimiter detection
- Single column fallback handling

### 5. Edge Cases and Robustness Tests (`edgecases.test.ts`)

- **14 tests** covering comprehensive edge cases
- Empty file handling
- Whitespace-only files
- Mixed delimiters in same file
- Malformed data with inconsistent column counts
- Large dataset handling (10,000 rows)
- Special characters in data (Unicode, emojis, etc.)
- Very long lines (1000+ characters per cell)
- Numeric-only data header detection
- Mixed numeric/text headers
- BOM (Byte Order Mark) handling

### 6. CSV Parsing Edge Cases Tests (`csvParsing.test.ts`)

- **10 tests** covering CSV parsing edge cases
- Quoted fields containing commas
- Empty quoted fields
- Trailing commas
- Header-only files
- All-numeric data (auto-generated headers)
- Trimming spaces around values

### 7. JSON Parsing Tests (`json.test.ts`)

- **9 tests** covering JSON data parsing
- Array of primitives (strings, numbers, mixed types)
- Single object parsing
- Null values in objects
- Invalid JSON error handling

### 8. Data Commands Tests (`dataCommands.test.ts`)

- **17 tests** covering command execution and error handling
- Unsupported file type handling
- All supported file formats (.csv, .json, .tsv, .tab, .out, .data)
- Active editor fallback
- Parse failure handling

### 9. Extension Integration Tests (`extension.test.ts`)

- **14 tests** covering extension functionality
- Data preview and plotting commands
- Chart type configurations
- Chart features (aggregation, multiple axes, etc.)

### 10. Provider Tests (`providers.test.ts`)

- **10 tests** covering webview provider behavior
- DataPreviewProvider integration
- ChartViewProvider integration
- Chart configuration application

## Coverage Metrics

### Current Coverage (as of December 2024)

| Metric | Coverage | Target |
|--------|----------|--------|
| Lines | 87.91% | 87% |
| Branches | 88.23% | 87% |
| Functions | 83.01% | 80% |
| Statements | 87.91% | 87% |

### Target Thresholds

Local thresholds enforced by `scripts/check-coverage.mjs`:
- **Lines**: 87%
- **Branches**: 87%
- **Functions**: 80%
- **Statements**: 87%

Codecov targets (defined in `codecov.yml`):
- **Project**: 90% with 5% threshold
- **Patch**: 90% with 10% threshold

### Known Coverage Limitations

Approximately 2-3% of code is inherently difficult to test:

1. **`resolveWebviewView` methods** (~35 lines each provider)
   - Requires VS Code to actually resolve a webview view
   - Only callable by VS Code's webview infrastructure

2. **Inline arrow functions in dependency factories** (~10 functions)
   - Default implementations wrapping VS Code APIs
   - Count as separate functions in coverage metrics

3. **Panel creation `else` branches** (~20 lines each provider)
   - Creates webview panel when no existing view
   - Tests run but coverage instrumentation has issues

## Running Tests

### Run all tests:
```bash
npm test
```

### Run tests with coverage:
```bash
npm run test:coverage
```

### View coverage report:
After running coverage, open `coverage/index.html` in a browser.

## Coverage Reporting

Coverage reports are automatically generated and uploaded to Codecov on every push and pull request via GitHub Actions.

- **Codecov Dashboard**: https://codecov.io/gh/Anselmoo/vsplot
- **Coverage Badge**: Displayed in README.md

## Test Data

Test fixtures are automatically generated by `scripts/setup-test-data.sh` and stored in the `test-data/` directory (gitignored).

## CI/CD Integration

The GitHub Actions workflow includes:
1. Linting
2. Compilation
3. Test data setup
4. Test execution with coverage
5. Coverage upload to Codecov with threshold enforcement

## Architecture for Testability

### Dependency Injection Pattern

All command and message handler logic uses dependency injection:

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Runtime                           │
├─────────────────────────────────────────────────────────────┤
│  registerDataCommands()          DataPreviewProvider        │
│       │                               │                      │
│       ▼                               ▼                      │
│  ┌──────────────┐              ┌──────────────────┐         │
│  │ Command      │              │ Message Handler  │         │
│  │ Wrapper      │              │ Wrapper          │         │
│  └──────┬───────┘              └────────┬─────────┘         │
│         │                               │                    │
│         ▼                               ▼                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │       Extracted Testable Functions               │       │
│  │  • resolveUri()      • handleExportData()        │       │
│  │  • executePreviewData() • handleCreateChart()    │       │
│  │  • executePlotData()    • handleReparse()        │       │
│  │  • executeOpenDataViewer() • toCSV()             │       │
│  └──────────────────────────────────────────────────┘       │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │        Injected Dependencies Interface           │       │
│  │  CommandDependencies / MessageHandlerDependencies │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Benefits

1. **Full code path coverage** - All branches testable via mocked dependencies
2. **Fast tests** - No VS Code runtime needed for unit tests
3. **Reliable tests** - No flaky UI interactions
4. **Clear separation** - Business logic isolated from VS Code APIs

## Future Enhancements

Potential areas for expanded test coverage:
- Performance benchmarking for very large files (100K+ rows)
- Streaming parser for memory efficiency
- Visual regression testing for webview UI
- End-to-end testing with actual webview rendering
