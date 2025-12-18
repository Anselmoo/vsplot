/**
 * Unit tests for extracted command logic functions.
 * These tests use dependency injection to test all code paths
 * that were previously unreachable via command execution.
 */
import * as assert from "assert";
import * as vscode from "vscode";
import {
    resolveUri,
    executePreviewData,
    executePlotData,
    executeOpenDataViewer,
    CommandDependencies,
    CommandResult,
} from "../commands/dataCommands";
import type { ParsedData } from "../data/load";

// --- Mock Helpers ---

function createMockDeps(overrides: Partial<CommandDependencies> = {}): CommandDependencies {
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
        rows: [[1, 2], [3, 4]],
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

            assert.strictEqual(result.uri?.fsPath, uri.fsPath);
            assert.strictEqual(result.error, undefined);
        });

        test("should fallback to active editor URI when no URI provided", () => {
            const activeUri = vscode.Uri.file("/active/editor.csv");
            const result = resolveUri(undefined, () => activeUri);

            assert.strictEqual(result.uri?.fsPath, activeUri.fsPath);
            assert.strictEqual(result.error, undefined);
        });

        test("should return error when no URI and no active editor", () => {
            const result = resolveUri(undefined, () => undefined);

            assert.strictEqual(result.uri, undefined);
            assert.strictEqual(result.error, "No file selected.");
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
                showPreview: async () => { showPreviewCalled = true; },
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
                showChart: async () => { showChartCalled = true; },
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
                getWorkspaceFolders: () => [{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 }],
                findWorkspaceFiles: async () => [],
            });
            const mockProvider = { showPreview: async () => {} };

            const result = await executeOpenDataViewer(deps, mockProvider);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.info, "No data files found in workspace.");
        });

        test("should succeed when user cancels quick pick", async () => {
            const deps = createMockDeps({
                getWorkspaceFolders: () => [{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 }],
                findWorkspaceFiles: async () => [vscode.Uri.file("/workspace/test.csv")],
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
                getWorkspaceFolders: () => [{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 }],
                findWorkspaceFiles: async () => [fileUri],
                showQuickPick: async () => ({ label: "test.csv", description: fileUri.fsPath, uri: fileUri }),
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
                getWorkspaceFolders: () => [{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 }],
                findWorkspaceFiles: async () => [fileUri],
                showQuickPick: async () => ({ label: "test.csv", description: fileUri.fsPath, uri: fileUri }),
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
                getWorkspaceFolders: () => [{ uri: vscode.Uri.file("/workspace"), name: "test", index: 0 }],
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
});
