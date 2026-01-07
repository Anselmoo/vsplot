/* Chart View Main Script (trimmed header omitted for brevity) */

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
let scientific = false;
let logScaleState = { x: false, y: false, y2: false };

/* initialize plugin, message handlers, applyConfig, initializeChart omitted for brevity */

// ==================== Event Listeners ====================

document.getElementById("updateChart").addEventListener("click", createChart);
document.getElementById("chartType").addEventListener("change", createChart);
document.getElementById("xAxis").addEventListener("change", createChart);
document.getElementById("yAxis").addEventListener("change", createChart);

const legendToggle = document.getElementById("legendToggle");
if (legendToggle) {
	legendToggle.addEventListener("change", () => {
		if (chart) {
			chart.options.plugins.legend.display = legendToggle.checked;
			chart.update();
		}
	});
}

const dragZoomToggle = document.getElementById("dragZoomToggle");
if (dragZoomToggle) {
	dragZoomToggle.addEventListener("change", () => {
		if (chart) {
			const enabled = dragZoomToggle.checked;
			chart.options.plugins.zoom.drag = chart.options.plugins.zoom.drag || {};
			chart.options.plugins.zoom.drag.enabled = enabled;
			chart.update();
			setupManualDrag(enabled && !pluginAvailable);
		}
	});
}

const curveToggle = document.getElementById("curveToggle");
if (curveToggle) {
	curveToggle.addEventListener("change", () => {
		if (chart) {
			const curveSmoothing = curveToggle.checked;
			chart.options.elements.line.tension = curveSmoothing ? 0.3 : 0;
			chart.options.elements.line.cubicInterpolationMode = curveSmoothing
				? "monotone"
				: "default";
			chart.update();
		}
	});
}

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
	syncFormatFromUI();
	if (chart) {
		const curveSmoothing =
			chart.config.type === "line"
				? document.getElementById("curveToggle").checked
				: true;
		chart.options = getChartOptions(
			chart.config.type,
			chart.options.scales?.x?.title?.text,
			chart.options.scales?.y?.title?.text,
			document.getElementById("dragZoomToggle")?.checked ?? true,
			!!chart.options.scales?.y2,
			chart.options.scales?.y2?.title?.text,
			curveSmoothing,
		);
		chart.update();
	}
});

// Arrow key navigation for panning the chart
document.addEventListener('keydown', (e) => {
	if (!chart || !chart.options.plugins.zoom) return;
	
	const panAmount = 50; // pixels to pan
	const key = e.key;
	
	if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
		e.preventDefault();
		
		const xScale = chart.scales.x;
		const yScale = chart.scales.y;
		
		if (!xScale || !yScale) return;
		
		const xRange = xScale.max - xScale.min;
		const yRange = yScale.max - yScale.min;
		
		// Calculate pan delta as percentage of range
		const xDelta = (xRange * 0.1); // 10% of range
		const yDelta = (yRange * 0.1);
		
		switch(key) {
			case 'ArrowLeft':
				xScale.options.min = xScale.min - xDelta;
				xScale.options.max = xScale.max - xDelta;
				break;
			case 'ArrowRight':
				xScale.options.min = xScale.min + xDelta;
				xScale.options.max = xScale.max + xDelta;
				break;
			case 'ArrowUp':
				yScale.options.min = yScale.min + yDelta;
				yScale.options.max = yScale.max + yDelta;
				break;
			case 'ArrowDown':
				yScale.options.min = yScale.min - yDelta;
				yScale.options.max = yScale.max - yDelta;
				break;
		}
		
		chart.update('none');
	}
});

// Remaining functions omitted for brevity
