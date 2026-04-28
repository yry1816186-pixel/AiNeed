import { readdir, readFile } from "node:fs/promises";
import { join, extname, relative } from "node:path";

const SRC_DIR = join(import.meta.dirname, "..", "apps", "mobile", "src");
const BASELINE = {
  "hardcoded-color": 364,
  "hardcoded-spacing": 354,
  "hardcoded-border-radius": 355,
  "hardcoded-font-size": 20,
  "nonstandard-animation": 253,
};

const CATEGORIES = {
  "hardcoded-color": {
    patterns: [
      /#([0-9A-Fa-f]{3,8})(?![0-9A-Fa-f])/g,
      /rgba\s*\(/g,
    ],
    excludePatterns: [
      /node_modules/,
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /generated\//,
      /legacy-map\.ts$/,
    ],
  },
  "hardcoded-spacing": {
    patterns: [
      /(?:width|height|padding|margin|gap|top|bottom|left|right)\s*:\s*(\d+)(?![.\d])/g,
    ],
    excludePatterns: [
      /node_modules/,
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /generated\//,
      /legacy-map\.ts$/,
    ],
  },
  "hardcoded-border-radius": {
    patterns: [
      /borderRadius\s*:\s*(\d+)(?![.\d])/g,
      /border-radius\s*:\s*(\d+)(?![.\d])/g,
    ],
    excludePatterns: [
      /node_modules/,
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /generated\//,
      /legacy-map\.ts$/,
    ],
  },
  "hardcoded-font-size": {
    patterns: [
      /fontSize\s*:\s*(\d+)(?![.\d])/g,
    ],
    excludePatterns: [
      /node_modules/,
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /generated\//,
      /legacy-map\.ts$/,
    ],
  },
  "nonstandard-animation": {
    patterns: [
      /duration\s*:\s*(\d+)(?![.\d])/g,
      /transition.*duration\s*:\s*(\d+)/g,
    ],
    excludePatterns: [
      /node_modules/,
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /generated\//,
      /legacy-map\.ts$/,
    ],
  },
};

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      yield* walk(fullPath);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      yield fullPath;
    }
  }
}

function isExcluded(filePath, excludePatterns) {
  return excludePatterns.some((p) => p.test(filePath));
}

async function audit() {
  const results = {};
  const totalByCategory = {};

  for (const category of Object.keys(CATEGORIES)) {
    totalByCategory[category] = 0;
    results[category] = [];
  }

  for await (const filePath of walk(SRC_DIR)) {
    const relPath = relative(SRC_DIR, filePath).replace(/\\/g, "/");
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");

    for (const [category, config] of Object.entries(CATEGORIES)) {
      if (isExcluded(relPath, config.excludePatterns)) continue;

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        for (const pattern of config.patterns) {
          pattern.lastIndex = 0;
          const matches = line.matchAll(pattern);
          for (const match of matches) {
            const value = match[1] || match[0];
            if (category === "hardcoded-color" && value.startsWith("#")) {
              const len = value.length - 1;
              if (len !== 3 && len !== 6 && len !== 8) continue;
            }
            if (category === "hardcoded-spacing") {
              const num = parseInt(value, 10);
              if (num === 0 || num === 1) continue;
            }
            totalByCategory[category]++;
            results[category].push(`${relPath}:${lineIdx + 1} | ${match[0].trim()}`);
          }
        }
      }
    }
  }

  console.log("=".repeat(60));
  console.log("Hardcoded Values Audit Report");
  console.log("=".repeat(60));
  console.log(`Source: ${relative(import.meta.dirname, SRC_DIR)}`);
  console.log("");

  let totalCurrent = 0;
  let totalBaseline = 0;

  for (const [category, count] of Object.entries(totalByCategory)) {
    const baseline = BASELINE[category] || 0;
    totalCurrent += count;
    totalBaseline += baseline;
    const delta = count - baseline;
    const arrow = delta < 0 ? "↓" : delta > 0 ? "↑" : "=";
    console.log(`  ${category}: ${count} (baseline: ${baseline}, ${arrow}${Math.abs(delta)})`);
  }

  console.log("");
  console.log(`  TOTAL: ${totalCurrent} (baseline: ${totalBaseline})`);

  const improved = totalCurrent < totalBaseline;
  console.log("");
  console.log(improved ? "✅ Progress: fewer hardcoded values than baseline" : "⚠️  No progress: count >= baseline");

  console.log("");
  console.log("Top files by category:");
  for (const [category, items] of Object.entries(results)) {
    if (items.length === 0) continue;
    console.log(`\n  ${category} (${items.length}):`);
    const fileCounts = {};
    for (const item of items) {
      const file = item.split(":")[0];
      fileCounts[file] = (fileCounts[file] || 0) + 1;
    }
    const sorted = Object.entries(fileCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [file, count] of sorted) {
      console.log(`    ${file}: ${count}`);
    }
  }

  process.exit(improved ? 0 : 1);
}

audit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(2);
});
