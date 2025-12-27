import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { parseDataFile } from "../data/load";

suite("Delimiter Detection Tests", () => {
	test("Detects colon delimiter", async function () {
		this.timeout(10000);
		const uri = vscode.Uri.file(
			path.join(__dirname, "../../test-data/colon-delimited.txt"),
		);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.detectedDelimiter,
			":",
			"Should detect colon delimiter",
		);
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.strictEqual(
			data?.headers[0],
			"name",
			"First header should be 'name'",
		);
		assert.strictEqual(
			data?.headers[1],
			"age",
			"Second header should be 'age'",
		);
		assert.strictEqual(
			data?.headers[2],
			"city",
			"Third header should be 'city'",
		);
		assert.strictEqual(data?.rows.length, 3, "Should have 3 data rows");
	});

	test("Detects pipe delimiter", async function () {
		this.timeout(10000);
		const uri = vscode.Uri.file(
			path.join(__dirname, "../../test-data/pipe-delimited.dat"),
		);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.detectedDelimiter,
			"|",
			"Should detect pipe delimiter",
		);
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.strictEqual(data?.rows.length, 3, "Should have 3 data rows");
	});

	test("Detects space delimiter", async function () {
		this.timeout(10000);
		const uri = vscode.Uri.file(
			path.join(__dirname, "../../test-data/space-delimited.txt"),
		);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.detectedDelimiter,
			" ",
			"Should detect space delimiter",
		);
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.strictEqual(data?.rows.length, 3, "Should have 3 data rows");
	});

	test("Handles single column with fallback", async function () {
		this.timeout(10000);
		const uri = vscode.Uri.file(
			path.join(__dirname, "../../test-data/single-column.txt"),
		);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		// Single column should fallback to comma delimiter (best default)
		assert.ok(data?.detectedDelimiter, "Should have a delimiter set");
		assert.strictEqual(data?.headers.length, 1, "Should have 1 column");
		assert.strictEqual(data?.rows.length, 3, "Should have 3 data rows");
	});

	test("User can override delimiter with pipe", async function () {
		this.timeout(10000);
		// Create a comma-separated file
		const content = "a,b,c\n1,2,3\n4,5,6";
		const tmpPath = path.join(__dirname, "../../test-data/override-test.txt");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);

		// Parse without override (should detect comma)
		const dataAuto = await parseDataFile(uri);
		assert.strictEqual(
			dataAuto?.detectedDelimiter,
			",",
			"Should auto-detect comma",
		);
		assert.strictEqual(dataAuto?.headers.length, 3, "Should have 3 columns");

		// Parse with pipe override (should split differently)
		const dataOverride = await parseDataFile(uri, { delimiter: "|" });
		assert.strictEqual(
			dataOverride?.detectedDelimiter,
			"|",
			"Should use override delimiter",
		);
		// With pipe delimiter, "a,b,c" is one column
		assert.strictEqual(
			dataOverride?.headers.length,
			1,
			"Should have 1 column when using pipe on comma-separated data",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("User can override delimiter with tab", async function () {
		this.timeout(10000);
		// Create a tab-separated file
		const content = "a\tb\tc\n1\t2\t3\n4\t5\t6";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/tab-override-test.txt",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);

		// Parse with explicit tab override
		const data = await parseDataFile(uri, { delimiter: "\t" });
		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.detectedDelimiter,
			"\t",
			"Should use tab delimiter",
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

	test("Delimiter detection prefers consistency across lines", async function () {
		this.timeout(10000);
		// Create a file where both comma and space could work, but comma is more consistent
		const content = "a,b,c\n1,2,3\n4,5,6\n7,8,9";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/consistency-test.txt",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.detectedDelimiter,
			",",
			"Should detect comma as most consistent delimiter",
		);
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.strictEqual(data?.rows.length, 3, "Should have 3 data rows");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("Delimiter detection handles semicolon", async function () {
		this.timeout(10000);
		const content = "name;value;count\nitem1;10;5\nitem2;20;3";
		const tmpPath = path.join(__dirname, "../../test-data/semicolon-test.txt");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.detectedDelimiter,
			";",
			"Should detect semicolon delimiter",
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
});
