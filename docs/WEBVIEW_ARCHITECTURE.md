# Webview Architecture

This document describes the modular architecture for VSPlot's webview components.

## Overview

VSPlot uses VS Code's webview API to render interactive data previews and chart visualizations. The webview architecture has been refactored to separate concerns and improve maintainability.

## Structure

### Provider Layer (TypeScript)
- **`src/providers/chartViewProvider.ts`** - Chart visualization provider
- **`src/providers/dataPreviewProvider.ts`** - Data preview/table provider
- **`src/providers/webviewUtils.ts`** - Shared utilities for webview management

### View Layer (HTML/CSS/JS)
- **`media/chartView/`** - Chart view assets
  - `index.html` - HTML template with placeholders
  - `styles.css` - Chart-specific styling
  - `main.js` - Chart rendering and interaction logic
  - `README.md` - Detailed documentation

- **`media/dataPreview/`** - Data preview assets
  - `index.html` - HTML template with placeholders
  - `styles.css` - Table and statistics styling
  - `main.js` - Data display and filtering logic
  - `README.md` - Detailed documentation

## Template System

### How It Works

1. **HTML Templates**: UI structure is defined in separate `.html` files using placeholder syntax `{{PLACEHOLDER}}`
2. **Provider Code**: TypeScript providers load templates and replace placeholders with runtime values
3. **Separation**: Business logic stays in TypeScript, presentation stays in HTML/CSS/JS

### Example

**Template (`media/chartView/index.html`):**
```html
<head>
    <meta http-equiv="Content-Security-Policy" content="{{CSP}}">
    <link rel="stylesheet" href="{{STYLES_URI}}">
    <script nonce="{{NONCE}}" src="{{CHARTJS_URI}}"></script>
</head>
<body data-default-chart-type="{{DEFAULT_CHART_TYPE}}">
    <!-- content -->
</body>
```

**Provider (`src/providers/chartViewProvider.ts`):**
```typescript
return loadHtmlTemplate(this._extensionUri, 'media/chartView/index.html', {
    CSP: csp,
    NONCE: nonce,
    STYLES_URI: stylesUri.toString(),
    CHARTJS_URI: chartJsUri.toString(),
    DEFAULT_CHART_TYPE: defaultChartType
});
```

## Benefits

### For Developers
- **Clear Separation**: Logic vs. presentation are clearly separated
- **Easier Updates**: Modify UI without touching TypeScript
- **Better Readability**: Smaller, focused files

### For AI/Copilot
- **Better Context**: AI can understand structure from separate files
- **Improved Suggestions**: Copilot provides better completions when HTML/CSS/JS are in dedicated files
- **Easier Navigation**: File-based structure is more intuitive

### For Maintenance
- **Version Control**: Changes to UI don't mix with logic changes
- **Testing**: UI and logic can be tested independently
- **Documentation**: Each layer has its own README

## Utility Functions

### `loadHtmlTemplate(extensionUri, templatePath, replacements)`

Loads an HTML template file and replaces all `{{PLACEHOLDER}}` occurrences with values from the `replacements` object.

**Parameters:**
- `extensionUri`: VS Code URI to extension root
- `templatePath`: Relative path to template file (e.g., `'media/chartView/index.html'`)
- `replacements`: Object mapping placeholder names to values

**Returns:** Complete HTML string with all placeholders replaced

### `getNonce()`

Generates a cryptographically random nonce for Content Security Policy.

**Returns:** 32-character random string

## Adding a New Webview

1. Create a directory under `media/` (e.g., `media/newView/`)
2. Add `index.html` with `{{PLACEHOLDER}}` syntax
3. Add `styles.css` and `main.js` files
4. Create a provider in `src/providers/` that extends `vscode.WebviewViewProvider`
5. Use `loadHtmlTemplate()` in the provider's `_getHtmlForWebview()` method
6. Document the view in a `README.md` file

## Security

All webviews use Content Security Policy (CSP) with nonce-based script execution:
- Scripts must have a `nonce` attribute matching the generated nonce
- External resources are loaded only from the extension's resource roots
- Inline scripts are blocked (except with valid nonce)

## Testing

Webviews can be tested by:
1. Using VS Code's Extension Development Host (F5)
2. Opening sample data files from `sample-data/`
3. Running automated tests with `npm test`

For more details on individual views, see their respective README files:
- [Chart View Documentation](../media/chartView/README.md)
- [Data Preview Documentation](../media/dataPreview/README.md)
