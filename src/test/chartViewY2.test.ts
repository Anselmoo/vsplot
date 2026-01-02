import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
import type { ChartTestConfig, ChartTestState } from "../providers/chartViewProvider";

const EXTENSION_ID = "AnselmHahn.vsplot";

suite("Chart View Y2 and Live Updates Test Suite", () => {
	test("Y2 axis can be added and removed via config", async function () {
		this.timeout(20000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const uri = vscode.Uri.file(path.join(basePath, "sample-data", "iris.csv"));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);

		// First, set Y2 to a valid column
		const cfgWithY2: ChartTestConfig = { chartType: "line", x: 0, y: 1, y2: 2 };
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfgWithY2);
		let state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(state.y2, 2, "Y2 should be set to column 2");
		assert.strictEqual(state.datasetLens.length, 2, "Should have 2 datasets when Y2 is active");

		// Now remove Y2 by setting it to -1
		const cfgWithoutY2: ChartTestConfig = { chartType: "line", x: 0, y: 1, y2: -1 };
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfgWithoutY2);
		state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(state.y2, -1, "Y2 should be -1 (removed)");
		assert.strictEqual(state.datasetLens.length, 1, "Should have 1 dataset when Y2 is removed");
	});

	test("Line chart with Y2 shows two datasets on different axes", async function () {
		this.timeout(20000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const uri = vscode.Uri.file(path.join(basePath, "sample-data", "iris.csv"));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);

		const cfg: ChartTestConfig = { chartType: "line", x: 0, y: 1, y2: 3 };
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfg);
		const state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(state.chartType, "line");
		assert.strictEqual(state.y2, 3, "Y2 should be column 3");
		assert.strictEqual(state.datasetLens.length, 2, "Line chart with Y2 should have 2 datasets");
		assert.ok(state.datasetLens[0] > 0 && state.datasetLens[1] > 0);
	});

	test("Bar chart with Y2 shows two datasets", async function () {
		this.timeout(20000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const uri = vscode.Uri.file(path.join(basePath, "sample-data", "iris.csv"));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);

		const cfg: ChartTestConfig = {
			chartType: "bar",
			x: 4,
			y: 0,
			y2: 1,
			agg: "avg",
		};
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfg);
		const state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(state.chartType, "bar");
		assert.strictEqual(state.y2, 1, "Y2 should be column 1");
		assert.strictEqual(state.datasetLens.length, 2, "Bar chart with Y2 should have 2 datasets");
	});
});
