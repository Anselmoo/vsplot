import * as vscode from "vscode";
import type { ParsedData } from "../data/load";
import { getNonce, loadHtmlTemplate } from "./webviewUtils";

export class ChartViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "vsplot.chartView";
	private _view?: vscode.WebviewView;
	private _currentWebview?: vscode.Webview;
	private _pendingTestResolvers: Map<
		string,
		(payload: ChartTestState) => void
	> = new Map();
	private _pendingConfigAcks: Map<string, () => void> = new Map();

	constructor(private readonly _extensionUri: vscode.Uri) {}

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
		this._currentWebview = webviewView.webview;
	}

	public async showChart(_uri: vscode.Uri, data: ParsedData) {
		if (this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({
				type: "showChart",
				data: data,
			});
		} else {
			// Create a new webview panel for chart
			const panel = vscode.window.createWebviewPanel(
				"chartView",
				`Chart: ${data.fileName}`,
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					localResourceRoots: [this._extensionUri],
				},
			);

			panel.webview.html = this._getHtmlForWebview(panel.webview);

			// Send data to webview
			panel.webview.postMessage({
				type: "showChart",
				data: data,
			});

			this._wireMessageHandlers(panel.webview);
			this._currentWebview = panel.webview;
		}
	}

	private _wireMessageHandlers(webview: vscode.Webview) {
		webview.onDidReceiveMessage(async (message) => {
			if (!message || typeof message !== "object") {
				return;
			}
			if (message.type === "exportChart" && typeof message.data === "string") {
				try {
					const uri = await vscode.window.showSaveDialog({
						saveLabel: "Save Chart Image",
						filters: { "PNG Image": ["png"] },
						defaultUri: vscode.Uri.file(
							message.filename ?? `chart_${Date.now()}.png`,
						),
					});
					if (!uri) {
						return;
					}
					const base64 = message.data.split(",")[1] ?? message.data;
					const buffer = Buffer.from(base64, "base64");
					await vscode.workspace.fs.writeFile(uri, buffer);
					vscode.window.showInformationMessage("Chart image saved.");
				} catch (err: unknown) {
					const m = err instanceof Error ? err.message : String(err);
					vscode.window.showErrorMessage(`Failed to save chart image: ${m}`);
				}
				return;
			}
			if (message.type === "vsplot:test:state" && message.id) {
				const resolve = this._pendingTestResolvers.get(message.id);
				if (resolve) {
					resolve(message.payload);
					this._pendingTestResolvers.delete(message.id);
				}
				return;
			}
			if (message.type === "vsplot:test:config-applied" && message.id) {
				const resolve = this._pendingConfigAcks.get(message.id);
				if (resolve) {
					resolve();
					this._pendingConfigAcks.delete(message.id);
				}
				return;
			}
		});
	}

	public async requestChartState(): Promise<ChartTestState> {
		if (!this._currentWebview) {
			throw new Error("Chart webview not available");
		}
		const id = String(Date.now()) + Math.random().toString(36).slice(2);
		const payload = await new Promise<ChartTestState>((resolve, reject) => {
			const timer = setTimeout(() => {
				this._pendingTestResolvers.delete(id);
				reject(new Error("Timed out waiting for chart state"));
			}, 5000);
			this._pendingTestResolvers.set(id, (p) => {
				clearTimeout(timer);
				resolve(p);
			});
			this._currentWebview?.postMessage({ type: "vsplot:test:getState", id });
		});
		return payload;
	}

	public async applyChartConfig(config: ChartTestConfig): Promise<void> {
		if (!this._currentWebview) {
			throw new Error("Chart webview not available");
		}
		const id = String(Date.now()) + Math.random().toString(36).slice(2);
		const ack = new Promise<void>((resolve) => {
			const timer = setTimeout(() => {
				this._pendingConfigAcks.delete(id);
				resolve(); // do not fail hard, continue even without ack
			}, 1000);
			this._pendingConfigAcks.set(id, () => {
				clearTimeout(timer);
				resolve();
			});
		});
		this._currentWebview.postMessage({
			type: "vsplot:test:setConfig",
			id,
			payload: config,
		});
		await ack;
	}

	/**
	 * Generate HTML for the webview
	 *
	 * This method loads an external HTML template from media/chartView/index.html
	 * and replaces placeholders with actual values to keep the provider code
	 * clean and maintainable.
	 *
	 * @param webview - The webview to generate HTML for
	 * @returns HTML string with references to external resources
	 */
	private _getHtmlForWebview(webview: vscode.Webview) {
		const vsplotConfig = vscode.workspace.getConfiguration("vsplot");
		const defaultChartType = vsplotConfig.get<string>(
			"defaultChartType",
			"line",
		);
		const defaultStylePreset = vsplotConfig.get<string>(
			"defaultStylePreset",
			"clean",
		);
		const defaultDecimals = vsplotConfig.get<number>("defaultDecimals", 2);
		const defaultUseThousands = vsplotConfig.get<boolean>(
			"useThousands",
			false,
		);

		// Build URIs for external resources
		const stylesUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._extensionUri,
				"media",
				"chartView",
				"styles.css",
			),
		);
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "media", "chartView", "main.js"),
		);

		// Build URIs for local scripts (Chart.js and plugins)
		const chartJsUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "media", "chart.umd.js"),
		);
		const zoomPluginUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._extensionUri,
				"media",
				"chartjs-plugin-zoom.umd.js",
			),
		);
		const dateAdapterUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._extensionUri,
				"media",
				"chartjs-adapter-date-fns.bundle.js",
			),
		);

		const nonce = getNonce();

		// Build CSP with nonce-based script loading
		const csp = `default-src 'none'; img-src ${webview.cspSource} data: blob:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource}; font-src ${webview.cspSource}; connect-src ${webview.cspSource} data:;`;

		// Load HTML template and replace placeholders
		return loadHtmlTemplate(this._extensionUri, "media/chartView/index.html", {
			CSP: csp,
			NONCE: nonce,
			STYLES_URI: stylesUri.toString(),
			SCRIPT_URI: scriptUri.toString(),
			CHARTJS_URI: chartJsUri.toString(),
			ZOOM_PLUGIN_URI: zoomPluginUri.toString(),
			DATE_ADAPTER_URI: dateAdapterUri.toString(),
			DEFAULT_CHART_TYPE: defaultChartType,
			DEFAULT_STYLE_PRESET: defaultStylePreset,
			DEFAULT_DECIMALS: String(defaultDecimals),
			DEFAULT_USE_THOUSANDS: String(defaultUseThousands),
		});
	}
}

export interface ChartTestState {
	chartType: string;
	x: number;
	y: number;
	y2: number;
	legend: boolean;
	dragZoom: boolean;
	curveSmoothing: boolean;
	color: string;
	agg: string;
	stylePreset: string;
	decimals: number;
	thousands: boolean;
	labelsCount: number;
	datasetLens: number[];
	error?: string;
}

export type ChartTestConfig = Partial<{
	chartType: string;
	x: number;
	y: number;
	y2: number;
	legend: boolean;
	dragZoom: boolean;
	curveSmoothing: boolean;
	color: string;
	agg: string;
	stylePreset: string;
	decimals: number;
	thousands: boolean;
}>;
