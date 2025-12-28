import * as assert from "node:assert";
import * as vscode from "vscode";
import {
	handleCreateChart,
	handleExportData,
	handleReparse,
	toCSV,
} from "../providers/dataPreviewProvider";

suite("DataPreviewProvider Unit Tests", () => {
	test("toCSV escapes commas, quotes and newlines", () => {
		const headers = ["h1", "h2"];
		const rows = [
			["simple", 'with "quote"'],
			["mult\nline", 42],
		];
		const csv = toCSV(headers, rows as any);
		assert.ok(csv.includes('"with ""quote"""'));
		assert.ok(csv.includes('"mult\nline"'));
	});

	test("handleExportData returns error when writeFile throws", async () => {
		let shownError = "";
		const deps = {
			showSaveDialog: async () => vscode.Uri.file("/tmp/out.csv"),
			writeFile: async (_uri: vscode.Uri, _content: Uint8Array) => {
				throw new Error("disk full");
			},
			showInfoMessage: (_: string) => {},
			showErrorMessage: (m: string) => {
				shownError = m;
			},
			parseDataFile: async () => null,
		};

		const result = await handleExportData(
			{ type: "exportData", data: { headers: ["a"], rows: [["b"]] } },
			deps as any,
		);
		assert.strictEqual(result.success, false);
		assert.ok(shownError.includes("Failed to export data"));
	});

	test("handleExportData returns success when user cancels save dialog", async () => {
		const deps = {
			showSaveDialog: async () => undefined,
			writeFile: async (_uri: vscode.Uri, _content: Uint8Array) => {},
			showInfoMessage: (_: string) => {},
			showErrorMessage: (_: string) => {},
			parseDataFile: async () => null,
		};

		const result = await handleExportData(
			{ type: "exportData", data: { headers: ["a"], rows: [["b"]] } },
			deps as any,
		);
		assert.strictEqual(result.success, true);
	});

	test("handleReparse posts showData when parseDataFile returns data", async () => {
		let posted: any = null;
		const deps = {
			showSaveDialog: async () => undefined,
			writeFile: async () => {},
			showInfoMessage: () => {},
			showErrorMessage: () => {},
			parseDataFile: async (_uri: vscode.Uri) =>
				({
					headers: ["x"],
					rows: [[1]],
					totalRows: 1,
					detectedDelimiter: ",",
				}) as any,
		};

		const postMessage = async (m: any) => {
			posted = m;
			return true;
		};

		const result = await handleReparse(
			{ type: "reparse", delimiter: "auto" },
			vscode.Uri.file("/tmp/foo.csv"),
			postMessage,
			deps as any,
		);
		assert.strictEqual(result.success, true);
		assert.strictEqual(posted?.type, "showData");
	});

	test("handleCreateChart returns error when chartProvider is undefined", async () => {
		let shownError = "";
		const deps = {
			showSaveDialog: async () => undefined,
			writeFile: async () => {},
			showInfoMessage: () => {},
			showErrorMessage: (m: string) => {
				shownError = m;
			},
			parseDataFile: async () => null,
		};

		const result = await handleCreateChart(
			{
				type: "createChart",
				data: {
					headers: ["a"],
					rows: [["b"]],
					totalRows: 1,
					detectedDelimiter: ",",
					fileName: "f.csv",
					fileType: "csv",
				},
			},
			undefined,
			undefined,
			deps as any,
		);
		assert.strictEqual(result.success, false);
		assert.ok(shownError.includes("Chart provider not available"));
	});

	test("handleReparse returns error when currentUri is undefined", async () => {
		let shownError = "";
		const deps = {
			showSaveDialog: async () => undefined,
			writeFile: async () => {},
			showInfoMessage: () => {},
			showErrorMessage: (m: string) => {
				shownError = m;
			},
			parseDataFile: async () => null,
		};

		const postMessage = async (_m: any) => true;

		const result = await handleReparse(
			{ type: "reparse", delimiter: "auto" },
			undefined,
			postMessage,
			deps as any,
		);
		assert.strictEqual(result.success, false);
		assert.ok(shownError.includes("Cannot reparse"));
	});
});
