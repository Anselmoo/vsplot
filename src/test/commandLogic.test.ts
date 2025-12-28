/**
 * Unit tests for extracted command logic functions.
 * These tests use dependency injection to test all code paths
 * that were previously unreachable via command execution.
 */
import * as assert from "node:assert";
import * as vscode from "vscode";
import {
	type CommandDependencies,
	executeOpenDataViewer,
	executePlotData,
	executePreviewData,
	resolveUri,
} from "../commands/dataCommands";
import type { ParsedData } from "../data/load";

// --- Mock Helpers ---

function createMockDeps(
	overrides: Partial<CommandDependencies> = {},
): CommandDependencies {
	return {
		getActiveEditorUri: () => undefined,
		parseDataFile: async () => null,
		showErrorMessage: () => {},
		showInfoMessage: () => {},
		findWorkspaceFiles: async () => [],
		showQuickPick: async () => undefined,
		getWorkspaceFolders: () => undefined,
		asRelativePath: (uri) => uri.fsPath,
		...overrides,
	} as CommandDependencies;
}

function createMockParsedData(overrides: Partial<ParsedData> = {}): ParsedData {
	return {
		headers: ["A", "B"],
		rows: [
			[1, 2],
			[3, 4],
		],
		fileName: "test.csv",
		fileType: "csv",
		totalRows: 2,
		...overrides,
	};
}

// --- Tests ---

