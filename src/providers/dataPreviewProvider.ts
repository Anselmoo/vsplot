import * as vscode from "vscode";
import type { ParsedData, ParseOptions } from "../data/load.js";
import { parseDataFile } from "../data/load.js";
import { getNonce, loadHtmlTemplate } from "./webviewUtils";

// --- Dependency Injection for Message Handlers ---

/**
 * Dependencies that can be injected for testing message handler logic.
 */
export interface MessageHandlerDependencies {
	showSaveDialog: (options: vscode.SaveDialogOptions) => Thenable<vscode.Uri | undefined>;
	writeFile: (uri: vscode.Uri, content: Uint8Array) => Thenable<void>;
	showInfoMessage: (msg: string) => void;
	showErrorMessage: (msg: string) => void;
	parseDataFile: (uri: vscode.Uri, options?: ParseOptions) => Promise<ParsedData | null>;
}

/**
 * Create default dependencies using real VS Code APIs
 */
export function createDefaultMessageHandlerDeps(): MessageHandlerDependencies {
	return {
		showSaveDialog: (options) => vscode.window.showSaveDialog(options),
		writeFile: (uri, content) => vscode.workspace.fs.writeFile(uri, content),
		showInfoMessage: (msg) => {
			vscode.window.showInformationMessage(msg);
		},
		showErrorMessage: (msg) => {
			vscode.window.showErrorMessage(msg);
		},
		parseDataFile: parseDataFile,
	};
}

// --- Message Types ---

export interface ExportDataMessage {
	type: "exportData";
	data: { headers: string[]; rows: (string | number)[][] };
}

export interface CreateChartMessage {
	type: "createChart";
	data: ParsedData & { fileName?: string };
}

export interface ReparseMessage {
	type: "reparse";
	delimiter: string | "auto";
}

export type WebviewMessage = ExportDataMessage | CreateChartMessage | ReparseMessage;

// --- Result Type ---

export interface MessageHandlerResult {
	success: boolean;
	error?: string;
}

// --- Extracted Testable Message Handler Functions ---

/**
 * Handle exportData message - exports filtered data to CSV.
 * Fully testable with dependency injection.
 */
export async function handleExportData(
	message: ExportDataMessage,
	deps: MessageHandlerDependencies,
): Promise<MessageHandlerResult> {
	try {
		const uri = await deps.showSaveDialog({
			saveLabel: "Export Filtered Data",
			filters: { CSV: ["csv"] },
			defaultUri: vscode.Uri.file("filtered_data.csv"),
		});

		if (!uri) {
			return { success: true }; // User cancelled - not an error
		}

		const csv = toCSV(message.data.headers, message.data.rows);
		await deps.writeFile(uri, Buffer.from(csv, "utf8"));
		deps.showInfoMessage("Filtered data exported.");
		return { success: true };
	} catch (e) {
		const errorMsg = "Failed to export data: " + (e instanceof Error ? e.message : String(e));
		deps.showErrorMessage(errorMsg);
		return { success: false, error: errorMsg };
	}
}

/**
 * Handle createChart message - creates a chart from preview data.
 * Fully testable with dependency injection.
 */
export async function handleCreateChart(
	message: CreateChartMessage,
	currentUri: vscode.Uri | undefined,
	chartProvider: ChartProviderLike | undefined,
	deps: MessageHandlerDependencies,
): Promise<MessageHandlerResult> {
	try {
		if (!chartProvider) {
			deps.showErrorMessage("Chart provider not available");
			return { success: false, error: "Chart provider not available" };
		}

		const uri = currentUri ?? vscode.Uri.file(message.data.fileName || "preview");
		await chartProvider.showChart(uri, message.data);
		return { success: true };
	} catch (e) {
		const errorMsg = "Failed to create chart: " + (e instanceof Error ? e.message : String(e));
		deps.showErrorMessage(errorMsg);
		return { success: false, error: errorMsg };
	}
}

/**
 * Handle reparse message - re-parses data with a different delimiter.
 * Fully testable with dependency injection.
 */
