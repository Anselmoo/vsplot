# Supported File Formats and Features

This document provides a comprehensive overview of all file formats, delimiters, and parser features supported by VSPlot.

## Supported File Extensions

VSPlot can parse and visualize data from the following file types:

| Extension | Description | Default Delimiter | Example Files |
|-----------|-------------|-------------------|---------------|
| `.csv` | Comma-separated values | `,` (comma) | `sample-data/iris.csv`, `sample-data/timeseries-sample.csv` |
| `.json` | JavaScript Object Notation | N/A | `sample-data/3d-sample.json` |
| `.txt` | Text files | Auto-detected | `test-data/colon-delimited.txt`, `test-data/space-delimited.txt` |
| `.dat` | Data files | Auto-detected | `sample-data/sales-sample.dat`, `test-data/pipe-delimited.dat` |
| `.tsv` | Tab-separated values | `\t` (tab) | `sample-data/test.tsv` |
| `.tab` | Tab-delimited files | `\t` (tab) | `sample-data/test.tab` |
| `.out` | Output files | Auto-detected | `sample-data/test.out` |
| `.data` | Generic data files | Auto-detected | `sample-data/test.data` |

## Supported Delimiters

For non-CSV text-based formats, VSPlot automatically detects the delimiter from these options:

| Delimiter | Character | Common Usage | Example File |
|-----------|-----------|--------------|--------------|
| Comma | `,` | Standard CSV, general data | `sample-data/iris.csv`, `sample-data/test.out` |
| Pipe | `\|` | Database exports, log files | `sample-data/sales-sample.dat`, `test-data/pipe-delimited.dat` |
| Semicolon | `;` | European CSV format | `sample-data/semicolon-delimited.csv` |
| Colon | `:` | Configuration files, simple data | `test-data/colon-delimited.txt` |
| Tab | `\t` | TSV files, spreadsheet exports | `sample-data/test.tsv`, `sample-data/test.tab` |
| Space | ` ` | Scientific data, whitespace-separated | `sample-data/test.data`, `test-data/space-delimited.txt` |

### Delimiter Detection Algorithm

The auto-detection algorithm:
1. Tests each delimiter candidate on the first line
2. Scores based on column count and consistency across first 6 lines
3. Selects the delimiter with the highest score
4. Falls back to comma if no multi-column delimiter is detected

**Scoring formula**: `score = (column_count × 10) + consistency_count`

See [Delimiter Detection Guide](./DELIMITER_DETECTION.md) for detailed information.

## Comment Line Filtering

VSPlot automatically filters out comment lines to make working with annotated data files easier.

### Default Comment Markers

| Marker | Example | Common In | Example File |
|--------|---------|-----------|--------------|
| `#` | `# This is a comment` | Python, R, Shell scripts, many data formats | `test-data/csv-with-comments.csv`, `test-data/txt-with-comments.txt` |
| `%` | `% This is a comment` | MATLAB, LaTeX, some statistical formats | `test-data/csv-with-comments.csv`, `test-data/dat-with-comments.dat` |
| `//` | `// This is a comment` | C, C++, Java, JavaScript | `test-data/csv-with-comments.csv`, `test-data/dat-with-comments.dat` |

### Comment Filtering Behavior

- **Whitespace handling**: Comment markers are checked after trimming leading whitespace
- **Empty lines**: Empty lines are skipped separately (not treated as comments)
- **Partial matches**: Only lines that START with a comment marker are filtered
- **Data integrity**: Comment filtering preserves the order and integrity of data rows

### Custom Comment Markers

You can configure custom comment markers programmatically:

```typescript
import { parseDataFile } from './data/load';

// Use custom comment markers
const data = await parseDataFile(uri, { 
    commentMarkers: ['!', '##', 'REM'] 
});

// Disable comment filtering
const dataNoFilter = await parseDataFile(uri, { 
    commentMarkers: [] 
});
```

See [Comment Handling Guide](./COMMENT_HANDLING.md) for detailed information.

## Parser Options

The `parseDataFile` function accepts optional parameters:

