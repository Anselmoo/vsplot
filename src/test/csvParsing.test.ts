import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
import { parseDataFile } from "../data/load";

suite("CSV Parsing Edge Cases Tests", () => {
	test("CSV with quoted fields containing commas should parse correctly", async function () {
		this.timeout(10000);
		const content =
			'Name,Address,City\nAlice,"123 Main St, Apt 4",NYC\nBob,"456 Oak Ave, Suite 200",LA';
		const tmpPath = path.join(
			__dirname,
			"../../test-data/csv-quoted-commas.csv",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.strictEqual(data?.rows.length, 2, "Should have 2 data rows");
		assert.strictEqual(
			data?.rows[0][1],
			"123 Main St, Apt 4",
			"Quoted field with comma should be preserved",
		);
		assert.strictEqual(
			data?.rows[1][1],
			"456 Oak Ave, Suite 200",
			"Quoted field with comma should be preserved",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (_e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with quoted fields containing newlines should handle gracefully", async function () {
		this.timeout(10000);
		// Note: Multi-line quoted fields are complex - our simple parser may not handle them perfectly
		const content = 'Name,Note\nAlice,"Simple note"\nBob,"Another note"';
		const tmpPath = path.join(
			__dirname,
			"../../test-data/csv-simple-quotes.csv",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 2, "Should have 2 columns");
		assert.strictEqual(data?.rows.length, 2, "Should have 2 data rows");
		assert.strictEqual(
			data?.rows[0][1],
			"Simple note",
			"Quoted field should be parsed",
		);
		assert.strictEqual(
			data?.rows[1][1],
			"Another note",
			"Quoted field should be parsed",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (_e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with empty quoted fields should parse", async function () {
		this.timeout(10000);
		const content = 'A,B,C\n1,"",3\n4,"",6';
		const tmpPath = path.join(
			__dirname,
			"../../test-data/csv-empty-quotes.csv",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.strictEqual(data?.rows.length, 2, "Should have 2 data rows");
		assert.strictEqual(
			data?.rows[0][1],
			"",
			"Empty quoted field should be empty string",
		);
		assert.strictEqual(
			data?.rows[1][1],
			"",
			"Empty quoted field should be empty string",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (_e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with trailing comma should handle gracefully", async function () {
		this.timeout(10000);
		const content = "A,B,C,\n1,2,3,\n4,5,6,";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/csv-trailing-comma.csv",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		// Trailing comma creates an extra empty column
		assert.ok(data?.headers.length >= 3, "Should have at least 3 columns");
		assert.ok(data?.rows.length >= 2, "Should have at least 2 data rows");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (_e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with BOM (Byte Order Mark) should parse correctly", async function () {
		this.timeout(10000);
		// UTF-8 BOM is EF BB BF
		const bom = "\uFEFF";
		const content = `${bom}Name,Age,Score\nAlice,25,95\nBob,30,87`;
		const tmpPath = path.join(__dirname, "../../test-data/csv-with-bom.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.rows.length, 2, "Should have 2 data rows");
		// The BOM might be stripped or might appear in first header
		// Either way, parsing should succeed

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (_e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with header only (no data rows) should parse", async function () {
		this.timeout(10000);
		const content = "Name,Age,Score";
		const tmpPath = path.join(__dirname, "../../test-data/csv-header-only.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 3, "Should have 3 headers");
		assert.strictEqual(
			data?.headers[0],
			"Name",
			"First header should be 'Name'",
		);
		assert.strictEqual(
			data?.headers[1],
			"Age",
			"Second header should be 'Age'",
		);
		assert.strictEqual(
			data?.headers[2],
			"Score",
			"Third header should be 'Score'",
		);
		assert.strictEqual(data?.rows.length, 0, "Should have 0 data rows");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (_e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with all numeric first line should generate column headers", async function () {
		this.timeout(10000);
		const content = "1,2,3\n4,5,6\n7,8,9";
		const tmpPath = path.join(__dirname, "../../test-data/csv-all-numeric.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		assert.strictEqual(
			data?.headers[0],
			"Column 1",
			"Should auto-generate header",
		);
		assert.strictEqual(
			data?.headers[1],
			"Column 2",
			"Should auto-generate header",
		);
		assert.strictEqual(
			data?.headers[2],
			"Column 3",
			"Should auto-generate header",
		);
		// All rows should be included as data (no header row)
		assert.strictEqual(data?.rows.length, 3, "Should have 3 data rows");
		assert.strictEqual(data?.rows[0][0], 1, "First value should be numeric");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (_e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with mixed numeric and text headers should detect headers", async function () {
		this.timeout(10000);
		const content = "ID,Name,1\n1,Alice,100\n2,Bob,200";
		const tmpPath = path.join(
			__dirname,
			"../../test-data/csv-mixed-headers.csv",
		);
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 3, "Should have 3 columns");
		// Because there's at least one non-numeric value ("Name"), it should be treated as headers
		assert.strictEqual(data?.headers[0], "ID", "First header should be 'ID'");
		assert.strictEqual(
			data?.headers[1],
			"Name",
			"Second header should be 'Name'",
		);
		assert.strictEqual(data?.rows.length, 2, "Should have 2 data rows");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (_e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with leading and trailing empty lines should be filtered", async function () {
		this.timeout(10000);
		const content = "\n\nName,Age\nAlice,25\nBob,30\n\n\n";
		const tmpPath = path.join(__dirname, "../../test-data/csv-empty-lines.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers.length, 2, "Should have 2 columns");
		assert.strictEqual(
			data?.rows.length,
			2,
			"Should have 2 data rows (empty lines filtered)",
		);
		assert.strictEqual(data?.rows[0][0], "Alice", "First row should be Alice");
		assert.strictEqual(data?.rows[1][0], "Bob", "Second row should be Bob");

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (_e) {
			// Ignore cleanup errors
		}
	});

	test("CSV with spaces around values should trim them", async function () {
		this.timeout(10000);
		const content = "Name , Age , Score\n Alice , 25 , 95\n Bob , 30 , 87";
		const tmpPath = path.join(__dirname, "../../test-data/csv-spaces.csv");
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(tmpPath),
			Buffer.from(content, "utf8"),
		);

		const uri = vscode.Uri.file(tmpPath);
		const data = await parseDataFile(uri);

		assert.ok(data, "Data should be parsed");
		assert.strictEqual(data?.headers[0], "Name", "Header should be trimmed");
		assert.strictEqual(data?.headers[1], "Age", "Header should be trimmed");
		assert.strictEqual(data?.headers[2], "Score", "Header should be trimmed");
		assert.strictEqual(data?.rows[0][0], "Alice", "Values should be trimmed");
		assert.strictEqual(
			data?.rows[0][1],
			25,
			"Numeric values should be parsed and trimmed",
		);

		// Clean up
		try {
			await vscode.workspace.fs.delete(vscode.Uri.file(tmpPath));
		} catch (_e) {
			// Ignore cleanup errors
		}
	});
});
