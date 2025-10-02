# Chart View Module

This directory contains the modular webview assets for the VSPlot chart visualization feature.

## Purpose

The chart view allows users to create interactive visualizations from their data files. It supports multiple chart types including line, bar, scatter, pie, doughnut, and radar charts.

## Architecture

The chart view is split into separate files for maintainability and AI-friendliness:

### Files

- **`index.html`** - HTML template structure
- **`styles.css`** - All CSS styling using VS Code theme variables
- **`main.js`** - JavaScript logic for chart rendering and interactions
- **`README.md`** - This documentation file

### Integration

The TypeScript provider (`src/providers/chartViewProvider.ts`) loads these files dynamically using VS Code's webview URI API with proper Content Security Policy (CSP) enforcement.

## Features

### Chart Types Supported

- **Line**: Time series and trend visualization
- **Bar**: Category comparison with aggregation support
- **Scatter**: Correlation and distribution analysis
- **Pie/Doughnut**: Proportion and composition visualization
- **Radar**: Multi-dimensional comparison

### Advanced Capabilities

- **Dual Y-Axis**: Plot two different metrics with independent scales
- **Time Series**: Automatic detection and handling of date/time columns
- **Aggregation**: Sum, count, average, min, max for categorical data
- **Zoom & Pan**: Interactive zoom using wheel/pinch or drag (with Shift key)
- **Color Customization**: Pick custom colors for chart elements
- **Style Presets**: Clean, Soft, and Vibrant color schemes
- **Number Formatting**: Configurable decimal places and thousands separators
- **Statistics**: Automatic calculation of min, max, average, median, and standard deviation
- **State Persistence**: Chart configuration saved per file

### User Interface

#### Controls

- Chart type selector (line, bar, scatter, pie, doughnut, radar)
- X-axis and Y-axis column selectors
- Optional Y2-axis for dual-axis charts
- Legend toggle
- Color picker for primary dataset
- Drag zoom toggle
- Aggregation function selector (for categorical data)
- Style preset selector
- Number formatting options
- Compact cards toggle
- Icons toggle

#### Display Elements

- Chart canvas with zoom controls overlay
- Statistics card showing data point count, min, max, average, median, standard deviation
- Dataset metadata card showing file name, column count, row count
- Error message display for validation errors

## Data Flow

1. **Extension → Webview**: Provider sends `showChart` message with parsed data
2. **Webview Processing**: JavaScript initializes UI, populates selectors, restores state
3. **Chart Rendering**: Chart.js creates visualization based on selected configuration
4. **User Interaction**: Controls update chart in real-time
5. **State Persistence**: Configuration saved to VS Code state API
6. **Export**: Chart can be exported as PNG image

## Message Protocol

### From Extension to Webview

- `showChart`: Provide data and trigger chart initialization
  ```javascript
  {
    type: 'showChart',
    data: {
      fileName: string,
      headers: string[],
      rows: any[][],
      totalRows: number
    }
  }
  ```

- `vsplot:test:setConfig`: Apply configuration (for testing)
  ```javascript
  {
    type: 'vsplot:test:setConfig',
    id: string,
    payload: {
      chartType?: string,
      x?: number,
      y?: number,
      y2?: number,
      legend?: boolean,
      dragZoom?: boolean,
      color?: string,
      agg?: string,
      stylePreset?: string,
      decimals?: number,
      thousands?: boolean
    }
  }
  ```

- `vsplot:test:getState`: Request current chart state (for testing)
  ```javascript
  {
    type: 'vsplot:test:getState',
    id: string
  }
  ```

### From Webview to Extension

- `exportChart`: Request chart image export
  ```javascript
  {
    type: 'exportChart',
    data: string,      // Base64 PNG data
    filename: string
  }
  ```

- `vsplot:test:state`: Respond with current state (for testing)
  ```javascript
  {
    type: 'vsplot:test:state',
    id: string,
    payload: {
      chartType: string,
      x: number,
      y: number,
      y2: number,
      legend: boolean,
      dragZoom: boolean,
      color: string,
      agg: string,
      stylePreset: string,
      decimals: number,
      thousands: boolean,
      labelsCount: number,
      datasetLens: number[],
      error?: string
    }
  }
  ```

- `vsplot:test:config-applied`: Acknowledge configuration applied (for testing)
  ```javascript
  {
    type: 'vsplot:test:config-applied',
    id: string
  }
  ```

## Dependencies

- **Chart.js v4.5.0**: Core charting library (loaded from `media/chart.umd.js`)
- **chartjs-plugin-zoom v2.2.0**: Zoom and pan plugin (loaded from `media/chartjs-plugin-zoom.umd.js`)
- **chartjs-adapter-date-fns v3.0.0**: Date/time adapter (loaded from `media/chartjs-adapter-date-fns.bundle.js`)

## Security

The webview uses Content Security Policy (CSP) with:
- Script execution limited to nonce-tagged scripts and VS Code resources
- Style allowed from VS Code resources and inline (for theme variables)
- Images allowed from webview source and data URIs
- No external connections allowed

## Theming

All colors use VS Code CSS variables for seamless theme integration:
- `--vscode-foreground`: Text color
- `--vscode-editor-background`: Background color
- `--vscode-widget-border`: Border color
- `--vscode-button-background`: Button background
- `--vscode-editorWidget-background`: Card background
- And many more...

## Testing

The chart view includes test hooks for automated testing:
- State inspection via `vsplot:test:getState`
- Configuration application via `vsplot:test:setConfig`
- Acknowledgment of configuration changes

## Development Notes

### Adding a New Chart Type

1. Add option to `chartType` select in `index.html`
2. Update default selection logic in `initializeChart()` in `main.js`
3. Add data preparation logic in `prepareChartData()` in `main.js`
4. Update validation logic in `createChart()` if needed
5. Test with various data types

### Modifying Styles

Edit `styles.css` directly. Use VS Code theme variables for colors to ensure theme compatibility.

### Debugging

1. Open VS Code Developer Tools (Help → Toggle Developer Tools)
2. Find the webview frame in the Elements panel
3. Use Console panel to view errors and `console.log` output
4. Add breakpoints in `main.js` for step-through debugging

## Future Enhancements

Potential improvements:
- Additional chart types (bubble, area, polar)
- Chart annotations and reference lines
- Data filtering and transformation
- Multiple dataset support
- Chart templates and presets
- Collaborative sharing
