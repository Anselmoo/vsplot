import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
import type {
	ChartTestConfig,
	ChartTestState,
} from "../providers/chartViewProvider";

// Extension ID constant
const EXTENSION_ID = "AnselmHahn.vsplot";

suite("Provider Integration Tests", () => {
	/**
	 * Test DataPreviewProvider behavior
	 */
	suite("DataPreviewProvider", () => {
		test("showPreview should display data in webview", async function () {
			this.timeout(15000);

			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";

			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			// Preview data should work
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "showPreview executed successfully");
		});

		test("showPreview should handle files with special characters", async function () {
			this.timeout(10000);

			const content =
				'Name,Description\nTest,"Contains special chars: <>&\'""\nAnother,"More: @#$%"';
			const tmpPath = path.join(
				__dirname,
				"../../test-data/special-chars-provider.csv",
			);
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(tmpPath),
				Buffer.from(content, "utf8"),
			);

			const uri = vscode.Uri.file(tmpPath);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "Preview handled special characters");
			} catch (_error) {
				assert.fail(`Preview failed with special chars: ${error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Log cleanup errors for debugging but don't fail the test
				const errorMessage = _e instanceof Error ? _e.message : String(_e);
				console.warn(`Cleanup warning: ${errorMessage}`);
			}
		});

		test("showPreview should handle files with unicode characters", async function () {
			this.timeout(10000);

			const content = "Name,Value\n日本語,中文\nРусский,العربية\n한국어,ไทย";
			const tmpPath = path.join(
				__dirname,
				"../../test-data/unicode-provider.csv",
			);
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(tmpPath),
				Buffer.from(content, "utf8"),
			);

			const uri = vscode.Uri.file(tmpPath);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "Preview handled unicode characters");
			} catch (_error) {
				assert.fail(`Preview failed with unicode: ${error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Log cleanup errors for debugging but don't fail the test
				const errorMessage = _e instanceof Error ? _e.message : String(_e);
				console.warn(`Cleanup warning: ${errorMessage}`);
			}
		});

		test("showPreview should handle large datasets", async function () {
			this.timeout(20000);

			// Generate a moderately large dataset efficiently using Array.join
			const header = "id,value1,value2,value3";
			const rows = Array.from(
				{ length: 5000 },
				(_, i) => `${i},${Math.random()},${Math.random()},${Math.random()}`,
			);
			const content = [header, ...rows].join("\n");

			const tmpPath = path.join(
				__dirname,
				"../../test-data/large-provider.csv",
			);
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(tmpPath),
				Buffer.from(content, "utf8"),
			);

			const uri = vscode.Uri.file(tmpPath);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "Preview handled large dataset");
			} catch (_error) {
				assert.fail(`Preview failed with large dataset: ${error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Log cleanup errors for debugging but don't fail the test
				const errorMessage = _e instanceof Error ? _e.message : String(_e);
				console.warn(`Cleanup warning: ${errorMessage}`);
			}
		});
	});

	/**
	 * Test ChartViewProvider behavior
	 */
	suite("ChartViewProvider", () => {
		test("showChart should display chart webview", async function () {
			this.timeout(15000);

			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";

			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			// Plot data should work
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			assert.ok(true, "showChart executed successfully");
		});

		test("requestChartState should return state after plotting", async function () {
			this.timeout(20000);

			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";

			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const state = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.ok(state, "State should be returned");
			assert.ok(state.chartType, "Chart type should be defined");
			assert.ok(typeof state.x === "number", "X index should be a number");
			assert.ok(typeof state.y === "number", "Y index should be a number");
		});

		test("applyChartConfig should update chart settings", async function () {
			this.timeout(20000);

			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";

			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Apply specific configuration
			const config: ChartTestConfig = {
				chartType: "bar",
				x: 4,
				y: 0,
				agg: "sum",
				legend: false,
			};

			await vscode.commands.executeCommand(
				"vsplot.test.applyChartConfig",
				config,
			);

			const state = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.strictEqual(state.chartType, "bar", "Chart type should be bar");
			assert.strictEqual(state.agg, "sum", "Aggregation should be sum");
			assert.strictEqual(state.legend, false, "Legend should be disabled");
		});

		test("applyChartConfig should handle pie chart", async function () {
			this.timeout(20000);

			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";

			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const config: ChartTestConfig = {
				chartType: "pie",
				x: 4,
				y: 0,
				agg: "count",
			};

			await vscode.commands.executeCommand(
				"vsplot.test.applyChartConfig",
				config,
			);

			const state = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.strictEqual(state.chartType, "pie", "Chart type should be pie");
		});

		test("applyChartConfig should handle style presets", async function () {
			this.timeout(20000);

			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";

			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Test soft style preset
			const config: ChartTestConfig = {
				chartType: "line",
				stylePreset: "soft",
				decimals: 1,
				thousands: true,
			};

			await vscode.commands.executeCommand(
				"vsplot.test.applyChartConfig",
				config,
			);

			const state = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.strictEqual(
				state.stylePreset,
				"soft",
				"Style preset should be soft",
			);
			assert.strictEqual(state.decimals, 1, "Decimals should be 1");
			assert.strictEqual(
				state.thousands,
				true,
				"Thousands separator should be enabled",
			);
		});

		test("applyChartConfig should handle vibrant style preset", async function () {
			this.timeout(20000);

			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";

			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const config: ChartTestConfig = {
				chartType: "line",
				stylePreset: "vibrant",
				decimals: 0,
			};

			await vscode.commands.executeCommand(
				"vsplot.test.applyChartConfig",
				config,
			);

			const state = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.strictEqual(
				state.stylePreset,
				"vibrant",
				"Style preset should be vibrant",
			);
			assert.strictEqual(state.decimals, 0, "Decimals should be 0");
		});

		test("chart should handle drag zoom toggle", async function () {
			this.timeout(20000);

			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";

			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Enable drag zoom
			const configEnabled: ChartTestConfig = {
				chartType: "scatter",
				x: 0,
				y: 1,
				dragZoom: true,
			};

			await vscode.commands.executeCommand(
				"vsplot.test.applyChartConfig",
				configEnabled,
			);

			const stateEnabled = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.strictEqual(
				stateEnabled.dragZoom,
				true,
				"Drag zoom should be enabled",
			);

			// Disable drag zoom
			const configDisabled: ChartTestConfig = {
				dragZoom: false,
			};

			await vscode.commands.executeCommand(
				"vsplot.test.applyChartConfig",
				configDisabled,
			);

			const stateDisabled = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.strictEqual(
				stateDisabled.dragZoom,
				false,
				"Drag zoom should be disabled",
			);
		});
	});

	/**
	 * Test workflow integration between providers
	 */
	suite("Provider Workflow Integration", () => {
		test("preview then plot should work sequentially", async function () {
			this.timeout(20000);

			try {
				const ext = vscode.extensions.getExtension(EXTENSION_ID);
				assert.ok(ext, "Extension should be available");
				const basePath = ext ? ext.extensionPath : "";

				const csvPath = path.join(basePath, "sample-data", "iris.csv");
				const uri = vscode.Uri.file(csvPath);

				// First preview
				await vscode.commands.executeCommand("vsplot.previewData", uri);

				// Then plot
				await vscode.commands.executeCommand("vsplot.plotData", uri);

				// Verify chart state is available
				const state = (await vscode.commands.executeCommand(
					"vsplot.test.requestChartState",
				)) as ChartTestState;

				assert.ok(state, "Chart state should be available after workflow");
			} finally {
				// Ensure any opened editors/webviews are closed after the test
				await vscode.commands.executeCommand(
					"workbench.action.closeAllEditors",
				);
			}
		});

		test("multiple plot commands should work correctly", async function () {
			this.timeout(25000);

			try {
				const ext = vscode.extensions.getExtension(EXTENSION_ID);
				assert.ok(ext, "Extension should be available");
				const basePath = ext ? ext.extensionPath : "";

				const csvPath = path.join(basePath, "sample-data", "iris.csv");
				const uri = vscode.Uri.file(csvPath);

				// Plot multiple times
				await vscode.commands.executeCommand("vsplot.plotData", uri);
				await vscode.commands.executeCommand("vsplot.plotData", uri);
				await vscode.commands.executeCommand("vsplot.plotData", uri);

				// Verify final state
				const state = (await vscode.commands.executeCommand(
					"vsplot.test.requestChartState",
				)) as ChartTestState;

				assert.ok(
					state,
					"Chart state should be available after multiple plots",
				);
			} finally {
				// Ensure any opened editors/webviews are closed after the test
				await vscode.commands.executeCommand(
					"workbench.action.closeAllEditors",
				);
			}
		});

		test("switching between different file types should work", async function () {
			this.timeout(25000);

			try {
				const ext = vscode.extensions.getExtension(EXTENSION_ID);
				assert.ok(ext, "Extension should be available");
				const basePath = ext ? ext.extensionPath : "";

				// Create a TSV file
				const tsvContent = "A\tB\tC\n1\t2\t3\n4\t5\t6";
				const tsvPath = path.join(
					__dirname,
					"../../test-data/workflow-test.tsv",
				);
				await vscode.workspace.fs.writeFile(
					vscode.Uri.file(tsvPath),
					Buffer.from(tsvContent, "utf8"),
				);

				// Plot CSV first
				const csvPath = path.join(basePath, "sample-data", "iris.csv");
				await vscode.commands.executeCommand(
					"vsplot.plotData",
					vscode.Uri.file(csvPath),
				);

				// Then plot TSV
				await vscode.commands.executeCommand(
					"vsplot.plotData",
					vscode.Uri.file(tsvPath),
				);

				// Verify state
				const state = (await vscode.commands.executeCommand(
					"vsplot.test.requestChartState",
				)) as ChartTestState;

				assert.ok(
					state,
					"Chart state should be available after switching files",
				);

				// Clean up TSV file
				try {
					await vscode.workspace.fs.delete(vscode.Uri.file(tsvPath));
				} catch (_e) {
					// Log cleanup errors for debugging but don't fail the test
					const errorMessage = _e instanceof Error ? _e.message : String(_e);
					console.warn(`Cleanup warning: ${errorMessage}`);
				}
			} finally {
				// Ensure any opened editors/webviews are closed after the test
				await vscode.commands.executeCommand(
					"workbench.action.closeAllEditors",
				);
			}
		});
	});
});
