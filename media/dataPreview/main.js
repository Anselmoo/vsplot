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
    
    // Build pagination HTML without inline handlers (CSP compliant)
    const showPrevious = currentPage > 1;
    const showNext = currentPage < totalPages;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredData.rows.length);
    const rowsOnPage = Math.max(0, endIndex - startIndex);
    
    pagination.innerHTML = `
        <span>Page ${currentPage} of ${totalPages} | Showing ${rowsOnPage} of ${filteredData.rows.length} rows</span>
        <div>
            ${showPrevious ? '<button id="prevPageBtn">Previous</button>' : ''}
            ${showNext ? '<button id="nextPageBtn">Next</button>' : ''}
        </div>
    `;
    
    // Attach event listeners after buttons are created
    if (showPrevious) {
        const prevBtn = document.getElementById('prevPageBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', previousPage);
        }
    }
    if (showNext) {
        const nextBtn = document.getElementById('nextPageBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', nextPage);
        }
    }
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
    // Always apply compact class
    panelEl.classList.add('compact');
}

function updateStats() {
    const panel = document.getElementById('previewStatsPanel');
    const out = document.getElementById('previewStats');
    if (!filteredData || !filteredData.rows || filteredData.rows.length === 0) {
        panel.style.display = 'none';
        return;
    }
    panel.style.display = 'block';
    
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
    
    // Use inline SVG icons for each stat
    // SVG icons use currentColor for automatic theme adaptation
    out.innerHTML = `
        <div class="stat">
            <span class="badge">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="Column indicator">
                    <path d="M2 2h2v12H2V2zm4 0h2v12H6V2zm4 0h2v12h-2V2z"/>
                </svg>
            </span>
            <div><strong>Column:</strong> ${filteredData.headers[col]}</div>
        </div>
        <div class="stat">
            <span class="badge">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="Data points">
                    <path d="M14 2H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm0 11H2V3h12v10zM4 5h8v2H4V5zm0 3h6v2H4V8z"/>
                </svg>
            </span>
            <div><strong>Data points:</strong> ${count}</div>
        </div>
        <div class="stat">
            <span class="badge">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="Minimum value">
                    <path d="M8 2l-6 12h12L8 2zm0 3l3.5 7h-7L8 5z"/>
                </svg>
            </span>
            <div><strong>Min:</strong> ${min.toFixed(2)}</div>
        </div>
        <div class="stat">
            <span class="badge">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="Maximum value">
                    <path d="M8 14l6-12H2l6 12zm0-3L4.5 4h7L8 11z"/>
                </svg>
            </span>
            <div><strong>Max:</strong> ${max.toFixed(2)}</div>
        </div>
        <div class="stat">
            <span class="badge">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="Average value">
                    <path d="M1 8h14M1 4l7 4 7-4M1 12l7-4 7 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
            </span>
            <div><strong>Average:</strong> ${avg.toFixed(2)}</div>
        </div>
        <div class="stat">
            <span class="badge">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="Median value">
                    <path d="M8 1v14M1 8h14" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
            </span>
            <div><strong>Median:</strong> ${median.toFixed(2)}</div>
        </div>
        <div class="stat">
            <span class="badge">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="Standard deviation">
                    <path d="M8 2L2 8l6 6 6-6-6-6zm0 2.8L11.2 8 8 11.2 4.8 8 8 4.8z"/>
                </svg>
            </span>
            <div><strong>Std Dev:</strong> ${stddev.toFixed(2)}</div>
        </div>
    `;
}

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
