import * as path from "node:path";
import * as vscode from "vscode";

// Extension ID constant
export const EXTENSION_ID = "AnselmHahn.vsplot";

// Valid configuration constants - these should match the actual values supported by the application
export const VALID_CHART_TYPES = ["line", "bar", "scatter", "pie", "doughnut"] as const;
export const VALID_STYLE_PRESETS = ["clean", "soft"] as const;
export const VALID_AGGREGATION_TYPES = ["sum", "avg", "count", "min", "max"] as const;

/**
 * Test helper to get extension base path
 */
export function getExtensionBasePath(): string {
	const ext = vscode.extensions.getExtension(EXTENSION_ID);
	if (!ext) {
		throw new Error("Extension not found");
	}
	return ext.extensionPath;
}

/**
 * Test helper to create a temporary test file.
 * Note: Assumes test-data directory exists (should be created by test setup scripts).
 */
export async function createTempFile(fileName: string, content: string): Promise<vscode.Uri> {
	const basePath = getExtensionBasePath();
	const testDataDir = path.join(basePath, "test-data");
	const tmpPath = path.join(testDataDir, fileName);

	// Ensure test-data directory exists
	try {
		await vscode.workspace.fs.createDirectory(vscode.Uri.file(testDataDir));
	} catch {
		// Directory already exists, ignore
	}

	await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), Buffer.from(content, "utf8"));
	return vscode.Uri.file(tmpPath);
}

/**
 * Test helper to delete a temporary test file
 */
export async function deleteTempFile(uri: vscode.Uri): Promise<void> {
	try {
		await vscode.workspace.fs.delete(uri);
	} catch (_e) {
		// Log cleanup errors for debugging, but don't fail the test
		const errorMessage = _e instanceof Error ? _e.message : String(_e);
		console.warn(`Failed to clean up temp file ${uri.fsPath}: ${errorMessage}`);
	}
}

/**
 * Test helper to close all open editors/webviews after a test
 */
export async function closeAllEditors(): Promise<void> {
	await vscode.commands.executeCommand("workbench.action.closeAllEditors");
}

/**
 * Test helper to get URI for a sample data file
 */
export function getSampleDataUri(filename: string): vscode.Uri {
	const basePath = getExtensionBasePath();
	const csvPath = path.join(basePath, "sample-data", filename);
	return vscode.Uri.file(csvPath);
}
