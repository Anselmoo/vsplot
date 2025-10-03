# VSPlot — Data Preview and Charts in VS Code

[![Release CI](https://img.shields.io/github/actions/workflow/status/Anselmoo/vsplot/release.yml?branch=main&logo=github&label=CI)](https://github.com/Anselmoo/vsplot/actions/workflows/release.yml)
[![codecov](https://img.shields.io/codecov/c/github/Anselmoo/vsplot?logo=codecov)](https://codecov.io/gh/Anselmoo/vsplot)
[![License](https://img.shields.io/github/license/Anselmoo/vsplot)](LICENSE)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/Anselmoo.vsplot?logo=visualstudiocode&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=Anselmoo.vsplot)
[![VS Code Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/Anselmoo.vsplot?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=Anselmoo.vsplot)

![VSPlot Banner](images/banner-1200x630.png)

Preview and visualize CSV/JSON/TXT/DAT directly in VS Code. Explore tables with search/sort/pagination, then build interactive charts with zoom, drag-zoom, aggregation, and multiple axes.

> [!NOTE]
> VSPlot supports **8 file formats** with automatic delimiter detection and comment filtering. See [Supported Formats](#supported-formats) for details.

## Features

<details open>
<summary><b>Click to expand/collapse features</b></summary>

### Data Preview
- Search, sort, pagination, row selection
- Delimiter auto-detection with override (comma, pipe, tab, space, etc.)
- Comment line filtering (skips lines starting with #, %, //)
- Export filtered rows to CSV
- Stats panel with count/min/max/avg/median/stddev
- Compact cards and small badges toggles
- "Create Chart" from current filtered data

### Chart View (Chart.js v4)
- Chart types: line, bar, scatter, pie, doughnut, radar
- Axis selectors, legend toggle, color picker
- Zoom in/out/reset + drag-zoom fallback
- Aggregation for categorical X (sum, count, avg, min, max)
- Multiple Y axes (Y2) for line/bar/scatter
- Number formatting (decimals, thousands), style presets
- Stats + dataset meta cards; compact and icons toggles

</details>

## Supported Formats

<details open>
<summary><b>Click to expand/collapse supported formats</b></summary>

VSPlot supports the following file formats with automatic parsing:

### File Extensions
- **CSV** (`.csv`) - Comma-separated values with optional comment filtering
- **JSON** (`.json`) - Standard JSON data files
- **TXT** (`.txt`) - Text files with auto-detected delimiters
- **DAT** (`.dat`) - Data files with auto-detected delimiters
- **TSV** (`.tsv`) - Tab-separated values (auto-defaults to tab delimiter)
- **TAB** (`.tab`) - Tab-delimited files
- **OUT** (`.out`) - Output files with auto-detected delimiters
- **DATA** (`.data`) - Generic data files with auto-detected delimiters

### Supported Delimiters
The parser automatically detects the following delimiters (or you can manually override):
- **Comma** (`,`) - Standard CSV format
- **Pipe** (`|`) - Common in database exports
- **Semicolon** (`;`) - Common in European CSV files
- **Colon** (`:`) - Used in some configuration files
- **Tab** (`\t`) - Standard for TSV/TAB files
- **Space** (` `) - Common in scientific data files

### Comment Line Support
By default, VSPlot filters out lines starting with these comment markers:
- **Hash** (`#`) - Common in scripting languages and data formats
- **Percent** (`%`) - Common in MATLAB, LaTeX, statistical formats
- **Double Slash** (`//`) - Common in C-style languages

> [!TIP]
> Comment markers can be customized programmatically via the API. See the [Comment Handling Guide](docs/COMMENT_HANDLING.md) for details.

### Documentation
- 📖 [Supported Formats Reference](docs/SUPPORTED_FORMATS.md) - Comprehensive format, delimiter, and feature documentation
- 💬 [Comment Handling Guide](docs/COMMENT_HANDLING.md) - Detailed comment filtering documentation
- 🔍 [Delimiter Detection Guide](docs/DELIMITER_DETECTION.md) - Auto-detection algorithm and manual overrides

### Example Data Files
> [!IMPORTANT]
> Sample data files demonstrating all features are available in `sample-data/` and `test-data/` directories. Run `bash scripts/setup-test-data.sh` to generate them.

### Icon Theme Support
For enhanced visual file type recognition in VS Code's Explorer, consider using an icon theme extension such as:
- [**Material Icon Theme**](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) - Provides beautiful Material Design icons for CSV, JSON, TXT, and other data file types supported by VSPlot

> [!TIP]
> Icon themes help you quickly identify different file types in your workspace. The Material Icon Theme automatically recognizes most file extensions supported by VSPlot (`.csv`, `.json`, `.txt`, `.dat`, `.tsv`, `.tab`, `.out`, `.data`) and displays appropriate icons in the Explorer and editor tabs.

</details>

## Usage

- Explorer context menu:
  - “Preview Data” for `.csv`, `.json`, `.txt`, `.dat`, `.tsv`, `.tab`, `.out`, `.data`
  - “Plot Data” for `.csv`, `.json`
- From Data Preview: use “Create Chart” to open Chart View with filtered rows.

## Commands

<details>
<summary><b>Click to expand/collapse available commands</b></summary>

| Command | Description |
|---------|-------------|
| `vsplot.previewData` | Preview Data in table view |
| `vsplot.plotData` | Plot Data in chart view |
| `vsplot.openDataViewer` | Open Data Viewer |

</details>

## Settings

<details>
<summary><b>Click to expand/collapse extension settings</b></summary>

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `vsplot.defaultChartType` | `string` | `line` | Default chart type (line, bar, scatter, pie) |
| `vsplot.rowsPerPage` | `number` | `150` | Number of rows to display per page |
| `vsplot.defaultStylePreset` | `string` | `clean` | Default chart style (clean, soft, vibrant) |
| `vsplot.defaultDecimals` | `number` | `2` | Number of decimal places (0, 1, or 2) |
| `vsplot.useThousands` | `boolean` | `false` | Use thousands separator in numbers |
| `vsplot.compactStatsCards` | `boolean` | `false` | Use compact layout for statistics cards |
| `vsplot.showStatsIcons` | `boolean` | `true` | Show icons in statistics display |

</details>

## Screenshots

Images must be PNG/JPG. The repo includes generated assets under `images/`.

![Data Preview screenshot](images/screenshot-data-preview.png)
![Chart View screenshot](images/screenshot-chart-view.png)

## Release Notes

See [`CHANGELOG.md`](CHANGELOG.md) for full history.

## Contributing

Contributions are welcome! See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup, coding standards, and release flow.

## License

MIT — see [`LICENSE`](LICENSE) for details.

---

> [!NOTE]
> **Privacy**: This extension does not collect any telemetry or usage data. Your data stays local.
