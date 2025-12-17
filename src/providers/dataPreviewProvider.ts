import * as vscode from 'vscode';
import type { ParsedData } from '../data/load.js';
import { parseDataFile } from '../data/load.js';
import { loadHtmlTemplate, getNonce } from './webviewUtils';

export class DataPreviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'vsplot.dataPreview';
    private _view?: vscode.WebviewView;
    private _chartProvider?: { showChart: (uri: vscode.Uri, data: ParsedData) => Promise<void> };
    private _currentUri?: vscode.Uri;

    constructor(private readonly _extensionUri: vscode.Uri, chartProvider?: { showChart: (uri: vscode.Uri, data: ParsedData) => Promise<void> }) {
        this._chartProvider = chartProvider;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        this._wireMessageHandlers(webviewView.webview);
    }

    public async showPreview(uri: vscode.Uri, data: ParsedData) {
        this._currentUri = uri;
        if (this._view) {
            this._view.show?.(true);
            this._view.webview.postMessage({
                type: 'showData',
                data: data
            });
        } else {
            // Create a new webview panel for preview
            const panel = vscode.window.createWebviewPanel(
                'dataPreview',
                `Data Preview: ${data.fileName}`,
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [this._extensionUri]
                }
            );

            panel.webview.html = this._getHtmlForWebview(panel.webview);

            // Send data to webview
            panel.webview.postMessage({
                type: 'showData',
                data: data
            });
            this._wireMessageHandlers(panel.webview);
        }
    }

    private _wireMessageHandlers(webview: vscode.Webview) {
        webview.onDidReceiveMessage(async (message) => {
            if (!message || typeof message !== 'object') {
                return;
            }
            if (message.type === 'exportData') {
                try {
                    const uri = await vscode.window.showSaveDialog({
                        saveLabel: 'Export Filtered Data',
                        filters: { 'CSV': ['csv'] },
                        defaultUri: vscode.Uri.file('filtered_data.csv')
                    });
                    if (!uri) {
                        return;
                    }
                    const { data } = message;
                    const csv = toCSV(data.headers, data.rows);
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, 'utf8'));
                    vscode.window.showInformationMessage('Filtered data exported.');
                } catch (e) {
                    vscode.window.showErrorMessage('Failed to export data: ' + (e instanceof Error ? e.message : String(e)));
                }
                return;
            }
            if (message.type === 'createChart') {
                try {
                    const { data } = message;
                    if (this._chartProvider) {
                        await this._chartProvider.showChart(this._currentUri ?? vscode.Uri.file(data.fileName || 'preview'), data);
                    } else {
                        vscode.window.showErrorMessage('Chart provider not available');
                    }
                } catch (e) {
                    vscode.window.showErrorMessage('Failed to create chart: ' + (e instanceof Error ? e.message : String(e)));
                }
                return;
            }
            if (message.type === 'reparse' && message.delimiter !== undefined) {
                try {
                    if (!this._currentUri) {
                        vscode.window.showErrorMessage('Cannot reparse without a backing file URI.');
                        return;
                    }
                    const delim = message.delimiter === 'auto' ? undefined : message.delimiter;
                    const data = await parseDataFile(this._currentUri, { delimiter: delim });
                    if (data) {
                        webview.postMessage({ type: 'showData', data });
                    }
                } catch (e) {
                    vscode.window.showErrorMessage('Failed to reparse: ' + (e instanceof Error ? e.message : String(e)));
                }
                return;
            }
        });
    }

    /**
     * Generate HTML for the webview
     * 
     * This method loads an external HTML template from media/dataPreview/index.html
     * and replaces placeholders with actual values to keep the provider code 
     * clean and maintainable.
     * 
     * @param webview - The webview to generate HTML for
     * @returns HTML string with references to external resources
     */
    private _getHtmlForWebview(webview: vscode.Webview) {
        const cfg = vscode.workspace.getConfiguration('vsplot');
        const rowsPerPage = cfg.get<number>('rowsPerPage', 150);

        // Build URIs for external resources
        const stylesUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'dataPreview', 'styles.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'dataPreview', 'main.js')
        );

        const nonce = getNonce();

        // Build HTML with external resources
        const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource};`;
        
        // Load HTML template and replace placeholders
        return loadHtmlTemplate(this._extensionUri, 'media/dataPreview/index.html', {
            CSP: csp,
            NONCE: nonce,
            STYLES_URI: stylesUri.toString(),
            SCRIPT_URI: scriptUri.toString(),
            ROWS_PER_PAGE: String(rowsPerPage)
        });
    }
}

export interface ChartProviderLike { showChart(uri: vscode.Uri, data: ParsedData): Promise<void>; }

function toCSV(headers: string[], rows: (string|number)[][]): string {
    const esc = (v: unknown) => {
        if (v === null || v === undefined) {
            return '';
        }
        const s = String(v);
        if (/[",\n]/.test(s)) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    };
    return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
}
