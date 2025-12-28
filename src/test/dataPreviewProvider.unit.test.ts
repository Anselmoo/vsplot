import * as assert from "node:assert";
import * as vscode from "vscode";
import type { ParsedData } from "../data/load";
import type {
	ChartProviderLike,
	MessageHandlerDependencies,
} from "../providers/dataPreviewProvider";
import {
	handleCreateChart,
	handleExportData,
	handleReparse,
	toCSV,
} from "../providers/dataPreviewProvider";

suite("DataPreviewProvider Unit Tests", () => {
	test("toCSV escapes commas, quotes and newlines", () => {
		const headers = ["h1", "h2"];
		const rows: (string | number)[][] = [
			["simple", 'with "quote"'],
			["mult\nline", 42],
		];
		const csv = toCSV(headers, rows);
		assert.ok(csv.includes('"with ""quote"""'));
		assert.ok(csv.includes('"mult\nline"'));
	});

	test("handleExportData returns error when writeFile throws", async () => {
		let shownError = "";
		const deps: MessageHandlerDependencies = {
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
			deps,
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
		let posted: unknown = null;
		const deps: MessageHandlerDependencies = {
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
				}) as ParsedData,
		};

		const postMessage = async (m: unknown) => {
			posted = m;
			return true;
		};

		const result = await handleReparse(
			{ type: "reparse", delimiter: "auto" },
			vscode.Uri.file("/tmp/foo.csv"),
			postMessage,
			deps,
		);
		assert.strictEqual(result.success, true);
		assert.strictEqual((posted as any)?.type, "showData");
	});

	test("handleCreateChart returns error when chartProvider is undefined", async () => {
		let shownError = "";
		const deps: MessageHandlerDependencies = {
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
			deps,
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

	test("handleCreateChart uses fileName when currentUri is undefined", async () => {
		let calledUri: vscode.Uri | null = null;
		const chartProvider: ChartProviderLike = {
			showChart: async (uri: vscode.Uri, _data: ParsedData) => {
				calledUri = uri;
			},
		};

		const deps: MessageHandlerDependencies = {
			showSaveDialog: async () => undefined,
			writeFile: async () => {},
			showInfoMessage: () => {},
			showErrorMessage: (_: string) => {},
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
					fileName: "file.csv",
					fileType: "csv",
				},
			},
			undefined,
			chartProvider,
			deps,
		);
		assert.strictEqual(result.success, true);
		assert.ok(calledUri);
		if (calledUri) {
			assert.ok((calledUri as any).fsPath.endsWith("file.csv"));
		}
	});

	test("handleCreateChart uses default filename when none provided", async () => {
		let calledUri: vscode.Uri | null = null;
		const chartProvider: ChartProviderLike = {
			showChart: async (uri: vscode.Uri, _data: ParsedData) => {
				calledUri = uri;
			},
		};

		const deps: MessageHandlerDependencies = {
			showSaveDialog: async () => undefined,
			writeFile: async () => {},
			showInfoMessage: () => {},
			showErrorMessage: (_: string) => {},
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
					fileType: "csv",
				},
			},
			undefined,
			chartProvider,
			deps,
		);
		assert.strictEqual(result.success, true);
		assert.ok(calledUri);
		if (calledUri) {
			assert.ok((calledUri as any).path.includes("preview"));
		}
	});

	test("handleCreateChart returns error when chartProvider.showChart throws", async () => {
		let shownError = "";
		const chartProvider: ChartProviderLike = {
			showChart: async () => {
				throw new Error("chart-fail");
			},
		};

		const deps: MessageHandlerDependencies = {
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
					fileName: "file.csv",
					fileType: "csv",
				},
			},
			undefined,
			chartProvider,
			deps,
		);
		assert.strictEqual(result.success, false);
		assert.ok(shownError.includes("Failed to create chart"));
	});
});
