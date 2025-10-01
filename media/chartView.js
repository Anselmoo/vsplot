// Chart View JavaScript
// This file contains the webview logic for VSPlot's chart visualization

(function() {
    'use strict';

    const vscode = acquireVsCodeApi();
    let currentData = null;
    let chart = null;
    let chartCanvas = null;
    let pluginAvailable = false;
    let dragOverlay = null;
    let pendingConfig = null;
    let pendingConfigId = null;
    let stylePreset = window.vsplotConfig.defaultStylePreset;
    let decimals = window.vsplotConfig.defaultDecimals;
    let useThousands = window.vsplotConfig.defaultUseThousands;
    let compactCards = window.vsplotConfig.compactCards;
    let showIcons = window.vsplotConfig.showIcons;

    // Try to register zoom plugin from various UMD globals
    try {
        const zoomPlugin = (window.chartjsPluginZoom) || (window.ChartZoom) || (window["chartjs-plugin-zoom"]) || undefined;
        if (zoomPlugin && window.Chart && typeof window.Chart.register === 'function') {
            window.Chart.register(zoomPlugin);
            pluginAvailable = true;
        }
    } catch {}

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'showChart':
                currentData = message.data;
                initializeChart();
                if (pendingConfig) {
                    try {
                        const cfg = pendingConfig;
                        if (cfg.chartType) document.getElementById('chartType').value = cfg.chartType;
                        if (typeof cfg.x === 'number') document.getElementById('xAxis').value = String(cfg.x);
                        if (typeof cfg.y === 'number') document.getElementById('yAxis').value = String(cfg.y);
                        if (typeof cfg.y2 !== 'undefined') document.getElementById('yAxis2').value = String(cfg.y2);
                        if (typeof cfg.legend === 'boolean') document.getElementById('legendToggle').checked = cfg.legend;
                        if (typeof cfg.dragZoom === 'boolean') document.getElementById('dragZoomToggle').checked = cfg.dragZoom;
                        if (cfg.color) document.getElementById('colorPicker').value = cfg.color;
                        if (cfg.agg) document.getElementById('aggFunc').value = cfg.agg;
                        if (cfg.stylePreset) { document.getElementById('stylePreset').value = cfg.stylePreset; stylePreset = cfg.stylePreset; }
                        if (typeof cfg.decimals === 'number') { document.getElementById('decimals').value = String(cfg.decimals); decimals = cfg.decimals; }
                        if (typeof cfg.thousands === 'boolean') { document.getElementById('thousands').checked = !!cfg.thousands; useThousands = !!cfg.thousands; }
                        createChart();
                        if (pendingConfigId) {
                            vscode.postMessage({ type: 'vsplot:test:config-applied', id: pendingConfigId });
                        }
                    } catch {}
                    pendingConfig = null;
                    pendingConfigId = null;
                }
                break;
            case 'vsplot:test:setConfig':
                try {
                    const cfg = message.payload || {};
                    if (!currentData) {
                        pendingConfig = cfg;
                        pendingConfigId = message.id || null;
                    } else {
                        if (cfg.chartType) document.getElementById('chartType').value = cfg.chartType;
                        if (typeof cfg.x === 'number') document.getElementById('xAxis').value = String(cfg.x);
                        if (typeof cfg.y === 'number') document.getElementById('yAxis').value = String(cfg.y);
                        if (typeof cfg.y2 !== 'undefined') document.getElementById('yAxis2').value = String(cfg.y2);
                        if (typeof cfg.legend === 'boolean') document.getElementById('legendToggle').checked = cfg.legend;
                        if (typeof cfg.dragZoom === 'boolean') document.getElementById('dragZoomToggle').checked = cfg.dragZoom;
                        if (cfg.color) document.getElementById('colorPicker').value = cfg.color;
                        if (cfg.agg) document.getElementById('aggFunc').value = cfg.agg;
                        createChart();
                        if (message.id) {
                            vscode.postMessage({ type: 'vsplot:test:config-applied', id: message.id });
                        }
                    }
                } catch {}
                break;
            case 'vsplot:test:getState':
                try {
                    const state = {
                        chartType: document.getElementById('chartType').value,
                        x: parseInt(document.getElementById('xAxis').value),
                        y: parseInt(document.getElementById('yAxis').value),
                        y2: parseInt(document.getElementById('yAxis2').value),
                        legend: document.getElementById('legendToggle').checked,
                        dragZoom: document.getElementById('dragZoomToggle').checked,
                        color: document.getElementById('colorPicker').value,
                        agg: document.getElementById('aggFunc').value,
                        stylePreset: document.getElementById('stylePreset').value,
                        decimals: parseInt(document.getElementById('decimals').value),
                        thousands: document.getElementById('thousands').checked,
                        labelsCount: (chart && chart.data && chart.data.labels && chart.data.labels.length) ? chart.data.labels.length : 0,
                        datasetLens: (chart && chart.data && chart.data.datasets) ? chart.data.datasets.map(d=>Array.isArray(d.data)?d.data.length:0) : []
                    };
                    vscode.postMessage({ type: 'vsplot:test:state', id: message.id, payload: state });
                } catch (e) {
                    vscode.postMessage({ type: 'vsplot:test:state', id: message.id, payload: { error: String(e) } });
                }
                break;
        }
    });

    function initializeChart() {
        if (!currentData) return;

        document.getElementById('title').textContent = `Chart: ${currentData.fileName}`;

        // Populate axis selectors
        const xAxisSelect = document.getElementById('xAxis');
        const yAxisSelect = document.getElementById('yAxis');
        const yAxis2Select = document.getElementById('yAxis2');
        const addY2Btn = document.getElementById('addY2Btn');

        xAxisSelect.innerHTML = '';
        yAxisSelect.innerHTML = '';
        yAxis2Select.innerHTML = '';

        // Y2: add None option
        const noneOpt = document.createElement('option');
        noneOpt.value = '-1';
        noneOpt.textContent = '- None -';
        yAxis2Select.appendChild(noneOpt);

        currentData.headers.forEach((header, index) => {
            const optionX = document.createElement('option');
            optionX.value = index;
            optionX.textContent = header;
            xAxisSelect.appendChild(optionX);

            const optionY = document.createElement('option');
            optionY.value = index;
            optionY.textContent = header;
            yAxisSelect.appendChild(optionY);

            const optionY2 = document.createElement('option');
            optionY2.value = index;
            optionY2.textContent = header;
            yAxis2Select.appendChild(optionY2);
        });

        // Restore state if present
        const state = vscode.getState && vscode.getState();
        let restored = false;
        const byFile = state && state.byFile ? state.byFile : undefined;
        const saved = byFile ? byFile[currentData.fileName] : undefined;
        if (saved) {
            try {
                document.getElementById('chartType').value = saved.chartType || document.getElementById('chartType').value;
                document.getElementById('legendToggle').checked = !!saved.legend;
                document.getElementById('dragZoomToggle').checked = !!saved.dragZoom;
                document.getElementById('colorPicker').value = saved.color || document.getElementById('colorPicker').value;
                if (typeof saved.x === 'number') xAxisSelect.selectedIndex = saved.x;
                if (typeof saved.y === 'number') yAxisSelect.selectedIndex = saved.y;
                if (typeof saved.y2 === 'number' || saved.y2 === -1) document.getElementById('yAxis2').value = String(saved.y2);
                if (saved.agg) document.getElementById('aggFunc').value = saved.agg;
                if (saved.stylePreset) { document.getElementById('stylePreset').value = saved.stylePreset; stylePreset = saved.stylePreset; }
                if (typeof saved.decimals === 'number') { document.getElementById('decimals').value = String(saved.decimals); decimals = saved.decimals; }
                if (typeof saved.thousands === 'boolean') { document.getElementById('thousands').checked = !!saved.thousands; useThousands = !!saved.thousands; }
                if (typeof saved.compactCards === 'boolean') { compactCards = !!saved.compactCards; document.getElementById('compactCardsToggle').checked = compactCards; }
                if (typeof saved.showIcons === 'boolean') { showIcons = !!saved.showIcons; document.getElementById('iconsToggle').checked = showIcons; }
                restored = true;
            } catch {}
        }
        if (!restored) {
            try {
                document.getElementById('stylePreset').value = stylePreset;
                document.getElementById('decimals').value = String(decimals);
                document.getElementById('thousands').checked = !!useThousands;
                document.getElementById('compactCardsToggle').checked = !!compactCards;
                document.getElementById('iconsToggle').checked = !!showIcons;
            } catch {}
        }

        updateY2ToggleUI();

        // Heuristic defaults: prefer first two numeric columns for scatter, else bar
        const numericCols = getNumericColumnIndexes(currentData.rows);
        if (!restored && numericCols.length >= 2) {
            xAxisSelect.selectedIndex = numericCols[0];
            yAxisSelect.selectedIndex = numericCols[1];
            const chartTypeSel = document.getElementById('chartType');
            if (chartTypeSel) {
                chartTypeSel.value = 'scatter';
            }
        } else if (!restored && currentData.headers.length > 1) {
            xAxisSelect.selectedIndex = 0;
            yAxisSelect.selectedIndex = 1;
        } else if (!restored && currentData.headers.length === 1) {
            xAxisSelect.selectedIndex = 0;
            yAxisSelect.selectedIndex = 0;
        }

        createChart();
    }

    function createChart() {
        try {
            const chartType = document.getElementById('chartType').value;
            const xAxisIndex = parseInt(document.getElementById('xAxis').value);
            const yAxisIndex = parseInt(document.getElementById('yAxis').value);
            const yAxis2Index = parseInt(document.getElementById('yAxis2').value);
            const isCategoricalX = isCategoricalColumn(currentData.rows, xAxisIndex);
            const isCategoricalY = isCategoricalColumn(currentData.rows, yAxisIndex);
            const isCategoricalY2 = !isNaN(yAxis2Index) && yAxis2Index >= 0 ? isCategoricalColumn(currentData.rows, yAxis2Index) : false;
            const xIsTime = isTimeColumn(currentData.rows, xAxisIndex);
            stylePreset = document.getElementById('stylePreset').value || 'clean';
            decimals = parseInt(document.getElementById('decimals').value) || 2;
            useThousands = document.getElementById('thousands').checked;

            if (isNaN(xAxisIndex) || isNaN(yAxisIndex)) {
                showError('Please select valid axes');
                return;
            }

            // Guard: line/scatter require numeric or time X, and numeric Y
            if ((chartType === 'line' || chartType === 'scatter') && ((isCategoricalX && !xIsTime) || isCategoricalY)) {
                showError('Line/Scatter require numeric or time X and numeric Y.');
                return;
            }

            // Allow scatter to have Y2 as separate dataset rendered against right axis

            if ((chartType === 'line' || chartType === 'bar' || chartType === 'scatter') && !isNaN(yAxis2Index) && yAxis2Index >= 0 && isCategoricalY2) {
                showError('Y2 must be numeric for Line/Bar charts.');
                return;
            }

            hideError();

            // Show/hide aggregation control
            const aggGroup = document.getElementById('aggGroup');
            const showAgg = (chartType === 'bar' && !xIsTime) || chartType === 'pie' || chartType === 'doughnut';
            aggGroup.style.display = showAgg ? 'flex' : 'none';

            // Reflect Y2 UI state
            updateY2ToggleUI();

            // Prepare data
            const chartData = prepareChartData(chartType, xAxisIndex, yAxisIndex, isNaN(yAxis2Index) ? -1 : yAxis2Index);

            // Destroy existing chart
            if (chart) {
                chart.destroy();
            }

            chartCanvas = document.getElementById('chart');
            const ctx = chartCanvas.getContext('2d');

            const dragEnabled = document.getElementById('dragZoomToggle').checked;

            chart = new Chart(ctx, {
                type: chartType,
                data: chartData,
                options: getChartOptions(chartType, chartData.__xLabel, chartData.__yLabel, dragEnabled, !!chartData.__hasY2, chartData.__y2Label)
            });
            // Apply compact class to cards
            try {
                const statsEl = document.getElementById('chartStats');
                const metaEl = document.getElementById('chartMeta');
                statsEl.classList.toggle('compact', !!compactCards);
                metaEl.classList.toggle('compact', !!compactCards);
                statsEl.classList.toggle('no-icons', !showIcons);
                metaEl.classList.toggle('no-icons', !showIcons);
            } catch {}

            document.getElementById('noData').style.display = 'none';
            chartCanvas.style.display = 'block';

            updateChartStats();
            // Setup manual drag if plugin missing
            setupManualDrag(dragEnabled && !pluginAvailable);

            // Save state
            try {
                const existing = (vscode.getState && vscode.getState()) || {};
                const byFile = existing.byFile || {};
                byFile[currentData.fileName] = {
                    chartType,
                    x: xAxisIndex,
                    y: yAxisIndex,
                    y2: isNaN(yAxis2Index) ? -1 : yAxis2Index,
                    legend: document.getElementById('legendToggle').checked,
                    dragZoom: document.getElementById('dragZoomToggle').checked,
                    color: document.getElementById('colorPicker').value,
                    agg: document.getElementById('aggFunc').value,
                    stylePreset,
                    decimals,
                    thousands: useThousands,
                    compactCards: document.getElementById('compactCardsToggle').checked,
                    showIcons: document.getElementById('iconsToggle').checked
                };
                vscode.setState && vscode.setState({ byFile });
            } catch {}

            // Cache initial bounds for manual reset fallback
            cacheInitialBounds(chart);

        } catch (error) {
            showError('Error creating chart: ' + error.message);
        }
    }

    function prepareChartData(chartType, xAxisIndex, yAxisIndex, yAxis2Index) {
        const xLabel = currentData.headers[xAxisIndex];
        const yLabel = currentData.headers[yAxisIndex];
        const hasY2 = typeof yAxis2Index === 'number' && yAxis2Index >= 0;
        const y2Label = hasY2 ? currentData.headers[yAxis2Index] : undefined;
        const aggFunc = document.getElementById('aggFunc').value || 'sum';
        const xIsTime = isTimeColumn(currentData.rows, xAxisIndex);

        if (chartType === 'pie' || chartType === 'doughnut') {
            // For pie charts, aggregate data by x-axis values
            const aggregatedData = {};
            const aggregator = makeAggregator(aggFunc);
            currentData.rows.forEach(row => {
                const key = row[xAxisIndex];
                const value = parseFloat(row[yAxisIndex]) || 0;
                aggregator(aggregatedData, key, value);
            });

            const aggOut = aggFunc === 'avg' ? collapseAvg(aggregatedData) : aggregatedData;
            const result = {
                labels: Object.keys(aggOut),
                datasets: [{
                    label: yLabel,
                    data: Object.values(aggOut),
                    backgroundColor: generateColors(Object.keys(aggOut).length),
                    borderWidth: 1
                }]
            };
            result.__xLabel = xLabel;
            result.__yLabel = yLabel;
            result.__hasY2 = false;
            return result;
        } else if (chartType === 'bar' && !xIsTime) {
            // Bar with non-time X: aggregate by distinct X values (categorical-like)
            const aggregated = {};
            const aggregated2 = {};
            const agg1 = makeAggregator(aggFunc);
            const agg2 = makeAggregator(aggFunc);
            currentData.rows.forEach(row => {
                const key = String(row[xAxisIndex]);
                const val = parseFloat(row[yAxisIndex]) || 0;
                agg1(aggregated, key, val);
                if (hasY2) {
                    const val2 = parseFloat(row[yAxis2Index]) || 0;
                    agg2(aggregated2, key, val2);
                }
            });
            const out1 = aggFunc === 'avg' ? collapseAvg(aggregated) : aggregated;
            const out2 = aggFunc === 'avg' ? collapseAvg(aggregated2) : aggregated2;
            const labels = Object.keys(out1).sort((a,b) => String(a).localeCompare(String(b)));
            const values = labels.map(k => out1[k]);
            const values2 = hasY2 ? labels.map(k => (out2[k] || 0)) : undefined;
            const result = {
                labels,
                datasets: [{
                    label: yLabel,
                    data: values,
                    backgroundColor: getPickedColor('rgba', 0.7),
                    borderColor: getPickedColor('rgba', 1),
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }].concat(hasY2 ? [{
                    label: y2Label,
                    data: values2,
                    yAxisID: 'y2',
                    backgroundColor: 'rgba(255,99,132,0.6)',
                    borderColor: 'rgba(255,99,132,1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }] : [])
            };
            result.__xLabel = xLabel;
            result.__yLabel = yLabel;
            result.__hasY2 = hasY2;
            result.__y2Label = y2Label;
            return result;
        } else {
            // For other chart types
            let result;
            if (chartType === 'scatter') {
                const points = currentData.rows.map(row => ({
                    x: xIsTime ? new Date(row[xAxisIndex]) : (parseFloat(row[xAxisIndex]) || 0),
                    y: parseFloat(row[yAxisIndex]) || 0
                }));
                result = {
                    datasets: [{
                        label: yLabel,
                        data: points,
                        backgroundColor: getPickedColor('rgba', 0.6),
                        borderColor: getPickedColor('rgba', 1),
                        borderWidth: 1,
                        showLine: false
                    }].concat(hasY2 ? [{
                        label: y2Label,
                        data: currentData.rows.map(row => ({ x: xIsTime ? new Date(row[xAxisIndex]) : (parseFloat(row[xAxisIndex]) || 0), y: parseFloat(row[yAxis2Index]) || 0 })),
                        yAxisID: 'y2',
                        backgroundColor: 'rgba(255,99,132,0.6)',
                        borderColor: 'rgba(255,99,132,1)',
                        borderWidth: 1,
                        showLine: false
                    }] : [])
                };
            } else {
                const xIsTimeLocal = xIsTime;
                if (chartType === 'line' && xIsTimeLocal) {
                    const points = currentData.rows.map(row => ({ x: new Date(row[xAxisIndex]), y: parseFloat(row[yAxisIndex]) || 0 }));
                    const points2 = hasY2 ? currentData.rows.map(row => ({ x: new Date(row[xAxisIndex]), y: parseFloat(row[yAxis2Index]) || 0 })) : undefined;
                    result = {
                        datasets: [{
                            label: yLabel,
                            data: points,
                            backgroundColor: getPickedColor('rgba', 0.2),
                            borderColor: getPickedColor('rgba', 1),
                            borderWidth: 2,
                            fill: false
                        }].concat(hasY2 ? [{
                            label: y2Label,
                            data: points2,
                            yAxisID: 'y2',
                            backgroundColor: 'rgba(255,99,132,0.3)',
                            borderColor: 'rgba(255,99,132,1)',
                            borderWidth: 2,
                            fill: false
                        }] : [])
                    };
                } else {
                    const labels = xIsTimeLocal ? currentData.rows.map(row => new Date(row[xAxisIndex])) : currentData.rows.map(row => row[xAxisIndex]);
                    const values = currentData.rows.map(row => parseFloat(row[yAxisIndex]) || 0);
                    const values2 = hasY2 ? currentData.rows.map(row => parseFloat(row[yAxis2Index]) || 0) : undefined;
                    result = {
                        labels,
                        datasets: [{
                            label: yLabel,
                            data: values,
                            backgroundColor: chartType === 'bar' ? getPickedColor('rgba', 0.7) : getPickedColor('rgba', 0.2),
                            borderColor: getPickedColor('rgba', 1),
                            borderWidth: chartType === 'bar' ? 1 : 2,
                            borderRadius: chartType === 'bar' ? 4 : 0,
                            borderSkipped: chartType === 'bar' ? false : undefined,
                            fill: chartType === 'line' ? false : true
                        }].concat(hasY2 ? [{
                            label: y2Label,
                            data: values2,
                            yAxisID: 'y2',
                            backgroundColor: 'rgba(255,99,132,0.3)',
                            borderColor: 'rgba(255,99,132,1)',
                            borderWidth: chartType === 'bar' ? 1 : 2,
                            borderRadius: chartType === 'bar' ? 4 : 0,
                            borderSkipped: chartType === 'bar' ? false : undefined,
                            fill: chartType === 'line' ? false : true
                        }] : [])
                    };
                }
            }
            result.__xLabel = xLabel;
            result.__yLabel = yLabel;
            result.__hasY2 = hasY2;
            result.__y2Label = y2Label;
            return result;
        }
    }

    function getChartOptions(chartType, xAxisTitle, yAxisTitle, dragEnabled, hasY2, y2Title) {
        const fg = getComputedStyle(document.body).getPropertyValue('--vscode-foreground');
        const grid = getComputedStyle(document.body).getPropertyValue('--vscode-widget-border');
        const tooltipBg = getComputedStyle(document.body).getPropertyValue('--vscode-editorHoverWidget-background') || 'rgba(0,0,0,0.8)';
        const tooltipFg = getComputedStyle(document.body).getPropertyValue('--vscode-editorHoverWidget-foreground') || fg;
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            elements: {
                line: {
                    tension: 0.3,
                    cubicInterpolationMode: 'monotone'
                },
                point: {
                    radius: 2,
                    hoverRadius: 4
                }
            },
            plugins: {
                tooltip: {
                    backgroundColor: tooltipBg,
                    titleColor: tooltipFg,
                    bodyColor: tooltipFg,
                    borderColor: grid,
                    borderWidth: 1,
                    callbacks: {
                        label: function(ctx) {
                            try {
                                const dsLabel = ctx.dataset.label ? ctx.dataset.label + ': ' : '';
                                const val = (typeof ctx.raw === 'object' && ctx.raw && 'y' in ctx.raw) ? ctx.raw.y : ctx.parsed !== undefined ? (ctx.parsed.y ?? ctx.parsed) : ctx.raw;
                                if (typeof val === 'number') return dsLabel + formatNumber(val);
                                return dsLabel + String(val);
                            } catch { return ctx.formattedValue; }
                        }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                    },
                    limits: {},
                    drag: {
                        enabled: !!dragEnabled,
                        modifierKey: 'shift'
                    }
                },
                legend: {
                    display: document.getElementById('legendToggle')?.checked ?? true,
                    labels: {
                        color: fg
                    }
                }
            }
        };

        if (chartType !== 'pie' && chartType !== 'doughnut' && chartType !== 'radar') {
            baseOptions.scales = {
                x: {
                    type: detectXScaleType(),
                    ticks: { color: fg, callback: function(v) { try { return formatTick('x', v); } catch { return v; } } },
                    grid: { color: grid },
                    title: {
                        display: !!xAxisTitle,
                        text: xAxisTitle,
                        color: getComputedStyle(document.body).getPropertyValue('--vscode-descriptionForeground')
                    }
                },
                y: {
                    ticks: { color: fg, callback: function(v) { try { return formatTick('y', v); } catch { return v; } } },
                    grid: { color: grid },
                    title: {
                        display: !!yAxisTitle,
                        text: yAxisTitle,
                        color: getComputedStyle(document.body).getPropertyValue('--vscode-descriptionForeground')
                    }
                }
            };
            if (hasY2) {
                baseOptions.scales.y2 = {
                    position: 'right',
                    ticks: { color: fg, callback: function(v) { try { return formatTick('y2', v); } catch { return v; } } },
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: !!y2Title,
                        text: y2Title,
                        color: getComputedStyle(document.body).getPropertyValue('--vscode-descriptionForeground')
                    }
                };
            }
        }

        return baseOptions;
    }

    function detectXScaleType() {
        const idx = parseInt(document.getElementById('xAxis').value);
        if (isTimeColumn(currentData.rows, idx)) return 'time';
        const chartType = document.getElementById('chartType').value;
        if (chartType === 'scatter') return 'linear';
        return undefined;
    }

    function isTimeColumn(rows, index) {
        let timeCount = 0, total = 0;
        for (let r = 0; r < Math.min(rows.length, 50); r++) {
            const v = rows[r][index];
            if (v == null || v === '') { total++; continue; }
            const d = new Date(v);
            if (!isNaN(d.getTime())) timeCount++;
            total++;
        }
        return total > 0 && (timeCount / total) >= 0.6;
    }

    function getPalette() {
        if (stylePreset === 'vibrant') return [
            'rgba(255, 99, 132, 0.85)','rgba(54, 162, 235, 0.85)','rgba(255, 206, 86, 0.85)','rgba(75, 192, 192, 0.85)','rgba(153, 102, 255, 0.85)','rgba(255, 159, 64, 0.85)','rgba(0,200,83,0.85)','rgba(233,30,99,0.85)'
        ];
        if (stylePreset === 'soft') return [
            'rgba(99, 110, 250, 0.6)','rgba(239, 85, 59, 0.6)','rgba(0, 204, 150, 0.6)','rgba(171, 99, 250, 0.6)','rgba(255, 161, 90, 0.6)','rgba(25, 211, 243, 0.6)','rgba(255, 102, 146, 0.6)'
        ];
        return [
            'rgba(120, 144, 156, 0.7)','rgba(33, 150, 243, 0.7)','rgba(156, 39, 176, 0.7)','rgba(76, 175, 80, 0.7)','rgba(255, 193, 7, 0.7)','rgba(244, 67, 54, 0.7)','rgba(0, 188, 212, 0.7)'
        ];
    }

    function generateColors(count) {
        const palette = getPalette();
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(palette[i % palette.length]);
        }
        return result;
    }

    function updateChartStats() {
        if (!currentData) return;

        const stats = document.getElementById('chartStats');
        const meta = document.getElementById('chartMeta');
        const xAxisIndex = parseInt(document.getElementById('xAxis').value);
        const yAxisIndex = parseInt(document.getElementById('yAxis').value);

        const yValues = currentData.rows
            .map(row => parseFloat(row[yAxisIndex]))
            .filter(val => !isNaN(val));

        if (yValues.length > 0) {
            const min = Math.min(...yValues);
            const max = Math.max(...yValues);
            const avg = yValues.reduce((a, b) => a + b, 0) / yValues.length;
            const sorted = [...yValues].sort((a,b)=>a-b);
            const mid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            const variance = yValues.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / (yValues.length > 1 ? (yValues.length - 1) : 1);
            const stddev = Math.sqrt(variance);

            stats.innerHTML = `
                <div class="section-title">Statistics</div>
                <div class="stats-grid">
                    <div class="stat"><span class="badge">n</span><div><strong>Data points:</strong> ${yValues.length}</div></div>
                    <div class="stat"><span class="badge">min</span><div><strong>Min:</strong> ${min.toFixed(2)}</div></div>
                    <div class="stat"><span class="badge">max</span><div><strong>Max:</strong> ${max.toFixed(2)}</div></div>
                    <div class="stat"><span class="badge">avg</span><div><strong>Average:</strong> ${avg.toFixed(2)}</div></div>
                    <div class="stat"><span class="badge">med</span><div><strong>Median:</strong> ${median.toFixed(2)}</div></div>
                    <div class="stat"><span class="badge">sd</span><div><strong>Std Dev:</strong> ${stddev.toFixed(2)}</div></div>
                </div>
            `;
            stats.style.display = 'block';
        } else {
            stats.style.display = 'none';
        }

        // Meta info
        meta.innerHTML = `
            <div class="section-title">Dataset</div>
            <div class="stats-grid">
                <div class="stat"><span class="badge">file</span><div><strong>File:</strong> ${currentData.fileName}</div></div>
                <div class="stat"><span class="badge">cols</span><div><strong>Columns:</strong> ${currentData.headers.length}</div></div>
                <div class="stat"><span class="badge">rows</span><div><strong>Rows:</strong> ${currentData.totalRows}</div></div>
            </div>
        `;
        meta.style.display = 'block';
    }

    function showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    function hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    // Event listeners
    document.getElementById('updateChart').addEventListener('click', createChart);
    document.getElementById('chartType').addEventListener('change', createChart);
    document.getElementById('xAxis').addEventListener('change', createChart);
    document.getElementById('yAxis').addEventListener('change', createChart);
    document.getElementById('legendToggle').addEventListener('change', () => {
        if (chart) {
            chart.options.plugins.legend.display = document.getElementById('legendToggle').checked;
            chart.update();
        }
    });

    document.getElementById('dragZoomToggle').addEventListener('change', () => {
        if (chart) {
            const enabled = document.getElementById('dragZoomToggle').checked;
            chart.options.plugins.zoom.drag = chart.options.plugins.zoom.drag || {};
            chart.options.plugins.zoom.drag.enabled = enabled;
            chart.update();
            setupManualDrag(enabled && !pluginAvailable);
        }
    });

    // Color picker handling
    document.getElementById('colorPicker').addEventListener('change', () => {
        if (chart) {
            const color = document.getElementById('colorPicker').value;
            const rgba = hexToRgba(color, 0.6);
            const line = hexToRgba(color, 1);
            chart.data.datasets.forEach(ds => {
                ds.backgroundColor = rgba;
                ds.borderColor = line;
            });
            chart.update();
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

    document.getElementById('zoomIn').addEventListener('click', () => {
        if (chart && typeof chart.zoom === 'function') {
            chart.zoom(1.2);
        } else if (chart) {
            programmaticZoom(chart, 0.8);
        }
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        if (chart && typeof chart.zoom === 'function') {
            chart.zoom(0.8);
        } else if (chart) {
            programmaticZoom(chart, 1.25);
        }
    });

    document.getElementById('resetZoom').addEventListener('click', () => {
        if (chart && typeof chart.resetZoom === 'function') {
            chart.resetZoom();
        } else if (chart) {
            resetToInitialBounds(chart);
        }
    });

    document.getElementById('exportChart').addEventListener('click', () => {
        if (chart) {
            const url = chart.toBase64Image();
            vscode.postMessage({
                type: 'exportChart',
                data: url,
                filename: `chart_${currentData.fileName}_${Date.now()}.png`
            });
        }
    });

    // Aggregation change should re-render
    document.getElementById('aggFunc').addEventListener('change', createChart);
    document.getElementById('stylePreset').addEventListener('change', createChart);
    document.getElementById('decimals').addEventListener('change', () => {
        decimals = parseInt(document.getElementById('decimals').value) || 2;
        if (chart) { chart.options = getChartOptions(chart.config.type, chart.options.scales?.x?.title?.text, chart.options.scales?.y?.title?.text, document.getElementById('dragZoomToggle').checked, !!chart.options.scales?.y2, chart.options.scales?.y2?.title?.text); chart.update(); }
    });
    document.getElementById('thousands').addEventListener('change', () => {
        useThousands = document.getElementById('thousands').checked;
        if (chart) { chart.options = getChartOptions(chart.config.type, chart.options.scales?.x?.title?.text, chart.options.scales?.y?.title?.text, document.getElementById('dragZoomToggle').checked, !!chart.options.scales?.y2, chart.options.scales?.y2?.title?.text); chart.update(); }
    });
    document.getElementById('compactCardsToggle').addEventListener('change', () => {
        compactCards = document.getElementById('compactCardsToggle').checked;
        try {
            const statsEl = document.getElementById('chartStats');
            const metaEl = document.getElementById('chartMeta');
            statsEl.classList.toggle('compact', !!compactCards);
            metaEl.classList.toggle('compact', !!compactCards);
        } catch {}
        // persist without forcing chart rebuild
        try {
            const state = vscode.getState && vscode.getState();
            const byFile = (state && state.byFile) ? state.byFile : {};
            byFile[currentData.fileName] = Object.assign({}, byFile[currentData.fileName] || {}, { compactCards });
            vscode.setState && vscode.setState({ byFile });
        } catch {}
    });

    document.getElementById('iconsToggle').addEventListener('change', () => {
        showIcons = document.getElementById('iconsToggle').checked;
        try {
            const statsEl = document.getElementById('chartStats');
            const metaEl = document.getElementById('chartMeta');
            statsEl.classList.toggle('no-icons', !showIcons);
            metaEl.classList.toggle('no-icons', !showIcons);
        } catch {}
        try {
            const state = vscode.getState && vscode.getState();
            const byFile = (state && state.byFile) ? state.byFile : {};
            byFile[currentData.fileName] = Object.assign({}, byFile[currentData.fileName] || {}, { showIcons });
            vscode.setState && vscode.setState({ byFile });
        } catch {}
    });

    // Y2 quick toggle
    document.getElementById('addY2Btn').addEventListener('click', () => {
        const y2Sel = document.getElementById('yAxis2');
        const ySel = document.getElementById('yAxis');
        const current = parseInt(y2Sel.value);
        if (isNaN(current) || current < 0) {
            // add: suggest next numeric column different from Y
            const numCols = getNumericColumnIndexes(currentData.rows);
            const yIdx = parseInt(ySel.value);
            const candidate = numCols.find(i => i !== yIdx);
            if (typeof candidate === 'number') {
                y2Sel.value = String(candidate);
            } else if (numCols.length > 0) {
                y2Sel.value = String(numCols[0]);
            } else {
                y2Sel.value = '-1';
            }
        } else {
            // remove
            y2Sel.value = '-1';
        }
        updateY2ToggleUI();
        createChart();
    });

    function updateY2ToggleUI() {
        const btn = document.getElementById('addY2Btn');
        const y2Sel = document.getElementById('yAxis2');
        const active = !isNaN(parseInt(y2Sel.value)) && parseInt(y2Sel.value) >= 0;
        btn.textContent = active ? 'Remove Y2' : '+ Add Y2';
    }

    // Utilities
    function makeAggregator(kind) {
        if (kind === 'count') {
            return (obj, key, value) => { obj[key] = (obj[key] || 0) + 1; };
        }
        if (kind === 'avg') {
            return (obj, key, value) => {
                const cur = obj[key] || { s: 0, c: 0 };
                cur.s += value; cur.c += 1; obj[key] = cur;
            };
        }
        if (kind === 'min') {
            return (obj, key, value) => { obj[key] = obj[key] == null ? value : Math.min(obj[key], value); };
        }
        if (kind === 'max') {
            return (obj, key, value) => { obj[key] = obj[key] == null ? value : Math.max(obj[key], value); };
        }
        // sum default
        return (obj, key, value) => { obj[key] = (obj[key] || 0) + value; };
    }

    // Convert averaged aggregation shape to numbers for pies/bars
    function collapseAvg(obj) {
        const out = {};
        for (const k in obj) {
            const v = obj[k];
            out[k] = (typeof v === 'object' && v && 's' in v && 'c' in v) ? (v.c ? v.s / v.c : 0) : v;
        }
        return out;
    }
    function formatNumber(n) {
        if (typeof n !== 'number' || !isFinite(n)) return String(n);
        try {
            const nf = new Intl.NumberFormat(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
                useGrouping: !!useThousands
            });
            return nf.format(n);
        } catch {
            const fixed = n.toFixed(decimals);
            return fixed;
        }
    }

    function formatTick(axis, v) {
        const xType = detectXScaleType();
        if (axis === 'x') {
            if (xType === 'time') return v; // let adapter format time
            if (xType === 'linear' && typeof v === 'number') return formatNumber(v);
            return v;
        }
        if (typeof v === 'number') return formatNumber(v);
        return v;
    }
    function hexToRgba(hex, alpha=1) {
        const m = /^#?([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/.exec(hex);
        if (!m) return 'rgba(54,162,235,' + alpha + ')';
        const r = parseInt(m[1], 16);
        const g = parseInt(m[2], 16);
        const b = parseInt(m[3], 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    }

    function getPickedColor(fmt='rgba', alpha=0.6) {
        const val = document.getElementById('colorPicker').value || '#36a2eb';
        return hexToRgba(val, alpha);
    }

    function isCategoricalColumn(rows, index) {
        let catCount = 0, total = 0;
        for (let r = 0; r < Math.min(rows.length, 50); r++) {
            const v = rows[r][index];
            if (typeof v === 'number') { total++; continue; }
            if (v == null || v === '') { total++; catCount++; continue; }
            const n = typeof v === 'string' ? Number(v) : Number(String(v));
            if (Number.isNaN(n)) { catCount++; }
            total++;
        }
        return total > 0 && (catCount / total) >= 0.5;
    }

    function programmaticZoom(c, factor) {
        if (!c.options.scales) return;
        const scales = c.options.scales;
        ['x','y'].forEach(axis => {
            const s = scales[axis];
            if (!s) return;
            // Only for linear-like numeric axes
            const chartScale = c.scales[axis];
            if (!chartScale) return;
            const min = chartScale.min;
            const max = chartScale.max;
            const center = (min + max) / 2;
            const newMin = center + (min - center) * factor;
            const newMax = center + (max - center) * factor;
            s.min = newMin;
            s.max = newMax;
        });
        c.update();
    }

    function setupManualDrag(enable) {
        const container = document.querySelector('.chart-container');
        if (!container || !chartCanvas) return;
        // Remove existing overlay and handlers
        if (dragOverlay) {
            container.removeChild(dragOverlay);
            dragOverlay = null;
        }
        chartCanvas.onmousedown = null;
        chartCanvas.onmousemove = null;
        window.onmouseup = null;
        if (!enable) return;

        let start = null;
        dragOverlay = document.createElement('div');
        dragOverlay.style.position = 'absolute';
        dragOverlay.style.border = '1px dashed var(--vscode-foreground)';
        dragOverlay.style.background = 'rgba(0,0,0,0.1)';
        dragOverlay.style.pointerEvents = 'none';
        dragOverlay.style.display = 'none';
        container.appendChild(dragOverlay);

        chartCanvas.onmousedown = (e) => {
            if (!e.shiftKey) return;
            const rect = chartCanvas.getBoundingClientRect();
            start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            dragOverlay.style.left = e.clientX - rect.left + 'px';
            dragOverlay.style.top = e.clientY - rect.top + 'px';
            dragOverlay.style.width = '0px';
            dragOverlay.style.height = '0px';
            dragOverlay.style.display = 'block';
        };
        chartCanvas.onmousemove = (e) => {
            if (!start) return;
            const rect = chartCanvas.getBoundingClientRect();
            const cur = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            const x = Math.min(start.x, cur.x);
            const y = Math.min(start.y, cur.y);
            const w = Math.abs(start.x - cur.x);
            const h = Math.abs(start.y - cur.y);
            dragOverlay.style.left = x + 'px';
            dragOverlay.style.top = y + 'px';
            dragOverlay.style.width = w + 'px';
            dragOverlay.style.height = h + 'px';
        };
        window.onmouseup = (e) => {
            if (!start) return;
            const rect = chartCanvas.getBoundingClientRect();
            const end = { x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)) };
            const x0 = Math.min(start.x, end.x);
            const x1 = Math.max(start.x, end.x);
            const y0 = Math.min(start.y, end.y);
            const y1 = Math.max(start.y, end.y);
            dragOverlay.style.display = 'none';
            start = null;
            if (chart && chart.scales && chart.scales.x && chart.scales.y) {
                const xv0 = chart.scales.x.getValueForPixel(x0);
                const xv1 = chart.scales.x.getValueForPixel(x1);
                const yv1 = chart.scales.y.getValueForPixel(y0);
                const yv0 = chart.scales.y.getValueForPixel(y1);
                if (!chart.options.scales) chart.options.scales = {};
                chart.options.scales.x = chart.options.scales.x || {};
                chart.options.scales.y = chart.options.scales.y || {};
                chart.options.scales.x.min = xv0;
                chart.options.scales.x.max = xv1;
                chart.options.scales.y.min = yv0;
                chart.options.scales.y.max = yv1;
                chart.update();
            }
        };
    }

    let initialBounds = null;
    function cacheInitialBounds(c) {
        const res = {};
        for (const id in c.scales) {
            const sc = c.scales[id];
            res[id] = { min: sc.min, max: sc.max };
        }
        initialBounds = res;
    }

    function resetToInitialBounds(c) {
        if (!initialBounds) return;
        if (!c.options.scales) return;
        for (const id in initialBounds) {
            if (!c.options.scales[id]) continue;
            c.options.scales[id].min = initialBounds[id].min;
            c.options.scales[id].max = initialBounds[id].max;
        }
        c.update();
    }
})();
