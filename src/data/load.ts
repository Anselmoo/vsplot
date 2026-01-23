import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

export interface ParsedData {
	headers: string[];
	rows: (string | number)[][];
	fileName: string;
	fileType: "csv" | "json" | "txt" | "dat" | "tsv" | "tab" | "out" | "data";
	totalRows: number;
	detectedDelimiter?: string;
}

export interface ParseOptions {
	delimiter?: string;
	commentMarkers?: string[];
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
 * Comment Handling:
 * - Skips lines starting with #, %, // by default
 * - User can override comment markers via options.commentMarkers parameter
 *
 * @param uri - URI of the file to parse
 * @param options - Optional settings including delimiter override and comment markers
 * @returns Promise resolving to ParsedData or null if unsupported file type
 */
export async function parseDataFile(
	uri: vscode.Uri,
	options?: ParseOptions,
): Promise<ParsedData | null> {
	try {
		const filePath = uri.fsPath;
		const fileName = path.basename(filePath);
		const fileExtension = path.extname(filePath).toLowerCase();

		// Read file content
		const content = await fs.promises.readFile(filePath, "utf8");

		// Default comment markers: #, %, //
		const commentMarkers = options?.commentMarkers ?? ["#", "%", "//"];

		switch (fileExtension) {
			case ".csv":
				return parseCSV(content, fileName, commentMarkers);
			case ".json":
				return parseJSON(content, fileName);
			case ".txt":
			case ".dat":
			case ".out":
			case ".data":
			case ".tab":
				return parseDelimited(
					content,
					fileName,
					fileExtension.slice(1) as "txt" | "dat" | "out" | "data" | "tab" | "tsv",
					options?.delimiter,
					commentMarkers,
				);
			case ".tsv":
				// TSV files have tab delimiter by default
				return parseDelimited(content, fileName, "tsv", options?.delimiter ?? "\t", commentMarkers);
			default:
				vscode.window.showErrorMessage(`Unsupported file type: ${fileExtension}`);
				return null;
		}
	} catch (_error) {
		vscode.window.showErrorMessage(`Error reading file: ${_error}`);
		return null;
	}
}

/**
 * Check if a line is a comment based on configured comment markers
 *
 * @param line - Line to check
 * @param commentMarkers - Array of comment marker strings
 * @returns true if line starts with any comment marker, false otherwise
 */
function isCommentLine(line: string, commentMarkers: string[]): boolean {
	const trimmed = line.trim();
	if (!trimmed) {
		return false; // Empty lines are not comment lines
	}
	return commentMarkers.some((marker) => trimmed.startsWith(marker));
}

/**
 * Detect delimiter for CSV files (comma or semicolon most common)
 *
 * @param firstLine - First line of the file
 * @param sampleLines - Additional lines to check for consistency
 * @returns Detected delimiter (comma or semicolon)
 */
function detectCSVDelimiter(firstLine: string, sampleLines: string[]): string {
	const candidates = [",", ";"];
	let bestDelimiter = ",";
	let bestScore = -1;

	for (const delimiter of candidates) {
		const firstLineCount = (firstLine.match(new RegExp(`\\${delimiter}`, "g")) || []).length;
		if (firstLineCount === 0) continue;

		// Check consistency across sample lines
		let consistentCount = 0;
		for (let i = 1; i < sampleLines.length; i++) {
			const lineCount = (sampleLines[i].match(new RegExp(`\\${delimiter}`, "g")) || []).length;
			if (lineCount === firstLineCount) {
				consistentCount++;
			}
		}

		const score = firstLineCount * 10 + consistentCount;
		if (score > bestScore) {
			bestScore = score;
			bestDelimiter = delimiter;
		}
	}

	return bestDelimiter;
}

function parseCSV(
	content: string,
	fileName: string,
	commentMarkers: string[] = ["#", "%", "//"],
): ParsedData {
	const lines = content.trim().split("\n");
	if (lines.length === 0) {
		throw new Error("File is empty");
	}

	// Filter out comment lines and empty lines
	const nonCommentLines = lines.filter((line) => {
		const trimmed = line.trim();
		return trimmed && !isCommentLine(line, commentMarkers);
	});

	if (nonCommentLines.length === 0) {
		throw new Error("File contains only comments or empty lines");
	}

	// Detect delimiter for CSV files (comma or semicolon are most common)
	const delimiter = detectCSVDelimiter(nonCommentLines[0], nonCommentLines.slice(0, 6));

	// Parse CSV with detected delimiter
	const firstRowData = parseCSVLine(nonCommentLines[0], delimiter);
	let headers: string[];
	let dataStartIndex = 0;

	// If only one column detected, treat it as data (list) rather than a header
	if (firstRowData.length === 1) {
		headers = ["Column 1"];
		dataStartIndex = 0;
	} else {
		// Check if first line looks like headers (non-numeric)
		const hasHeaders = firstRowData.some((item) => Number.isNaN(Number(item)) && item !== "");

		if (hasHeaders) {
			headers = firstRowData;
			dataStartIndex = 1;
		} else {
			// All numeric - generate column headers
			headers = firstRowData.map((_, index) => `Column ${index + 1}`);
			dataStartIndex = 0;
		}
	}

	const rows: (string | number)[][] = [];

	for (let i = dataStartIndex; i < nonCommentLines.length; i++) {
		if (nonCommentLines[i].trim()) {
			const raw = parseCSVLine(nonCommentLines[i], delimiter);
			const coerced = raw.map((v) => {
				const n = Number(v);
				return !Number.isNaN(n) && v !== "" ? n : v;
			});
			rows.push(coerced);
		}
	}

	return {
		headers,
		rows,
		fileName,
		fileType: "csv",
		totalRows: rows.length,
		detectedDelimiter: delimiter,
	};
}

function parseCSVLine(line: string, delimiter = ","): string[] {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === delimiter && !inQuotes) {
			result.push(current.trim());
			current = "";
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
			if (jsonData.length > 0 && typeof jsonData[0] === "object") {
				const headers = Object.keys(jsonData[0]);
				const rows = jsonData.map((obj) => headers.map((header) => obj[header]));

				return {
					headers,
					rows,
					fileName,
					fileType: "json",
					totalRows: rows.length,
				};
			} else {
				// Array of primitives
				return {
					headers: ["Value"],
					rows: jsonData.map((item) => [item]),
					fileName,
					fileType: "json",
					totalRows: jsonData.length,
				};
			}
		} else if (typeof jsonData === "object" && jsonData !== null) {
			// Single object
			const headers = Object.keys(jsonData);
			const rows = [headers.map((header) => jsonData[header])];

			return {
				headers,
				rows,
				fileName,
				fileType: "json",
				totalRows: 1,
			};
		} else {
			throw new Error("JSON format not supported for tabular display");
		}
	} catch (_error) {
		throw new Error(`Invalid JSON: ${_error}`);
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
 * - Filters out comment lines based on configured markers
 *
 * @param content - File content as string
 * @param fileName - Name of the file being parsed
 * @param fileType - Type of file (txt, dat, tsv, tab, out, data)
 * @param overrideDelimiter - Optional delimiter to use instead of auto-detection
 * @param commentMarkers - Array of comment marker strings (default: ['#', '%', '//'])
 * @returns ParsedData object with headers, rows, and detected delimiter
 */
function parseDelimited(
	content: string,
	fileName: string,
	fileType: "txt" | "dat" | "tsv" | "tab" | "out" | "data",
	overrideDelimiter?: string,
	commentMarkers: string[] = ["#", "%", "//"],
): ParsedData {
	const lines = content.trim().split("\n");
	if (lines.length === 0) {
		throw new Error("File is empty");
	}

	// Filter out comment lines and empty lines
	const nonCommentLines = lines.filter((line) => {
		const trimmed = line.trim();
		return trimmed && !isCommentLine(line, commentMarkers);
	});

	if (nonCommentLines.length === 0) {
		throw new Error("File contains only comments or empty lines");
	}

	// Detect delimiter among common candidates unless override provided
	const firstLine = nonCommentLines[0];
	let delimiter = overrideDelimiter ?? "";
	if (!delimiter) {
		// Candidates cover all common delimiters: comma, pipe, semicolon, colon, tab, space
		const candidates = [",", "|", ";", ":", "\t", " "];
		let best = ",";
		let bestScore = -1;
		for (const cand of candidates) {
			const parts = firstLine.split(cand);
			if (parts.length <= 1) {
				continue;
			}
			// Score by column count and consistency with next few lines
			let consistent = 0;
			const expected = parts.length;
			for (let i = 1; i < Math.min(6, nonCommentLines.length); i++) {
				if (nonCommentLines[i].split(cand).length === expected) {
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
	const firstRowData = firstLine.split(delimiter).map((item) => item.trim());
	let headers: string[];
	let dataStartIndex = 0;

	if (firstRowData.length === 1) {
		// Heuristic: decide whether the first line is a header or actual data.
		// Treat it as a header only if it matches common header keywords (case-insensitive)
		// and there are additional data lines. This avoids misclassifying pure data lists
		// (e.g., Value1, Value2...) as having a header.
		const headerCandidates = new Set(["value", "values", "name", "id", "item", "label", "key"]);
		const firstLower = String(firstRowData[0]).trim().toLowerCase();
		if (
			nonCommentLines.length > 1 &&
			Number.isNaN(Number(firstRowData[0])) &&
			firstRowData[0] !== "" &&
			headerCandidates.has(firstLower)
		) {
			headers = firstRowData;
			dataStartIndex = 1;
		} else {
			headers = ["Column 1"];
			dataStartIndex = 0;
		}
	} else {
		// Check if first line looks like headers (non-numeric)
		const hasHeaders = firstRowData.some((item) => Number.isNaN(Number(item)) && item !== "");

		if (hasHeaders) {
			headers = firstRowData;
			dataStartIndex = 1;
		} else {
			headers = firstRowData.map((_, index) => `Column ${index + 1}`);
			dataStartIndex = 0;
		}
	}

	const rows: (string | number)[][] = [];
	for (let i = dataStartIndex; i < nonCommentLines.length; i++) {
		if (nonCommentLines[i].trim()) {
			const rowData = nonCommentLines[i].split(delimiter).map((item) => {
				const trimmed = item.trim();
				// Try to convert to number if possible
				const num = Number(trimmed);
				return !Number.isNaN(num) && trimmed !== "" ? num : trimmed;
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
		detectedDelimiter: delimiter,
	};
}
