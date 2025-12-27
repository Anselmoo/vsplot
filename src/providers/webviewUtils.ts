import * as fs from "fs";
import * as path from "path";
import type * as vscode from "vscode";

/**
 * Load an HTML template file and replace placeholders with actual values.
 *
 * This function reads a template file from the media directory and replaces
 * all occurrences of {{PLACEHOLDER}} with the corresponding values from the
 * replacements object.
 *
 * @param extensionUri - The extension's root URI
 * @param templatePath - Path to the template file relative to the extension root
 * @param replacements - Object mapping placeholder names to their replacement values
 * @returns HTML string with all placeholders replaced
 */
export function loadHtmlTemplate(
	extensionUri: vscode.Uri,
	templatePath: string,
	replacements: Record<string, string>,
): string {
	const templateFilePath = path.join(extensionUri.fsPath, templatePath);

	// Read the template file
	let html = fs.readFileSync(templateFilePath, "utf8");

	// Replace all placeholders with their values
	for (const [key, value] of Object.entries(replacements)) {
		// Replace {{KEY}} with value
		const placeholder = `{{${key}}}`;
		html = html.split(placeholder).join(value);
	}

	return html;
}

/**
 * Generate a random nonce for Content Security Policy.
 *
 * @returns A random 32-character string
 */
export function getNonce(): string {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
