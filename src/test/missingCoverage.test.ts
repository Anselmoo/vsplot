import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
import { parseDataFile } from "../data/load";
import { ChartViewProvider } from "../providers/chartViewProvider";

class FakeWebview {
	public posted: any[] = [];
	public cspSource = "vscode-resource:";
	private _handler?: (m: any) => void;
	postMessage(msg: any) {
		this.posted.push(msg);
	}
	onDidReceiveMessage(handler: (m: any) => void) {
		this._handler = handler;
	}
	simulateIncoming(m: any) {
		if (this._handler) {
			this._handler(m);
		}
	}
	asWebviewUri(u: vscode.Uri) {
		return u;
	}
}

class FakeWebviewView {
	public webview = new FakeWebview();
	public show = (_?: boolean) => {};
}

suite("Missing Coverage Tests", () => {
	/**
	 * Test coverage for openPreview command execution failure
	 * Covers chartViewProvider.ts lines 121-123 (catch block error handling)
	 */
	test("openPreview message shows error when executeCommand throws", async () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));
		const fakeView = new FakeWebviewView() as any;
		provider.resolveWebviewView(fakeView, {} as any, {} as any);

		const origExec = vscode.commands.executeCommand;
		const origError = vscode.window.showErrorMessage;
		let shownError = "";

		// Mock executeCommand to throw an error
		(vscode.commands.executeCommand as any) = async () => {
			throw new Error("Command execution failed");
		};

		(vscode.window.showErrorMessage as any) = (msg: string) => {
			shownError = msg;
		};

		try {
			// Set a current URI first
			await provider.showChart(vscode.Uri.file("/tmp/data.csv"), {
				headers: ["h"],
				rows: [[1]],
				totalRows: 1,
				fileName: "data.csv",
				detectedDelimiter: ",",
			} as any);

			// Trigger openPreview message
			fakeView.webview.simulateIncoming({ type: "openPreview" });
			await new Promise((resolve) => setTimeout(resolve, 20));

			// Verify error message was shown
			assert.ok(shownError.includes("Failed to open data preview"), "Should show error message");
			assert.ok(
				shownError.includes("Command execution failed"),
				"Should include original error message",
			);
		} finally {
			(vscode.commands.executeCommand as any) = origExec;
			(vscode.window.showErrorMessage as any) = origError;
		}
	});

	/**
	 * Test coverage for openPreview command execution failure with non-Error object
	 * Covers chartViewProvider.ts line 122 (String(_error) path)
	 */
	test("openPreview message handles non-Error thrown values", async () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));
		const fakeView = new FakeWebviewView() as any;
		provider.resolveWebviewView(fakeView, {} as any, {} as any);

		const origExec = vscode.commands.executeCommand;
		const origError = vscode.window.showErrorMessage;
		let shownError = "";

		// Mock executeCommand to throw a non-Error value
		(vscode.commands.executeCommand as any) = async () => {
			throw "String error message";
		};

		(vscode.window.showErrorMessage as any) = (msg: string) => {
			shownError = msg;
		};

		try {
			// Set a current URI first
			await provider.showChart(vscode.Uri.file("/tmp/data.csv"), {
				headers: ["h"],
				rows: [[1]],
				totalRows: 1,
				fileName: "data.csv",
				detectedDelimiter: ",",
			} as any);

			// Trigger openPreview message
			fakeView.webview.simulateIncoming({ type: "openPreview" });
			await new Promise((resolve) => setTimeout(resolve, 20));

			// Verify error message was shown with stringified error
			assert.ok(shownError.includes("Failed to open data preview"), "Should show error message");
			assert.ok(shownError.includes("String error message"), "Should include stringified error");
		} finally {
			(vscode.commands.executeCommand as any) = origExec;
			(vscode.window.showErrorMessage as any) = origError;
		}
	});

	/**
	 * Test coverage for unsupported file type in parseDataFile
	 * Covers load.ts line 73 (unsupported file type error message)
	 */
	test("parseDataFile returns null and shows error for unsupported file type", async () => {
		const tmpPath = path.join(__dirname, "../../test-data/test-unsupported.xyz");
		const content = "Some content";
		await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

		const origError = vscode.window.showErrorMessage;
		let shownError = "";
		(vscode.window.showErrorMessage as any) = (msg: string) => {
			shownError = msg;
		};

		try {
			const uri = vscode.Uri.file(tmpPath);
			const result = await parseDataFile(uri);

			assert.strictEqual(result, null, "Should return null for unsupported file type");
			assert.ok(
				shownError.includes("Unsupported file type"),
				"Should show unsupported file type error",
			);
			assert.ok(shownError.includes(".xyz"), "Error should mention the file extension");
		} finally {
			(vscode.window.showErrorMessage as any) = origError;
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		}
	});

	/**
	 * Test coverage for file reading error in parseDataFile
	 * Covers load.ts line 77 (file reading error catch block)
	 */
	test("parseDataFile returns null and shows error when file cannot be read", async () => {
		// Use a path that doesn't exist to trigger file reading error
		const tmpPath = path.join(__dirname, "../../test-data/non-existent-file.csv");

		const origError = vscode.window.showErrorMessage;
		let shownError = "";
		(vscode.window.showErrorMessage as any) = (msg: string) => {
			shownError = msg;
		};

		try {
			const uri = vscode.Uri.file(tmpPath);
			const result = await parseDataFile(uri);

			assert.strictEqual(result, null, "Should return null when file cannot be read");
			assert.ok(shownError.includes("Error reading file"), "Should show file reading error");
		} finally {
			(vscode.window.showErrorMessage as any) = origError;
		}
	});
});
