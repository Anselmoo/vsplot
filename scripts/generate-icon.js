// Generates colored chart images at multiple sizes under images/
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const imagesDir = path.join(__dirname, "..", "images");
if (!fs.existsSync(imagesDir)) {
	fs.mkdirSync(imagesDir, { recursive: true });
}

// Palette
const colors = {
	bgTop: { r: 32, g: 34, b: 40, a: 255 }, // #202228
	bgBottom: { r: 43, g: 45, b: 49, a: 255 }, // #2b2d31
	grid: { r: 255, g: 255, b: 255, a: 26 }, // ~10% white
	axes: { r: 220, g: 224, b: 229, a: 255 }, // light gray
	line: { r: 79, g: 195, b: 247, a: 255 }, // #4FC3F7 accent
	bar1: { r: 74, g: 222, b: 128, a: 255 }, // #4ADE80 green
	bar2: { r: 245, g: 158, b: 11, a: 255 }, // #F59E0B orange
	bar3: { r: 167, g: 139, b: 250, a: 255 }, // #A78BFA violet
};

function createPNG(width, height) {
	return new PNG({ width, height });
}

function setPixel(png, width, x, y, c) {
	if (x < 0 || y < 0 || x >= width || y >= png.height) {
		return;
	}
	const idx = (width * y + x) << 2;
	png.data[idx] = c.r;
	png.data[idx + 1] = c.g;
	png.data[idx + 2] = c.b;
	png.data[idx + 3] = c.a;
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}
function mix(c1, c2, t) {
	return {
		r: Math.round(lerp(c1.r, c2.r, t)),
		g: Math.round(lerp(c1.g, c2.g, t)),
		b: Math.round(lerp(c1.b, c2.b, t)),
		a: Math.round(lerp(c1.a, c2.a, t)),
	};
}

function fillVerticalGradient(png, width, cTop, cBottom) {
	for (let y = 0; y < png.height; y++) {
		const t = y / (png.height - 1);
		const row = mix(cTop, cBottom, t);
		for (let x = 0; x < width; x++) {
			setPixel(png, width, x, y, row);
		}
	}
}

function drawGrid(png, width, margin, color, stepY) {
	const baseY = png.height - margin;
	for (let y = baseY; y >= margin; y -= stepY) {
		for (let x = margin; x < width - margin; x++) {
			setPixel(png, width, x, y, color);
		}
	}
}

function drawAxes(png, width, margin, color, thickness) {
	const baseY = png.height - margin;
	// X axis
	for (let t = 0; t < thickness; t++) {
		for (let x = margin; x < width - margin / 2; x++) {
			setPixel(png, width, x, baseY + t, color);
		}
	}
	// Y axis
	for (let t = 0; t < thickness; t++) {
		for (let y = margin / 2; y < baseY + 1; y++) {
			setPixel(png, width, margin + t, y, color);
		}
	}
}

function drawBars(png, width, margin, baseY, barHeightsPx, barColors) {
	const drawableW = width - margin * 2;
	const n = barHeightsPx.length;
	const gap = Math.max(4, Math.round(drawableW * 0.06));
	const totalGaps = gap * (n - 1);
	const barWidth = Math.max(6, Math.round((drawableW - totalGaps) / n));
	let x = margin + Math.round((drawableW - (barWidth * n + gap * (n - 1))) / 2);
	for (let i = 0; i < n; i++) {
		const h = Math.max(2, barHeightsPx[i]);
		for (let xi = x; xi < x + barWidth; xi++) {
			for (let y = baseY - 1; y > baseY - h; y--) {
				setPixel(png, width, xi, y, barColors[i]);
			}
		}
		x += barWidth + gap;
	}
}

function drawLine(png, width, p1, p2, color) {
	let x0 = p1.x,
		y0 = p1.y;
	const x1 = p2.x,
		y1 = p2.y;
	const dx = Math.abs(x1 - x0),
		sx = x0 < x1 ? 1 : -1;
	const dy = -Math.abs(y1 - y0),
		sy = y0 < y1 ? 1 : -1;
	let err = dx + dy;
	while (true) {
		setPixel(png, width, x0, y0, color);
		if (x0 === x1 && y0 === y1) {
			break;
		}
		const e2 = 2 * err;
		if (e2 >= dy) {
			err += dy;
			x0 += sx;
		}
		if (e2 <= dx) {
			err += dx;
			y0 += sy;
		}
	}
}

function drawLinePath(png, width, points, color, thickness) {
	for (let i = 0; i < points.length - 1; i++) {
		drawLine(png, width, points[i], points[i + 1], color);
		// Thicken
		for (let t = 1; t < thickness; t++) {
			drawLine(
				png,
				width,
				{ x: points[i].x, y: points[i].y + t },
				{ x: points[i + 1].x, y: points[i + 1].y + t },
				color,
			);
		}
	}
}

function renderChartImage(width, height, outFile) {
	const png = createPNG(width, height);
	const margin = Math.max(12, Math.round(Math.min(width, height) * 0.12));
	const baseY = height - margin;
	fillVerticalGradient(png, width, colors.bgTop, colors.bgBottom);
	drawGrid(png, width, margin, colors.grid, Math.max(6, Math.round((height - margin * 2) / 4)));
	drawAxes(
		png,
		width,
		margin,
		colors.axes,
		Math.max(1, Math.round(Math.min(width, height) * 0.012)),
	);

	const drawableH = baseY - margin;
	const barsNorm = [0.36, 0.56, 0.22];
	const barHeightsPx = barsNorm.map((v) => Math.round(v * drawableH));
	drawBars(png, width, margin, baseY, barHeightsPx, [colors.bar1, colors.bar2, colors.bar3]);

	const linePts = [
		{ x: margin + Math.round(width * 0.06), y: baseY - Math.round(drawableH * 0.35) },
		{ x: margin + Math.round(width * 0.22), y: baseY - Math.round(drawableH * 0.28) },
		{ x: margin + Math.round(width * 0.4), y: baseY - Math.round(drawableH * 0.62) },
		{ x: margin + Math.round(width * 0.62), y: baseY - Math.round(drawableH * 0.45) },
	];
	drawLinePath(
		png,
		width,
		linePts,
		colors.line,
		Math.max(1, Math.round(Math.min(width, height) * 0.01)),
	);

	return new Promise((resolve) => {
		const outPath = path.join(imagesDir, outFile);
		png
			.pack()
			.pipe(fs.createWriteStream(outPath))
			.on("finish", () => {
				console.log("Wrote", outPath);
				resolve();
			});
	});
}

(async () => {
	await renderChartImage(128, 128, "icon.png");
	await renderChartImage(512, 512, "icon-512.png");
	await renderChartImage(1200, 630, "banner-1200x630.png");
})();
