import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
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

suite("ChartViewProvider Unit Tests", () => {
	test("resolveWebviewView and showChart posts showChart message", () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));
		const fakeView = new FakeWebviewView() as any;
		provider.resolveWebviewView(fakeView, {} as any, {} as any);

		provider.showChart(vscode.Uri.file("/tmp.csv"), {
			headers: ["h"],
			rows: [[1]],
			totalRows: 1,
			fileName: "tmp.csv",
			detectedDelimiter: ",",
		} as any);

		// When _view exists, showChart should use it and call postMessage
		assert.ok(fakeView.webview.posted.some((p: any) => p.type === "showChart"));
	});

	test("requestChartState throws when no webview available", async () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));
		await assert.rejects(() => provider.requestChartState(), {
			message: "Chart webview not available",
		});
	});

	test("requestChartState resolves when webview replies", async () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));
		const fakeView = new FakeWebviewView() as any;
		provider.resolveWebviewView(fakeView, {} as any, {} as any);

		const p = provider.requestChartState();

		// Find the posted message and extract id
		const posted = fakeView.webview.posted.find((m: any) => m.type === "vsplot:test:getState");
		assert.ok(posted && posted.id, "getState message should be posted");

		// Simulate the webview sending back the state
		fakeView.webview.simulateIncoming({
			type: "vsplot:test:state",
			id: posted.id,
			payload: { chartType: "line" },
		});

		const payload = await p;
		assert.strictEqual(payload.chartType, "line");
	});

	test("applyChartConfig awaits ack when webview applies config", async () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));
		const fakeView = new FakeWebviewView() as any;
		provider.resolveWebviewView(fakeView, {} as any, {} as any);

		const cfg = { chartType: "line" } as any;
		const promise = provider.applyChartConfig(cfg);

		const posted = fakeView.webview.posted.find((m: any) => m.type === "vsplot:test:setConfig");
		assert.ok(posted && posted.id);

		// Simulate the ack
		fakeView.webview.simulateIncoming({
			type: "vsplot:test:config-applied",
			id: posted.id,
		});

		await promise; // should resolve without throwing
	});

	test("exportChart saves image when save dialog accepts and shows error on failure", async () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));
		const fakeView = new FakeWebviewView() as any;
		provider.resolveWebviewView(fakeView, {} as any, {} as any);

		// Stub VS Code APIs
		const origShow = vscode.window.showSaveDialog;
		const tmpPath = path.join(__dirname, "../../test-data/tmp-chart.png");

		// Success path: showSaveDialog returns a file and the workspace fs will write it
		(vscode.window.showSaveDialog as any) = async () => vscode.Uri.file(tmpPath);

		try {
			// Ensure old tmp file is deleted
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				/* ignore */
			}

			// Simulate exportChart message
			fakeView.webview.simulateIncoming({
				type: "exportChart",
				data: "data:image/png;base64,QUJD",
				filename: "chart.png",
			});

			// Give the async handler a moment to write the file
			await new Promise((r) => setTimeout(r, 50));

			// Read the file back and validate base64 content
			const file = await vscode.workspace.fs.readFile(vscode.Uri.file(tmpPath));
			assert.ok(Buffer.from(file).toString("base64").includes("QUJD"));

			// Error path: make showSaveDialog throw so catch block is executed
			let shown = "";
			(vscode.window.showSaveDialog as any) = async () => {
				throw new Error("dialog failed");
			};
			const origErr = vscode.window.showErrorMessage;
			(vscode.window.showErrorMessage as any) = (m: string) => {
				shown = m;
			};
			fakeView.webview.simulateIncoming({
				type: "exportChart",
				data: "data:image/png;base64,QUJD",
				filename: "chart.png",
			});
			// allow async handler to run
			await new Promise((r) => setTimeout(r, 20));
			assert.ok(shown.includes("Failed to save chart image"));
			(vscode.window.showErrorMessage as any) = origErr;
		} finally {
			(vscode.window.showSaveDialog as any) = origShow;
			// cleanup
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				/* ignore */
			}
		}
	});

	test("showChart creates panel when _view undefined", () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));

		const fakePanelWebview = new FakeWebview();
		const origCreate = (vscode.window as any).createWebviewPanel;
		(vscode.window as any).createWebviewPanel = (
			_viewType: any,
			_title: any,
			_col: any,
			_opts: any,
		) => ({ webview: fakePanelWebview }) as any;

		try {
			provider.showChart(vscode.Uri.file("/tmp.csv"), {
				headers: ["h"],
				rows: [[1]],
				totalRows: 1,
				fileName: "tmp.csv",
				detectedDelimiter: ",",
			} as any);

			assert.ok(fakePanelWebview.posted.some((p: any) => p.type === "showChart"));
		} finally {
			(vscode.window as any).createWebviewPanel = origCreate;
		}
	});

	test("exportChart does nothing when save dialog is cancelled", async () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));
		const fakeView = new FakeWebviewView() as any;
		provider.resolveWebviewView(fakeView, {} as any, {} as any);

		const origShow = vscode.window.showSaveDialog;
		const origErr = vscode.window.showErrorMessage;
		let shown = "";
		(vscode.window.showSaveDialog as any) = async () => undefined;
		(vscode.window.showErrorMessage as any) = (m: string) => {
			shown = m;
		};

		try {
			fakeView.webview.simulateIncoming({
				type: "exportChart",
				data: "data:image/png;base64,QUJD",
				filename: "chart.png",
			});

			await new Promise((r) => setTimeout(r, 20));
			assert.strictEqual(shown, ""); // no error shown
		} finally {
			(vscode.window.showSaveDialog as any) = origShow;
			(vscode.window.showErrorMessage as any) = origErr;
		}
	});

	test("exportChart shows error when writeFile throws", async () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));
		const fakeView = new FakeWebviewView() as any;
		provider.resolveWebviewView(fakeView, {} as any, {} as any);

		const origShow = vscode.window.showSaveDialog;
		const origWrite = (vscode.workspace.fs as any).writeFile;
		const origErr = vscode.window.showErrorMessage;
		const tmpPath = path.join(__dirname, "../../test-data/tmp-chart-fail.png");

		(vscode.window.showSaveDialog as any) = async () => vscode.Uri.file(tmpPath);
		// Replace entire fs object temporarily so writeFile can throw (workspace.fs may be read-only)
		const origFs = vscode.workspace.fs as any;
		Object.defineProperty(vscode.workspace, "fs", {
			value: {
				...origFs,
				writeFile: async () => {
					throw new Error("write failed");
				},
			},
			configurable: true,
		});

		let shown = "";
		(vscode.window.showErrorMessage as any) = (m: string) => {
			shown = m;
		};

		try {
			fakeView.webview.simulateIncoming({
				type: "exportChart",
				data: "data:image/png;base64,QUJD",
				filename: "chart.png",
			});
			await new Promise((r) => setTimeout(r, 20));
			assert.ok(shown.includes("Failed to save chart image"));
		} finally {
			(vscode.window.showSaveDialog as any) = origShow;
			Object.defineProperty(vscode.workspace, "fs", { value: origFs, configurable: true });
			(vscode.window.showErrorMessage as any) = origErr;
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				/* ignore */
			}
		}
	});

	test("exportChart handles base64 without data prefix", async () => {
		const repoRoot = path.join(__dirname, "../..");
		const provider = new ChartViewProvider(vscode.Uri.file(repoRoot));
		const fakeView = new FakeWebviewView() as any;
		provider.resolveWebviewView(fakeView, {} as any, {} as any);

		const origShow = vscode.window.showSaveDialog;
		const tmpPath = path.join(__dirname, "../../test-data/tmp-chart-noprefix.png");
		(vscode.window.showSaveDialog as any) = async () => vscode.Uri.file(tmpPath);

		try {
			// cleanup if exists
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				/* ignore */
			}

			fakeView.webview.simulateIncoming({
				type: "exportChart",
				data: "QUJD",
				filename: "chart.png",
			});

			await new Promise((r) => setTimeout(r, 50));
			const file = await vscode.workspace.fs.readFile(vscode.Uri.file(tmpPath));
			assert.strictEqual(Buffer.from(file).toString("base64"), "QUJD");
		} finally {
			(vscode.window.showSaveDialog as any) = origShow;
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				/* ignore */
			}
		}
	});
});