```typescript
interface ParseOptions {
    delimiter?: string;        // Override auto-detected delimiter
    commentMarkers?: string[]; // Override default comment markers
}
```

### Example: Override Delimiter

```typescript
// Force tab delimiter
const data = await parseDataFile(uri, { delimiter: '\t' });

// Force semicolon delimiter
const data = await parseDataFile(uri, { delimiter: ';' });
```

### Example: Custom Comment Markers

```typescript
// Use only hash comments
const data = await parseDataFile(uri, { commentMarkers: ['#'] });

// Use custom markers
const data = await parseDataFile(uri, { commentMarkers: ['REM', '!'] });
```

## Example Data Files

### Generate Test Files

Run the following command to generate all sample and test data files:

```bash
bash scripts/setup-test-data.sh
```

This creates:
- `sample-data/` - Real-world datasets for demonstrations
- `test-data/` - Test fixtures for delimiter and comment handling

### Available Example Files

#### Format Examples
- `sample-data/iris.csv` - Classic CSV dataset
- `sample-data/3d-sample.json` - JSON data structure
- `sample-data/test.tsv` - Tab-separated values
- `sample-data/test.tab` - Tab-delimited file
- `sample-data/test.out` - Output file format
- `sample-data/test.data` - Generic data format

#### Delimiter Examples
- `test-data/colon-delimited.txt` - Colon (`:`) delimiter
- `test-data/pipe-delimited.dat` - Pipe (`|`) delimiter
- `test-data/space-delimited.txt` - Space delimiter
- `sample-data/semicolon-delimited.csv` - Semicolon (`;`) delimiter
- `sample-data/sales-sample.dat` - Pipe delimiter with real data

#### Comment Handling Examples
- `test-data/csv-with-comments.csv` - All three default comment markers (#, %, //)
- `test-data/txt-with-comments.txt` - Hash (`#`) comments
- `test-data/dat-with-comments.dat` - Mixed comment markers
- `test-data/custom-comment-markers.txt` - Custom markers for testing

#### Real-World Datasets
- `sample-data/iris.csv` - Classic flower classification dataset
- `sample-data/titanic.csv` - Passenger survival data
- `sample-data/boston_housing.csv` - Real estate prices
- `sample-data/weather.csv` - Airport traffic sample
- `sample-data/timeseries-sample.csv` - Time series data
- `sample-data/sales-sample.dat` - Categorical sales data

## Edge Cases and Robustness

VSPlot handles various edge cases:

### Empty and Invalid Files
- **Empty files**: Throws error "File is empty"
- **Only comments**: Throws error "File contains only comments or empty lines"
- **Whitespace only**: Treated as empty and throws error

### Delimiter Ambiguity
- **Multiple potential delimiters**: Chooses most consistent across lines
- **Delimiter in data**: Consider using manual override or CSV with quoting
- **Single column**: Falls back to comma delimiter for consistency

### Special Characters
- **Unicode support**: Full Unicode character support
- **Emojis**: Preserved in data
- **Special symbols**: Maintained as-is
- **BOM handling**: Byte Order Mark properly handled

### Large Files
- Successfully tested with 10,000+ row files
- Maintains performance for typical data visualization use cases

## Related Documentation

- [Comment Handling Guide](./COMMENT_HANDLING.md) - Detailed comment filtering
- [Delimiter Detection Guide](./DELIMITER_DETECTION.md) - Auto-detection details
- [Webview Architecture](./WEBVIEW_ARCHITECTURE.md) - Extension architecture
- [Testing Coverage](./TESTING_COVERAGE.md) - Test suite documentation

## Limitations

1. **CSV Quoting**: Complex CSV files with quoted delimiters may require pre-processing
2. **Mixed Delimiters**: Files with inconsistent delimiters should be cleaned
3. **Very Large Files**: Files over 100,000 rows may experience performance issues
4. **Binary Formats**: Excel (.xlsx), databases, and other binary formats are not supported

## Future Enhancements

Potential areas for expansion:
- Streaming parser for very large files
- Additional format support (XML, YAML)
- More sophisticated CSV quoting handling
- Performance optimizations for 100K+ row files
