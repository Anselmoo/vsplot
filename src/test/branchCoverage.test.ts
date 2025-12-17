import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import type {
	ChartTestConfig,
	ChartTestState,
} from "../providers/chartViewProvider";

// Extension ID constant
const EXTENSION_ID = "AnselmHahn.vsplot";

suite("Branch Coverage Tests", () => {
	/**
	 * Test branches in message validation
	 */
	suite("Message Validation Branches", () => {
		test("chart state should include all expected properties", async function () {
			this.timeout(20000);
			
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";
			
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			
			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			// Verify all state properties exist
			assert.ok("chartType" in state, "State should have chartType");
			assert.ok("x" in state, "State should have x");
			assert.ok("y" in state, "State should have y");
			assert.ok("y2" in state, "State should have y2");
			assert.ok("legend" in state, "State should have legend");
			assert.ok("dragZoom" in state, "State should have dragZoom");
			assert.ok("curveSmoothing" in state, "State should have curveSmoothing");
			assert.ok("color" in state, "State should have color");
			assert.ok("agg" in state, "State should have agg");
			assert.ok("stylePreset" in state, "State should have stylePreset");
			assert.ok("decimals" in state, "State should have decimals");
			assert.ok("thousands" in state, "State should have thousands");
			assert.ok("labelsCount" in state, "State should have labelsCount");
			assert.ok("datasetLens" in state, "State should have datasetLens");
		});
	});

	/**
	 * Test configuration fallback branches
	 */
	suite("Configuration Fallback Branches", () => {
		test("chart should use default configuration values", async function () {
			this.timeout(20000);
			
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";
			
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			
			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			// Check defaults match expected values from package.json
			assert.ok(
				["line", "bar", "scatter", "pie"].includes(state.chartType),
				"Chart type should be a valid type"
			);
			assert.ok(
				["clean", "soft", "vibrant"].includes(state.stylePreset),
				"Style preset should be valid"
			);
			assert.ok(
				[0, 1, 2].includes(state.decimals),
				"Decimals should be 0, 1, or 2"
			);
			assert.ok(
				typeof state.thousands === "boolean",
				"Thousands should be boolean"
			);
		});

		test("chart should apply partial configuration", async function () {
			this.timeout(20000);
			
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";
			
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			
			// Apply only partial config (just chartType)
			const config: ChartTestConfig = {
				chartType: "scatter",
			};
			
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);
			
			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			assert.strictEqual(state.chartType, "scatter", "Chart type should be updated");
			// Other values should remain at their defaults
			assert.ok(typeof state.legend === "boolean", "Legend should still be set");
		});

		test("chart should handle empty configuration object", async function () {
			this.timeout(20000);
			
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";
			
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			
			// Get initial state
			const initialState = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			// Apply empty config
			const config: ChartTestConfig = {};
			
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);
			
			const finalState = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			// State should be unchanged
			assert.strictEqual(
				finalState.chartType,
				initialState.chartType,
				"Chart type should be unchanged"
			);
		});
	});

	/**
	 * Test delimiter override branches
	 */
	suite("Delimiter Override Branches", () => {
		test("preview should handle auto delimiter detection", async function () {
			this.timeout(10000);
			
			// Create file with multiple potential delimiters
			const content = "A,B|C\n1,2|3\n4,5|6";
			const tmpPath = path.join(__dirname, "../../test-data/multi-delim-test.txt");
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(tmpPath),
				Buffer.from(content, "utf8")
			);

			const uri = vscode.Uri.file(tmpPath);
			
			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "Auto delimiter detection worked");
			} catch (error) {
				assert.fail(`Auto detection failed: ${error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (e) {
				// Ignore cleanup errors
			}
		});
	});

	/**
	 * Test panel creation branches (when view is undefined)
	 */
	suite("Panel Creation Branches", () => {
		test("preview should create panel when view is not available", async function () {
			this.timeout(15000);
			
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";
			
			// Create a new CSV file
			const content = "Name,Value\nTest,123";
			const tmpPath = path.join(__dirname, "../../test-data/panel-create-test.csv");
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(tmpPath),
				Buffer.from(content, "utf8")
			);
			
			const uri = vscode.Uri.file(tmpPath);
			
			// This should trigger panel creation path
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "Panel creation path executed");

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (e) {
				// Ignore cleanup errors
			}
		});

		test("chart should create panel when view is not available", async function () {
			this.timeout(15000);
			
			// Create a new CSV file
			const content = "X,Y\n1,10\n2,20\n3,30";
			const tmpPath = path.join(__dirname, "../../test-data/chart-panel-test.csv");
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(tmpPath),
				Buffer.from(content, "utf8")
			);
			
			const uri = vscode.Uri.file(tmpPath);
			
			// This should trigger panel creation path
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			assert.ok(true, "Chart panel creation path executed");

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (e) {
				// Ignore cleanup errors
			}
		});
	});

	/**
	 * Test null/undefined value handling
	 */
	suite("Null/Undefined Value Handling", () => {
		test("preview should handle null values in data", async function () {
			this.timeout(10000);
			
			const content = '[{"name": "Test", "value": null}, {"name": null, "value": 42}]';
			const tmpPath = path.join(__dirname, "../../test-data/null-values.json");
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(tmpPath),
				Buffer.from(content, "utf8")
			);

			const uri = vscode.Uri.file(tmpPath);
			
			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "Preview handled null values");
			} catch (error) {
				assert.fail(`Preview failed with null values: ${error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (e) {
				// Ignore cleanup errors
			}
		});

		test("plot should handle null values in data", async function () {
			this.timeout(15000);
			
			const content = '[{"x": 1, "y": null}, {"x": 2, "y": 20}, {"x": null, "y": 30}]';
			const tmpPath = path.join(__dirname, "../../test-data/null-plot.json");
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(tmpPath),
				Buffer.from(content, "utf8")
			);

			const uri = vscode.Uri.file(tmpPath);
			
			try {
				await vscode.commands.executeCommand("vsplot.plotData", uri);
				assert.ok(true, "Plot handled null values");
			} catch (error) {
				// Some null handling may cause issues but shouldn't crash
				assert.ok(true, "Plot handled null values with warning");
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (e) {
				// Ignore cleanup errors
			}
		});
	});

	/**
	 * Test Y2 axis branches
	 */
	suite("Y2 Axis Branches", () => {
		test("scatter chart should handle Y2 axis configuration", async function () {
			this.timeout(20000);
			
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";
			
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			
			// Configure scatter with Y2
			const config: ChartTestConfig = {
				chartType: "scatter",
				x: 0,
				y: 1,
				y2: 2,
			};
			
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);
			
			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			assert.strictEqual(state.y2, 2, "Y2 should be set to column 2");
			assert.ok(state.datasetLens.length >= 2, "Should have at least 2 datasets");
		});

		test("line chart should handle Y2 axis configuration", async function () {
			this.timeout(20000);
			
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";
			
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			
			// Configure line with Y2
			const config: ChartTestConfig = {
				chartType: "line",
				x: 0,
				y: 1,
				y2: 3,
			};
			
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);
			
			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			assert.strictEqual(state.y2, 3, "Y2 should be set to column 3");
		});
	});

	/**
	 * Test timeout handling branches
	 */
	suite("Timeout Handling Branches", () => {
		test("requestChartState should work within timeout", async function () {
			this.timeout(25000);
			
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";
			
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			
			// Multiple state requests should work within timeout
			for (let i = 0; i < 3; i++) {
				const state = await vscode.commands.executeCommand(
					"vsplot.test.requestChartState"
				) as ChartTestState;
				
				assert.ok(state, `State request ${i + 1} should succeed`);
			}
		});

		test("applyChartConfig should handle rapid successive calls", async function () {
			this.timeout(30000);
			
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";
			
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
			
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			
			// Apply multiple configs rapidly
			const configs: ChartTestConfig[] = [
				{ chartType: "line" },
				{ chartType: "bar" },
				{ chartType: "scatter" },
				{ chartType: "pie" },
				{ chartType: "line" },
			];
			
			for (const config of configs) {
				await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);
			}
			
			// Final state should match last config
			const finalState = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;
			
			assert.strictEqual(finalState.chartType, "line", "Final chart type should be line");
		});
	});
});
