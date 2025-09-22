import * as vscode from 'vscode';
import type { ParsedData } from '../data/load.js';
import { parseDataFile } from '../data/load.js';

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

    private _getHtmlForWebview(_webview: vscode.Webview) {
        const cfg = vscode.workspace.getConfiguration('vsplot');
        const rowsPerPage = cfg.get<number>('rowsPerPage', 150);
        const compactCards = cfg.get<boolean>('compactStatsCards', false);
        const showIconsDefault = cfg.get<boolean>('showStatsIcons', true);

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Data Preview</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 16px;
                    margin: 0;
                }

                .header {
                    margin-bottom: 16px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--vscode-widget-border);
                }

                .file-info {
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 8px;
                }

                .controls {
                    margin-bottom: 16px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9em;
                    box-shadow: 0 1px 0 rgba(0,0,0,0.1);
                    transition: background 0.15s ease, box-shadow 0.15s ease;
                }

                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                input[type="text"], select {
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 0.9em;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }

                .table-container {
                    overflow: auto;
                    max-height: 600px;
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 2px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.85em;
                }

                th, td {
                    padding: 6px 8px;
                    text-align: left;
                    border-bottom: 1px solid var(--vscode-widget-border);
                    border-right: 1px solid var(--vscode-widget-border);
                }

                th {
                    background: var(--vscode-editor-selectionBackground);
                    font-weight: 600;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }

                tr:hover {
                    background: var(--vscode-list-hoverBackground);
                }

                .row-selected {
                    background: var(--vscode-list-activeSelectionBackground) !important;
                    color: var(--vscode-list-activeSelectionForeground);
                }

                .pagination {
                    margin-top: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                }

                .no-data {
                    text-align: center;
                    padding: 32px;
                    color: var(--vscode-descriptionForeground);
                }

                .stats-panel {
                    margin-top: 16px;
                    padding: 14px 16px;
                    background: var(--vscode-editorWidget-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 8px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.12);
                    font-size: 0.9em;
                    color: var(--vscode-foreground);
                    display: none;
                }

                .stats-panel .section-title {
                    font-weight: 600;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .stats-controls {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 6px;
                    padding: 6px 8px;
                    margin-bottom: 12px;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                    gap: 8px 16px;
                    font-variant-numeric: tabular-nums;
                }
                .stat { display:flex; align-items:center; gap:8px; }
                .badge { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:4px; background: var(--vscode-input-background); color: var(--vscode-descriptionForeground); font-size: 12px; }
                .no-icons .badge { display:none; }
                .stats-panel.compact { padding: 10px 12px; border-radius: 6px; }
                .stats-panel.compact .stats-controls { padding: 4px 6px; }
                .stats-panel.compact .stats-grid { gap: 6px 12px; }
                .stats-panel.compact .badge { width:16px; height:16px; font-size:11px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2 id="title">Data Preview</h2>
                <div class="file-info" id="fileInfo"></div>
            </div>

            <div class="controls">
                <input type="text" id="searchInput" placeholder="Search data..." />
                <button id="exportBtn">Export Filtered Data</button>
                <button id="chartBtn">Create Chart</button>
                <label for="delimiterSelect">Delimiter:</label>
                <select id="delimiterSelect">
                    <option value="auto">Auto</option>
                    <option value=",">Comma ,</option>
                    <option value="|">Pipe |</option>
                    <option value=";">Semicolon ;</option>
                    <option value=":">Colon :</option>
                    <option value="\t">Tab \t</option>
                    <option value=" ">Space ␠</option>
                </select>
            </div>

            <div class="table-container">
                <div class="no-data" id="noData">No data to display</div>
                <table id="dataTable" style="display: none;">
                    <thead id="tableHead"></thead>
                    <tbody id="tableBody"></tbody>
                </table>
            </div>

            <div class="pagination" id="pagination"></div>

            <div class="stats-panel ${compactCards ? 'compact' : ''}" id="previewStatsPanel">
                <div class="section-title">Statistics</div>
                <div class="stats-controls">
                    <label for="statsColumn">Column</label>
                    <select id="statsColumn"></select>
                    <label style="display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" id="statsSelectedOnly" />
                        <span>Use selected rows only</span>
                    </label>
                        <span style="flex:1"></span>
                    <label style="display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" id="iconsToggle" ${showIconsDefault ? 'checked' : ''} />
                        <span>Icons</span>
                    </label>
                    <span style="width:8px"></span>
                        <label style="display:flex;align-items:center;gap:6px;">
                            <input type="checkbox" id="compactCardsToggle" ${compactCards ? 'checked' : ''} />
                            <span>Compact</span>
                        </label>
                </div>
                <div id="previewStats" class="stats-grid"></div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let currentData = null;
                let compactCards = ${compactCards};
                let previewIcons = ${showIconsDefault};
                let filteredData = null;
                let selectedRows = new Set();
                let currentPage = 1;
                const rowsPerPage = ${rowsPerPage};

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'showData':
                            currentData = message.data;
                            filteredData = message.data;
                            // Set delimiter selector based on detected or auto
                            setTimeout(() => {
                                const detected = currentData.detectedDelimiter;
                                const sel = document.getElementById('delimiterSelect');
                                if (detected && sel) {
                                    sel.value = detected;
                                } else if (sel) {
                                    sel.value = 'auto';
                                }
                            }, 0);
                            initializeStatsControls();
                            // apply compact from restored state or default
                            try {
                                const panel = document.getElementById('previewStatsPanel');
                                panel.classList.toggle('compact', !!compactCards);
                                panel.classList.toggle('no-icons', !previewIcons);
                            } catch {}
                            displayData();
                            break;
                    }
                });

                function displayData() {
                    if (!currentData) return;

                    document.getElementById('title').textContent = \`Data Preview: \${currentData.fileName}\`;
                    document.getElementById('fileInfo').textContent =
                        \`File type: \${currentData.fileType.toUpperCase()} | Total rows: \${currentData.totalRows} | Columns: \${currentData.headers.length}\`;

                    const table = document.getElementById('dataTable');
                    const noData = document.getElementById('noData');

                    if (filteredData.rows.length === 0) {
                        table.style.display = 'none';
                        noData.style.display = 'block';
                        return;
                    }

                    table.style.display = 'table';
                    noData.style.display = 'none';

                    // Create table header
                    const thead = document.getElementById('tableHead');
                    thead.innerHTML = '<tr><th><input type="checkbox" id="selectAll"></th>' +
                        filteredData.headers.map((header, idx) => \`<th data-col="\${idx}" class="sortable">\${header} <span class="sort">⇅</span></th>\`).join('') + '</tr>';

                    // Create table body with pagination
                    const tbody = document.getElementById('tableBody');
                    const startIndex = (currentPage - 1) * rowsPerPage;
                    const endIndex = Math.min(startIndex + rowsPerPage, filteredData.rows.length);

                    tbody.innerHTML = '';
                    for (let i = startIndex; i < endIndex; i++) {
                        const row = filteredData.rows[i];
                        const tr = document.createElement('tr');
                        tr.innerHTML = \`<td><input type="checkbox" data-row="\${i}" /></td>\` +
                            row.map(cell => \`<td>\${cell ?? ''}</td>\`).join('');

                        // Add row click handler
                        tr.addEventListener('click', (e) => {
                            if (e.target.type !== 'checkbox') {
                                toggleRowSelection(tr, i);
                            }
                        });

                        tbody.appendChild(tr);
                    }

                    bindHeaderEvents();
                    updatePagination();
                    updateStats();
                }

                function bindHeaderEvents() {
                    const selectAll = document.getElementById('selectAll');
                    if (selectAll) {
                        selectAll.addEventListener('change', (e) => {
                            const checked = e.target.checked;
                            selectedRows = new Set();
                            const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
                            checkboxes.forEach((cb, idx) => {
                                cb.checked = checked;
                                const globalIndex = (currentPage - 1) * rowsPerPage + idx;
                                if (checked) selectedRows.add(globalIndex);
                            });
                            const rows = document.querySelectorAll('tbody tr');
                            rows.forEach(r => checked ? r.classList.add('row-selected') : r.classList.remove('row-selected'));
                        });
                    }
                    const headers = document.querySelectorAll('th.sortable');
                    headers.forEach(h => {
                        h.addEventListener('click', () => {
                            const col = parseInt(h.getAttribute('data-col'));
                            sortByColumn(col);
                        });
                    });
                }

                let sortState = { col: -1, dir: 1 };
                function sortByColumn(col) {
                    if (sortState.col === col) {
                        sortState.dir = -sortState.dir;
                    } else {
                        sortState = { col, dir: 1 };
                    }
                    filteredData = { ...filteredData, rows: [...filteredData.rows].sort((a,b) => {
                        const av = a[col];
                        const bv = b[col];
                        if (av == null && bv == null) return 0;
                        if (av == null) return -1 * sortState.dir;
                        if (bv == null) return 1 * sortState.dir;
                        if (!isNaN(av) && !isNaN(bv)) return (av - bv) * sortState.dir;
                        return String(av).localeCompare(String(bv)) * sortState.dir;
                    }) };
                    currentPage = 1;
                    displayData();
                }

                function toggleRowSelection(tr, rowIndex) {
                    const checkbox = tr.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;

                    if (checkbox.checked) {
                        selectedRows.add(rowIndex);
                        tr.classList.add('row-selected');
                    } else {
                        selectedRows.delete(rowIndex);
                        tr.classList.remove('row-selected');
                    }
                }

                function updatePagination() {
                    const pagination = document.getElementById('pagination');
                    const totalPages = Math.ceil(filteredData.rows.length / rowsPerPage) || 1;
                    if (totalPages <= 1) {
                        pagination.innerHTML = \`<span>Showing \${filteredData.rows.length} rows</span>\`;
                        return;
                    }
                    pagination.innerHTML = \`
                        <span>Page \${currentPage} of \${totalPages} | Showing \${Math.min(rowsPerPage, filteredData.rows.length)} of \${filteredData.rows.length} rows</span>
                        <div>
                            <button onclick="previousPage()" \${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                            <button onclick="nextPage()" \${currentPage === totalPages ? 'disabled' : ''}>Next</button>
                        </div>
                    \`;
                }

                function previousPage() {
                    if (currentPage > 1) {
                        currentPage--;
                        displayData();
                    }
                }

                function nextPage() {
                    const totalPages = Math.ceil(filteredData.rows.length / rowsPerPage);
                    if (currentPage < totalPages) {
                        currentPage++;
                        displayData();
                    }
                }

                // Search functionality
                document.getElementById('searchInput').addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    if (!searchTerm) {
                        filteredData = currentData;
                    } else {
                        filteredData = {
                            ...currentData,
                            rows: currentData.rows.filter(row =>
                                row.some(cell =>
                                    cell && cell.toString().toLowerCase().includes(searchTerm)
                                )
                            )
                        };
                    }
                    currentPage = 1;
                    selectedRows.clear();
                    displayData();
                });

                // Export functionality
                document.getElementById('exportBtn').addEventListener('click', () => {
                    vscode.postMessage({
                        type: 'exportData',
                        data: filteredData,
                        selectedRows: Array.from(selectedRows)
                    });
                });

                // Chart functionality
                document.getElementById('chartBtn').addEventListener('click', () => {
                    vscode.postMessage({
                        type: 'createChart',
                        data: filteredData,
                        selectedRows: Array.from(selectedRows)
                    });
                });

                // Delimiter override
                document.getElementById('delimiterSelect').addEventListener('change', (e) => {
                    const val = e.target.value;
                    vscode.postMessage({ type: 'reparse', delimiter: val });
                });

                // Stats controls events
                document.getElementById('statsColumn').addEventListener('change', updateStats);
                document.getElementById('statsSelectedOnly').addEventListener('change', updateStats);

                function initializeStatsControls() {
                    const sel = document.getElementById('statsColumn');
                    sel.innerHTML = '';
                    if (!currentData || !currentData.headers) return;
                    currentData.headers.forEach((h, idx) => {
                        const opt = document.createElement('option');
                        opt.value = String(idx);
                        opt.textContent = h;
                        sel.appendChild(opt);
                    });
                    // default to first numeric column if available
                    const nums = getNumericColumnIndexes(currentData.rows);
                    if (nums.length > 0) {
                        sel.value = String(nums[0]);
                    } else {
                        sel.value = '0';
                    }
                    const panelEl = document.getElementById('previewStatsPanel');
                    panelEl.style.display = 'block';
                        // Restore per-file compact choice
                        try {
                            const state = vscode.getState && vscode.getState();
                            const byFile = state && state.byFile ? state.byFile : undefined;
                            const saved = byFile ? byFile[currentData.fileName] : undefined;
                            if (saved && typeof saved.previewCompact === 'boolean') {
                                compactCards = !!saved.previewCompact;
                                document.getElementById('compactCardsToggle').checked = compactCards;
                                panelEl.classList.toggle('compact', compactCards);
                            } else {
                                document.getElementById('compactCardsToggle').checked = compactCards;
                                panelEl.classList.toggle('compact', compactCards);
                            }
                            if (saved && typeof saved.previewIcons === 'boolean') {
                                previewIcons = !!saved.previewIcons;
                                document.getElementById('iconsToggle').checked = previewIcons;
                                panelEl.classList.toggle('no-icons', !previewIcons);
                            } else {
                                document.getElementById('iconsToggle').checked = previewIcons;
                                panelEl.classList.toggle('no-icons', !previewIcons);
                            }
                        } catch {}
                }

                function updateStats() {
                    const panel = document.getElementById('previewStatsPanel');
                    const out = document.getElementById('previewStats');
                    if (!filteredData || !filteredData.rows || filteredData.rows.length === 0) {
                        panel.style.display = 'none';
                        return;
                    }
                    panel.style.display = 'block';
                    // ensure style reflects current toggle
                    try { panel.classList.toggle('compact', !!document.getElementById('compactCardsToggle').checked); } catch {}
                    try { panel.classList.toggle('no-icons', !document.getElementById('iconsToggle').checked); } catch {}
                    const col = parseInt(document.getElementById('statsColumn').value);
                    const selectedOnly = document.getElementById('statsSelectedOnly').checked;
                    const rows = selectedOnly && selectedRows.size > 0
                        ? Array.from(selectedRows).map(i => filteredData.rows[i]).filter(Boolean)
                        : filteredData.rows;
                    const values = rows.map(r => parseFloat(r[col])).filter(v => !Number.isNaN(v));
                    if (values.length === 0) {
                        out.textContent = 'No numeric data in selected column.';
                        return;
                    }
                    const count = values.length;
                    let min = values[0], max = values[0], sum = 0;
                    for (let i = 0; i < values.length; i++) {
                        const v = values[i];
                        if (v < min) min = v;
                        if (v > max) max = v;
                        sum += v;
                    }
                    const avg = sum / count;
                    const sorted = values.slice().sort((a,b)=>a-b);
                    const mid = Math.floor(sorted.length / 2);
                    const median = (sorted.length % 2) ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
                    let varSum = 0;
                    for (let i = 0; i < values.length; i++) {
                        const diff = values[i] - avg;
                        varSum += diff * diff;
                    }
                    const variance = varSum / (values.length > 1 ? (values.length - 1) : 1);
                    const stddev = Math.sqrt(variance);
                    out.innerHTML = \`
                        <div class="stat"><span class="badge">col</span><div><strong>Column:</strong> \${filteredData.headers[col]}</div></div>
                        <div class="stat"><span class="badge">n</span><div><strong>Data points:</strong> \${count}</div></div>
                        <div class="stat"><span class="badge">min</span><div><strong>Min:</strong> \${min.toFixed(2)}</div></div>
                        <div class="stat"><span class="badge">max</span><div><strong>Max:</strong> \${max.toFixed(2)}</div></div>
                        <div class="stat"><span class="badge">avg</span><div><strong>Average:</strong> \${avg.toFixed(2)}</div></div>
                        <div class="stat"><span class="badge">med</span><div><strong>Median:</strong> \${median.toFixed(2)}</div></div>
                        <div class="stat"><span class="badge">sd</span><div><strong>Std Dev:</strong> \${stddev.toFixed(2)}</div></div>
                    \`;
                }

                // Handle Compact toggle changes and persist per file
                document.addEventListener('change', (e) => {
                    const t = e.target;
                    if (t && t.id === 'compactCardsToggle') {
                        try {
                            const panel = document.getElementById('previewStatsPanel');
                            panel.classList.toggle('compact', !!t.checked);
                            const state = vscode.getState && vscode.getState();
                            const byFile = (state && state.byFile) ? state.byFile : {};
                            if (currentData && currentData.fileName) {
                                byFile[currentData.fileName] = Object.assign({}, byFile[currentData.fileName] || {}, { previewCompact: !!t.checked });
                                vscode.setState && vscode.setState({ byFile });
                            }
                        } catch {}
                    }
                    if (t && t.id === 'iconsToggle') {
                        try {
                            const panel = document.getElementById('previewStatsPanel');
                            panel.classList.toggle('no-icons', !t.checked);
                            const state = vscode.getState && vscode.getState();
                            const byFile = (state && state.byFile) ? state.byFile : {};
                            if (currentData && currentData.fileName) {
                                byFile[currentData.fileName] = Object.assign({}, byFile[currentData.fileName] || {}, { previewIcons: !!t.checked });
                                vscode.setState && vscode.setState({ byFile });
                            }
                        } catch {}
                    }
                });

                function getNumericColumnIndexes(rows) {
                    if (!rows || rows.length === 0) return [];
                    const cols = rows[0].length;
                    const indexes = [];
                    for (let c = 0; c < cols; c++) {
                        let numCount = 0, total = 0;
                        for (let r = 0; r < Math.min(rows.length, 50); r++) {
                            const v = rows[r][c];
                            const n = typeof v === 'number' ? v : parseFloat(v);
                            if (!Number.isNaN(n)) numCount++;
                            total++;
                        }
                        if (total > 0 && numCount / total >= 0.7) {
                            indexes.push(c);
                        }
                    }
                    return indexes;
                }
            </script>
        </body>
        </html>`;
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
