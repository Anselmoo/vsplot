import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
	closeAllEditors,
	createTempFile,
	deleteTempFile,
	getExtensionBasePath,
	getSampleDataUri,
} from "./testUtils";

suite("Test Utils Unit Tests", () => {
	test("getExtensionBasePath returns a path", () => {
		const base = getExtensionBasePath();
		assert.ok(base && base.length > 0);
		assert.ok(fs.existsSync(base));
	});

	test("createTempFile and deleteTempFile create and cleanup file", async function () {
		this.timeout(10000);
		const uri = await createTempFile("tmp-test.txt", "hello world");
		assert.ok(uri.fsPath.includes("tmp-test.txt"));
		// file should exist
		const exists = fs.existsSync(uri.fsPath);
		assert.ok(exists, "Temp file should exist");

		await deleteTempFile(uri);
		const exists2 = fs.existsSync(uri.fsPath);
		assert.ok(!exists2, "Temp file should be removed");
	});

	test("deleteTempFile handles missing file gracefully", async () => {
		const fake = vscode.Uri.file(
			path.join(getExtensionBasePath(), "test-data", "definitely-not-exists-12345.txt"),
		);
		// Should not throw
		await deleteTempFile(fake);
	});

	test("closeAllEditors runs without error", async () => {
		await closeAllEditors();
	});

	test("getSampleDataUri returns correct file uri", () => {
		const uri = getSampleDataUri("test1.csv");
		assert.ok(uri.fsPath.endsWith(path.join("sample-data", "test1.csv")));
	});
});
