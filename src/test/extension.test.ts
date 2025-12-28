import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
import * as dataCommands from "../commands/dataCommands";
import { createDefaultDependencies, registerDataCommands } from "../commands/dataCommands";
import type { ChartTestConfig, ChartTestState } from "../providers/chartViewProvider";
import { ChartViewProvider } from "../providers/chartViewProvider";
import { DataPreviewProvider } from "../providers/dataPreviewProvider";

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
		assert.ok(state.labelsCount === 3, `expected 3 categories, got ${state.labelsCount}`);
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

	test("Scatter with numeric index column plots correctly (issue #30)", async function () {
		this.timeout(20000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		// Regression test for issue #30: https://github.com/Anselmoo/vsplot/issues/30
		// Test data contributed by @JerryJohnsonLee: index (0,1,2...), label (decimals), predictions (decimals)
		// Downloaded by scripts/setup-test-data.sh to avoid license issues with committed test data
		const uri = vscode.Uri.file(path.join(basePath, "test-data", "scatter-numeric-regression.csv"));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);
		// Plot label (col 1) vs predictions (col 2)
		const cfg: ChartTestConfig = { chartType: "scatter", x: 1, y: 2 };
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfg);
		const state = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(state.chartType, "scatter");
		assert.ok(state.datasetLens.length >= 1, "should have at least one dataset");
		assert.ok(state.datasetLens[0] === 100, `expected 100 points, got ${state.datasetLens[0]}`);
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

	test("Line chart curve smoothing toggle", async function () {
		this.timeout(20000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext);
		const basePath = ext ? ext.extensionPath : "";
		const uri = vscode.Uri.file(path.join(basePath, "sample-data", "iris.csv"));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand("vsplot.plotData", uri);

		// Test with curve smoothing enabled (default)
		const cfgSmooth: ChartTestConfig = {
			chartType: "line",
			x: 0,
			y: 1,
			curveSmoothing: true,
		};
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfgSmooth);
		const stateSmooth = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(stateSmooth.chartType, "line");
		assert.strictEqual(stateSmooth.curveSmoothing, true);

		// Test with curve smoothing disabled
		const cfgLinear: ChartTestConfig = {
			chartType: "line",
			x: 0,
			y: 1,
			curveSmoothing: false,
		};
		await vscode.commands.executeCommand("vsplot.test.applyChartConfig", cfgLinear);
		const stateLinear = (await vscode.commands.executeCommand(
			"vsplot.test.requestChartState",
		)) as ChartTestState;
		assert.strictEqual(stateLinear.chartType, "line");
		assert.strictEqual(stateLinear.curveSmoothing, false);
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
		assert.ok(state.decimals === 0 || state.decimals === 1 || state.decimals === 2);
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

	// Error handling wrapper tests for newly changed catch blocks
	test("previewData wrapper shows error when provider throws", async function () {
		this.timeout(10000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		const basePath = ext ? ext.extensionPath : "";
		const uri = vscode.Uri.file(path.join(basePath, "sample-data", "iris.csv"));

		// Make the provider throw
		const origShowPreview = (DataPreviewProvider as any).prototype.showPreview;
		(DataPreviewProvider as any).prototype.showPreview = async () => {
			throw new Error("preview-fail");
		};

		let shown = "";
		const origErr = vscode.window.showErrorMessage;
		(vscode.window.showErrorMessage as any) = (m: string) => {
			shown = m;
		};

		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			// allow async handler to run
			await new Promise((r) => setTimeout(r, 20));
			assert.ok(shown.includes("Failed to preview data"));
		} finally {
			(DataPreviewProvider as any).prototype.showPreview = origShowPreview;
			(vscode.window.showErrorMessage as any) = origErr;
		}
	});

	test("plotData wrapper shows error when chart provider throws", async function () {
		this.timeout(10000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		const basePath = ext ? ext.extensionPath : "";
		const uri = vscode.Uri.file(path.join(basePath, "sample-data", "iris.csv"));

		// Make the chart provider throw
		const origShowChart = (ChartViewProvider as any).prototype.showChart;
		(ChartViewProvider as any).prototype.showChart = async () => {
			throw new Error("chart-fail");
		};

		let shown = "";
		const origErr = vscode.window.showErrorMessage;
		(vscode.window.showErrorMessage as any) = (m: string) => {
			shown = m;
		};

		try {
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			await new Promise((r) => setTimeout(r, 20));
			assert.ok(shown.includes("Failed to plot data"));
		} finally {
			(ChartViewProvider as any).prototype.showChart = origShowChart;
			(vscode.window.showErrorMessage as any) = origErr;
		}
	});

	test("openDataViewer wrapper shows error when findFiles throws", async function () {
		this.timeout(10000);

		let shown = "";
		const origErr = vscode.window.showErrorMessage;
		(vscode.window.showErrorMessage as any) = (m: string) => {
			shown = m;
		};

		try {
			// Create deps that throw when findWorkspaceFiles is called
			const fakeDeps: any = {
				getActiveEditorUri: () => undefined,
				parseDataFile: async () => null,
				showErrorMessage: (m: string) => {
					shown = m;
				},
				showInfoMessage: () => {},
				findWorkspaceFiles: async () => {
					throw new Error("boom");
				},
				showQuickPick: async () => undefined,
				getWorkspaceFolders: () => [{ uri: vscode.Uri.file("/tmp") } as any],
				asRelativePath: (_: vscode.Uri) => "x",
			};

			const handler = dataCommands.makeOpenDataViewerHandler(fakeDeps, {
				showPreview: async () => {},
			} as any);

			await handler();
			await new Promise((r) => setTimeout(r, 20));
			assert.ok(shown.includes("Failed to open data viewer"));
		} finally {
		}
	});

	test("applyChartConfig wrapper shows error when provider throws", async function () {
		this.timeout(10000);
		const origApply = (ChartViewProvider as any).prototype.applyChartConfig;
		(ChartViewProvider as any).prototype.applyChartConfig = async () => {
			throw new Error("cfg-fail");
		};

		let shown = "";
		const origErr = vscode.window.showErrorMessage;
		(vscode.window.showErrorMessage as any) = (m: string) => {
			shown = m;
		};

		try {
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", {
				chartType: "line",
			});
			await new Promise((r) => setTimeout(r, 20));
			assert.ok(shown.includes("Error") || shown.includes("cfg-fail"));
		} finally {
			(ChartViewProvider as any).prototype.applyChartConfig = origApply;
			(vscode.window.showErrorMessage as any) = origErr;
		}
	});
});
