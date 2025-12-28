import * as assert from "node:assert";
import * as vscode from "vscode";

// Extension ID constant
const EXTENSION_ID = "AnselmHahn.vsplot";

suite("Extension Activation Tests", () => {
	test("Extension should be present", () => {
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be installed");
	});

	test("Extension should activate", async function () {
		this.timeout(10000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be available");

		await ext?.activate();
		assert.strictEqual(ext?.isActive, true, "Extension should be active");
	});

	test("All commands should be registered", async function () {
		this.timeout(10000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		await ext?.activate();

		const commands = await vscode.commands.getCommands(true);

		// Check main commands
		assert.ok(commands.includes("vsplot.previewData"), "previewData command should be registered");
		assert.ok(commands.includes("vsplot.plotData"), "plotData command should be registered");
		assert.ok(
			commands.includes("vsplot.openDataViewer"),
			"openDataViewer command should be registered",
		);

		// Check test commands
		assert.ok(
			commands.includes("vsplot.test.applyChartConfig"),
			"test.applyChartConfig command should be registered",
		);
		assert.ok(
			commands.includes("vsplot.test.requestChartState"),
			"test.requestChartState command should be registered",
		);
	});

	test("Extension should handle activation errors gracefully", async function () {
		this.timeout(10000);
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, "Extension should be available");

		// Multiple activations should not cause issues
		await ext?.activate();
		await ext?.activate();
		assert.strictEqual(ext?.isActive, true, "Extension should remain active");
	});
});
