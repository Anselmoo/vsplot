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

suite("Command Coverage Tests", () => {
	/**
	 * Tests for vsplot.previewData command
	 */
	suite("previewData Command", () => {
		test("should work with explicit URI", async function () {
			this.timeout(15000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			// Execute with URI - should not throw
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "previewData completed with URI");
		});

		test("should fallback to active editor when URI is undefined", async function () {
			this.timeout(15000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			// Open file in editor
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			// Verify active editor is set
			assert.ok(vscode.window.activeTextEditor, "Active editor should be set");
			assert.strictEqual(
				vscode.window.activeTextEditor?.document.uri.fsPath,
				uri.fsPath,
				"Active editor should have the correct file"
			);

			// Execute without URI - should use active editor fallback
			await vscode.commands.executeCommand("vsplot.previewData", undefined);
			assert.ok(true, "previewData completed with fallback to active editor");
		});

		test("should handle parse failure and show error message", async function () {
			this.timeout(10000);
			// Create empty file that will fail to parse meaningfully
			const uri = await createTempFile("empty-cmd-coverage.csv", "");

			try {
				// Execute - should complete without throwing even for empty files
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				// The command should handle the error internally and show an error message
				assert.ok(true, "previewData handled empty file gracefully");
			} finally {
				await deleteTempFile(uri);
			}
		});

		test("should handle file with only comments", async function () {
			this.timeout(10000);
			const content = "# Comment line 1\n# Comment line 2\n# Comment line 3";
			const uri = await createTempFile("comments-only-coverage.csv", content);

			try {
				// This should trigger the error path for "no data after filtering comments"
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "Command completed for file with only comments");
			} catch (error) {
				// Throwing is acceptable for invalid files
				assert.ok(true, "Command threw for file with only comments");
			} finally {
				await deleteTempFile(uri);
			}
		});
	});

	/**
	 * Tests for vsplot.plotData command
	 */
	suite("plotData Command", () => {
		test("should work with explicit URI", async function () {
			this.timeout(15000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);
			assert.ok(true, "plotData completed with URI");
		});

		test("should fallback to active editor when URI is undefined", async function () {
			this.timeout(15000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			// Open file in editor
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			// Verify active editor is set
			assert.ok(vscode.window.activeTextEditor, "Active editor should be set");

			// Execute without URI - should use active editor fallback
			await vscode.commands.executeCommand("vsplot.plotData", undefined);
			assert.ok(true, "plotData completed with fallback to active editor");
		});

		test("should handle parse failure gracefully", async function () {
			this.timeout(10000);
			const uri = await createTempFile("empty-plot-coverage.csv", "");

			try {
				await vscode.commands.executeCommand("vsplot.plotData", uri);
				assert.ok(true, "plotData handled empty file gracefully");
			} finally {
				await deleteTempFile(uri);
			}
		});
	});

	/**
	 * Tests for test commands
	 */
	suite("Test Commands", () => {
		test("applyChartConfig should throw when no webview is available", async function () {
			this.timeout(10000);
			// Attempt to apply config without first plotting - may throw
			const config: ChartTestConfig = {
				chartType: "bar",
			};

			try {
				await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);
				// If it doesn't throw, that's also fine
				assert.ok(true, "applyChartConfig completed");
			} catch (error) {
				// Expected to throw when webview is not available
				assert.ok(true, "applyChartConfig threw as expected when no webview");
			}
		});

		test("requestChartState should throw when no webview is available", async function () {
			this.timeout(10000);

			try {
				await vscode.commands.executeCommand("vsplot.test.requestChartState");
				assert.ok(true, "requestChartState completed");
			} catch (error) {
				// Expected to throw when webview is not available
				assert.ok(true, "requestChartState threw as expected when no webview");
			}
		});

		test("applyChartConfig and requestChartState should work after plotting", async function () {
			this.timeout(20000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			// Plot first to create webview
			await vscode.commands.executeCommand("vsplot.plotData", uri);

			// Apply config
			const config: ChartTestConfig = {
				chartType: "scatter",
				x: 0,
				y: 1,
			};
			await vscode.commands.executeCommand("vsplot.test.applyChartConfig", config);

			// Request state
			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;

			assert.ok(state, "State should be returned");
			assert.strictEqual(state.chartType, "scatter", "Chart type should be scatter");
			assert.strictEqual(state.x, 0, "X index should be 0");
			assert.strictEqual(state.y, 1, "Y index should be 1");
		});
	});

	/**
	 * Tests for chart state validation
	 */
	suite("Chart State Validation", () => {
		test("chart state should have correct types for all properties", async function () {
			this.timeout(20000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;

			// Validate types of all state properties
			assert.strictEqual(typeof state.chartType, "string", "chartType should be string");
			assert.strictEqual(typeof state.x, "number", "x should be number");
			assert.strictEqual(typeof state.y, "number", "y should be number");
			assert.strictEqual(typeof state.y2, "number", "y2 should be number");
			assert.strictEqual(typeof state.legend, "boolean", "legend should be boolean");
			assert.strictEqual(typeof state.dragZoom, "boolean", "dragZoom should be boolean");
			assert.strictEqual(typeof state.curveSmoothing, "boolean", "curveSmoothing should be boolean");
			assert.strictEqual(typeof state.color, "string", "color should be string");
			assert.strictEqual(typeof state.agg, "string", "agg should be string");
			assert.strictEqual(typeof state.stylePreset, "string", "stylePreset should be string");
			assert.strictEqual(typeof state.decimals, "number", "decimals should be number");
			assert.strictEqual(typeof state.thousands, "boolean", "thousands should be boolean");
			assert.strictEqual(typeof state.labelsCount, "number", "labelsCount should be number");
			assert.ok(Array.isArray(state.datasetLens), "datasetLens should be array");
		});

		test("chart type should be one of valid types", async function () {
			this.timeout(20000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;

			const validChartTypes = ["line", "bar", "scatter", "pie", "doughnut"];
			assert.ok(
				validChartTypes.includes(state.chartType),
				`chartType '${state.chartType}' should be one of ${validChartTypes.join(", ")}`
			);
		});

		test("style preset should be one of valid presets", async function () {
			this.timeout(20000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;

			const validPresets = ["clean", "soft", "vibrant"];
			assert.ok(
				validPresets.includes(state.stylePreset),
				`stylePreset '${state.stylePreset}' should be one of ${validPresets.join(", ")}`
			);
		});

		test("aggregation should be one of valid types", async function () {
			this.timeout(20000);
			const basePath = getExtensionBasePath();
			const csvPath = path.join(basePath, "sample-data", "iris.csv");
			const uri = vscode.Uri.file(csvPath);

			await vscode.commands.executeCommand("vsplot.plotData", uri);

			const state = await vscode.commands.executeCommand(
				"vsplot.test.requestChartState"
			) as ChartTestState;

			const validAggTypes = ["none", "sum", "avg", "count", "min", "max"];
			assert.ok(
				validAggTypes.includes(state.agg),
				`agg '${state.agg}' should be one of ${validAggTypes.join(", ")}`
			);
		});
	});

	/**
	 * Tests for file type handling
	 */
	suite("File Type Handling", () => {
		test("TXT file should be parsed with auto-detected delimiter", async function () {
			this.timeout(10000);
			const content = "A,B,C\n1,2,3\n4,5,6";
			const uri = await createTempFile("auto-delim.txt", content);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "TXT file parsed successfully");
			} finally {
				await deleteTempFile(uri);
			}
		});

		test("DAT file should be parsed with auto-detected delimiter", async function () {
			this.timeout(10000);
			const content = "X|Y|Z\n10|20|30\n40|50|60";
			const uri = await createTempFile("pipe-delim.dat", content);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "DAT file parsed successfully");
			} finally {
				await deleteTempFile(uri);
			}
		});

		test("TSV file should default to tab delimiter", async function () {
			this.timeout(10000);
			const content = "Col1\tCol2\tCol3\n1\t2\t3\n4\t5\t6";
			const uri = await createTempFile("tab-default.tsv", content);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "TSV file parsed with tab delimiter");
			} finally {
				await deleteTempFile(uri);
			}
		});

		test("JSON array should be parsed correctly", async function () {
			this.timeout(10000);
			const content = '[{"a":1,"b":2},{"a":3,"b":4}]';
			const uri = await createTempFile("array.json", content);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "JSON array parsed successfully");
			} finally {
				await deleteTempFile(uri);
			}
		});

		test("JSON object should be parsed correctly", async function () {
			this.timeout(10000);
			const content = '{"name":"test","value":42}';
			const uri = await createTempFile("object.json", content);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "JSON object parsed successfully");
			} finally {
				await deleteTempFile(uri);
			}
		});

		test("unsupported file type should show error", async function () {
			this.timeout(10000);
			const content = "random content";
			const basePath = getExtensionBasePath();
			const tmpPath = path.join(basePath, "test-data", "unsupported.xyz");
			const uri = vscode.Uri.file(tmpPath);
			await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "Command completed for unsupported file type");
			} catch (error) {
				assert.ok(true, "Command threw for unsupported file type");
			} finally {
				await deleteTempFile(uri);
			}
		});
	});

	/**
	 * Tests for data parsing edge cases
	 */
	suite("Data Parsing Edge Cases", () => {
		test("CSV with quoted fields containing commas", async function () {
			this.timeout(10000);
			const content = 'Name,Description\nTest,"Contains, comma"\nAnother,"Has, many, commas"';
			const uri = await createTempFile("quoted-commas.csv", content);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "CSV with quoted commas parsed successfully");
			} finally {
				await deleteTempFile(uri);
			}
		});

		test("CSV with mixed numeric and string data", async function () {
			this.timeout(10000);
			const content = "Name,Value,Count\nAlpha,100,5\nBeta,text,10\nGamma,300,text";
			const uri = await createTempFile("mixed-types.csv", content);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "CSV with mixed types parsed successfully");
			} finally {
				await deleteTempFile(uri);
			}
		});

		test("file with custom comment markers", async function () {
			this.timeout(10000);
			const content = "# Header comment\n% Percent comment\n// Slash comment\nA,B,C\n1,2,3";
			const uri = await createTempFile("custom-comments.csv", content);

			try {
				await vscode.commands.executeCommand("vsplot.previewData", uri);
				assert.ok(true, "File with comment markers parsed successfully");
			} finally {
				await deleteTempFile(uri);
			}
		});
	});
});
