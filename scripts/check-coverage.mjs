#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const thresholds = {
  lines: 87,
  functions: 80,  // Lower due to untestable inline arrow functions and resolveWebviewView
  branches: 87,
  statements: 87,
};

const summaryPath = path.resolve(
  process.cwd(),
  "coverage",
  "coverage-summary.json"
);

if (!fs.existsSync(summaryPath)) {
  console.error(
    `Coverage summary not found at ${summaryPath}. Did the coverage run complete successfully?`
  );
  process.exit(1);
}

let summary;
try {
  summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
} catch (error) {
  console.error(
    `Unable to read coverage summary: ${
      error instanceof Error ? error.message : error
    }`
  );
  process.exit(1);
}

const totals = summary.total;
if (!totals) {
  console.error("Coverage summary is missing total metrics.");
  process.exit(1);
}

let hasFailure = false;

for (const [metric, min] of Object.entries(thresholds)) {
  const stats = totals[metric];
  if (!stats) {
    console.error(`Coverage summary does not contain '${metric}' metrics.`);
    hasFailure = true;
    continue;
  }

  const pct = typeof stats.pct === "number" ? stats.pct : Number.NaN;
  if (!Number.isFinite(pct)) {
    console.error(`Coverage percentage for '${metric}' is not a number.`);
    hasFailure = true;
    continue;
  }

  if (pct + 1e-9 < min) {
    console.error(
      `Coverage for ${metric} (${pct.toFixed(
        2
      )}%) is below the required ${min}%.`
    );
    hasFailure = true;
  }
}

if (hasFailure) {
  process.exit(1);
}

console.log(
  "Coverage thresholds met:",
  Object.entries(thresholds)
    .map(([metric, min]) => `${metric} ≥ ${min}%`)
    .join(", ")
);
