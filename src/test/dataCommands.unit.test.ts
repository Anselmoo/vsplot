import * as assert from "node:assert";
import * as vscode from "vscode";
import {
	executeOpenDataViewer,
	executePlotData,
	executePreviewData,
	makeOpenDataViewerHandler,
	resolveUri,
} from "../commands/dataCommands";

suite("DataCommands Unit Tests", () => {
	test("resolveUri returns error when no active editor and none provided", () => {
		const res = resolveUri(undefined, () => undefined);
		assert.strictEqual(res.success, false);
		assert.ok(res.error?.includes("No file selected"));
	});

	test("executePreviewData returns error when parseDataFile returns null", async () => {
		const deps = {
			getActiveEditorUri: () => vscode.Uri.file("/tmp/x.csv"),
			parseDataFile: async (_: vscode.Uri) => null,
			showErrorMessage: (_: string) => {},
			showInfoMessage: (_: string) => {},
			findWorkspaceFiles: async () => [],
			showQuickPick: async () => undefined,
			getWorkspaceFolders: () => undefined,
			asRelativePath: (_: vscode.Uri) => "x",
		};
		let called = false;
		const previewProvider = {
			showPreview: async (_: vscode.Uri, _d: any) => {
				called = true;
			},
		};
		const result = await executePreviewData(undefined as any, deps as any, previewProvider);
		assert.strictEqual(result.success, false);
		assert.strictEqual(called, false);
	});

	test("executePlotData returns error when parseDataFile returns null", async () => {
		const deps = {
			getActiveEditorUri: () => vscode.Uri.file("/tmp/x.csv"),
			parseDataFile: async (_: vscode.Uri) => null,
			showErrorMessage: (_: string) => {},
			showInfoMessage: (_: string) => {},
			findWorkspaceFiles: async () => [],
			showQuickPick: async () => undefined,
			getWorkspaceFolders: () => undefined,
			asRelativePath: (_: vscode.Uri) => "x",
		};
		let called = false;
		const chartProvider = {
			showChart: async (_: vscode.Uri, _d: any) => {
				called = true;
			},
		};
		const result = await executePlotData(undefined as any, deps as any, chartProvider);
		assert.strictEqual(result.success, false);
		assert.strictEqual(called, false);
	});

	test("executeOpenDataViewer returns error when no workspace folders", async () => {
		const deps = {
			getWorkspaceFolders: () => undefined,
			findWorkspaceFiles: async () => [],
			showQuickPick: async () => undefined,
			asRelativePath: (_: vscode.Uri) => "x",
			getActiveEditorUri: () => undefined,
			parseDataFile: async () => null,
			showErrorMessage: (_: string) => {},
			showInfoMessage: (_: string) => {},
		};
		const previewProvider = { showPreview: async () => {} };
		const result = await executeOpenDataViewer(deps as any, previewProvider);
		assert.strictEqual(result.success, false);
		assert.ok(result.error && result.error.includes("No workspace folder open."));
	});

	test("executeOpenDataViewer returns info when no files found", async () => {
		const deps = {
			getWorkspaceFolders: () => [{ uri: vscode.Uri.file("/tmp") } as any],
			findWorkspaceFiles: async () => [],
			showQuickPick: async () => undefined,
			asRelativePath: (_: vscode.Uri) => "x",
			getActiveEditorUri: () => undefined,
			parseDataFile: async () => null,
			showErrorMessage: (_: string) => {},
			showInfoMessage: (_: string) => {},
		};
		const previewProvider = { showPreview: async () => {} };
		const result = await executeOpenDataViewer(deps as any, previewProvider);
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.info, "No data files found in workspace.");
	});

	test("executeOpenDataViewer returns success when user cancels quick pick", async () => {
		const uri = vscode.Uri.file("/tmp/x.csv");
		const deps = {
			getWorkspaceFolders: () => [{ uri: vscode.Uri.file("/tmp") } as any],
			findWorkspaceFiles: async () => [uri],
			showQuickPick: async () => undefined,
			asRelativePath: (_: vscode.Uri) => "x",
			getActiveEditorUri: () => undefined,
			parseDataFile: async () => null,
			showErrorMessage: (_: string) => {},
			showInfoMessage: (_: string) => {},
		};
		const previewProvider = { showPreview: async () => {} };
		const result = await executeOpenDataViewer(deps as any, previewProvider);
		assert.strictEqual(result.success, true);
	});

	test("executeOpenDataViewer returns error when parse of selected file fails", async () => {
		const uri = vscode.Uri.file("/tmp/x.csv");
		const deps = {
			getWorkspaceFolders: () => [{ uri: vscode.Uri.file("/tmp") } as any],
			findWorkspaceFiles: async () => [uri],
			showQuickPick: async () => ({ uri }) as any,
			asRelativePath: (_: vscode.Uri) => "x",
			getActiveEditorUri: () => undefined,
			parseDataFile: async () => null,
			showErrorMessage: (_: string) => {},
			showInfoMessage: (_: string) => {},
		};
		const previewProvider = { showPreview: async () => {} };
		const result = await executeOpenDataViewer(deps as any, previewProvider);
		assert.strictEqual(result.success, false);
		assert.strictEqual(result.error, "Failed to parse selected data file");
	});

	test("makeOpenDataViewerHandler calls showInfoMessage when no files found", async () => {
		let infoShown = "";
		const fakeDeps: any = {
			getWorkspaceFolders: () => [{ uri: vscode.Uri.file("/tmp") } as any],
			findWorkspaceFiles: async () => [],
			showQuickPick: async () => undefined,
			asRelativePath: (_: vscode.Uri) => "x",
			getActiveEditorUri: () => undefined,
			parseDataFile: async () => null,
			showErrorMessage: (_: string) => {},
			showInfoMessage: (m: string) => {
				infoShown = m;
			},
		};

		const handler = makeOpenDataViewerHandler(
			fakeDeps as any,
			{ showPreview: async () => {} } as any,
		);
		await handler();
		assert.ok(infoShown.includes("No data files found in workspace."));
	});
});
