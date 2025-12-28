import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
import { ChartViewProvider } from "../providers/chartViewProvider";

class FakeWebview {
	public posted: any[] = [];
	public cspSource = "vscode-resource:";
	postMessage(msg: any) {
		this.posted.push(msg);
	}
	onDidReceiveMessage(_handler: (m: any) => void) {
		/* no-op */
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
});
