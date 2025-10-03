# Comment Line Handling in VSPlot

## Overview

VSPlot automatically filters out comment lines when parsing text-based data files (CSV, TXT, DAT, TSV, TAB, OUT, DATA). This makes it easier to work with data files that contain metadata, notes, or documentation inline.

## Default Comment Markers

By default, VSPlot recognizes and skips lines starting with the following comment markers:
- `#` (hash/number sign) - Common in many scripting languages and data formats
- `%` (percent) - Common in MATLAB, LaTeX, and some statistical formats
- `//` (double slash) - Common in C-style languages

## Example

Given a CSV file with comments:

```csv
# This is a metadata comment
# Dataset: Sample Sales Data
Name,Age,Score
Alice,25,95.5
% This percent comment is also skipped
Bob,30,87.3
// This slash comment is skipped too
Charlie,35,92.1
```

VSPlot will parse this as:

| Name    | Age | Score |
|---------|-----|-------|
| Alice   | 25  | 95.5  |
| Bob     | 30  | 87.3  |
| Charlie | 35  | 92.1  |

The comment lines are automatically excluded from the parsed data.

## Custom Comment Markers

You can configure custom comment markers when using the VSPlot API programmatically:

```typescript
import { parseDataFile } from './data/load';

// Use custom comment markers (e.g., for a specific format)
const data = await parseDataFile(uri, { 
    commentMarkers: ['!', '##', 'REM'] 
});
```

## Disabling Comment Filtering

To disable comment filtering entirely, pass an empty array:

```typescript
const data = await parseDataFile(uri, { 
    commentMarkers: [] 
});
```

## Behavior

- **Whitespace handling**: Comment markers are checked after trimming leading whitespace
- **Empty lines**: Empty lines are NOT considered comments and are skipped separately
- **Partial matches**: Only lines that START with a comment marker are filtered
- **Data integrity**: Comment filtering preserves the order and integrity of data rows

## Test Files

The following test files are available in the `test-data` directory (created by running `bash scripts/setup-test-data.sh`):

- `csv-with-comments.csv` - CSV with multiple comment types
- `txt-with-comments.txt` - TXT file with hash comments
- `dat-with-comments.dat` - DAT file with mixed comment markers
- `custom-comment-markers.txt` - For testing custom comment marker configuration

## Related Features

- [Delimiter Detection](./DELIMITER_DETECTION.md) - Automatic delimiter detection
- [File Format Support](../README.md#supported-formats) - Supported data file formats

## Error Handling

If a file contains ONLY comment lines (no actual data), VSPlot will throw an error:
```
Error: File contains only comments or empty lines
```

This ensures that you're aware when a file has no parseable data content.
