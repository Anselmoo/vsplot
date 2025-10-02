import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ParsedData {
    headers: string[];
    rows: (string | number)[][];
    fileName: string;
    fileType: 'csv' | 'json' | 'txt' | 'dat' | 'tsv' | 'tab' | 'out' | 'data';
    totalRows: number;
    detectedDelimiter?: string;
}

/**
 * Parse a data file and return structured data
 * 
 * Supports CSV, JSON, and delimited text files (TXT, DAT, TSV, TAB, OUT, DATA).
 * 
 * Delimiter Detection:
 * - Auto-detects delimiter for non-CSV files from: comma, pipe, semicolon, colon, tab, space
 * - User can override delimiter via options.delimiter parameter
 * - TSV files default to tab delimiter unless overridden
 * 
 * @param uri - URI of the file to parse
 * @param options - Optional settings including delimiter override
 * @returns Promise resolving to ParsedData or null if unsupported file type
 */
export async function parseDataFile(uri: vscode.Uri, options?: { delimiter?: string }): Promise<ParsedData | null> {
    try {
        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        const fileExtension = path.extname(filePath).toLowerCase();

        // Read file content
        const content = await fs.promises.readFile(filePath, 'utf8');

        switch (fileExtension) {
            case '.csv':
                return parseCSV(content, fileName);
            case '.json':
                return parseJSON(content, fileName);
            case '.txt':
            case '.dat':
            case '.out':
            case '.data':
            case '.tab':
                return parseDelimited(content, fileName, fileExtension.slice(1) as 'txt' | 'dat' | 'out' | 'data' | 'tab' | 'tsv', options?.delimiter);
            case '.tsv':
                // TSV files have tab delimiter by default
                return parseDelimited(content, fileName, 'tsv', options?.delimiter ?? '\t');
            default:
                vscode.window.showErrorMessage(`Unsupported file type: ${fileExtension}`);
                return null;
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading file: ${error}`);
        return null;
    }
}

function parseCSV(content: string, fileName: string): ParsedData {
    const lines = content.trim().split('\n');
    if (lines.length === 0) {
        throw new Error('File is empty');
    }

    // Parse CSV with basic comma separation (could be enhanced with proper CSV parser)
    const headers = parseCSVLine(lines[0]);
    const rows: (string | number)[][] = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const raw = parseCSVLine(lines[i]);
            const coerced = raw.map(v => {
                const n = Number(v);
                return !Number.isNaN(n) && v !== '' ? n : v;
            });
            rows.push(coerced);
        }
    }

    return {
        headers,
        rows,
        fileName,
        fileType: 'csv',
        totalRows: rows.length
    };
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

function parseJSON(content: string, fileName: string): ParsedData {
    try {
        const jsonData = JSON.parse(content);

        if (Array.isArray(jsonData)) {
            // Array of objects
            if (jsonData.length > 0 && typeof jsonData[0] === 'object') {
                const headers = Object.keys(jsonData[0]);
                const rows = jsonData.map(obj => headers.map(header => obj[header]));

                return {
                    headers,
                    rows,
                    fileName,
                    fileType: 'json',
                    totalRows: rows.length
                };
            } else {
                // Array of primitives
                return {
                    headers: ['Value'],
                    rows: jsonData.map(item => [item]),
                    fileName,
                    fileType: 'json',
                    totalRows: jsonData.length
                };
            }
        } else if (typeof jsonData === 'object' && jsonData !== null) {
            // Single object
            const headers = Object.keys(jsonData);
            const rows = [headers.map(header => jsonData[header])];

            return {
                headers,
                rows,
                fileName,
                fileType: 'json',
                totalRows: 1
            };
        } else {
            throw new Error('JSON format not supported for tabular display');
        }
    } catch (error) {
        throw new Error(`Invalid JSON: ${error}`);
    }
}

/**
 * Parse delimited text files (TXT, DAT, TSV, TAB, OUT, DATA)
 * 
 * Features:
 * - Auto-detects delimiter from common candidates: comma, pipe, semicolon, colon, tab, space
 * - Scores delimiters by column count and consistency across first 6 lines
 * - Allows user override of delimiter via options parameter
 * - Fallback to comma delimiter if no multi-column delimiter detected
 * - Auto-detects headers vs numeric data in first line
 * 
 * @param content - File content as string
 * @param fileName - Name of the file being parsed
 * @param fileType - Type of file (txt, dat, tsv, tab, out, data)
 * @param overrideDelimiter - Optional delimiter to use instead of auto-detection
 * @returns ParsedData object with headers, rows, and detected delimiter
 */
function parseDelimited(content: string, fileName: string, fileType: 'txt' | 'dat' | 'tsv' | 'tab' | 'out' | 'data', overrideDelimiter?: string): ParsedData {
    const lines = content.trim().split('\n');
    if (lines.length === 0) {
        throw new Error('File is empty');
    }

    // Detect delimiter among common candidates unless override provided
    const firstLine = lines[0];
    let delimiter = overrideDelimiter ?? '';
    if (!delimiter) {
        // Candidates cover all common delimiters: comma, pipe, semicolon, colon, tab, space
        const candidates = [',', '|', ';', ':', '\t', ' '];
        let best = ',';
        let bestScore = -1;
        for (const cand of candidates) {
            const parts = firstLine.split(cand);
            if (parts.length <= 1) {
                continue;
            }
            // Score by column count and consistency with next few lines
            let consistent = 0;
            const expected = parts.length;
            for (let i = 1; i < Math.min(6, lines.length); i++) {
                if (lines[i].split(cand).length === expected) {
                    consistent++;
                }
            }
            const score = expected * 10 + consistent;
            if (score > bestScore) {
                bestScore = score;
                best = cand;
            }
        }
        // Fallback to comma if no delimiter produces multiple columns
        delimiter = best;
    }

    // Assume first line contains headers or generate them
    const firstRowData = firstLine.split(delimiter).map(item => item.trim());
    let headers: string[];
    let dataStartIndex = 0;

    // Check if first line looks like headers (non-numeric)
    const hasHeaders = firstRowData.some(item => Number.isNaN(Number(item)) && item !== '');

    if (hasHeaders) {
        headers = firstRowData;
        dataStartIndex = 1;
    } else {
        headers = firstRowData.map((_, index) => `Column ${index + 1}`);
        dataStartIndex = 0;
    }

    const rows: (string | number)[][] = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
        if (lines[i].trim()) {
            const rowData = lines[i].split(delimiter).map(item => {
                const trimmed = item.trim();
                // Try to convert to number if possible
                const num = Number(trimmed);
                return !Number.isNaN(num) && trimmed !== '' ? num : trimmed;
            });
            rows.push(rowData);
        }
    }

    return {
        headers,
        rows,
        fileName,
        fileType,
        totalRows: rows.length,
        detectedDelimiter: delimiter
    };
}
