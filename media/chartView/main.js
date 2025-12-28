/**
 * Chart View Main Script
 *
 * This script handles all chart visualization logic for the VS Code webview.
 * It includes data processing, chart rendering, and user interactions.
 *
 * @module chartView/main
 */

// Get VS Code API for message passing
const vscode = acquireVsCodeApi();

// Global state variables
let currentData = null;
let chart = null;
let chartCanvas = null;
let pluginAvailable = false;
let dragOverlay = null;
let pendingConfig = null;
let pendingConfigId = null;
let initialBounds = null;

// Get default settings from body data attributes
const defaultStylePreset = document.body.dataset.defaultStylePreset || "clean";
const defaultDecimals = parseInt(document.body.dataset.defaultDecimals) || 2;
const defaultUseThousands =
	document.body.dataset.defaultUseThousands === "true";

// Current style settings
let stylePreset = defaultStylePreset;
let decimals = defaultDecimals;
let useThousands = defaultUseThousands;

/**
 * Initialize zoom plugin if available
 * Tries to register the zoom plugin from various UMD global names
 */
try {
	const zoomPlugin =
		window.chartjsPluginZoom ||
		window.ChartZoom ||
		window["chartjs-plugin-zoom"] ||
		undefined;
	if (
		zoomPlugin &&
		window.Chart &&
		typeof window.Chart.register === "function"
	) {
		window.Chart.register(zoomPlugin);
		pluginAvailable = true;
	}
} catch (_e) {
	// Zoom plugin not available, will use manual zoom fallback
}

/**
 * Message handler for communication with extension
 */
window.addEventListener("message", (event) => {
	const message = event.data;
	switch (message.type) {
		case "showChart":
			currentData = message.data;
			initializeChart();
			if (pendingConfig) {
				try {
					applyConfig(pendingConfig);
					createChart();
					if (pendingConfigId) {
						vscode.postMessage({
							type: "vsplot:test:config-applied",
							id: pendingConfigId,
						});
					}
				} catch (_e) {
					console.error("Error applying pending config:", e);
				}
				pendingConfig = null;
				pendingConfigId = null;
			}
			break;
		case "vsplot:test:setConfig":
			try {
				const cfg = message.payload || {};
				if (!currentData) {
					pendingConfig = cfg;
					pendingConfigId = message.id || null;
				} else {
					applyConfig(cfg);
					createChart();
					if (message.id) {
						vscode.postMessage({
							type: "vsplot:test:config-applied",
							id: message.id,
						});
					}
				}
			} catch (_e) {
				console.error("Error setting config:", e);
			}
			break;
		case "vsplot:test:getState":
			try {
				const state = {
					chartType: document.getElementById("chartType").value,
					x: parseInt(document.getElementById("xAxis").value),
					y: parseInt(document.getElementById("yAxis").value),
					y2: parseInt(document.getElementById("yAxis2").value),
					legend: document.getElementById("legendToggle").checked,
					dragZoom: document.getElementById("dragZoomToggle").checked,
					curveSmoothing: document.getElementById("curveToggle").checked,
					color: document.getElementById("colorPicker").value,
					agg: document.getElementById("aggFunc").value,
					stylePreset: document.getElementById("stylePreset").value,
					decimals: parseInt(document.getElementById("decimals").value),
					thousands: document.getElementById("thousands").checked,
					labelsCount:
						chart && chart.data && chart.data.labels && chart.data.labels.length
							? chart.data.labels.length
							: 0,
					datasetLens:
						chart && chart.data && chart.data.datasets
							? chart.data.datasets.map((d) =>
									Array.isArray(d.data) ? d.data.length : 0,
								)
							: [],
				};
				vscode.postMessage({
					type: "vsplot:test:state",
					id: message.id,
					payload: state,
				});
			} catch (_e) {
				vscode.postMessage({
					type: "vsplot:test:state",
					id: message.id,
					payload: { error: String(e) },
				});
			}
			break;
	}
});

/**
 * Apply configuration to UI controls
 * @param {Object} cfg - Configuration object
 */
function applyConfig(cfg) {
	if (cfg.chartType) document.getElementById("chartType").value = cfg.chartType;
	if (typeof cfg.x === "number")
		document.getElementById("xAxis").value = String(cfg.x);
	if (typeof cfg.y === "number")
		document.getElementById("yAxis").value = String(cfg.y);
	if (typeof cfg.y2 !== "undefined")
		document.getElementById("yAxis2").value = String(cfg.y2);
	if (typeof cfg.legend === "boolean")
		document.getElementById("legendToggle").checked = cfg.legend;
	if (typeof cfg.dragZoom === "boolean")
		document.getElementById("dragZoomToggle").checked = cfg.dragZoom;
	if (typeof cfg.curveSmoothing === "boolean")
		document.getElementById("curveToggle").checked = cfg.curveSmoothing;
	if (cfg.color) document.getElementById("colorPicker").value = cfg.color;
	if (cfg.agg) document.getElementById("aggFunc").value = cfg.agg;
	if (cfg.stylePreset) {
		document.getElementById("stylePreset").value = cfg.stylePreset;
		stylePreset = cfg.stylePreset;
	}
	if (typeof cfg.decimals === "number") {
		document.getElementById("decimals").value = String(cfg.decimals);
		decimals = cfg.decimals;
	}
	if (typeof cfg.thousands === "boolean") {
		document.getElementById("thousands").checked = !!cfg.thousands;
		useThousands = !!cfg.thousands;
	}
}

/**
 * Initialize chart UI with data
 */
