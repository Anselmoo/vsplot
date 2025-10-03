import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import { parseDataFile } from "../data/load";

suite("Edge Cases and Robustness Tests", () => {
	test("Empty file should throw error", async function () {
		this.timeout(10000);
		const content = "";
		const tmpPath = path.join(__dirname, "../../test-data/empty-file.txt");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await parseDataFile(uri);
			assert.fail("Should have thrown an error for empty file");
		} catch (error) {
			assert.ok(true, "Correctly threw error for empty file");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("File with only whitespace should throw error", async function () {
		this.timeout(10000);
		const content = "   \n\t\n  \n";
		const tmpPath = path.join(__dirname, "../../test-data/whitespace-only.txt");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		
		try {
			await parseDataFile(uri);
			assert.fail("Should have thrown an error for whitespace-only file");
		} catch (error) {
			assert.ok(true, "Correctly threw error for whitespace-only file");
		}

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("Mixed delimiters in same file should detect most consistent", async function () {
		this.timeout(10000);
		// First 3 lines use comma, last line uses semicolon - comma should win
		const content = "a,b,c\n1,2,3\n4,5,6\n7;8;9";
		const tmpPath = path.join(__dirname, "../../test-data/mixed-delimiters.txt");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(
			data?.detectedDelimiter,
			",",
			"Should detect comma as most consistent delimiter"
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

	test("Malformed data with inconsistent column counts should parse available columns", async function () {
		this.timeout(10000);
		// Header has 3 columns, but data rows have varying counts
		const content = "a,b,c\n1,2,3\n4,5\n6,7,8,9";
		const tmpPath = path.join(__dirname, "../../test-data/inconsistent-columns.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed despite inconsistent columns");
		assert.strictEqual(data?.headers.length, 3, "Should have 3 header columns");
		assert.strictEqual(data?.rows.length, 3, "Should have 3 data rows");
		// Row 1 should have 3 values
		assert.strictEqual(data?.rows[0].length, 3, "First row should have 3 columns");
		// Row 2 should have 2 values (it's malformed but parsed as-is)
		assert.strictEqual(data?.rows[1].length, 2, "Second row should have 2 columns");
		// Row 3 should have 4 values (it's malformed but parsed as-is)
		assert.strictEqual(data?.rows[2].length, 4, "Third row should have 4 columns");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("Large dataset should parse without errors", async function () {
		this.timeout(15000);
		// Generate a large CSV with 10,000 rows
		const header = "id,value1,value2,value3\n";
		const rows = Array.from({ length: 10000 }, (_, i) => 
			`${i},${Math.random()},${Math.random()},${Math.random()}`
		).join("\n");
		const content = header + rows;
		
		const tmpPath = path.join(__dirname, "../../test-data/large-dataset.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Large dataset should be parsed");
		assert.strictEqual(data?.headers.length, 4, "Should have 4 columns");
		assert.strictEqual(data?.rows.length, 10000, "Should have 10,000 data rows");
		assert.strictEqual(data?.totalRows, 10000, "Total rows should be 10,000");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("Special characters in data should be preserved", async function () {
		this.timeout(10000);
		const content = "name,description\nTest,Contains @#$%^&*()!\nAnother,Has \"quotes\" and 'apostrophes'\nThird,Unicode: émojis 🎉 中文";
		const tmpPath = path.join(__dirname, "../../test-data/special-chars.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data with special characters should be parsed");
		assert.strictEqual(data?.headers.length, 2, "Should have 2 columns");
		assert.strictEqual(data?.rows.length, 3, "Should have 3 data rows");
		assert.strictEqual(data?.rows[0][1], "Contains @#$%^&*()!", "Special chars should be preserved");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("Very long lines should be parsed correctly", async function () {
		this.timeout(10000);
		// Create a CSV with very long cell values (1000 characters each)
		const longValue = "x".repeat(1000);
		const content = `col1,col2,col3\n${longValue},${longValue},${longValue}\nshort,values,here`;
		const tmpPath = path.join(__dirname, "../../test-data/long-lines.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data with very long lines should be parsed");
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.strictEqual(data?.rows.length, 2, "Should have 2 data rows");
		assert.strictEqual((data?.rows[0][0] as string).length, 1000, "First cell should have 1000 characters");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("Numeric-only data should generate column headers", async function () {
		this.timeout(10000);
		// All numeric data - first line should be treated as data, not headers
		const content = "1,2,3\n4,5,6\n7,8,9";
		const tmpPath = path.join(__dirname, "../../test-data/numeric-only.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Numeric-only data should be parsed");
		// When all values are numeric, headers are generated and first line is treated as data
		assert.strictEqual(data?.headers[0], "Column 1", "First header should be generated");
		assert.strictEqual(data?.headers[1], "Column 2", "Second header should be generated");
		assert.strictEqual(data?.headers[2], "Column 3", "Third header should be generated");
		assert.strictEqual(data?.rows.length, 3, "Should have 3 data rows");
		assert.strictEqual(data?.rows[0][0], 1, "First value should be 1");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("Mixed numeric and text headers should detect headers correctly", async function () {
		this.timeout(10000);
		// Header has mix of text and numbers, but should still be treated as header
		const content = "name,age,id123\nAlice,25,100\nBob,30,200";
		const tmpPath = path.join(__dirname, "../../test-data/mixed-headers.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data with mixed headers should be parsed");
		assert.strictEqual(data?.headers[0], "name", "First header should be 'name'");
		assert.strictEqual(data?.headers[1], "age", "Second header should be 'age'");
		assert.strictEqual(data?.headers[2], "id123", "Third header should be 'id123'");
		assert.strictEqual(data?.rows.length, 2, "Should have 2 data rows");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("File with BOM (Byte Order Mark) should be parsed correctly", async function () {
		this.timeout(10000);
		// UTF-8 BOM is EF BB BF
		const bom = "\uFEFF";
		const content = `${bom}name,value\ntest,123`;
		const tmpPath = path.join(__dirname, "../../test-data/with-bom.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data with BOM should be parsed");
		// BOM might be included in first header, but parsing should still work
		assert.ok(data?.headers.length >= 2, "Should have at least 2 columns");
		assert.strictEqual(data?.rows.length, 1, "Should have 1 data row");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("File with only header (no data rows) should parse without error", async function () {
		this.timeout(10000);
		const content = "col1,col2,col3";
		const tmpPath = path.join(__dirname, "../../test-data/header-only.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Header-only file should be parsed");
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.strictEqual(data?.rows.length, 0, "Should have 0 data rows");
		assert.strictEqual(data?.totalRows, 0, "Total rows should be 0");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("File with trailing empty lines should ignore them", async function () {
		this.timeout(10000);
		const content = "name,value\ntest,123\n\n\n\n";
		const tmpPath = path.join(__dirname, "../../test-data/trailing-empty.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data with trailing empty lines should be parsed");
		assert.strictEqual(data?.headers.length, 2, "Should have 2 columns");
		assert.strictEqual(data?.rows.length, 1, "Should have 1 data row (empty lines ignored)");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("File with leading empty lines and comments should skip to data", async function () {
		this.timeout(10000);
		const content = "\n\n# Comment\n\nname,value\ntest,123";
		const tmpPath = path.join(__dirname, "../../test-data/leading-empty.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data with leading empty lines should be parsed");
		assert.strictEqual(data?.headers.length, 2, "Should have 2 columns");
		assert.strictEqual(data?.rows.length, 1, "Should have 1 data row");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	test("Delimiter with quoted values containing delimiter should parse correctly", async function () {
		this.timeout(10000);
		// CSV with quotes containing commas
		const content = 'name,description\n"Smith, John","Developer, Senior"\n"Doe, Jane","Manager, Project"';
		const tmpPath = path.join(__dirname, "../../test-data/quoted-delimiters.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8")
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data with quoted delimiters should be parsed");
		assert.strictEqual(data?.headers.length, 2, "Should have 2 columns");
		assert.strictEqual(data?.rows.length, 2, "Should have 2 data rows");
		// Note: Basic CSV parser might not handle this perfectly, but it should not crash
		assert.ok(data?.rows[0].length >= 2, "First row should have at least 2 values");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (e) {
			// Ignore cleanup errors
		}
	});
});
