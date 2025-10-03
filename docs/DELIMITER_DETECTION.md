# Delimiter Detection in VSPlot

## Overview

VSPlot automatically detects the delimiter used in your data files (TXT, DAT, TSV, TAB, OUT, DATA) and provides the ability to override this detection when needed.

## Supported Delimiters

The parser can automatically detect the following delimiters:

- **Comma** (`,`) - Standard CSV format
- **Pipe** (`|`) - Common in database exports
- **Semicolon** (`;`) - Common in European CSV files
- **Colon** (`:`) - Used in some configuration files
- **Tab** (`\t`) - Standard for TSV files
- **Space** (` `) - Common in scientific data files

## Auto-Detection Algorithm

The delimiter detection algorithm:

1. **Tests each delimiter candidate** on the first line of your file
2. **Scores each candidate** based on:
   - Number of columns produced (higher is better)
   - Consistency across the first 6 lines (more consistent = higher score)
3. **Selects the delimiter** with the highest score
4. **Fallback**: If no delimiter produces multiple columns, defaults to comma (`,`)

### Scoring Formula

```
score = (column_count × 10) + consistency_count
```

Where:
- `column_count` = number of columns when splitting the first line
- `consistency_count` = number of subsequent lines (up to 5) with the same column count

## Manual Override

You can override the automatic delimiter detection through the UI:

1. **Open the Data Preview** panel for your file
2. **Locate the Delimiter dropdown** in the controls section
3. **Select your preferred delimiter**:
   - Auto (default - uses auto-detection)
   - Comma `,`
   - Pipe `|`
   - Semicolon `;`
   - Colon `:`
   - Tab `\t`
   - Space ` `
4. The data will automatically **re-parse** with your selected delimiter

## Examples

### Colon-Delimited File

```
name:age:city
Alice:30:NYC
Bob:25:LA
```

**Auto-detected delimiter**: `:` (colon)

### Pipe-Delimited File

```
product|price|quantity
Widget|10.99|5
Gadget|25.50|3
```

**Auto-detected delimiter**: `|` (pipe)

### Space-Delimited File

```
x y z
1.0 2.0 3.0
4.5 5.5 6.5
```

**Auto-detected delimiter**: ` ` (space)

### Single Column File

```
SingleValue
123
456
789
```

**Auto-detected delimiter**: `,` (comma - fallback)  
**Result**: Single column with 4 rows

## Programmatic Usage

When using the VSPlot API programmatically:

```typescript
import { parseDataFile } from './data/load';

// Auto-detect delimiter
const data = await parseDataFile(uri);
console.log(data.detectedDelimiter); // e.g., "|"

// Override delimiter
const dataWithOverride = await parseDataFile(uri, { delimiter: '\t' });
console.log(dataWithOverride.detectedDelimiter); // "\t"
```

## Edge Cases

### Mixed Delimiters

If your file contains multiple potential delimiters, the algorithm will choose the one that produces the most consistent column count across lines.

### Delimiter in Data

If your data values contain the delimiter character, consider:
1. Using a different delimiter via manual override
2. Switching to CSV format with proper quoting
3. Pre-processing your data to escape delimiters

### Single Column Data

Files with no delimiters will be parsed as single-column data with comma as the reported delimiter (for consistency).

## Best Practices

1. **Use consistent delimiters** throughout your file
2. **Avoid delimiters in data values** when possible
3. **Use TSV format** (`.tsv` extension) for tab-delimited files - it will automatically default to tab
4. **Test with preview** before creating charts to ensure correct parsing
5. **Override when needed** - the auto-detection is good but not perfect for all cases

## Troubleshooting

### Data Appears as Single Column

**Problem**: Multi-column data shows as one column  
**Solution**: 
- Check if auto-detection failed
- Manually select the correct delimiter from the dropdown
- Verify your file actually uses a supported delimiter

### Wrong Number of Columns

**Problem**: Data is split into wrong number of columns  
**Solution**:
- The wrong delimiter was detected
- Manually override with the correct delimiter
- Check for delimiter characters within your data values

### Inconsistent Parsing

**Problem**: Some rows have different column counts  
**Solution**:
- Your file may have inconsistent delimiters
- Some rows may have extra or missing delimiters
- Clean up the source data or use manual override

## Related Features

- **Data Preview**: Visual inspection of parsed data
- **Export Filtered Data**: Save re-parsed data in CSV format
- **Chart Creation**: Charts use the same delimiter detection

## Technical Details

The delimiter detection is implemented in `src/data/load.ts`:
- `parseDataFile()` - Main entry point with override support
- `parseDelimited()` - Auto-detection and parsing logic

See the source code documentation for implementation details.
