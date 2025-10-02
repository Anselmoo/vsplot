import * as vscode from "vscode";
import type { ParsedData } from "../data/load";

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
	 * This method loads external CSS and JavaScript files from media/chartView/
	 * to keep the provider code clean and maintainable.
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
		const compactCards = vsplotConfig.get<boolean>("compactStatsCards", false);
		const showIcons = vsplotConfig.get<boolean>("showStatsIcons", true);

		// Build URIs for external resources
		const stylesUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "media", "chartView", "styles.css"),
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

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chart View</title>
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <link rel="stylesheet" href="${stylesUri}">
    <script nonce="${nonce}" src="${chartJsUri}"></script>
    <script nonce="${nonce}" src="${zoomPluginUri}"></script>
    <script nonce="${nonce}" src="${dateAdapterUri}"></script>
</head>
<body data-default-chart-type="${defaultChartType}" data-default-style-preset="${defaultStylePreset}" data-default-decimals="${defaultDecimals}" data-default-use-thousands="${defaultUseThousands}" data-compact-cards="${compactCards}" data-show-icons="${showIcons}">
    <div class="header">
        <h2 id="title">Chart View</h2>
    </div>

    <div class="controls">
        <div class="control-group">
            <label for="chartType">Chart Type:</label>
            <select id="chartType">
                <option value="line" ${defaultChartType === "line" ? "selected" : ""}>Line</option>
                <option value="bar" ${defaultChartType === "bar" ? "selected" : ""}>Bar</option>
                <option value="scatter" ${defaultChartType === "scatter" ? "selected" : ""}>Scatter</option>
                <option value="pie" ${defaultChartType === "pie" ? "selected" : ""}>Pie</option>
                <option value="doughnut">Doughnut</option>
                <option value="radar">Radar</option>
            </select>
        </div>

        <div class="control-group">
            <label for="xAxis">X-Axis:</label>
            <select id="xAxis"></select>
        </div>

        <div class="control-group">
            <label for="yAxis">Y-Axis:</label>
            <select id="yAxis"></select>
        </div>

        <div class="control-group">
            <label for="yAxis2">Y2-Axis:</label>
            <select id="yAxis2"></select>
            <button id="addY2Btn" title="Add secondary Y axis">+ Add Y2</button>
        </div>

        <div class="control-group">
            <label for="legendToggle">Legend:</label>
            <input type="checkbox" id="legendToggle" checked />
        </div>

        <div class="control-group">
            <label for="colorPicker">Color:</label>
            <input type="color" id="colorPicker" value="#36a2eb" />
        </div>

        <div class="control-group">
            <label for="dragZoomToggle">Drag Zoom:</label>
            <input type="checkbox" id="dragZoomToggle" />
        </div>

        <div class="control-group" id="aggGroup" style="display:none;">
            <label for="aggFunc">Aggregate:</label>
            <select id="aggFunc">
                <option value="sum" selected>Sum</option>
                <option value="count">Count</option>
                <option value="avg">Average</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
            </select>
        </div>

        <div class="control-group">
            <label for="stylePreset">Style:</label>
            <select id="stylePreset">
                <option value="clean" ${defaultStylePreset === "clean" ? "selected" : ""}>Clean</option>
                <option value="soft" ${defaultStylePreset === "soft" ? "selected" : ""}>Soft</option>
                <option value="vibrant" ${defaultStylePreset === "vibrant" ? "selected" : ""}>Vibrant</option>
            </select>
        </div>

        <div class="control-group" id="formatGroup">
            <label for="decimals">Decimals:</label>
            <select id="decimals">
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2" ${defaultDecimals === 2 ? "selected" : ""}>2</option>
            </select>
            <label style="display:flex;align-items:center;gap:4px;">
                <input type="checkbox" id="thousands" ${defaultUseThousands ? "checked" : ""} /> 1,000s
            </label>
        </div>

        <div class="control-group">
            <label for="compactCardsToggle">Cards:</label>
            <input type="checkbox" id="compactCardsToggle" ${compactCards ? "checked" : ""} />
            <span>Compact</span>
            <span style="width:12px"></span>
            <label for="iconsToggle">Icons:</label>
            <input type="checkbox" id="iconsToggle" ${showIcons ? "checked" : ""} />
        </div>

        <button id="updateChart">Update Chart</button>
        <button id="exportChart">Export Chart</button>
    </div>

    <div id="errorMessage" class="error-message" style="display: none;"></div>

    <div class="chart-container">
        <div class="zoom-controls">
            <button id="zoomIn" title="Zoom In">+</button>
            <button id="zoomOut" title="Zoom Out">-</button>
            <button id="resetZoom" title="Reset Zoom">⌂</button>
        </div>
        <div class="no-data" id="noData">No data to display</div>
        <canvas id="chart" style="display: none;"></canvas>
    </div>

    <div class="chart-stats ${compactCards ? "compact" : ""}" id="chartStats" style="display: none;"></div>
    <div class="chart-stats ${compactCards ? "compact" : ""}" id="chartMeta" style="display: none;"></div>

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}
}

export interface ChartTestState {
	chartType: string;
	x: number;
	y: number;
	y2: number;
	legend: boolean;
	dragZoom: boolean;
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
	color: string;
	agg: string;
	stylePreset: string;
	decimals: number;
	thousands: boolean;
}>;

function getNonce() {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
