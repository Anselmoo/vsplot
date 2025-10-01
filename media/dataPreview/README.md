# Data Preview Webview

This directory contains the modularized UI components for the data preview webview in VSPlot.

## Structure

- **`styles.css`** - All CSS styling for the data preview UI
  - VSCode-themed colors using CSS variables
  - Responsive table layout with sticky headers
  - Statistics panel styling with compact mode support
  - Button and form input styling

- **`main.js`** - JavaScript logic for data preview functionality
  - Data display and pagination
  - Search and filtering
  - Column sorting
  - Row selection
  - Statistics calculation
  - Export and chart creation
  - State persistence using VSCode API

- **`index.html`** - (Template) HTML structure loaded dynamically by TypeScript
  - Currently embedded in `dataPreviewProvider.ts`
  - Contains the skeleton structure for the webview

## Configuration

The webview receives configuration through data attributes on the `<body>` element:

- `data-rows-per-page` - Number of rows to display per page (default: 150)
- `data-compact-cards` - Whether to use compact stats cards (true/false)
- `data-show-icons` - Whether to show icons in stats (true/false)

## Message Protocol

The webview communicates with the extension host using the VSCode Webview Message API:

### Messages from Extension → Webview
- `showData` - Displays data in the preview
  - `data.fileName` - Name of the file
  - `data.fileType` - Type of file (csv, json, etc.)
  - `data.headers` - Column headers array
  - `data.rows` - Data rows array
  - `data.totalRows` - Total number of rows
  - `data.detectedDelimiter` - Detected delimiter character

### Messages from Webview → Extension
- `exportData` - Export filtered data to CSV
  - `data` - Filtered dataset
  - `selectedRows` - Array of selected row indices

- `createChart` - Create a chart from the data
  - `data` - Filtered dataset
  - `selectedRows` - Array of selected row indices

- `reparse` - Reparse file with different delimiter
  - `delimiter` - Delimiter character or 'auto'

## Features

### Data Display
- Paginated table view with configurable rows per page
- Sticky table headers
- Row selection with checkbox
- Click to toggle row selection

### Search & Filter
- Real-time search across all columns
- Case-insensitive matching
- Resets to page 1 on search

### Sorting
- Click column headers to sort
- Toggle between ascending/descending
- Handles numeric and string values
- Null values sorted to end

### Statistics
- Column-level statistics
- Option to calculate on selected rows only
- Statistics shown:
  - Data points count
  - Min, Max values
  - Average (mean)
  - Median
  - Standard deviation
- Auto-selects first numeric column

### Export
- Export filtered data to CSV
- Preserves current filter/search state
- Proper CSV escaping for quotes and newlines

### State Persistence
- Compact mode preference per file
- Icon display preference per file
- Stored using VSCode state API

## Development

### Modifying Styles
Edit `styles.css` directly. Changes will be reflected on webview reload.

### Modifying Logic
Edit `main.js` directly. Use browser DevTools to debug:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "Developer: Toggle Developer Tools"
3. Navigate to the webview frame in the debugger

### Modifying HTML Structure
Currently the HTML is embedded in the TypeScript provider. To modify:
1. Edit the HTML template in `src/providers/dataPreviewProvider.ts`
2. Rebuild with `npm run compile`

## Security

The webview uses Content Security Policy (CSP) to restrict resource loading:
- Scripts must have a nonce attribute
- Styles are allowed from the extension only (plus inline for VSCode variables)
- No external resources are loaded

## Testing

To test changes:
1. Rebuild: `npm run compile`
2. Press F5 to launch Extension Development Host
3. Open a CSV or JSON file
4. Run command "VSPlot: Preview Data"
