import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/test/**/*.test.js",
  coverage: {
    include: ["out/src/**/*.js"],
    exclude: [
      "out/test/**",
      "out/src/test/**",
      "**/*.d.ts",
      "node_modules/**",
      "out/extension.js",
    ],
    reporter: ["lcov", "text-summary", "html", "json-summary"],
    includeAll: true,
    output: "coverage",
  },
});
