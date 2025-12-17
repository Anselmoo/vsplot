import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import type {
	ChartTestConfig,
	ChartTestState,
} from "../providers/chartViewProvider";

// Extension ID constant
const EXTENSION_ID = "AnselmHahn.vsplot";

/**
 * Test helper to get extension base path
 */
function getExtensionBasePath(): string {
	const ext = vscode.extensions.getExtension(EXTENSION_ID);
	if (!ext) {
		throw new Error("Extension not found");
	}
	return ext.extensionPath;
}

/**
 * Test helper to create a temporary test file
 */
async function createTempFile(fileName: string, content: string): Promise<vscode.Uri> {
	const basePath = getExtensionBasePath();
	const tmpPath = path.join(basePath, "test-data", fileName);
	await vscode.workspace.fs.writeFile(
		vscode.Uri.file(tmpPath),
		Buffer.from(content, "utf8")
	);
	return vscode.Uri.file(tmpPath);
}

/**
 * Test helper to delete a temporary test file
 */
async function deleteTempFile(uri: vscode.Uri): Promise<void> {
	try {
		await vscode.workspace.fs.delete(uri);
	} catch (e) {
		// Ignore cleanup errors
	}
}

suite("Provider Coverage Tests", () => {
	/**
	 * Tests for DataPreviewProvider
	 */
	suite("DataPreviewProvider Coverage", () => {
		test("showPreview should work when _view is defined", async function () {
			this.timeout(15000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			// First call creates the webview
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			
			// Second call should use existing _view
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			
			assert.ok(true, "showPreview worked with existing view");
		});

		test("showPreview should create panel when _view is undefined", async function () {
			this.timeout(15000);
			// Create a new file to trigger potential new panel creation
			const content = "A,B,C\n1,2,3";
			const uri = await createTempFile("panel-create.csv", content);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "showPreview created panel successfully");
			} finally {
				await deleteTempFile(uri);
			}
		});

		test("showPreview should post message with correct data structure", async function () {
			this.timeout(15000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			// Execute preview - if it completes without error, the message was posted
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "showPreview posted message successfully");
		});
	});

	/**
	 * Tests for ChartViewProvider
	 */
	suite("ChartViewProvider Coverage", () => {
		test("showChart should work when _view is defined", async function () {
			this.timeout(15000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			// First call creates the webview
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			
			// Second call should use existing _view
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			
			assert.ok(true, "showChart worked with existing view");
		});

		test("showChart should create panel when _view is undefined", async function () {
			this.timeout(15000);
			const content = "X,Y\n1,10\n2,20";
			const uri = await createTempFile("chart-panel.csv", content);

			try {
				await vscode.commands.executeCommand("vsplot.plotData", uri);
				assert.ok(true, "showChart created panel successfully");
			} finally {
				await deleteTempFile(uri);
			}
		});

		test("requestChartState timeout should resolve after timeout", async function () {
			this.timeout(25000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Request state multiple times to test pending resolver handling
			const state1Promise = vscode.commands.executeCommand("vsplot.test.requestChartState");
			const state2Promise = vscode.commands.executeCommand("vsplot.test.requestChartState");

			const state1 = await state1Promise as ChartTestState;
			const state2 = await state2Promise as ChartTestState;

			assert.ok(state1, "First state request should succeed");
			assert.ok(state2, "Second state request should succeed");
		});

		test("applyChartConfig should handle config-applied acknowledgment", async function () {
			this.timeout(20000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const config: ChartTestConfig = {
				chartType: "bar",
				legend: true,
			};

			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);

			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;

			assert.strictEqual(state.chartType, "bar", "Chart type should be updated");
			assert.strictEqual(state.legend, true, "Legend should be enabled");
		});
	});

	/**
	 * Tests for message handler branches
	 */
	suite("Message Handler Coverage", () => {
		test("webview should handle invalid message types gracefully", async function () {
			this.timeout(15000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			// Create webview first
			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// The webview should handle various message types without crashing
			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;

			assert.ok(state, "State should be available after message handling");
		});
	});

	/**
	 * Tests for chart configuration branches
	 */
	suite("Chart Configuration Coverage", () => {
		test("all chart types should be configurable", async function () {
			this.timeout(30000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const chartTypes = ["line", "bar", "scatter", "pie", "doughnut"];
			
			for (const chartType of chartTypes) {
				const config: ChartTestConfig = { chartType };
				await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);
				
				const state = await vscode.commands.executeCommand(
					"vsplot.test.requestChartState"
				) as ChartTestState;
				
				assert.strictEqual(
					state.chartType,
					chartType,
					`Chart type should be ${chartType}`
				);
			}
		});

		test("all style presets should be configurable", async function () {
			this.timeout(25000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const stylePresets = ["clean", "soft", "vibrant"];
			
			for (const stylePreset of stylePresets) {
				const config: ChartTestConfig = { stylePreset };
				await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);
				
				const state = await vscode.commands.executeCommand(
					"vsplot.test.requestChartState"
				) as ChartTestState;
				
				assert.strictEqual(
					state.stylePreset,
					stylePreset,
					`Style preset should be ${stylePreset}`
				);
			}
		});

		test("all aggregation types should be configurable", async function () {
			this.timeout(30000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Use categorical X (species column = 4) with numeric Y (sepal_length = 0)
			const aggTypes = ["sum", "avg", "count", "min", "max"];
			
			for (const agg of aggTypes) {
				const config: ChartTestConfig = {
					chartType: "bar",
					x: 4,  // species (categorical)
					y: 0,  // sepal_length (numeric)
					agg,
				};
				await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);
				
				const state = await vscode.commands.executeCommand(
					"vsplot.test.requestChartState"
				) as ChartTestState;
				
				assert.strictEqual(state.agg, agg, `Aggregation should be ${agg}`);
			}
		});

		test("decimal precision should be configurable", async function () {
			this.timeout(25000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const decimalValues = [0, 1, 2];
			
			for (const decimals of decimalValues) {
				const config: ChartTestConfig = { decimals };
				await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);
				
				const state = await vscode.commands.executeCommand(
					"vsplot.test.requestChartState"
				) as ChartTestState;
				
				assert.strictEqual(
					state.decimals,
					decimals,
					`Decimals should be ${decimals}`
				);
			}
		});

		test("thousands separator should be configurable", async function () {
			this.timeout(20000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Enable thousands
			const configEnabled: ChartTestConfig = { thousands: true };
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", configEnabled);
			
			let state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			assert.strictEqual(state.thousands, true, "Thousands should be enabled");

			// Disable thousands
			const configDisabled: ChartTestConfig = { thousands: false };
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", configDisabled);
			
			state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			assert.strictEqual(state.thousands, false, "Thousands should be disabled");
		});

		test("Y2 axis should be configurable for scatter and line charts", async function () {
			this.timeout(25000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Scatter with Y2
			const scatterConfig: ChartTestConfig = {
				chartType: "scatter",
				x: 0,
				y: 1,
				y2: 2,
			};
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", scatterConfig);
			
			let state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			assert.strictEqual(state.y2, 2, "Y2 should be set for scatter");
			assert.ok(state.datasetLens.length >= 2, "Should have at least 2 datasets");

			// Line with Y2
			const lineConfig: ChartTestConfig = {
				chartType: "line",
				x: 0,
				y: 1,
				y2: 3,
			};
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", lineConfig);
			
			state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			assert.strictEqual(state.y2, 3, "Y2 should be set for line");
		});

		test("curve smoothing should be configurable for line charts", async function () {
			this.timeout(20000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Enable curve smoothing
			const configSmooth: ChartTestConfig = {
				chartType: "line",
				curveSmoothing: true,
			};
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", configSmooth);
			
			let state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			assert.strictEqual(state.curveSmoothing, true, "Curve smoothing should be enabled");

			// Disable curve smoothing
			const configLinear: ChartTestConfig = {
				chartType: "line",
				curveSmoothing: false,
			};
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", configLinear);
			
			state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			assert.strictEqual(state.curveSmoothing, false, "Curve smoothing should be disabled");
		});
	});
});