suite("Command Logic Unit Tests", () => {
	suite("resolveUri", () => {
		test("should return provided URI when given", () => {
			const uri = vscode.Uri.file("/test/file.csv");
			const result = resolveUri(uri, () => undefined);

			assert.strictEqual(result.success, true);
			if (result.success) {
				assert.strictEqual(result.uri.fsPath, uri.fsPath);
			}
		});

		test("should fallback to active editor URI when no URI provided", () => {
			const activeUri = vscode.Uri.file("/active/editor.csv");
			const result = resolveUri(undefined, () => activeUri);

			assert.strictEqual(result.success, true);
			if (result.success) {
				assert.strictEqual(result.uri.fsPath, activeUri.fsPath);
			}
		});

		test("should return error when no URI and no active editor", () => {
			const result = resolveUri(undefined, () => undefined);

			assert.strictEqual(result.success, false);
			if (!result.success) {
				assert.strictEqual(result.error, "No file selected.");
			}
		});
	});

	suite("executePreviewData", () => {
		test("should succeed with valid URI and parsed data", async () => {
			const uri = vscode.Uri.file("/test/file.csv");
			const mockData = createMockParsedData();
			let showPreviewCalled = false;

			const deps = createMockDeps({
				parseDataFile: async () => mockData,
			});
			const mockProvider = {
				showPreview: async () => {
					showPreviewCalled = true;
				},
			};

			const result = await executePreviewData(uri, deps, mockProvider);

			assert.strictEqual(result.success, true);
			assert.strictEqual(result.error, undefined);
			assert.strictEqual(showPreviewCalled, true);
		});

		test("should return error when no URI and no active editor", async () => {
			const deps = createMockDeps({
				getActiveEditorUri: () => undefined,
			});
			const mockProvider = { showPreview: async () => {} };

			const result = await executePreviewData(undefined, deps, mockProvider);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.error, "No file selected.");
		});

		test("should return error when parseDataFile returns null", async () => {
			const uri = vscode.Uri.file("/test/file.csv");
			const deps = createMockDeps({
				parseDataFile: async () => null,
			});
			const mockProvider = { showPreview: async () => {} };

			const result = await executePreviewData(uri, deps, mockProvider);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.error, "Failed to parse data file");
		});

		test("should use active editor fallback when URI is undefined", async () => {
			const activeUri = vscode.Uri.file("/active/file.csv");
			const mockData = createMockParsedData();
			let receivedUri: vscode.Uri | undefined;

			const deps = createMockDeps({
				getActiveEditorUri: () => activeUri,
				parseDataFile: async (uri) => {
					receivedUri = uri;
					return mockData;
				},
			});
			const mockProvider = { showPreview: async () => {} };

			const result = await executePreviewData(undefined, deps, mockProvider);

			assert.strictEqual(result.success, true);
			assert.strictEqual(receivedUri?.fsPath, activeUri.fsPath);
		});
	});

	suite("executePlotData", () => {
		test("should succeed with valid URI and parsed data", async () => {
			const uri = vscode.Uri.file("/test/file.csv");
			const mockData = createMockParsedData();
			let showChartCalled = false;

			const deps = createMockDeps({
				parseDataFile: async () => mockData,
			});
			const mockProvider = {
				showChart: async () => {
					showChartCalled = true;
				},
			};

			const result = await executePlotData(uri, deps, mockProvider);

			assert.strictEqual(result.success, true);
			assert.strictEqual(showChartCalled, true);
		});

		test("should return error when no URI and no active editor", async () => {
			const deps = createMockDeps();
			const mockProvider = { showChart: async () => {} };

			const result = await executePlotData(undefined, deps, mockProvider);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.error, "No file selected.");
		});

		test("should return error when parseDataFile returns null", async () => {
			const uri = vscode.Uri.file("/test/file.csv");
			const deps = createMockDeps({
				parseDataFile: async () => null,
			});
			const mockProvider = { showChart: async () => {} };

			const result = await executePlotData(uri, deps, mockProvider);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.error, "Failed to parse data file");
		});

		test("should use active editor fallback when URI is undefined", async () => {
			const activeUri = vscode.Uri.file("/active/file.csv");
			const mockData = createMockParsedData();
			let receivedUri: vscode.Uri | undefined;

			const deps = createMockDeps({
				getActiveEditorUri: () => activeUri,
				parseDataFile: async (uri) => {
					receivedUri = uri;
					return mockData;
				},
			});
			const mockProvider = { showChart: async () => {} };

			const result = await executePlotData(undefined, deps, mockProvider);

			assert.strictEqual(result.success, true);
			assert.strictEqual(receivedUri?.fsPath, activeUri.fsPath);
		});
	});

	suite("executeOpenDataViewer", () => {
		test("should return error when no workspace folders", async () => {
			const deps = createMockDeps({
				getWorkspaceFolders: () => undefined,
			});
			const mockProvider = { showPreview: async () => {} };

			const result = await executeOpenDataViewer(deps, mockProvider);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.error, "No workspace folder open.");
		});

		test("should return info when no data files found", async () => {
			const deps = createMockDeps({
				getWorkspaceFolders: () => [
					{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 },
				],
				findWorkspaceFiles: async () => [],
			});
			const mockProvider = { showPreview: async () => {} };

			const result = await executeOpenDataViewer(deps, mockProvider);

			assert.strictEqual(result.success, true);
			assert.strictEqual(result.info, "No data files found in workspace.");
		});

		test("should succeed when user cancels quick pick", async () => {
			const deps = createMockDeps({
				getWorkspaceFolders: () => [
					{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 },
				],
				findWorkspaceFiles: async () => [
					vscode.Uri.file("/workspace/test.csv"),
				],
				showQuickPick: async () => undefined,
			});
			const mockProvider = { showPreview: async () => {} };

			const result = await executeOpenDataViewer(deps, mockProvider);

			assert.strictEqual(result.success, true);
			assert.strictEqual(result.error, undefined);
		});

		test("should return error when selected file fails to parse", async () => {
			const fileUri = vscode.Uri.file("/workspace/test.csv");
			const deps = createMockDeps({
				getWorkspaceFolders: () => [
					{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 },
				],
				findWorkspaceFiles: async () => [fileUri],
				showQuickPick: async () => ({
					label: "test.csv",
					description: fileUri.fsPath,
					uri: fileUri,
				}),
				parseDataFile: async () => null,
			});
			const mockProvider = { showPreview: async () => {} };

			const result = await executeOpenDataViewer(deps, mockProvider);

			assert.strictEqual(result.success, false);
			assert.strictEqual(result.error, "Failed to parse selected data file");
		});

		test("should succeed with full workflow", async () => {
			const fileUri = vscode.Uri.file("/workspace/test.csv");
			const mockData = createMockParsedData();
			let showPreviewCalled = false;
			let previewUri: vscode.Uri | undefined;

			const deps = createMockDeps({
				getWorkspaceFolders: () => [
					{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 },
				],
				findWorkspaceFiles: async () => [fileUri],
				showQuickPick: async () => ({
					label: "test.csv",
					description: fileUri.fsPath,
					uri: fileUri,
				}),
				parseDataFile: async () => mockData,
			});
			const mockProvider = {
				showPreview: async (uri: vscode.Uri) => {
					showPreviewCalled = true;
					previewUri = uri;
				},
			};

			const result = await executeOpenDataViewer(deps, mockProvider);

			assert.strictEqual(result.success, true);
			assert.strictEqual(showPreviewCalled, true);
			assert.strictEqual(previewUri?.fsPath, fileUri.fsPath);
		});

		test("should find files from multiple patterns", async () => {
			const csvFile = vscode.Uri.file("/workspace/data.csv");
			const jsonFile = vscode.Uri.file("/workspace/config.json");
			let findCallCount = 0;

			const deps = createMockDeps({
				getWorkspaceFolders: () => [
					{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 },
				],
				findWorkspaceFiles: async (pattern) => {
					findCallCount++;
					if (pattern === "**/*.csv") return [csvFile];
					if (pattern === "**/*.json") return [jsonFile];
					return [];
				},
				showQuickPick: async () => undefined,
			});
			const mockProvider = { showPreview: async () => {} };

			await executeOpenDataViewer(deps, mockProvider);

			// Should call findWorkspaceFiles for each pattern
			assert.ok(findCallCount >= 2, "Should search multiple patterns");
		});
	});

	suite("Exception Handling", () => {
		test("executePreviewData should propagate exception from showPreview", async () => {
			const uri = vscode.Uri.file("/test/file.csv");
			const mockData = createMockParsedData();

			const deps = createMockDeps({
				parseDataFile: async () => mockData,
			});
			const mockProvider = {
				showPreview: async () => {
					throw new Error("Preview panel creation failed");
				},
			};

			// The function should throw when showPreview throws
			try {
				await executePreviewData(uri, deps, mockProvider);
				assert.fail("Should have thrown an error");
			} catch (_error) {
				assert.ok(_error instanceof Error);
				assert.strictEqual(_error.message, "Preview panel creation failed");
			}
		});

		test("executePlotData should propagate exception from showChart", async () => {
			const uri = vscode.Uri.file("/test/file.csv");
			const mockData = createMockParsedData();

			const deps = createMockDeps({
				parseDataFile: async () => mockData,
			});
			const mockProvider = {
				showChart: async () => {
					throw new Error("Chart creation failed");
				},
			};

			// The function should throw when showChart throws
			try {
				await executePlotData(uri, deps, mockProvider);
				assert.fail("Should have thrown an error");
			} catch (_error) {
				assert.ok(_error instanceof Error);
				assert.strictEqual(_error.message, "Chart creation failed");
			}
		});

		test("executeOpenDataViewer should propagate exception from showPreview", async () => {
			const fileUri = vscode.Uri.file("/workspace/test.csv");
			const mockData = createMockParsedData();

			const deps = createMockDeps({
				getWorkspaceFolders: () => [
					{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 },
				],
				findWorkspaceFiles: async () => [fileUri],
				showQuickPick: async () => ({
					label: "test.csv",
					description: fileUri.fsPath,
					uri: fileUri,
				}),
				parseDataFile: async () => mockData,
			});
			const mockProvider = {
				showPreview: async () => {
					throw new Error("Preview panel creation failed");
				},
			};

			// The function should throw when showPreview throws
			try {
				await executeOpenDataViewer(deps, mockProvider);
				assert.fail("Should have thrown an error");
			} catch (_error) {
				assert.ok(_error instanceof Error);
				assert.strictEqual(_error.message, "Preview panel creation failed");
			}
		});

		test("executePreviewData should propagate exception from parseDataFile", async () => {
			const uri = vscode.Uri.file("/test/file.csv");

			const deps = createMockDeps({
				parseDataFile: async () => {
					throw new Error("File read failed");
				},
			});
			const mockProvider = { showPreview: async () => {} };

			try {
				await executePreviewData(uri, deps, mockProvider);
				assert.fail("Should have thrown an error");
			} catch (_error) {
				assert.ok(_error instanceof Error);
				assert.strictEqual(_error.message, "File read failed");
			}
		});

		test("executePlotData should propagate exception from parseDataFile", async () => {
			const uri = vscode.Uri.file("/test/file.csv");

			const deps = createMockDeps({
				parseDataFile: async () => {
					throw new Error("File read failed");
				},
			});
			const mockProvider = { showChart: async () => {} };

			try {
				await executePlotData(uri, deps, mockProvider);
				assert.fail("Should have thrown an error");
			} catch (_error) {
				assert.ok(_error instanceof Error);
				assert.strictEqual(_error.message, "File read failed");
			}
		});

		test("executeOpenDataViewer should propagate exception from findWorkspaceFiles", async () => {
			const deps = createMockDeps({
				getWorkspaceFolders: () => [
					{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 },
				],
				findWorkspaceFiles: async () => {
					throw new Error("Workspace search failed");
				},
			});
			const mockProvider = { showPreview: async () => {} };

			try {
				await executeOpenDataViewer(deps, mockProvider);
				assert.fail("Should have thrown an error");
			} catch (_error) {
				assert.ok(_error instanceof Error);
				assert.strictEqual(_error.message, "Workspace search failed");
			}
		});
	});
});
