import { defineConfig } from "@vscode/test-cli";

export default defineConfig([
	{
		label: "tests",
		files: "out/test/**/*.test.js",
		mocha: {
			ui: "tdd",
			timeout: 20000,
		},
	},
	{
		label: "junit",
		files: "out/test/**/*.test.js",
		mocha: {
			ui: "tdd",
			timeout: 20000,
			reporter: "mocha-junit-reporter",
			reporterOptions: {
				mochaFile: "./artifacts/test-results/junit.xml",
				outputs: true,
			},
		},
	},
]);

// Separate config export for coverage runs (used by test:coverage)
export const coverageConfig = defineConfig({
	files: "out/test/**/*.test.js",
	mocha: {
		ui: "tdd",
		timeout: 20000,
	},
	coverage: {
		include: ["out/src/**/*.js"],
		exclude: [
			"out/test/**",
			"**/test/**",
			"**/test/testUtils*", // More specific pattern to avoid matching non-test testUtils files
			"**/*.d.ts",
			"node_modules/**",
			"out/extension.js",
		],
		reporter: ["lcov", "text-summary", "html", "json-summary"],
		includeAll: true,
		output: "coverage",
	},
});