function initializeChart() {
	if (!currentData) return;

	document.getElementById("title").textContent =
		`Chart: ${currentData.fileName}`;

	// Populate axis selectors
	const xAxisSelect = document.getElementById("xAxis");
	const yAxisSelect = document.getElementById("yAxis");
	const yAxis2Select = document.getElementById("yAxis2");

	xAxisSelect.innerHTML = "";
	yAxisSelect.innerHTML = "";
	yAxis2Select.innerHTML = "";

	// Y2: add None option
	const noneOpt = document.createElement("option");
	noneOpt.value = "-1";
	noneOpt.textContent = "- None -";
	yAxis2Select.appendChild(noneOpt);

	currentData.headers.forEach((header, index) => {
		const optionX = document.createElement("option");
		optionX.value = index;
		optionX.textContent = header;
		xAxisSelect.appendChild(optionX);

		const optionY = document.createElement("option");
		optionY.value = index;
		optionY.textContent = header;
		yAxisSelect.appendChild(optionY);

		const optionY2 = document.createElement("option");
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
			document.getElementById("chartType").value =
				saved.chartType || document.getElementById("chartType").value;
			document.getElementById("legendToggle").checked = !!saved.legend;
			document.getElementById("dragZoomToggle").checked = !!saved.dragZoom;
			document.getElementById("colorPicker").value =
				saved.color || document.getElementById("colorPicker").value;
			if (typeof saved.x === "number") xAxisSelect.selectedIndex = saved.x;
			if (typeof saved.y === "number") yAxisSelect.selectedIndex = saved.y;
			if (typeof saved.y2 === "number" || saved.y2 === -1)
				document.getElementById("yAxis2").value = String(saved.y2);
			if (saved.agg) document.getElementById("aggFunc").value = saved.agg;
			if (saved.stylePreset) {
				document.getElementById("stylePreset").value = saved.stylePreset;
				stylePreset = saved.stylePreset;
			}
			if (typeof saved.decimals === "number") {
				document.getElementById("decimals").value = String(saved.decimals);
				decimals = saved.decimals;
			}
			if (typeof saved.thousands === "boolean") {
				document.getElementById("thousands").checked = !!saved.thousands;
				useThousands = !!saved.thousands;
			}
			if (typeof saved.curveSmoothing === "boolean") {
				document.getElementById("curveToggle").checked = saved.curveSmoothing;
			}
			restored = true;
		} catch (_e) {
			console.error("Error restoring state:", e);
		}
	}
	if (!restored) {
		try {
			document.getElementById("stylePreset").value = stylePreset;
			document.getElementById("decimals").value = String(decimals);
			document.getElementById("thousands").checked = !!useThousands;
		} catch (_e) {
			console.error("Error setting defaults:", e);
		}
	}

	updateY2ToggleUI();

	// Heuristic defaults: prefer first two numeric columns for scatter, else bar
	const numericCols = getNumericColumnIndexes(currentData.rows);
	if (!restored && numericCols.length >= 2) {
		xAxisSelect.selectedIndex = numericCols[0];
		yAxisSelect.selectedIndex = numericCols[1];
		const chartTypeSel = document.getElementById("chartType");
		if (chartTypeSel) {
			chartTypeSel.value = "scatter";
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

/**
 * Create or update the chart based on current settings
 */
function createChart() {
	try {
		const chartType = document.getElementById("chartType").value;
		const xAxisIndex = parseInt(document.getElementById("xAxis").value);
		const yAxisIndex = parseInt(document.getElementById("yAxis").value);
		const yAxis2Index = parseInt(document.getElementById("yAxis2").value);
		const isCategoricalX = isCategoricalColumn(currentData.rows, xAxisIndex);
		const isCategoricalY = isCategoricalColumn(currentData.rows, yAxisIndex);
		const isCategoricalY2 =
			!isNaN(yAxis2Index) && yAxis2Index >= 0
				? isCategoricalColumn(currentData.rows, yAxis2Index)
				: false;
		const xIsTime = isTimeColumn(currentData.rows, xAxisIndex);
		stylePreset = document.getElementById("stylePreset").value || "clean";
		decimals = parseInt(document.getElementById("decimals").value) || 2;
		useThousands = document.getElementById("thousands").checked;

		if (isNaN(xAxisIndex) || isNaN(yAxisIndex)) {
			showError("Please select valid axes");
			return;
		}

		// Guard: line/scatter require numeric or time X, and numeric Y
		if (
			(chartType === "line" || chartType === "scatter") &&
			((isCategoricalX && !xIsTime) || isCategoricalY)
		) {
			showError("Line/Scatter require numeric or time X and numeric Y.");
			return;
		}

		// Allow scatter to have Y2 as separate dataset rendered against right axis

		if (
			(chartType === "line" ||
				chartType === "bar" ||
				chartType === "scatter") &&
			!isNaN(yAxis2Index) &&
			yAxis2Index >= 0 &&
			isCategoricalY2
		) {
			showError("Y2 must be numeric for Line/Bar charts.");
			return;
		}

		hideError();

		// Show/hide aggregation control
		const aggGroup = document.getElementById("aggGroup");
		const showAgg =
			(chartType === "bar" && !xIsTime) ||
			chartType === "pie" ||
			chartType === "doughnut";
		aggGroup.style.display = showAgg ? "flex" : "none";

		// Show/hide curve smoothing control (only for line charts)
		const smoothGroup = document.getElementById("smoothGroup");
		smoothGroup.style.display = chartType === "line" ? "flex" : "none";

		// Reflect Y2 UI state
		updateY2ToggleUI();

		// Prepare data
		const chartData = prepareChartData(
			chartType,
			xAxisIndex,
			yAxisIndex,
			isNaN(yAxis2Index) ? -1 : yAxis2Index,
		);

		// Destroy existing chart
		if (chart) {
			chart.destroy();
		}

		chartCanvas = document.getElementById("chart");
		const ctx = chartCanvas.getContext("2d");

		const dragEnabled = document.getElementById("dragZoomToggle").checked;
		const curveSmoothing =
			chartType === "line"
				? document.getElementById("curveToggle").checked
				: true;

		chart = new Chart(ctx, {
			type: chartType,
			data: chartData,
			options: getChartOptions(
				chartType,
				chartData.__xLabel,
				chartData.__yLabel,
				dragEnabled,
				!!chartData.__hasY2,
				chartData.__y2Label,
				curveSmoothing,
			),
		});

		// Apply compact class to stats cards
		try {
			const statsEl = document.getElementById("chartStats");
			const metaEl = document.getElementById("chartMeta");
			statsEl.classList.add("compact");
			metaEl.classList.add("compact");
		} catch (_e) {
			console.error("Error applying card classes:", e);
		}

		document.getElementById("noData").style.display = "none";
		chartCanvas.style.display = "block";

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
				legend: document.getElementById("legendToggle").checked,
				dragZoom: document.getElementById("dragZoomToggle").checked,
				curveSmoothing:
					chartType === "line"
						? document.getElementById("curveToggle").checked
						: undefined,
				color: document.getElementById("colorPicker").value,
				agg: document.getElementById("aggFunc").value,
				stylePreset,
				decimals,
				thousands: useThousands,
			};
			vscode.setState && vscode.setState({ byFile });
		} catch (_e) {
			console.error("Error saving state:", e);
		}

		// Cache initial bounds for manual reset fallback
		cacheInitialBounds(chart);
	} catch (_error) {
		showError("Error creating chart: " + error.message);
	}
}

/**
 * Prepare chart data based on chart type and selected axes
 * @param {string} chartType - Type of chart (line, bar, scatter, pie, doughnut)
 * @param {number} xAxisIndex - Index of X axis column
 * @param {number} yAxisIndex - Index of Y axis column
 * @param {number} yAxis2Index - Index of Y2 axis column (or -1 if none)
 * @returns {Object} Chart.js data object with labels and datasets
 */
function prepareChartData(chartType, xAxisIndex, yAxisIndex, yAxis2Index) {
	const xLabel = currentData.headers[xAxisIndex];
	const yLabel = currentData.headers[yAxisIndex];
	const hasY2 = typeof yAxis2Index === "number" && yAxis2Index >= 0;
	const y2Label = hasY2 ? currentData.headers[yAxis2Index] : undefined;
	const aggFunc = document.getElementById("aggFunc").value || "sum";
	const xIsTime = isTimeColumn(currentData.rows, xAxisIndex);

	if (chartType === "pie" || chartType === "doughnut") {
		// For pie charts, aggregate data by x-axis values
		const aggregatedData = {};
		const aggregator = makeAggregator(aggFunc);
		currentData.rows.forEach((row) => {
			const key = row[xAxisIndex];
			const value = parseFloat(row[yAxisIndex]) || 0;
			aggregator(aggregatedData, key, value);
		});

		const aggOut =
			aggFunc === "avg" ? collapseAvg(aggregatedData) : aggregatedData;
		const result = {
			labels: Object.keys(aggOut),
			datasets: [
				{
					label: yLabel,
					data: Object.values(aggOut),
					backgroundColor: generateColors(Object.keys(aggOut).length),
					borderWidth: 1,
				},
			],
		};
		result.__xLabel = xLabel;
		result.__yLabel = yLabel;
		result.__hasY2 = false;
		return result;
	} else if (chartType === "bar" && !xIsTime) {
		// Bar with non-time X: aggregate by distinct X values (categorical-like)
		const aggregated = {};
		const aggregated2 = {};
		const agg1 = makeAggregator(aggFunc);
		const agg2 = makeAggregator(aggFunc);
		currentData.rows.forEach((row) => {
			const key = String(row[xAxisIndex]);
			const val = parseFloat(row[yAxisIndex]) || 0;
			agg1(aggregated, key, val);
			if (hasY2) {
				const val2 = parseFloat(row[yAxis2Index]) || 0;
				agg2(aggregated2, key, val2);
			}
		});
		const out1 = aggFunc === "avg" ? collapseAvg(aggregated) : aggregated;
		const out2 = aggFunc === "avg" ? collapseAvg(aggregated2) : aggregated2;
		const labels = Object.keys(out1).sort((a, b) =>
			String(a).localeCompare(String(b)),
		);
		const values = labels.map((k) => out1[k]);
		const values2 = hasY2 ? labels.map((k) => out2[k] || 0) : undefined;
		const result = {
			labels,
			datasets: [
				{
					label: yLabel,
					data: values,
					backgroundColor: getPickedColor("rgba", 0.7),
					borderColor: getPickedColor("rgba", 1),
					borderWidth: 1,
					borderRadius: 4,
					borderSkipped: false,
				},
			].concat(
				hasY2
					? [
							{
								label: y2Label,
								data: values2,
								yAxisID: "y2",
								backgroundColor: "rgba(255,99,132,0.6)",
								borderColor: "rgba(255,99,132,1)",
								borderWidth: 1,
								borderRadius: 4,
								borderSkipped: false,
							},
						]
					: [],
			),
		};
		result.__xLabel = xLabel;
		result.__yLabel = yLabel;
		result.__hasY2 = hasY2;
		result.__y2Label = y2Label;
		return result;
	} else {
		// For other chart types
		let result;
		if (chartType === "scatter") {
			const points = currentData.rows.map((row) => ({
				x: xIsTime
					? new Date(row[xAxisIndex])
					: parseFloat(row[xAxisIndex]) || 0,
				y: parseFloat(row[yAxisIndex]) || 0,
			}));
			result = {
				datasets: [
					{
						label: yLabel,
						data: points,
						backgroundColor: getPickedColor("rgba", 0.6),
						borderColor: getPickedColor("rgba", 1),
						borderWidth: 1,
						showLine: false,
					},
				].concat(
					hasY2
						? [
								{
									label: y2Label,
									data: currentData.rows.map((row) => ({
										x: xIsTime
											? new Date(row[xAxisIndex])
											: parseFloat(row[xAxisIndex]) || 0,
										y: parseFloat(row[yAxis2Index]) || 0,
									})),
									yAxisID: "y2",
									backgroundColor: "rgba(255,99,132,0.6)",
									borderColor: "rgba(255,99,132,1)",
									borderWidth: 1,
									showLine: false,
								},
							]
						: [],
				),
			};
		} else {
			const xIsTimeLocal = xIsTime;
			if (chartType === "line" && xIsTimeLocal) {
				const points = currentData.rows.map((row) => ({
					x: new Date(row[xAxisIndex]),
					y: parseFloat(row[yAxisIndex]) || 0,
				}));
				const points2 = hasY2
					? currentData.rows.map((row) => ({
							x: new Date(row[xAxisIndex]),
							y: parseFloat(row[yAxis2Index]) || 0,
						}))
					: undefined;
				result = {
					datasets: [
						{
							label: yLabel,
							data: points,
							backgroundColor: getPickedColor("rgba", 0.2),
							borderColor: getPickedColor("rgba", 1),
							borderWidth: 2,
							fill: false,
						},
					].concat(
						hasY2
							? [
									{
										label: y2Label,
										data: points2,
										yAxisID: "y2",
										backgroundColor: "rgba(255,99,132,0.3)",
										borderColor: "rgba(255,99,132,1)",
										borderWidth: 2,
										fill: false,
									},
								]
							: [],
					),
				};
			} else {
				const labels = xIsTimeLocal
					? currentData.rows.map((row) => new Date(row[xAxisIndex]))
					: currentData.rows.map((row) => row[xAxisIndex]);
				const values = currentData.rows.map(
					(row) => parseFloat(row[yAxisIndex]) || 0,
				);
				const values2 = hasY2
					? currentData.rows.map((row) => parseFloat(row[yAxis2Index]) || 0)
					: undefined;
				result = {
					labels,
					datasets: [
						{
							label: yLabel,
							data: values,
							backgroundColor:
								chartType === "bar"
									? getPickedColor("rgba", 0.7)
									: getPickedColor("rgba", 0.2),
							borderColor: getPickedColor("rgba", 1),
							borderWidth: chartType === "bar" ? 1 : 2,
							borderRadius: chartType === "bar" ? 4 : 0,
							borderSkipped: chartType === "bar" ? false : undefined,
							fill: chartType === "line" ? false : true,
						},
					].concat(
						hasY2
							? [
									{
										label: y2Label,
										data: values2,
										yAxisID: "y2",
										backgroundColor: "rgba(255,99,132,0.3)",
										borderColor: "rgba(255,99,132,1)",
										borderWidth: chartType === "bar" ? 1 : 2,
										borderRadius: chartType === "bar" ? 4 : 0,
										borderSkipped: chartType === "bar" ? false : undefined,
										fill: chartType === "line" ? false : true,
									},
								]
							: [],
					),
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

/**
 * Get chart options based on type and configuration
 * @param {string} chartType - Type of chart
 * @param {string} xAxisTitle - X axis title
 * @param {string} yAxisTitle - Y axis title
 * @param {boolean} dragEnabled - Whether drag zoom is enabled
 * @param {boolean} hasY2 - Whether secondary Y axis is present
 * @param {string} y2Title - Y2 axis title
 * @param {boolean} curveSmoothing - Whether to apply curve smoothing to line charts
 * @returns {Object} Chart.js options object
 */
function getChartOptions(
	chartType,
	xAxisTitle,
	yAxisTitle,
	dragEnabled,
	hasY2,
	y2Title,
	curveSmoothing = true,
) {
	const fg = getComputedStyle(document.body).getPropertyValue(
		"--vscode-foreground",
	);
	const grid = getComputedStyle(document.body).getPropertyValue(
		"--vscode-widget-border",
	);
	const tooltipBg =
		getComputedStyle(document.body).getPropertyValue(
			"--vscode-editorHoverWidget-background",
		) || "rgba(0,0,0,0.8)";
	const tooltipFg =
		getComputedStyle(document.body).getPropertyValue(
			"--vscode-editorHoverWidget-foreground",
		) || fg;
	const baseOptions = {
		responsive: true,
		maintainAspectRatio: false,
		elements: {
			line: {
				tension: curveSmoothing ? 0.3 : 0,
				cubicInterpolationMode: curveSmoothing ? "monotone" : "default",
			},
			point: {
				radius: 2,
				hoverRadius: 4,
			},
		},
		plugins: {
			tooltip: {
				backgroundColor: tooltipBg,
				titleColor: tooltipFg,
				bodyColor: tooltipFg,
				borderColor: grid,
				borderWidth: 1,
				callbacks: {
					label: (ctx) => {
						try {
							const dsLabel = ctx.dataset.label ? ctx.dataset.label + ": " : "";
							const val =
								typeof ctx.raw === "object" && ctx.raw && "y" in ctx.raw
									? ctx.raw.y
									: ctx.parsed !== undefined
										? (ctx.parsed.y ?? ctx.parsed)
										: ctx.raw;
							if (typeof val === "number") return dsLabel + formatNumber(val);
							return dsLabel + String(val);
						} catch (_e) {
							return ctx.formattedValue;
						}
					},
				},
			},
			zoom: {
				zoom: {
					wheel: {
						enabled: true,
					},
					pinch: {
						enabled: true,
					},
					mode: "xy",
				},
				pan: {
					enabled: true,
					mode: "xy",
				},
				limits: {},
				drag: {
					enabled: !!dragEnabled,
					modifierKey: "shift",
				},
			},
			legend: {
				display: document.getElementById("legendToggle")?.checked ?? true,
				labels: {
					color: fg,
				},
			},
		},
	};

	if (
		chartType !== "pie" &&
		chartType !== "doughnut" &&
		chartType !== "radar"
	) {
		baseOptions.scales = {
			x: {
				type: detectXScaleType(),
				ticks: {
					color: fg,
					callback: (v) => {
						try {
							return formatTick("x", v);
						} catch (_e) {
							return v;
						}
					},
				},
				grid: { color: grid },
				title: {
					display: !!xAxisTitle,
					text: xAxisTitle,
					color: getComputedStyle(document.body).getPropertyValue(
						"--vscode-descriptionForeground",
					),
				},
			},
			y: {
				ticks: {
					color: fg,
					callback: (v) => {
						try {
							return formatTick("y", v);
						} catch (_e) {
							return v;
						}
					},
				},
				grid: { color: grid },
				title: {
					display: !!yAxisTitle,
					text: yAxisTitle,
					color: getComputedStyle(document.body).getPropertyValue(
						"--vscode-descriptionForeground",
					),
				},
			},
		};
		if (hasY2) {
			baseOptions.scales.y2 = {
				position: "right",
				ticks: {
					color: fg,
					callback: (v) => {
						try {
							return formatTick("y2", v);
						} catch (_e) {
							return v;
						}
					},
				},
				grid: {
					drawOnChartArea: false,
				},
				title: {
					display: !!y2Title,
					text: y2Title,
					color: getComputedStyle(document.body).getPropertyValue(
						"--vscode-descriptionForeground",
					),
				},
			};
		}
	}

	return baseOptions;
}

/**
 * Detect X scale type (time, linear, or category)
 * @returns {string|undefined} Scale type
 */
function detectXScaleType() {
	const idx = parseInt(document.getElementById("xAxis").value);
	if (isTimeColumn(currentData.rows, idx)) return "time";
	const chartType = document.getElementById("chartType").value;
	if (chartType === "scatter") return "linear";
	return undefined;
}

/**
 * Check if column contains time/date values
 * @param {Array} rows - Data rows
 * @param {number} index - Column index
 * @returns {boolean} True if column is time-based
 */
function isTimeColumn(rows, index) {
	let timeCount = 0,
		total = 0;
	for (let r = 0; r < Math.min(rows.length, 50); r++) {
		const v = rows[r][index];
		if (v == null || v === "") {
			total++;
			continue;
		}

		// Skip pure numbers - they should not be treated as dates
		// (JavaScript Date() accepts numbers as milliseconds since epoch)
		// Handles regular numbers, decimals, and scientific notation (e.g., 1.5e-10, 3.2e8)
		if (
			typeof v === "number" ||
			(typeof v === "string" && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v.trim()))
		) {
			total++;
			continue;
		}

		const d = new Date(v);
		if (!isNaN(d.getTime())) timeCount++;
		total++;
	}
	return total > 0 && timeCount / total >= 0.6;
}

/**
 * Get color palette based on style preset
 * @returns {Array<string>} Array of color strings
 */
function getPalette() {
	if (stylePreset === "vibrant")
		return [
			"rgba(255, 99, 132, 0.85)",
			"rgba(54, 162, 235, 0.85)",
			"rgba(255, 206, 86, 0.85)",
			"rgba(75, 192, 192, 0.85)",
			"rgba(153, 102, 255, 0.85)",
			"rgba(255, 159, 64, 0.85)",
			"rgba(0,200,83,0.85)",
			"rgba(233,30,99,0.85)",
		];
	if (stylePreset === "soft")
		return [
			"rgba(99, 110, 250, 0.6)",
			"rgba(239, 85, 59, 0.6)",
			"rgba(0, 204, 150, 0.6)",
			"rgba(171, 99, 250, 0.6)",
			"rgba(255, 161, 90, 0.6)",
			"rgba(25, 211, 243, 0.6)",
			"rgba(255, 102, 146, 0.6)",
		];
	return [
		"rgba(120, 144, 156, 0.7)",
		"rgba(33, 150, 243, 0.7)",
		"rgba(156, 39, 176, 0.7)",
		"rgba(76, 175, 80, 0.7)",
		"rgba(255, 193, 7, 0.7)",
		"rgba(244, 67, 54, 0.7)",
		"rgba(0, 188, 212, 0.7)",
	];
}

/**
 * Generate array of colors for charts
 * @param {number} count - Number of colors needed
 * @returns {Array<string>} Array of color strings
 */
function generateColors(count) {
	const palette = getPalette();
	const result = [];
	for (let i = 0; i < count; i++) {
		result.push(palette[i % palette.length]);
	}
	return result;
}

/**
 * Update chart statistics display
 */
function updateChartStats() {
	if (!currentData) return;

	const stats = document.getElementById("chartStats");
	const meta = document.getElementById("chartMeta");
	const xAxisIndex = parseInt(document.getElementById("xAxis").value);
	const yAxisIndex = parseInt(document.getElementById("yAxis").value);

	const yValues = currentData.rows
		.map((row) => parseFloat(row[yAxisIndex]))
		.filter((val) => !isNaN(val));

	if (yValues.length > 0) {
		const min = Math.min(...yValues);
		const max = Math.max(...yValues);
		const avg = yValues.reduce((a, b) => a + b, 0) / yValues.length;
		const sorted = [...yValues].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		const median =
			sorted.length % 2 !== 0
				? sorted[mid]
				: (sorted[mid - 1] + sorted[mid]) / 2;
		const variance =
			yValues.reduce((acc, v) => acc + (v - avg) ** 2, 0) /
			(yValues.length > 1 ? yValues.length - 1 : 1);
		const stddev = Math.sqrt(variance);

		stats.innerHTML = `
            <div class="section-title">Statistics</div>
            <div class="stats-grid">
                <div class="stat">
                    <span class="badge">
                        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="Data points">
                            <path d="M14 2H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm0 11H2V3h12v10zM4 5h8v2H4V5zm0 3h6v2H4V8z"/>
                        </svg>
                    </span>
                    <div><strong>Data points:</strong> ${yValues.length}</div>
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
            </div>
        `;
		stats.style.display = "block";
	} else {
		stats.style.display = "none";
	}

	// Meta info
	meta.innerHTML = `
        <div class="section-title">Dataset</div>
        <div class="stats-grid">
            <div class="stat">
                <span class="badge">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="File name">
                        <path d="M13.5 1H3.5C2.67 1 2 1.67 2 2.5v11c0 .83.67 1.5 1.5 1.5h10c.83 0 1.5-.67 1.5-1.5v-11c0-.83-.67-1.5-1.5-1.5zM4 4h8v2H4V4zm0 3h8v2H4V7zm0 3h5v2H4v-2z"/>
                    </svg>
                </span>
                <div><strong>File:</strong> ${currentData.fileName}</div>
            </div>
            <div class="stat">
                <span class="badge">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="Number of columns">
                        <path d="M2 2h2v12H2V2zm4 0h2v12H6V2zm4 0h2v12h-2V2z"/>
                    </svg>
                </span>
                <div><strong>Columns:</strong> ${currentData.headers.length}</div>
            </div>
            <div class="stat">
                <span class="badge">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="Number of rows">
                        <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/>
                    </svg>
                </span>
                <div><strong>Rows:</strong> ${currentData.totalRows}</div>
            </div>
        </div>
    `;
	meta.style.display = "block";
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
	const errorElement = document.getElementById("errorMessage");
	errorElement.textContent = message;
	errorElement.style.display = "block";
}

/**
 * Hide error message
 */
function hideError() {
	document.getElementById("errorMessage").style.display = "none";
}

// ==================== Event Listeners ====================

document.getElementById("updateChart").addEventListener("click", createChart);
document.getElementById("chartType").addEventListener("change", createChart);
document.getElementById("xAxis").addEventListener("change", createChart);
document.getElementById("yAxis").addEventListener("change", createChart);

document.getElementById("legendToggle").addEventListener("change", () => {
	if (chart) {
		chart.options.plugins.legend.display =
			document.getElementById("legendToggle").checked;
		chart.update();
	}
});

document.getElementById("dragZoomToggle").addEventListener("change", () => {
	if (chart) {
		const enabled = document.getElementById("dragZoomToggle").checked;
		chart.options.plugins.zoom.drag = chart.options.plugins.zoom.drag || {};
		chart.options.plugins.zoom.drag.enabled = enabled;
		chart.update();
		setupManualDrag(enabled && !pluginAvailable);
	}
});

document.getElementById("curveToggle").addEventListener("change", () => {
	if (chart) {
		const curveSmoothing = document.getElementById("curveToggle").checked;
		chart.options.elements.line.tension = curveSmoothing ? 0.3 : 0;
		chart.options.elements.line.cubicInterpolationMode = curveSmoothing
			? "monotone"
			: "default";
		chart.update();
	}
});

// Color picker handling
document.getElementById("colorPicker").addEventListener("change", () => {
	if (chart) {
		const color = document.getElementById("colorPicker").value;
		const rgba = hexToRgba(color, 0.6);
		const line = hexToRgba(color, 1);
		chart.data.datasets.forEach((ds) => {
			ds.backgroundColor = rgba;
			ds.borderColor = line;
		});
		chart.update();
	}
});

document.getElementById("zoomIn").addEventListener("click", () => {
	if (chart && typeof chart.zoom === "function") {
		chart.zoom(1.2);
	} else if (chart) {
		programmaticZoom(chart, 0.8);
	}
});

document.getElementById("zoomOut").addEventListener("click", () => {
	if (chart && typeof chart.zoom === "function") {
		chart.zoom(0.8);
	} else if (chart) {
		programmaticZoom(chart, 1.25);
	}
});

document.getElementById("resetZoom").addEventListener("click", () => {
	if (chart && typeof chart.resetZoom === "function") {
		chart.resetZoom();
	} else if (chart) {
		resetToInitialBounds(chart);
	}
});

document.getElementById("exportChart").addEventListener("click", () => {
	if (chart) {
		const url = chart.toBase64Image();
		vscode.postMessage({
			type: "exportChart",
			data: url,
			filename: `chart_${currentData.fileName}_${Date.now()}.png`,
		});
	}
});

// Aggregation change should re-render
document.getElementById("aggFunc").addEventListener("change", createChart);
document.getElementById("stylePreset").addEventListener("change", createChart);
document.getElementById("decimals").addEventListener("change", () => {
	decimals = parseInt(document.getElementById("decimals").value) || 2;
	if (chart) {
		const curveSmoothing =
			chart.config.type === "line"
				? document.getElementById("curveToggle").checked
				: true;
		chart.options = getChartOptions(
			chart.config.type,
			chart.options.scales?.x?.title?.text,
			chart.options.scales?.y?.title?.text,
			document.getElementById("dragZoomToggle").checked,
			!!chart.options.scales?.y2,
			chart.options.scales?.y2?.title?.text,
			curveSmoothing,
		);
		chart.update();
	}
});

document.getElementById("thousands").addEventListener("change", () => {
	useThousands = document.getElementById("thousands").checked;
	if (chart) {
		const curveSmoothing =
			chart.config.type === "line"
				? document.getElementById("curveToggle").checked
				: true;
		chart.options = getChartOptions(
			chart.config.type,
			chart.options.scales?.x?.title?.text,
			chart.options.scales?.y?.title?.text,
			document.getElementById("dragZoomToggle").checked,
			!!chart.options.scales?.y2,
			chart.options.scales?.y2?.title?.text,
			curveSmoothing,
		);
		chart.update();
	}
});

document.getElementById("compactCardsToggle").addEventListener("change", () => {
	compactCards = document.getElementById("compactCardsToggle").checked;
	try {
		const statsEl = document.getElementById("chartStats");
		const metaEl = document.getElementById("chartMeta");
		statsEl.classList.toggle("compact", !!compactCards);
		metaEl.classList.toggle("compact", !!compactCards);
	} catch (_e) {
		console.error("Error toggling compact cards:", e);
	}
	// persist without forcing chart rebuild
	try {
		const state = vscode.getState && vscode.getState();
		const byFile = state && state.byFile ? state.byFile : {};
		byFile[currentData.fileName] = Object.assign(
			{},
			byFile[currentData.fileName] || {},
			{
				compactCards,
			},
		);
		vscode.setState && vscode.setState({ byFile });
	} catch (_e) {
		console.error("Error persisting compact cards state:", e);
	}
});

document.getElementById("iconsToggle").addEventListener("change", () => {
	showIcons = document.getElementById("iconsToggle").checked;
	try {
		const statsEl = document.getElementById("chartStats");
		const metaEl = document.getElementById("chartMeta");
		statsEl.classList.toggle("no-icons", !showIcons);
		metaEl.classList.toggle("no-icons", !showIcons);
	} catch (_e) {
		console.error("Error toggling icons:", e);
	}
	try {
		const state = vscode.getState && vscode.getState();
		const byFile = state && state.byFile ? state.byFile : {};
		byFile[currentData.fileName] = Object.assign(
			{},
			byFile[currentData.fileName] || {},
			{
				showIcons,
			},
		);
		vscode.setState && vscode.setState({ byFile });
	} catch (_e) {
		console.error("Error persisting icons state:", e);
	}
});

// Y2 quick toggle
document.getElementById("addY2Btn").addEventListener("click", () => {
	const y2Sel = document.getElementById("yAxis2");
	const ySel = document.getElementById("yAxis");
	const current = parseInt(y2Sel.value);
	if (isNaN(current) || current < 0) {
		// add: suggest next numeric column different from Y
		const numCols = getNumericColumnIndexes(currentData.rows);
		const yIdx = parseInt(ySel.value);
		const candidate = numCols.find((i) => i !== yIdx);
		if (typeof candidate === "number") {
			y2Sel.value = String(candidate);
		} else if (numCols.length > 0) {
			y2Sel.value = String(numCols[0]);
		} else {
			y2Sel.value = "-1";
		}
	} else {
		// remove
		y2Sel.value = "-1";
	}
	updateY2ToggleUI();
	createChart();
});

/**
 * Update Y2 toggle button text
 */
function updateY2ToggleUI() {
	const btn = document.getElementById("addY2Btn");
	const y2Sel = document.getElementById("yAxis2");
	const active = !isNaN(parseInt(y2Sel.value)) && parseInt(y2Sel.value) >= 0;
	btn.textContent = active ? "Remove Y2" : "+ Add Y2";
}

// ==================== Utility Functions ====================

/**
 * Get numeric column indexes from data
 * @param {Array} rows - Data rows
 * @returns {Array<number>} Array of numeric column indexes
 */
function getNumericColumnIndexes(rows) {
	if (!rows || rows.length === 0) return [];
	const cols = rows[0].length;
	const indexes = [];
	for (let c = 0; c < cols; c++) {
		let numCount = 0,
			total = 0;
		for (let r = 0; r < Math.min(rows.length, 50); r++) {
			const v = rows[r][c];
			const n = typeof v === "number" ? v : parseFloat(v);
			if (!Number.isNaN(n)) numCount++;
			total++;
		}
		if (total > 0 && numCount / total >= 0.7) {
			indexes.push(c);
		}
	}
	return indexes;
}

/**
 * Create an aggregator function
 * @param {string} kind - Type of aggregation (sum, count, avg, min, max)
 * @returns {Function} Aggregator function
 */
function makeAggregator(kind) {
	if (kind === "count") {
		return (obj, key, value) => {
			obj[key] = (obj[key] || 0) + 1;
		};
	}
	if (kind === "avg") {
		return (obj, key, value) => {
			const cur = obj[key] || { s: 0, c: 0 };
			cur.s += value;
			cur.c += 1;
			obj[key] = cur;
		};
	}
	if (kind === "min") {
		return (obj, key, value) => {
			obj[key] = obj[key] == null ? value : Math.min(obj[key], value);
		};
	}
	if (kind === "max") {
		return (obj, key, value) => {
			obj[key] = obj[key] == null ? value : Math.max(obj[key], value);
		};
	}
	// sum default
	return (obj, key, value) => {
		obj[key] = (obj[key] || 0) + value;
	};
}

/**
 * Convert averaged aggregation shape to numbers
 * @param {Object} obj - Aggregated data object
 * @returns {Object} Collapsed averages
 */
function collapseAvg(obj) {
	const out = {};
	for (const k in obj) {
		const v = obj[k];
		out[k] =
			typeof v === "object" && v && "s" in v && "c" in v
				? v.c
					? v.s / v.c
					: 0
				: v;
	}
	return out;
}

/**
 * Format number with decimal places and thousands separator
 * @param {number} n - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(n) {
	if (typeof n !== "number" || !isFinite(n)) return String(n);
	try {
		const nf = new Intl.NumberFormat(undefined, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
			useGrouping: !!useThousands,
		});
		return nf.format(n);
	} catch (_e) {
		const fixed = n.toFixed(decimals);
		return fixed;
	}
}

/**
 * Format tick values for axes
 * @param {string} axis - Axis name (x, y, y2)
 * @param {*} v - Tick value
 * @returns {*} Formatted value
 */
function formatTick(axis, v) {
	const xType = detectXScaleType();
	if (axis === "x") {
		if (xType === "time") return v; // let adapter format time
		if (xType === "linear" && typeof v === "number") return formatNumber(v);
		return v;
	}
	if (typeof v === "number") return formatNumber(v);
	return v;
}

/**
 * Convert hex color to rgba
 * @param {string} hex - Hex color string
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA color string
 */
function hexToRgba(hex, alpha = 1) {
	const m = /^#?([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/.exec(hex);
	if (!m) return "rgba(54,162,235," + alpha + ")";
	const r = parseInt(m[1], 16);
	const g = parseInt(m[2], 16);
	const b = parseInt(m[3], 16);
	return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

/**
 * Get picked color from color picker
 * @param {string} fmt - Format (rgba)
 * @param {number} alpha - Alpha value
 * @returns {string} Color string
 */
function getPickedColor(fmt = "rgba", alpha = 0.6) {
	const val = document.getElementById("colorPicker").value || "#36a2eb";
	return hexToRgba(val, alpha);
}

/**
 * Check if column is categorical
 * @param {Array} rows - Data rows
 * @param {number} index - Column index
 * @returns {boolean} True if categorical
 */
function isCategoricalColumn(rows, index) {
	let catCount = 0,
		total = 0;
	for (let r = 0; r < Math.min(rows.length, 50); r++) {
		const v = rows[r][index];
		if (typeof v === "number") {
			total++;
			continue;
		}
		if (v == null || v === "") {
			total++;
			catCount++;
			continue;
		}
		const n = typeof v === "string" ? Number(v) : Number(String(v));
		if (Number.isNaN(n)) {
			catCount++;
		}
		total++;
	}
	return total > 0 && catCount / total >= 0.5;
}

/**
 * Programmatic zoom function (fallback)
 * @param {Object} c - Chart instance
 * @param {number} factor - Zoom factor
 */
function programmaticZoom(c, factor) {
	if (!c.options.scales) return;
	const scales = c.options.scales;
	["x", "y"].forEach((axis) => {
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

/**
 * Setup manual drag zoom functionality
 * @param {boolean} enable - Whether to enable manual drag
 */
function setupManualDrag(enable) {
	const container = document.querySelector(".chart-container");
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
	dragOverlay = document.createElement("div");
	dragOverlay.style.position = "absolute";
	dragOverlay.style.border = "1px dashed var(--vscode-foreground)";
	dragOverlay.style.background = "rgba(0,0,0,0.1)";
	dragOverlay.style.pointerEvents = "none";
	dragOverlay.style.display = "none";
	container.appendChild(dragOverlay);

	chartCanvas.onmousedown = (e) => {
		if (!e.shiftKey) return;
		const rect = chartCanvas.getBoundingClientRect();
		start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		dragOverlay.style.left = e.clientX - rect.left + "px";
		dragOverlay.style.top = e.clientY - rect.top + "px";
		dragOverlay.style.width = "0px";
		dragOverlay.style.height = "0px";
		dragOverlay.style.display = "block";
	};

	chartCanvas.onmousemove = (e) => {
		if (!start) return;
		const rect = chartCanvas.getBoundingClientRect();
		const w = e.clientX - rect.left - start.x;
		const h = e.clientY - rect.top - start.y;
		if (w < 0) {
			dragOverlay.style.left = e.clientX - rect.left + "px";
			dragOverlay.style.width = Math.abs(w) + "px";
		} else {
			dragOverlay.style.width = w + "px";
		}
		if (h < 0) {
			dragOverlay.style.top = e.clientY - rect.top + "px";
			dragOverlay.style.height = Math.abs(h) + "px";
		} else {
			dragOverlay.style.height = h + "px";
		}
	};

	window.onmouseup = (e) => {
		if (!start) return;
		dragOverlay.style.display = "none";
		const rect = chartCanvas.getBoundingClientRect();
		const endX = e.clientX - rect.left;
		const endY = e.clientY - rect.top;
		const minX = Math.min(start.x, endX);
		const maxX = Math.max(start.x, endX);
		const minY = Math.min(start.y, endY);
		const maxY = Math.max(start.y, endY);
		start = null;
		// Apply manual zoom
		if (
			Math.abs(maxX - minX) > 5 &&
			Math.abs(maxY - minY) > 5 &&
			chart &&
			chart.scales
		) {
			try {
				const xScale = chart.scales.x;
				const yScale = chart.scales.y;
				if (xScale && yScale) {
					const xMin = xScale.getValueForPixel(minX);
					const xMax = xScale.getValueForPixel(maxX);
					const yMin = yScale.getValueForPixel(maxY);
					const yMax = yScale.getValueForPixel(minY);
					if (chart.options.scales) {
						if (chart.options.scales.x) {
							chart.options.scales.x.min = xMin;
							chart.options.scales.x.max = xMax;
						}
						if (chart.options.scales.y) {
							chart.options.scales.y.min = yMin;
							chart.options.scales.y.max = yMax;
						}
						chart.update();
					}
				}
			} catch (_e) {
				console.error("Error applying manual zoom:", e);
			}
		}
	};
}

/**
 * Cache initial chart bounds
 * @param {Object} c - Chart instance
 */
function cacheInitialBounds(c) {
	if (!c || !c.options.scales) return;
	initialBounds = {};
	for (const id in c.options.scales) {
		const s = c.options.scales[id];
		const chartScale = c.scales[id];
		if (chartScale) {
			initialBounds[id] = { min: chartScale.min, max: chartScale.max };
		}
	}
}

/**
 * Reset chart to initial bounds
 * @param {Object} c - Chart instance
 */
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
