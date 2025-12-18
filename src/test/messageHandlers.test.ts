/**
 * Unit tests for extracted message handler functions.
 * These tests use dependency injection to test webview message handling
 * that was previously unreachable via integration tests.
 */
import * as assert from "assert";
import * as vscode from "vscode";
import {
    handleExportData,
    handleCreateChart,
    handleReparse,
    toCSV,
    MessageHandlerDependencies,
    ExportDataMessage,
    CreateChartMessage,
    ReparseMessage,
    ChartProviderLike,
    createDefaultMessageHandlerDeps,
} from "../providers/dataPreviewProvider";
import {
    createDefaultDependencies,
} from "../commands/dataCommands";
import type { ParsedData } from "../data/load";

// --- Mock Helpers ---

function createMockDeps(overrides: Partial<MessageHandlerDependencies> = {}): MessageHandlerDependencies {
    return {
        showSaveDialog: async () => undefined,
        writeFile: async () => {},
        showInfoMessage: () => {},
        showErrorMessage: () => {},
        parseDataFile: async () => null,
        ...overrides,
    };
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

suite("Message Handler Unit Tests", () => {
    suite("Default Dependencies Coverage", () => {
        test("createDefaultMessageHandlerDeps returns valid dependencies", () => {
            const deps = createDefaultMessageHandlerDeps();
            assert.ok(deps.showSaveDialog);
            assert.ok(deps.writeFile);
            assert.ok(deps.showInfoMessage);
            assert.ok(deps.showErrorMessage);
            assert.ok(deps.parseDataFile);
        });

        test("createDefaultDependencies returns valid dependencies", () => {
            const deps = createDefaultDependencies();
            assert.ok(deps.getActiveEditorUri);
            assert.ok(deps.parseDataFile);
            assert.ok(deps.showErrorMessage);
            assert.ok(deps.showInfoMessage);
            assert.ok(deps.findWorkspaceFiles);
            assert.ok(deps.showQuickPick);
            assert.ok(deps.getWorkspaceFolders);
            assert.ok(deps.asRelativePath);
        });

        test("default message handler deps functions are callable", () => {
            const deps = createDefaultMessageHandlerDeps();
            // These won't do anything meaningful without VS Code context
            // but we verify they don't throw when called
            deps.showInfoMessage("test");
            deps.showErrorMessage("test");
        });

        test("default command deps functions are callable", () => {
            const deps = createDefaultDependencies();
            // These return undefined/empty in test context but shouldn't throw
            const uri = deps.getActiveEditorUri();
            assert.strictEqual(uri, undefined);
            const folders = deps.getWorkspaceFolders();
            // May or may not have folders in test workspace
            deps.showErrorMessage("test");
            deps.showInfoMessage("test");
        });

        test("default command deps asRelativePath works", () => {
            const deps = createDefaultDependencies();
            // Test asRelativePath - this should work with any URI
            const testUri = vscode.Uri.file("/test/path/file.csv");
            const relativePath = deps.asRelativePath(testUri);
            assert.ok(typeof relativePath === "string");
        });

        test("default command deps findWorkspaceFiles works", async () => {
            const deps = createDefaultDependencies();
            // Test findWorkspaceFiles - returns Thenable
            const files = await deps.findWorkspaceFiles("**/*.nonexistent12345");
            assert.ok(Array.isArray(files));
            assert.strictEqual(files.length, 0);
        });
    });

    suite("toCSV", () => {
        test("should convert headers and rows to CSV string", () => {
            const result = toCSV(["Name", "Value"], [["Alice", 100], ["Bob", 200]]);
            assert.strictEqual(result, "Name,Value\nAlice,100\nBob,200");
        });

        test("should escape values with commas", () => {
            const result = toCSV(["Name"], [["Hello, World"]]);
            assert.strictEqual(result, 'Name\n"Hello, World"');
        });

        test("should escape values with quotes", () => {
            const result = toCSV(["Name"], [['Say "Hello"']]);
            assert.strictEqual(result, 'Name\n"Say ""Hello"""');
        });

        test("should escape values with newlines", () => {
            const result = toCSV(["Text"], [["Line1\nLine2"]]);
            assert.strictEqual(result, 'Text\n"Line1\nLine2"');
        });

        test("should handle null and undefined values", () => {
            const result = toCSV(["A", "B"], [[null as unknown as string, undefined as unknown as number]]);
            assert.strictEqual(result, "A,B\n,");
        });

        test("should handle empty rows", () => {
            const result = toCSV(["A", "B"], []);
            assert.strictEqual(result, "A,B");
        });

        test("should handle numeric values", () => {
            const result = toCSV(["X", "Y"], [[1.5, 2.7], [3, 4]]);
            assert.strictEqual(result, "X,Y\n1.5,2.7\n3,4");
        });
    });

    suite("handleExportData", () => {
        test("should succeed when user selects save location", async () => {
            const saveUri = vscode.Uri.file("/export/data.csv");
            let writtenUri: vscode.Uri | undefined;
            let writtenContent = "";
            let infoShown = false;

            const deps = createMockDeps({
                showSaveDialog: async () => saveUri,
                writeFile: async (uri, content) => {
                    writtenUri = uri;
                    writtenContent = Buffer.from(content).toString("utf8");
                },
                showInfoMessage: () => { infoShown = true; },
            });

            const message: ExportDataMessage = {
                type: "exportData",
                data: { headers: ["A", "B"], rows: [[1, 2]] },
            };

            const result = await handleExportData(message, deps);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.error, undefined);
            assert.strictEqual(writtenUri?.fsPath, saveUri.fsPath);
            assert.strictEqual(writtenContent, "A,B\n1,2");
            assert.strictEqual(infoShown, true);
        });

        test("should succeed when user cancels save dialog", async () => {
            let writeFileCalled = false;

            const deps = createMockDeps({
                showSaveDialog: async () => undefined,
                writeFile: async () => { writeFileCalled = true; },
            });

            const message: ExportDataMessage = {
                type: "exportData",
                data: { headers: ["A"], rows: [[1]] },
            };

            const result = await handleExportData(message, deps);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.error, undefined);
            assert.strictEqual(writeFileCalled, false);
        });

        test("should return error when writeFile fails", async () => {
            let errorShown = "";

            const deps = createMockDeps({
                showSaveDialog: async () => vscode.Uri.file("/test.csv"),
                writeFile: async () => { throw new Error("Write failed"); },
                showErrorMessage: (msg) => { errorShown = msg; },
            });

            const message: ExportDataMessage = {
                type: "exportData",
                data: { headers: ["A"], rows: [[1]] },
            };

            const result = await handleExportData(message, deps);

            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes("Write failed"));
            assert.ok(errorShown.includes("Write failed"));
        });

        test("should return error when showSaveDialog throws", async () => {
            let errorShown = "";

            const deps = createMockDeps({
                showSaveDialog: async () => { throw new Error("Dialog error"); },
                showErrorMessage: (msg) => { errorShown = msg; },
            });

            const message: ExportDataMessage = {
                type: "exportData",
                data: { headers: ["A"], rows: [[1]] },
            };

            const result = await handleExportData(message, deps);

            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes("Dialog error"));
            assert.ok(errorShown.includes("Dialog error"));
        });
    });

    suite("handleCreateChart", () => {
        test("should succeed when chart provider is available", async () => {
            let chartShown = false;
            let receivedUri: vscode.Uri | undefined;
            let receivedData: ParsedData | undefined;

            const currentUri = vscode.Uri.file("/current/file.csv");
            const mockData = createMockParsedData();

            const chartProvider: ChartProviderLike = {
                showChart: async (uri, data) => {
                    chartShown = true;
                    receivedUri = uri;
                    receivedData = data;
                },
            };

            const message: CreateChartMessage = {
                type: "createChart",
                data: mockData,
            };

            const result = await handleCreateChart(message, currentUri, chartProvider, createMockDeps());

            assert.strictEqual(result.success, true);
            assert.strictEqual(chartShown, true);
            assert.strictEqual(receivedUri?.fsPath, currentUri.fsPath);
            assert.deepStrictEqual(receivedData?.headers, mockData.headers);
        });

        test("should return error when chart provider is not available", async () => {
            let errorShown = "";

            const deps = createMockDeps({
                showErrorMessage: (msg) => { errorShown = msg; },
            });

            const message: CreateChartMessage = {
                type: "createChart",
                data: createMockParsedData(),
            };

            const result = await handleCreateChart(message, undefined, undefined, deps);

            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, "Chart provider not available");
            assert.ok(errorShown.includes("Chart provider not available"));
        });

        test("should use fileName from message when no currentUri", async () => {
            let receivedUri: vscode.Uri | undefined;
            const mockData = { ...createMockParsedData(), fileName: "from-message.csv" };

            const chartProvider: ChartProviderLike = {
                showChart: async (uri) => { receivedUri = uri; },
            };

            const message: CreateChartMessage = {
                type: "createChart",
                data: mockData,
            };

            await handleCreateChart(message, undefined, chartProvider, createMockDeps());

            assert.ok(receivedUri?.fsPath.includes("from-message.csv"));
        });

        test("should use default filename when no currentUri and no fileName", async () => {
            let receivedUri: vscode.Uri | undefined;
            // Create data without fileName to test the default fallback
            const mockData: ParsedData = {
                headers: ["A", "B"],
                rows: [[1, 2]],
                fileName: "", // Empty string to trigger default
                fileType: "csv",
                totalRows: 1,
            };

            const chartProvider: ChartProviderLike = {
                showChart: async (uri) => { receivedUri = uri; },
            };

            const message: CreateChartMessage = {
                type: "createChart",
                data: mockData,
            };

            await handleCreateChart(message, undefined, chartProvider, createMockDeps());

            assert.ok(receivedUri?.fsPath.includes("preview"));
        });

        test("should return error when showChart throws", async () => {
            let errorShown = "";

            const deps = createMockDeps({
                showErrorMessage: (msg) => { errorShown = msg; },
            });

            const chartProvider: ChartProviderLike = {
                showChart: async () => { throw new Error("Chart error"); },
            };

            const message: CreateChartMessage = {
                type: "createChart",
                data: createMockParsedData(),
            };

            const result = await handleCreateChart(message, vscode.Uri.file("/test.csv"), chartProvider, deps);

            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes("Chart error"));
            assert.ok(errorShown.includes("Chart error"));
        });
    });

    suite("handleReparse", () => {
        test("should return error when no currentUri", async () => {
            let errorShown = "";

            const deps = createMockDeps({
                showErrorMessage: (msg) => { errorShown = msg; },
            });

            const message: ReparseMessage = {
                type: "reparse",
                delimiter: ",",
            };

            const result = await handleReparse(message, undefined, async () => true, deps);

            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes("Cannot reparse"));
            assert.ok(errorShown.includes("Cannot reparse"));
        });

        test("should reparse with explicit delimiter", async () => {
            let receivedDelimiter: string | undefined;
            let postedMessage: unknown;

            const deps = createMockDeps({
                parseDataFile: async (_uri, options) => {
                    receivedDelimiter = options?.delimiter;
                    return createMockParsedData();
                },
            });

            const message: ReparseMessage = {
                type: "reparse",
                delimiter: ";",
            };

            const result = await handleReparse(
                message,
                vscode.Uri.file("/test.csv"),
                async (msg) => { postedMessage = msg; return true; },
                deps
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(receivedDelimiter, ";");
            assert.ok(postedMessage);
        });

        test("should reparse with auto delimiter (undefined)", async () => {
            let receivedDelimiter: string | undefined = "not-called";

            const deps = createMockDeps({
                parseDataFile: async (_uri, options) => {
                    receivedDelimiter = options?.delimiter;
                    return createMockParsedData();
                },
            });

            const message: ReparseMessage = {
                type: "reparse",
                delimiter: "auto",
            };

            await handleReparse(
                message,
                vscode.Uri.file("/test.csv"),
                async () => true,
                deps
            );

            assert.strictEqual(receivedDelimiter, undefined);
        });

        test("should post message with parsed data", async () => {
            const mockData = createMockParsedData();
            let postedMessage: { type: string; data: ParsedData } | undefined;

            const deps = createMockDeps({
                parseDataFile: async () => mockData,
            });

            const message: ReparseMessage = {
                type: "reparse",
                delimiter: ",",
            };

            await handleReparse(
                message,
                vscode.Uri.file("/test.csv"),
                async (msg) => { postedMessage = msg as { type: string; data: ParsedData }; return true; },
                deps
            );

            assert.ok(postedMessage);
            assert.strictEqual(postedMessage?.type, "showData");
            assert.deepStrictEqual(postedMessage?.data.headers, mockData.headers);
        });

        test("should not post message when parseDataFile returns null", async () => {
            let postMessageCalled = false;

            const deps = createMockDeps({
                parseDataFile: async () => null,
            });

            const message: ReparseMessage = {
                type: "reparse",
                delimiter: ",",
            };

            await handleReparse(
                message,
                vscode.Uri.file("/test.csv"),
                async () => { postMessageCalled = true; return true; },
                deps
            );

            assert.strictEqual(postMessageCalled, false);
        });

        test("should handle parse failure with exception", async () => {
            let errorShown = "";

            const deps = createMockDeps({
                parseDataFile: async () => { throw new Error("Parse error"); },
                showErrorMessage: (msg) => { errorShown = msg; },
            });

            const message: ReparseMessage = {
                type: "reparse",
                delimiter: ",",
            };

            const result = await handleReparse(
                message,
                vscode.Uri.file("/test.csv"),
                async () => true,
                deps
            );

            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes("Parse error"));
            assert.ok(errorShown.includes("Parse error"));
        });

        test("should use correct URI for parsing", async () => {
            let receivedUri: vscode.Uri | undefined;
            const testUri = vscode.Uri.file("/workspace/data.csv");

            const deps = createMockDeps({
                parseDataFile: async (uri) => {
                    receivedUri = uri;
                    return createMockParsedData();
                },
            });

            const message: ReparseMessage = {
                type: "reparse",
                delimiter: ",",
            };

            await handleReparse(
                message,
                testUri,
                async () => true,
                deps
            );

            assert.strictEqual(receivedUri?.fsPath, testUri.fsPath);
        });
    });
});
