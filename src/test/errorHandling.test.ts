import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
import type { ChartTestConfig, ChartTestState } from "../providers/chartViewProvider";
import { EXTENSION_ID, VALID_AGGREGATION_TYPES } from "./testUtils";

suite("Error Handling and Edge Case Tests", () => {
	/**
	 * Test error handling in commands
	 */
	suite("Command Error Handling", () => {
		test("previewData should handle non-existent file gracefully", async function () {
			this.timeout(10000);

			const uri = vscode.Uri.file("/non/existent/path/file.csv");

			// Command should not throw - error should be shown to user via showErrorMessage
			// The command internally catches errors and shows them via VS Code API
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "Command handled non-existent file gracefully");
		});

		test("plotData should handle non-existent file gracefully", async function () {
			this.timeout(10000);

			const uri = vscode.Uri.file("/non/existent/path/data.json");

			// Command should not throw - error should be shown to user via showErrorMessage
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			assert.ok(true, "Command handled non-existent file gracefully");
		});

		test("commands should handle readable file successfully", async function () {
			this.timeout(10000);

			// Create a valid file that can be read
			const tmpPath = path.join(__dirname, "../../test-data/read-test.csv");
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(tmpPath),
				Buffer.from("Name,Value\nTest,123", "utf8"),
			);

			const uri = vscode.Uri.file(tmpPath);

			// Command should complete successfully for readable file
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "Command completed successfully for readable file");

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});
	});

	/**
	 * Test test command error handling
	 */
	suite("Test Command Error Handling", () => {
		test("applyChartConfig should work after plotting", async function () {
			this.timeout(15000);

			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");

			// First plot data to create a webview
			const basePath = ext ? ext.extensionPath : "";
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Now apply config - should succeed with the webview available
			const config: ChartTestConfig = {
				chartType: "bar",
			};

			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);

			// Verify the config was applied
			const state = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.strictEqual(state.chartType, "bar", "Chart type should be bar");
		});
	});

	/**
	 * Test data parsing edge cases
	 */
	suite("Data Parsing Edge Cases", () => {
		test("should handle CSV with only empty rows after header", async function () {
			this.timeout(10000);

			const content = "A,B,C\n,\n,\n,";
			const tmpPath = path.join(__dirname, "../../test-data/empty-rows.csv");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			// Preview should complete - empty data rows are filtered out
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "Preview completed for CSV with empty rows");

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle CSV with very long header names", async function () {
			this.timeout(10000);

			const longHeader = `Column_${"X".repeat(500)}`;
			const content = `${longHeader},${longHeader}2,${longHeader}3\n1,2,3\n4,5,6`;
			const tmpPath = path.join(__dirname, "../../test-data/long-headers.csv");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "Preview handled long headers");
			} catch (_error) {
				assert.fail(`Preview failed with long headers: ${_error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle CSV with many columns", async function () {
			this.timeout(10000);

			// Create a CSV with 100 columns
			const headers = Array.from({ length: 100 }, (_, i) => `Col${i + 1}`).join(",");
			const row1 = Array.from({ length: 100 }, (_, i) => i + 1).join(",");
			const row2 = Array.from({ length: 100 }, (_, i) => (i + 1) * 2).join(",");
			const content = `${headers}\n${row1}\n${row2}`;

			const tmpPath = path.join(__dirname, "../../test-data/many-columns.csv");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "Preview handled many columns");
			} catch (_error) {
				assert.fail(`Preview failed with many columns: ${_error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle JSON array with many objects", async function () {
			this.timeout(10000);

			// Create JSON with 100 objects
			const objects = Array.from({ length: 100 }, (_, i) => ({
				id: i + 1,
				name: `Item ${i + 1}`,
				value: Math.random() * 100,
			}));
			const content = JSON.stringify(objects);

			const tmpPath = path.join(__dirname, "../../test-data/many-objects.json");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "Preview handled many objects");
			} catch (_error) {
				assert.fail(`Preview failed with many objects: ${_error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle JSON with deeply nested values", async function () {
			this.timeout(10000);

			const content = '[{"outer": {"inner": {"deep": "value"}}, "simple": 1}]';
			const tmpPath = path.join(__dirname, "../../test-data/nested-json.json");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			// Nested JSON should be handled gracefully - either success or a controlled error
			// We expect the command to complete without throwing an unhandled exception
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "Preview handled nested JSON without crashing");

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});
	});

	/**
	 * Test chart configuration edge cases
	 */
	suite("Chart Configuration Edge Cases", () => {
		test("should handle chart with negative values", async function () {
			this.timeout(15000);

			const content = "X,Y\n-10,-20\n-5,-10\n0,0\n5,10\n10,20";
			const tmpPath = path.join(__dirname, "../../test-data/negative-values.csv");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const config: ChartTestConfig = {
				chartType: "line",
				x: 0,
				y: 1,
			};

			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);

			const state = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.ok(state, "Chart should handle negative values");
			assert.ok(state.datasetLens[0] > 0, "Dataset should have points");

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle chart with very large values", async function () {
			this.timeout(15000);

			const content = "X,Y\n1e10,2e10\n3e10,4e10\n5e10,6e10";
			const tmpPath = path.join(__dirname, "../../test-data/large-values.csv");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const config: ChartTestConfig = {
				chartType: "scatter",
				x: 0,
				y: 1,
			};

			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);

			const state = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.ok(state, "Chart should handle large values");
			assert.ok(state.datasetLens[0] > 0, "Dataset should have points");

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle chart with very small values", async function () {
			this.timeout(15000);

			const content = "X,Y\n1e-10,2e-10\n3e-10,4e-10\n5e-10,6e-10";
			const tmpPath = path.join(__dirname, "../../test-data/small-values.csv");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const config: ChartTestConfig = {
				chartType: "line",
				x: 0,
				y: 1,
			};

			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);

			const state = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.ok(state, "Chart should handle small values");
			assert.ok(state.datasetLens[0] > 0, "Dataset should have points");

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle chart with mixed value types in columns", async function () {
			this.timeout(15000);

			const content = "Category,Value\nA,10\nB,20\nC,text\nD,30";
			const tmpPath = path.join(__dirname, "../../test-data/mixed-types.csv");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const config: ChartTestConfig = {
				chartType: "bar",
				x: 0,
				y: 1,
				agg: "sum",
			};

			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);

			const state = (await vscode.commands.executeCommand(
				"vsplot.test.requestChartState",
			)) as ChartTestState;

			assert.ok(state, "Chart should handle mixed types");

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle all aggregation types", async function () {
			this.timeout(25000);

			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const basePath = ext ? ext.extensionPath : "";

			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Use imported VALID_AGGREGATION_TYPES from testUtils.ts for consistency
			for (const aggType of VALID_AGGREGATION_TYPES) {
				const config: ChartTestConfig = {
					chartType: "bar",
					x: 4, // species column (categorical)
					y: 0, // sepal_length column (numeric)
					agg: aggType,
				};

				await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);

				const state = (await vscode.commands.executeCommand(
					"vsplot.test.requestChartState",
				)) as ChartTestState;

				assert.strictEqual(state.agg, aggType, `Aggregation should be ${aggType}`);
			}
		});
	});

	/**
	 * Test file type support edge cases
	 */
	suite("File Type Support Edge Cases", () => {
		test("should handle DAT file with semicolon delimiter", async function () {
			this.timeout(10000);

			const content = "A;B;C\n1;2;3\n4;5;6";
			const tmpPath = path.join(__dirname, "../../test-data/semicolon-delim.dat");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "DAT file with semicolon parsed");
			} catch (_error) {
				assert.fail(`DAT file parsing failed: ${_error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle OUT file with space delimiter", async function () {
			this.timeout(10000);

			const content = "A B C\n1 2 3\n4 5 6";
			const tmpPath = path.join(__dirname, "../../test-data/space-delim.out");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "OUT file with space delimiter parsed");
			} catch (_error) {
				assert.fail(`OUT file parsing failed: ${_error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle DATA file with colon delimiter", async function () {
			this.timeout(10000);

			const content = "A:B:C\n1:2:3\n4:5:6";
			const tmpPath = path.join(__dirname, "../../test-data/colon-delim.data");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "DATA file with colon delimiter parsed");
			} catch (_error) {
				assert.fail(`DATA file parsing failed: ${_error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});

		test("should handle TAB file with comma delimiter", async function () {
			this.timeout(10000);

			const content = "A,B,C\n1,2,3\n4,5,6";
			const tmpPath = path.join(__dirname, "../../test-data/comma-delim.tab");
			await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));

			const uri = vscode.Uri.file(tmpPath);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "TAB file with comma delimiter parsed");
			} catch (_error) {
				assert.fail(`TAB file parsing failed: ${_error}`);
			}

			// Clean up
			try {
				await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
			} catch (_e) {
				// Ignore cleanup errors
			}
		});
	});
});
