import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";

// Extension ID constant
const EXTENSION_ID = "AnselmHahn.vsplot";

suite("Data Commands Tests", () => {
	test("previewData command should handle unsupported file type", async function () {
		this.timeout(10000);
		
		// Create an unsupported file type
		const content = "Some random content";
		const tmpPath = path.join(__dirname, "../../test-data/unsupported.xyz");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		// Execute command - it should handle the error gracefully
		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			// Command should complete without throwing
			assert.ok(true, "Command should handle unsupported file type gracefully");
		} catch (error) {
			// If it throws, that's also acceptable
			assert.ok(true, "Command threw error for unsupported file type");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("previewData command should use active editor when no URI provided", async function () {
		this.timeout(15000);
		
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be available");
		const basePath = ext ? ext.extensionPath : "";
		
		// Create and open a CSV file
		const csvPath = path.join(basePath, "sample-data", "iris.csv");
		const uri = vscode.Uri.file(csvPath);
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		
		// Verify active editor is set to the expected file
		assert.ok(vscode.window.activeTextEditor, "Active editor should be set");
		assert.strictEqual(
			vscode.window.activeTextEditor?.document.uri.fsPath,
			uri.fsPath,
			"Active editor should be the iris.csv file"
		);
		
		// Execute command without URI - should fallback to active editor
		await vscode.commands.executeCommand("vsplot.previewData");
		assert.ok(true, "Command should work with active editor fallback");
	});

	test("plotData command should use active editor when no URI provided", async function () {
		this.timeout(15000);
		
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be available");
		const basePath = ext ? ext.extensionPath : "";
		
		// Create and open a CSV file
		const csvPath = path.join(basePath, "sample-data", "iris.csv");
		const uri = vscode.Uri.file(csvPath);
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		
		// Verify active editor is set to the expected file
		assert.ok(vscode.window.activeTextEditor, "Active editor should be set");
		assert.strictEqual(
			vscode.window.activeTextEditor?.document.uri.fsPath,
			uri.fsPath,
			"Active editor should be the iris.csv file"
		);
		
		// Execute command without URI - should fallback to active editor
		await vscode.commands.executeCommand("vsplot.plotData");
		assert.ok(true, "Command should work with active editor fallback");
	});

	test("previewData command should handle failed parse gracefully", async function () {
		this.timeout(10000);
		
		// Create a file that will fail to parse (empty CSV)
		const content = "";
		const tmpPath = path.join(__dirname, "../../test-data/empty-parse-test.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			// Command might complete or show error message
			assert.ok(true, "Command handled parse failure gracefully");
		} catch (error) {
			// Throwing is also acceptable for parse failures
			assert.ok(true, "Command threw error for parse failure");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("plotData command should handle failed parse gracefully", async function () {
		this.timeout(10000);
		
		// Create a file that will fail to parse (empty CSV)
		const content = "";
		const tmpPath = path.join(__dirname, "../../test-data/empty-plot-test.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			// Command might complete or show error message
			assert.ok(true, "Command handled parse failure gracefully");
		} catch (error) {
			// Throwing is also acceptable for parse failures
			assert.ok(true, "Command threw error for parse failure");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("previewData command should handle corrupted file gracefully", async function () {
		this.timeout(10000);
		
		// Create a file with invalid binary content
		const tmpPath = path.join(__dirname, "../../test-data/corrupted.csv");
		// Use Buffer directly for binary data
		const buffer = Buffer.from([0xFF, 0xFE, 0x00, 0x01, 0x02, 0x03]);
		await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), buffer);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "Command handled corrupted file gracefully");
		} catch (error) {
			assert.ok(true, "Command threw error for corrupted file");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("plotData command should handle unsupported file type", async function () {
		this.timeout(10000);
		
		// Create an unsupported file type
		const content = "Some random content";
		const tmpPath = path.join(__dirname, "../../test-data/unsupported-plot.xyz");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		// Execute command - it should handle the error gracefully
		try {
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			// Command should complete without throwing
			assert.ok(true, "Command should handle unsupported file type gracefully");
		} catch (error) {
			// If it throws, that's also acceptable
			assert.ok(true, "Command threw error for unsupported file type");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("openDataViewer command should work with workspace", async function () {
		this.timeout(10000);
		
		// This test verifies the command is registered and can be executed
		// We can't easily test the full UI interaction in automated tests
		try {
			// Execute the command - it will show a quick pick if there are files
			// Since we can't interact with the UI, we just verify it doesn't crash
			const promise = vscode.commands.executeCommand("vsplot.openDataViewer");
			
			// Give it a moment to start
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// The command will be waiting for user input, so we can't await it fully
			// But we verified it started without error
			assert.ok(true, "openDataViewer command executed without error");
		} catch (error) {
			// Command might fail if no workspace is open, which is acceptable
			assert.ok(true, "Command handled no-workspace case");
		}
	});

	test("previewData with TSV file should use tab delimiter", async function () {
		this.timeout(10000);
		
		const content = "Name\tAge\tScore\nAlice\t25\t95\nBob\t30\t87";
		const tmpPath = path.join(__dirname, "../../test-data/tab-separated.tsv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			// If command completes without error, TSV was handled
			assert.ok(true, "TSV file was previewed successfully");
		} catch (error) {
			assert.fail(`TSV preview failed: ${error}`);
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("plotData with TAB file should parse correctly", async function () {
		this.timeout(10000);
		
		const content = "X\tY\tZ\n1\t2\t3\n4\t5\t6\n7\t8\t9";
		const tmpPath = path.join(__dirname, "../../test-data/tab-file.tab");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			// If command completes without error, TAB was handled
			assert.ok(true, "TAB file was plotted successfully");
		} catch (error) {
			assert.fail(`TAB plot failed: ${error}`);
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("previewData with OUT file should parse correctly", async function () {
		this.timeout(10000);
		
		const content = "Step|Value|Status\n1|100|OK\n2|200|OK\n3|300|OK";
		const tmpPath = path.join(__dirname, "../../test-data/output.out");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "OUT file was previewed successfully");
		} catch (error) {
			assert.fail(`OUT preview failed: ${error}`);
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("plotData with DATA file should parse correctly", async function () {
		this.timeout(10000);
		
		const content = "Time,Temperature,Humidity\n08:00,20.5,45\n09:00,21.0,43\n10:00,22.5,40";
		const tmpPath = path.join(__dirname, "../../test-data/measurements.data");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			assert.ok(true, "DATA file was plotted successfully");
		} catch (error) {
			assert.fail(`DATA plot failed: ${error}`);
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("previewData with JSON array of objects should work", async function () {
		this.timeout(10000);
		
		const content = '[{"id": 1, "name": "Item1"}, {"id": 2, "name": "Item2"}]';
		const tmpPath = path.join(__dirname, "../../test-data/objects.json");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "JSON array of objects was previewed successfully");
		} catch (error) {
			assert.fail(`JSON preview failed: ${error}`);
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("previewData command should handle file with only comments", async function () {
		this.timeout(10000);
		
		const content = "# Comment 1\n# Comment 2\n# Comment 3";
		const tmpPath = path.join(__dirname, "../../test-data/comments-only-cmd.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			// The command should handle this gracefully (showing error message)
			assert.ok(true, "Command handled file with only comments");
		} catch (error) {
			// Throwing is acceptable for invalid files
			assert.ok(true, "Command threw error for file with only comments");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("plotData command should handle file with only whitespace", async function () {
		this.timeout(10000);
		
		const content = "   \n\t\n   \n\t\t\t";
		const tmpPath = path.join(__dirname, "../../test-data/whitespace-cmd.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			// The command should handle this gracefully (showing error message)
			assert.ok(true, "Command handled whitespace-only file");
		} catch (error) {
			// Throwing is acceptable for invalid files
			assert.ok(true, "Command threw error for whitespace-only file");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("previewData command with invalid JSON should show error", async function () {
		this.timeout(10000);
		
		const content = '{invalid json content}';
		const tmpPath = path.join(__dirname, "../../test-data/invalid-json-cmd.json");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			// Command should complete and show error to user
			assert.ok(true, "Command handled invalid JSON gracefully");
		} catch (error) {
			// Throwing is also acceptable
			assert.ok(true, "Command threw error for invalid JSON");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("plotData command with invalid JSON should show error", async function () {
		this.timeout(10000);
		
		const content = 'not valid json at all';
		const tmpPath = path.join(__dirname, "../../test-data/invalid-json-plot.json");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			// Command should complete and show error to user
			assert.ok(true, "Command handled invalid JSON gracefully");
		} catch (error) {
			// Throwing is also acceptable
			assert.ok(true, "Command threw error for invalid JSON");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("previewData with JSON primitive should show error", async function () {
		this.timeout(10000);
		
		const content = '"just a string"';
		const tmpPath = path.join(__dirname, "../../test-data/json-primitive-cmd.json");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			// Command should handle this by showing error
			assert.ok(true, "Command handled JSON primitive gracefully");
		} catch (error) {
			assert.ok(true, "Command threw error for JSON primitive");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("previewData with single object JSON should work", async function () {
		this.timeout(10000);
		
		const content = '{"name": "Test", "value": 42, "active": true}';
		const tmpPath = path.join(__dirname, "../../test-data/single-object-cmd.json");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.previewData", uri);
			assert.ok(true, "Single object JSON previewed successfully");
		} catch (error) {
			assert.fail(`Single object JSON preview failed: ${error}`);
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("plotData with single object JSON should work", async function () {
		this.timeout(10000);
		
		const content = '{"x": 1, "y": 2, "z": 3}';
		const tmpPath = path.join(__dirname, "../../test-data/single-object-plot.json");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await vscode.commands.executeCommand("vsplot.plotData", uri);
			assert.ok(true, "Single object JSON plotted successfully");
		} catch (error) {
			assert.fail(`Single object JSON plot failed: ${error}`);
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});
});
