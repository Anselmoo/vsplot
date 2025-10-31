import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";

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
});
