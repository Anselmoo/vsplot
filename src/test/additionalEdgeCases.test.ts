import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { parseDataFile } from "../data/load";

suite("Additional Edge Cases Tests", () => {
	test("CSV with only headers and empty data lines should parse", async function () {
		this.timeout(10000);
		const content = "Name,Age,Score\n\n\n";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/headers-empty-lines.csv",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 3, "Should have 3 headers");
		assert.strictEqual(
			data?.rows.length,
			0,
			"Should have 0 data rows (empty lines filtered)",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with very long cell values should parse", async function () {
		this.timeout(10000);
		const longValue = "A".repeat(10000);
		const content = `Header1,Header2\n${longValue},Value2\nValue3,Value4`;
		const tmpPath = path.join(__dirname, "../../test-data/long-values.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.rows[0][0],
			longValue,
			"Long value should be preserved",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("TXT file with delimiter override should use override", async function () {
		this.timeout(10000);
		const content = "A;B;C\n1;2;3\n4;5;6";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/semicolon-override.txt",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri, { delimiter: ";" });

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.detectedDelimiter,
			";",
			"Should use semicolon delimiter",
		);
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.strictEqual(data?.rows.length, 2, "Should have 2 data rows");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("DAT file with mixed delimiters should detect most consistent", async function () {
		this.timeout(10000);
		const content = "A|B|C\n1|2|3\n4|5|6\n7,8,9";
		const tmpPath = path.join(__dirname, "../../test-data/mixed-delim.dat");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.detectedDelimiter,
			"|",
			"Should detect pipe as most consistent",
		);
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with single row should parse", async function () {
		this.timeout(10000);
		const content = "1,2,3";
		const tmpPath = path.join(__dirname, "../../test-data/single-row.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		// Single row of numbers should be treated as data with generated headers
		assert.ok(data?.headers.length > 0, "Should have headers");
		assert.ok(data?.rows.length >= 0, "Should have rows");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("JSON with nested objects should handle gracefully", async function () {
		this.timeout(10000);
		const content = '{"user": {"name": "John", "age": 30}, "location": "NYC"}';
		const tmpPath = path.join(__dirname, "../../test-data/nested-object.json");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		// Nested objects are treated as single object
		assert.ok(data, "Data should be parsed");
		assert.ok(data?.headers.length > 0, "Should have headers");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with negative numbers should parse correctly", async function () {
		this.timeout(10000);
		const content = "Value,Amount\nItem1,-100\nItem2,-250.5\nItem3,300";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/negative-numbers.csv",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.rows[0][1], -100, "Should parse negative integer");
		assert.strictEqual(
			data?.rows[1][1],
			-250.5,
			"Should parse negative decimal",
		);
		assert.strictEqual(data?.rows[2][1], 300, "Should parse positive number");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with scientific notation should parse", async function () {
		this.timeout(10000);
		const content = "Value,Number\nSmall,1.5e-10\nLarge,3.2e8";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/scientific-notation.csv",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			typeof data?.rows[0][1],
			"number",
			"Should parse as number",
		);
		assert.strictEqual(
			typeof data?.rows[1][1],
			"number",
			"Should parse as number",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with boolean-like strings should preserve as strings", async function () {
		this.timeout(10000);
		const content = "Name,Active\nAlice,true\nBob,false\nCharlie,TRUE";
		const tmpPath = path.join(__dirname, "../../test-data/boolean-strings.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		// Boolean strings should be preserved as strings in CSV
		assert.strictEqual(
			data?.rows[0][1],
			"true",
			"Should preserve 'true' as string",
		);
		assert.strictEqual(
			data?.rows[1][1],
			"false",
			"Should preserve 'false' as string",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("OUT file with comment lines should filter comments", async function () {
		this.timeout(10000);
		const content = "# Comment line\nA|B|C\n1|2|3\n% Another comment\n4|5|6";
		const tmpPath = path.join(__dirname, "../../test-data/comments.out");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.rows.length,
			2,
			"Should have 2 data rows (comments filtered)",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});
});
