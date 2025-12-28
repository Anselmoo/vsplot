import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { getNonce, loadHtmlTemplate } from "../providers/webviewUtils";

// Keep the test in sync with package.json publisher + name
const EXTENSION_ID = "AnselmHahn.vsplot";
const TEST_DATA_DIR = "test-data";

suite("Webview Utils Tests", () => {
	test("getNonce should generate a 32-character string", () => {
		const nonce = getNonce();
		assert.strictEqual(nonce.length, 32, "Nonce should be 32 characters long");
		assert.match(nonce, /^[A-Za-z0-9]+$/, "Nonce should contain only alphanumeric characters");
	});

	test("getNonce should generate unique values", () => {
		const nonce1 = getNonce();
		const nonce2 = getNonce();
		const nonce3 = getNonce();

		assert.notStrictEqual(nonce1, nonce2, "Consecutive nonces should be different");
		assert.notStrictEqual(nonce2, nonce3, "Consecutive nonces should be different");
		assert.notStrictEqual(nonce1, nonce3, "Consecutive nonces should be different");
	});

	test("loadHtmlTemplate should replace single placeholder", async function () {
		this.timeout(10000);

		// Create a temporary template file
		const tmpDir = path.join(__dirname, "../..", TEST_DATA_DIR);
		await vscode.workspace.fs.createDirectory(vscode.Uri.file(tmpDir));

		const templatePath = `${TEST_DATA_DIR}/template-test.html`;
		const fullPath = path.join(__dirname, "../..", templatePath);
		const templateContent = "<html><body>{{MESSAGE}}</body></html>";

		await fs.promises.writeFile(fullPath, templateContent, "utf8");

		try {
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const extensionUri = vscode.Uri.file(ext?.extensionPath);

			const result = loadHtmlTemplate(extensionUri, templatePath, {
				MESSAGE: "Hello World",
			});

			assert.strictEqual(
				result,
				"<html><body>Hello World</body></html>",
				"Placeholder should be replaced",
			);
		} finally {
			// Clean up
			try {
				await fs.promises.unlink(fullPath);
			} catch (_e) {
				// Ignore cleanup errors
			}
		}
	});

	test("loadHtmlTemplate should replace multiple placeholders", async function () {
		this.timeout(10000);

		const tmpDir = path.join(__dirname, "../..", TEST_DATA_DIR);
		await vscode.workspace.fs.createDirectory(vscode.Uri.file(tmpDir));

		const templatePath = `${TEST_DATA_DIR}/template-multi.html`;
		const fullPath = path.join(__dirname, "../..", templatePath);
		const templateContent =
			"<html><head><title>{{TITLE}}</title></head><body><h1>{{HEADING}}</h1><p>{{CONTENT}}</p></body></html>";

		await fs.promises.writeFile(fullPath, templateContent, "utf8");

		try {
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const extensionUri = vscode.Uri.file(ext?.extensionPath);

			const result = loadHtmlTemplate(extensionUri, templatePath, {
				TITLE: "Test Page",
				HEADING: "Welcome",
				CONTENT: "This is a test",
			});

			assert.strictEqual(
				result,
				"<html><head><title>Test Page</title></head><body><h1>Welcome</h1><p>This is a test</p></body></html>",
				"All placeholders should be replaced",
			);
		} finally {
			// Clean up
			try {
				await fs.promises.unlink(fullPath);
			} catch (_e) {
				// Ignore cleanup errors
			}
		}
	});

	test("loadHtmlTemplate should handle repeated placeholders", async function () {
		this.timeout(10000);

		const tmpDir = path.join(__dirname, "../..", TEST_DATA_DIR);
		await vscode.workspace.fs.createDirectory(vscode.Uri.file(tmpDir));

		const templatePath = `${TEST_DATA_DIR}/template-repeated.html`;
		const fullPath = path.join(__dirname, "../..", templatePath);
		const templateContent = "<div>{{VALUE}}</div><div>{{VALUE}}</div><div>{{VALUE}}</div>";

		await fs.promises.writeFile(fullPath, templateContent, "utf8");

		try {
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const extensionUri = vscode.Uri.file(ext?.extensionPath);

			const result = loadHtmlTemplate(extensionUri, templatePath, {
				VALUE: "42",
			});

			assert.strictEqual(
				result,
				"<div>42</div><div>42</div><div>42</div>",
				"Repeated placeholders should all be replaced",
			);
		} finally {
			// Clean up
			try {
				await fs.promises.unlink(fullPath);
			} catch (_e) {
				// Ignore cleanup errors
			}
		}
	});

	test("loadHtmlTemplate should handle empty replacement value", async function () {
		this.timeout(10000);

		const tmpDir = path.join(__dirname, "../..", TEST_DATA_DIR);
		await vscode.workspace.fs.createDirectory(vscode.Uri.file(tmpDir));

		const templatePath = `${TEST_DATA_DIR}/template-empty.html`;
		const fullPath = path.join(__dirname, "../..", templatePath);
		const templateContent = "<div>Before{{EMPTY}}After</div>";

		await fs.promises.writeFile(fullPath, templateContent, "utf8");

		try {
			const ext = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(ext, "Extension should be available");
			const extensionUri = vscode.Uri.file(ext?.extensionPath);

			const result = loadHtmlTemplate(extensionUri, templatePath, {
				EMPTY: "",
			});

			assert.strictEqual(
				result,
				"<div>BeforeAfter</div>",
				"Empty value should remove placeholder completely",
			);
		} finally {
			// Clean up
			try {
				await fs.promises.unlink(fullPath);
			} catch (_e) {
				// Ignore cleanup errors
			}
		}
	});
});
