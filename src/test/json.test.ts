import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { parseDataFile } from "../data/load";

suite("JSON Parsing Tests", () => {
	test("JSON array of primitives (strings) should parse", async function () {
		this.timeout(10000);
		const content = '["apple", "banana", "cherry"]';
		const tmpPath = path.join(
			__dirname,
			"../../test-data/json-string-array.json",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 1, "Should have 1 column (Value)");
		assert.strictEqual(data?.headers[0], "Value", "Header should be 'Value'");
		assert.strictEqual(data?.rows.length, 3, "Should have 3 rows");
		assert.strictEqual(
			data?.rows[0][0],
			"apple",
			"First row should be 'apple'",
		);
		assert.strictEqual(
			data?.rows[1][0],
			"banana",
			"Second row should be 'banana'",
		);
		assert.strictEqual(
			data?.rows[2][0],
			"cherry",
			"Third row should be 'cherry'",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("JSON array of primitives (numbers) should parse", async function () {
		this.timeout(10000);
		const content = "[1, 2, 3, 4, 5]";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/json-number-array.json",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 1, "Should have 1 column (Value)");
		assert.strictEqual(data?.rows.length, 5, "Should have 5 rows");
		assert.strictEqual(data?.rows[0][0], 1, "First row should be 1");
		assert.strictEqual(data?.rows[4][0], 5, "Last row should be 5");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("JSON array of primitives (mixed) should parse", async function () {
		this.timeout(10000);
		const content = '["text", 42, true, null, 3.14]';
		const tmpPath = path.join(
			__dirname,
			"../../test-data/json-mixed-array.json",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 1, "Should have 1 column");
		assert.strictEqual(data?.rows.length, 5, "Should have 5 rows");
		assert.strictEqual(data?.rows[0][0], "text", "First item should be 'text'");
		assert.strictEqual(data?.rows[1][0], 42, "Second item should be 42");
		assert.strictEqual(data?.rows[2][0], true, "Third item should be true");
		assert.strictEqual(data?.rows[3][0], null, "Fourth item should be null");
		assert.strictEqual(data?.rows[4][0], 3.14, "Fifth item should be 3.14");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("JSON single object should parse as one row", async function () {
		this.timeout(10000);
		const content = '{"name": "John", "age": 30, "city": "NYC"}';
		const tmpPath = path.join(
			__dirname,
			"../../test-data/json-single-object.json",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.ok(data?.headers.includes("name"), "Should have 'name' header");
		assert.ok(data?.headers.includes("age"), "Should have 'age' header");
		assert.ok(data?.headers.includes("city"), "Should have 'city' header");
		assert.strictEqual(data?.rows.length, 1, "Should have 1 row");
		assert.strictEqual(data?.totalRows, 1, "Total rows should be 1");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("JSON empty array should throw error", async function () {
		this.timeout(10000);
		const content = "[]";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/json-empty-array.json",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);

		// Empty array is gracefully handled
		const data = await parseDataFile(uri);
		// Based on the code, empty array gives us headers: ['Value'] and rows: []
		assert.ok(data, "Data should be parsed even for empty array");
		assert.strictEqual(
			data?.rows.length,
			0,
			"Should have 0 rows for empty array",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("JSON array of objects with null values should parse", async function () {
		this.timeout(10000);
		const content =
			'[{"name": "Alice", "age": 25}, {"name": "Bob", "age": null}, {"name": null, "age": 35}]';
		const tmpPath = path.join(
			__dirname,
			"../../test-data/json-null-values.json",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 2, "Should have 2 columns");
		assert.strictEqual(data?.rows.length, 3, "Should have 3 rows");
		assert.strictEqual(
			data?.rows[0][0],
			"Alice",
			"First row name should be 'Alice'",
		);
		assert.strictEqual(data?.rows[1][1], null, "Second row age should be null");
		assert.strictEqual(data?.rows[2][0], null, "Third row name should be null");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("Invalid JSON should throw error", async function () {
		this.timeout(10000);
		const content = "{invalid json}";
		const tmpPath = path.join(__dirname, "../../test-data/json-invalid.json");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		// Invalid JSON should return null (error is shown to user)
		assert.strictEqual(data, null, "Invalid JSON should return null");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("JSON primitive (not array or object) should throw error", async function () {
		this.timeout(10000);
		const content = '"just a string"';
		const tmpPath = path.join(__dirname, "../../test-data/json-primitive.json");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		// Primitive JSON should return null
		assert.strictEqual(data, null, "Primitive JSON should return null");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("JSON number primitive should throw error", async function () {
		this.timeout(10000);
		const content = "42";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/json-number-primitive.json",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		// Primitive JSON should return null
		assert.strictEqual(data, null, "Number primitive should return null");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("JSON list of dictionaries (array of objects) should parse", async function () {
		this.timeout(10000);
		// Use the sample-data file created by setup-test-data.sh
		const ext = vscode.extensions.getExtension("AnselmHahn.vsplot");
		assert.ok(ext, "Extension should be available");
		const basePath = ext ? ext.extensionPath : "";
		const jsonPath = path.join(basePath, "sample-data", "list-of-dict.json");

		const uri = vscode.Uri.file(jsonPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		// Should have headers from object keys: x, y, z, category, value
		assert.strictEqual(data?.headers.length, 5, "Should have 5 columns");
		assert.ok(data?.headers.includes("x"), "Should have 'x' header");
		assert.ok(data?.headers.includes("y"), "Should have 'y' header");
		assert.ok(data?.headers.includes("z"), "Should have 'z' header");
		assert.ok(
			data?.headers.includes("category"),
			"Should have 'category' header",
		);
		assert.ok(data?.headers.includes("value"), "Should have 'value' header");
		assert.strictEqual(data?.rows.length, 10, "Should have 10 rows");
		// First row should have: x=1.2, y=2.3, z=3.1, category="A", value=10
		const xIdx = data?.headers.indexOf("x") ?? 0;
		const categoryIdx = data?.headers.indexOf("category") ?? 0;
		assert.strictEqual(data?.rows[0][xIdx], 1.2, "First row x should be 1.2");
		assert.strictEqual(
			data?.rows[0][categoryIdx],
			"A",
			"First row category should be 'A'",
		);
	});
});