export async function handleReparse(
	message: ReparseMessage,
	currentUri: vscode.Uri | undefined,
	postMessage: (msg: unknown) => Thenable<boolean>,
	deps: MessageHandlerDependencies,
): Promise<MessageHandlerResult> {
	try {
		if (!currentUri) {
			deps.showErrorMessage("Cannot reparse without a backing file URI.");
			return { success: false, error: "Cannot reparse without a backing file URI." };
		}

		const delim = message.delimiter === "auto" ? undefined : message.delimiter;
		const data = await deps.parseDataFile(currentUri, { delimiter: delim });

		if (data) {
			await postMessage({ type: "showData", data });
		}
		return { success: true };
	} catch (e) {
		const errorMsg = "Failed to reparse: " + (e instanceof Error ? e.message : String(e));
		deps.showErrorMessage(errorMsg);
		return { success: false, error: errorMsg };
	}
}

// --- CSV Helper (exported for testing) ---

/**
 * Convert headers and rows to CSV string.
 * Properly escapes values containing commas, quotes, or newlines.
 */
export function toCSV(headers: string[], rows: (string | number)[][]): string {
	const esc = (v: unknown) => {
		if (v === null || v === undefined) {
			return "";
		}
		const s = String(v);
		if (/[",\n]/.test(s)) {
			return '"' + s.replace(/"/g, '""') + '"';
		}
		return s;
	};
	return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

// --- DataPreviewProvider Class ---

export interface ChartProviderLike {
	showChart(uri: vscode.Uri, data: ParsedData): Promise<void>;
}

export class DataPreviewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "vsplot.dataPreview";
	private _view?: vscode.WebviewView;
	private _chartProvider?: ChartProviderLike;
	private _currentUri?: vscode.Uri;
	private _deps: MessageHandlerDependencies;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		chartProvider?: ChartProviderLike,
		deps?: MessageHandlerDependencies,
	) {
		this._chartProvider = chartProvider;
		this._deps = deps ?? createDefaultMessageHandlerDeps();
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
		this._wireMessageHandlers(webviewView.webview);
	}

	public async showPreview(uri: vscode.Uri, data: ParsedData) {
		this._currentUri = uri;
		if (this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({
				type: "showData",
				data: data,
			});
		} else {
			// Create a new webview panel for preview
			const panel = vscode.window.createWebviewPanel(
				"dataPreview",
				`Data Preview: ${data.fileName}`,
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					localResourceRoots: [this._extensionUri],
				},
			);

			panel.webview.html = this._getHtmlForWebview(panel.webview);

			// Send data to webview
			panel.webview.postMessage({
				type: "showData",
				data: data,
			});
			this._wireMessageHandlers(panel.webview);
		}
	}

	private _wireMessageHandlers(webview: vscode.Webview) {
		webview.onDidReceiveMessage(async (message) => {
			if (!message || typeof message !== "object") {
				return;
			}

			if (message.type === "exportData") {
				await handleExportData(message as ExportDataMessage, this._deps);
				return;
			}

			if (message.type === "createChart") {
				await handleCreateChart(
					message as CreateChartMessage,
					this._currentUri,
					this._chartProvider,
					this._deps,
				);
				return;
			}

			if (message.type === "reparse" && message.delimiter !== undefined) {
				await handleReparse(
					message as ReparseMessage,
					this._currentUri,
					(msg) => webview.postMessage(msg),
					this._deps,
				);
				return;
			}
		});
	}

	/**
	 * Generate HTML for the webview
	 */
	private _getHtmlForWebview(webview: vscode.Webview) {
		const cfg = vscode.workspace.getConfiguration("vsplot");
		const rowsPerPage = cfg.get<number>("rowsPerPage", 150);

		// Build URIs for external resources
		const stylesUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "media", "dataPreview", "styles.css"),
		);
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "media", "dataPreview", "main.js"),
		);

		const nonce = getNonce();

		// Build HTML with external resources
		const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource};`;

		// Load HTML template and replace placeholders
		return loadHtmlTemplate(this._extensionUri, "media/dataPreview/index.html", {
			CSP: csp,
			NONCE: nonce,
			STYLES_URI: stylesUri.toString(),
			SCRIPT_URI: scriptUri.toString(),
			ROWS_PER_PAGE: String(rowsPerPage),
		});
	}
}
