/**
 * Data Preview Webview Script
 * 
 * This script handles all the UI logic for the data preview panel in VSPlot.
 * It manages data display, pagination, search, sorting, row selection, statistics,
 * and communication with the extension host.
 * 
 * @module dataPreview/main
 */

// VSCode API for webview communication
const vscode = acquireVsCodeApi();

// State variables
let currentData = null;           // Original dataset from extension
let compactCards = false;          // Compact mode for stats panel
let previewIcons = true;           // Show icons in stats
let filteredData = null;           // Currently filtered/searched dataset
let selectedRows = new Set();      // Set of selected row indices
let currentPage = 1;               // Current page number for pagination
let rowsPerPage = 150;             // Number of rows per page

/**
 * Initialize configuration from data attributes on body element
 */
function initializeConfig() {
    const body = document.body;
    rowsPerPage = parseInt(body.getAttribute('data-rows-per-page') || '150');
    compactCards = body.getAttribute('data-compact-cards') === 'true';
    previewIcons = body.getAttribute('data-show-icons') === 'true';
}

/**
 * Message handler for extension → webview communication
 * @listens window:message
 */
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

/**
 * Display data in the table with pagination
 * Updates table headers, body, pagination controls, and statistics
 */
function displayData() {
    if (!currentData) return;

    document.getElementById('title').textContent = `Data Preview: ${currentData.fileName}`;
    document.getElementById('fileInfo').textContent =
        `File type: ${currentData.fileType.toUpperCase()} | Total rows: ${currentData.totalRows} | Columns: ${currentData.headers.length}`;

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
        filteredData.headers.map((header, idx) => `<th data-col="${idx}" class="sortable">${header} <span class="sort">⇅</span></th>`).join('') + '</tr>';

    // Create table body with pagination
    const tbody = document.getElementById('tableBody');
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredData.rows.length);

    tbody.innerHTML = '';
    for (let i = startIndex; i < endIndex; i++) {
        const row = filteredData.rows[i];
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="checkbox" data-row="${i}" /></td>` +
            row.map(cell => `<td>${cell ?? ''}</td>`).join('');

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
            rows.forEach(r => {
                if (checked) {
                    r.classList.add('row-selected');
                } else {
                    r.classList.remove('row-selected');
                }
            });
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
        pagination.innerHTML = `<span>Showing ${filteredData.rows.length} rows</span>`;
        return;
    }
    pagination.innerHTML = `
        <span>Page ${currentPage} of ${totalPages} | Showing ${Math.min(rowsPerPage, filteredData.rows.length)} of ${filteredData.rows.length} rows</span>
        <div>
            <button onclick="previousPage()" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            <button onclick="nextPage()" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
    `;
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
    out.innerHTML = `
        <div class="stat"><span class="badge">col</span><div><strong>Column:</strong> ${filteredData.headers[col]}</div></div>
        <div class="stat"><span class="badge">n</span><div><strong>Data points:</strong> ${count}</div></div>
        <div class="stat"><span class="badge">min</span><div><strong>Min:</strong> ${min.toFixed(2)}</div></div>
        <div class="stat"><span class="badge">max</span><div><strong>Max:</strong> ${max.toFixed(2)}</div></div>
        <div class="stat"><span class="badge">avg</span><div><strong>Average:</strong> ${avg.toFixed(2)}</div></div>
        <div class="stat"><span class="badge">med</span><div><strong>Median:</strong> ${median.toFixed(2)}</div></div>
        <div class="stat"><span class="badge">sd</span><div><strong>Std Dev:</strong> ${stddev.toFixed(2)}</div></div>
    `;
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

// Initialize configuration on load
initializeConfig();
