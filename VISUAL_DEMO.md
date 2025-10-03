# Comment Line Handling - Visual Demonstration

## Feature Overview

VSPlot now automatically filters out comment lines when parsing text-based data files.

## Live Example

### Input File: `csv-with-comments.csv`

```csv
# This is a comment line
# Another comment
Name,Age,Score
Alice,25,95.5
% This is also a comment (percent marker)
Bob,30,87.3
// This is a slash comment
Charlie,35,92.1
```

### Processing Visualization

```
Original file (8 lines):
┌──────────────────────────────────────────────────────────┐
│ ❌ [COMMENT] Line 1: # This is a comment line           │
│ ❌ [COMMENT] Line 2: # Another comment                  │
│ ✅ [DATA]    Line 3: Name,Age,Score                     │
│ ✅ [DATA]    Line 4: Alice,25,95.5                      │
│ ❌ [COMMENT] Line 5: % This is also a comment...        │
│ ✅ [DATA]    Line 6: Bob,30,87.3                        │
│ ❌ [COMMENT] Line 7: // This is a slash comment         │
│ ✅ [DATA]    Line 8: Charlie,35,92.1                    │
└──────────────────────────────────────────────────────────┘

After comment filtering (4 lines):
┌──────────────────────────────────────────────────────────┐
│ ✅ Line 1: Name,Age,Score                                │
│ ✅ Line 2: Alice,25,95.5                                 │
│ ✅ Line 3: Bob,30,87.3                                   │
│ ✅ Line 4: Charlie,35,92.1                               │
└──────────────────────────────────────────────────────────┘
```

### Parsed Data Table

| Name    | Age | Score |
|---------|-----|-------|
| Alice   | 25  | 95.5  |
| Bob     | 30  | 87.3  |
| Charlie | 35  | 92.1  |

✅ **Result**: All 4 comment lines filtered, 3 data rows preserved!

## Supported Comment Markers

### Default Markers (automatic)

| Marker | Example                    | Common Usage          |
|--------|---------------------------|-----------------------|
| `#`    | `# This is a comment`     | Python, Shell, Ruby   |
| `%`    | `% This is a comment`     | MATLAB, LaTeX, TeX    |
| `//`   | `// This is a comment`    | C, C++, Java, JS      |

### Custom Markers (configurable)

You can use ANY string as a comment marker:

```typescript
// Use exclamation marks
parseDataFile(uri, { commentMarkers: ['!'] });

// Use REM (like batch files)
parseDataFile(uri, { commentMarkers: ['REM'] });

// Use multiple custom markers
parseDataFile(uri, { commentMarkers: ['##', ';;', '--'] });
```

## Feature Benefits

### 1. Cleaner Data Files
Add metadata, notes, and documentation directly in your data files:

```csv
# Dataset: Customer Sales 2024
# Source: Internal CRM
# Updated: 2024-01-15
# Contact: data-team@example.com

CustomerID,Name,Revenue,Region
1001,Acme Corp,150000,West
1002,Beta Inc,275000,East
```

### 2. Better Documentation
Document your data structure inline:

```csv
# Column Descriptions:
# - CustomerID: Unique identifier
# - Name: Company name
# - Revenue: Annual revenue in USD
# - Region: Geographic region

CustomerID,Name,Revenue,Region
...
```

### 3. Temporary Exclusions
Comment out test data or problematic rows:

```csv
Name,Value
Alice,100
# Bob,200  -- Excluded during testing
Charlie,300
```

### 4. Multi-Language Support
Works with data exported from various tools:

```
% MATLAB export
% Generated: 2024-01-15
x,y,z
1,2,3
```

```
// C++ simulation output
// Runtime: 1.5s
iteration,value
1,0.5
```

## Implementation Details

### Algorithm
1. Read file content
2. Split into lines
3. For each line:
   - Trim whitespace
   - Check if it starts with any comment marker
   - If yes: skip (filter out)
   - If no: keep for parsing
4. Parse remaining lines as data

### Error Handling
If a file contains ONLY comments (no data):
```
❌ Error: File contains only comments or empty lines
```

This prevents silent failures and alerts you to configuration issues.

## Testing

Run the setup script to create test files:
```bash
bash scripts/setup-test-data.sh
```

Test files are created in `test-data/`:
- `csv-with-comments.csv`
- `txt-with-comments.txt`
- `dat-with-comments.dat`
- `custom-comment-markers.txt`

## API Usage

### Basic (default markers)
```typescript
import { parseDataFile } from './data/load';

const data = await parseDataFile(uri);
// Automatically filters #, %, //
```

### Custom Markers
```typescript
const data = await parseDataFile(uri, {
    commentMarkers: ['!', 'NOTE:']
});
```

### Disable Filtering
```typescript
const data = await parseDataFile(uri, {
    commentMarkers: []
});
```

## Verification

✅ Compiles without errors  
✅ Passes linting  
✅ Test suite created (8 test cases)  
✅ Documentation complete  
✅ Backward compatible  
✅ No breaking changes  

## Summary

This feature makes it easy to:
- ✅ Add documentation to data files
- ✅ Temporarily exclude rows
- ✅ Include metadata and notes
- ✅ Work with files from various sources
- ✅ Maintain cleaner, self-documenting datasets

All while being **fully automatic** and **completely configurable**!
