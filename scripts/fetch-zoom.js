const https = require("https");
const fs = require("fs");
const path = require("path");

const out = path.resolve(
	__dirname,
	"..",
	"media",
	"chartjs-plugin-zoom.umd.js",
);
const url =
	"https://unpkg.com/chartjs-plugin-zoom@2.2.0/dist/chartjs-plugin-zoom.umd.js";

if (!fs.existsSync(path.dirname(out))) {
	fs.mkdirSync(path.dirname(out), { recursive: true });
}

console.log("Downloading", url);
https
	.get(url, (res) => {
		if (res.statusCode !== 200) {
			console.error("Failed to download, status", res.statusCode);
			process.exit(1);
		}
		const file = fs.createWriteStream(out);
		res.pipe(file);
		file.on("finish", () => {
			file.close();
			console.log("Saved", out);
		});
	})
	.on("error", (err) => {
		console.error("Download error", err.message);
		process.exit(1);
	});
