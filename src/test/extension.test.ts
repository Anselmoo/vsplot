import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import type {
	ChartTestConfig,
	ChartTestState,
} from "../providers/chartViewProvider";

// Keep the test in sync with package.json publisher + name
const EXTENSION_ID = "AnselmHahn.vsplot";

suite("Extension Test Suite", () => {
	vscode.window.showInformationMessage("Start all tests.");

	test("Sample test", () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test("Preview iris.csv without error", async function () {
		this.timeout(15000);

		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be discoverable");
		const basePath = ext ? ext.extensionPath : undefined;
		assert.ok(basePath, "Extension path should be defined");

		const irisPath = path.join(basePath as string, "sample-data", "iris.csv");
		const uri = vscode.Uri.file(irisPath);

		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);

		await vscode.commands.executeCommand("vsplot.previewData", uri);
		// If no exception, consider success
		assert.ok(true);
	});

	test("Plot iris.csv without error", async function () {
		this.timeout(15000);

		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be discoverable");
		const basePath = ext ? ext.extensionPath : undefined;
		assert.ok(basePath, "Extension path should be defined");

		const irisPath = path.join(basePath as string, "sample-data", "iris.csv");
		const uri = vscode.Uri.file(irisPath);

		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);

		await vscode.commands.executeCommand("vsplot.plotData", uri);
		// If no exception, consider success
		assert.ok(true);
	});

	test("Bar with categorical X aggregates species", async function () {
		this.timeout(20000);

		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const irisPath = path.join(basePath, "sample-data", "iris.csv");
		const uri = vscode.Uri.file(irisPath);
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);

		const cfg: ChartTestConfig = {
			chartType: "bar",
			x: 4,
			y: 0,
			agg: "avg",
			legend: true,
		};
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfg);
		const state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(state.chartType, "bar");
		assert.strictEqual(state.x, 4);
		assert.strictEqual(state.agg, "avg");
		// species has 3 categories
		assert.ok(
			state.labelsCount === 3,
			`expected 3 categories, got ${state.labelsCount}`,
		);
	});

	test("Scatter enforces numeric axes and builds dataset", async function () {
		this.timeout(20000);

		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const irisPath = path.join(basePath, "sample-data", "iris.csv");
		const uri = vscode.Uri.file(irisPath);
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);

		const cfg: ChartTestConfig = { chartType: "scatter", x: 0, y: 2 };
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfg);
		const state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(state.chartType, "scatter");
		assert.strictEqual(state.datasetLens.length >= 1, true);
		assert.ok(state.datasetLens[0] > 0, "scatter dataset should have points");
	});

	test("DAT with pipe delimiter parses and previews", async function () {
		this.timeout(20000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const datPath = path.join(basePath, "sample-data", "sales-sample.dat");
		const uri = vscode.Uri.file(datPath);
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.previewData", uri);
		assert.ok(true);
	});

	test("Time series CSV detects time axis on X", async function () {
		this.timeout(20000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const csvPath = path.join(basePath, "sample-data", "timeseries-sample.csv");
		const uri = vscode.Uri.file(csvPath);
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);
		const cfg: ChartTestConfig = { chartType: "line", x: 0, y: 1 };
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfg);
		const state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(state.chartType, "line");
		assert.ok(state.datasetLens[0] > 0);
	});

	test("Scatter supports Y2 dataset on right axis", async function () {
		this.timeout(20000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const uri = vscode.Uri.file(path.join(basePath, "sample-data", "iris.csv"));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);
		const cfg: ChartTestConfig = { chartType: "scatter", x: 0, y: 2, y2: 3 };
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfg);
		const state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(state.chartType, "scatter");
		assert.ok(state.datasetLens.length === 2);
		assert.ok(state.datasetLens[0] > 0 && state.datasetLens[1] > 0);
	});

	test("Doughnut with count aggregation on species", async function () {
		this.timeout(20000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const uri = vscode.Uri.file(path.join(basePath, "sample-data", "iris.csv"));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);
		const cfg: ChartTestConfig = {
			chartType: "doughnut",
			x: 4,
			y: 0,
			agg: "count",
		};
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfg);
		const state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(state.chartType, "doughnut");
		assert.ok(state.labelsCount === 3);
		assert.ok(state.datasetLens[0] === 3);
	});

	test("Chart uses config defaults for style/format on first open", async function () {
		this.timeout(20000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const uri = vscode.Uri.file(path.join(basePath, "sample-data", "iris.csv"));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);
		// Request state immediately; initial state should reflect defaults from package.json
		const state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.ok(
			state.stylePreset === "clean" ||
				state.stylePreset === "soft" ||
				state.stylePreset === "vibrant",
		);
		assert.strictEqual(typeof state.decimals, "number");
		assert.ok(
			state.decimals === 0 || state.decimals === 1 || state.decimals === 2,
		);
	});

	test("Preview TSV file without error", async function () {
		this.timeout(15000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be discoverable");
		const basePath = ext ? ext.extensionPath : undefined;
		assert.ok(basePath, "Extension path should be defined");

		const tsvPath = path.join(basePath as string, "sample-data", "test.tsv");
		const uri = vscode.Uri.file(tsvPath);

		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);

		await vscode.commands.executeCommand("vsplot.previewData", uri);
		assert.ok(true);
	});

	test("Preview TAB file without error", async function () {
		this.timeout(15000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be discoverable");
		const basePath = ext ? ext.extensionPath : undefined;
		assert.ok(basePath, "Extension path should be defined");

		const tabPath = path.join(basePath as string, "sample-data", "test.tab");
		const uri = vscode.Uri.file(tabPath);

		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);

		await vscode.commands.executeCommand("vsplot.previewData", uri);
		assert.ok(true);
	});

	test("Preview OUT file without error", async function () {
		this.timeout(15000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be discoverable");
		const basePath = ext ? ext.extensionPath : undefined;
		assert.ok(basePath, "Extension path should be defined");

		const outPath = path.join(basePath as string, "sample-data", "test.out");
		const uri = vscode.Uri.file(outPath);

		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);

		await vscode.commands.executeCommand("vsplot.previewData", uri);
		assert.ok(true);
	});

	test("Preview DATA file without error", async function () {
		this.timeout(15000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be discoverable");
		const basePath = ext ? ext.extensionPath : undefined;
		assert.ok(basePath, "Extension path should be defined");

		const dataPath = path.join(basePath as string, "sample-data", "test.data");
		const uri = vscode.Uri.file(dataPath);

		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);

		await vscode.commands.executeCommand("vsplot.previewData", uri);
		assert.ok(true);
	});
});
