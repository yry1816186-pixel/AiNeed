import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";

const SRC_DIR = join(import.meta.dirname, "..", "src");
const BASELINE = 1980;

const patterns = {
  "hardcoded-color": /#[0-9A-Fa-f]{6}\b/g,
  "hardcoded-rgba": /rgba\s*\(/g,
  "hardcoded-rgb": /rgb\s*\(/g,
  "hardcoded-spacing": /(?:margin|padding|gap|width|height|top|left|right|bottom):\s*\d+(?:px)?\b/g,
  "hardcoded-border-radius": /borderRadius:\s*\d+\b/g,
  "hardcoded-font-size": /fontSize:\s*\d+\b/g,
  "nonstandard-animation": /duration:\s*\d{3,}\b/g,
};

const results = {};
let totalFindings = 0;

function scanDir(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__" || entry === "generated") continue;
      scanDir(fullPath);
      continue;
    }
    const ext = extname(entry);
    if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) continue;
    const content = readFileSync(fullPath, "utf-8");
    const relPath = relative(SRC_DIR, fullPath);
    for (const [category, regex] of Object.entries(patterns)) {
      const matches = content.match(regex);
      if (matches) {
        if (!results[category]) results[category] = [];
        results[category].push({ file: relPath, count: matches.length });
        totalFindings += matches.length;
      }
    }
  }
}

scanDir(SRC_DIR);

console.log("=== Hardcoded Value Audit ===\n");
console.log(`Baseline (Phase 13): ${BASELINE} items`);
console.log(`Current findings:    ${totalFindings} items`);
console.log(`Progress:            ${BASELINE - totalFindings} items resolved (${Math.max(0, ((BASELINE - totalFindings) / BASELINE * 100)).toFixed(1)}%)\n`);

for (const [category, files] of Object.entries(results)) {
  const catTotal = files.reduce((s, f) => s + f.count, 0);
  console.log(`${category}: ${catTotal} findings across ${files.length} files`);
  const topFiles = files.sort((a, b) => b.count - a.count).slice(0, 5);
  for (const f of topFiles) {
    console.log(`  ${f.file}: ${f.count}`);
  }
  console.log();
}

process.exit(totalFindings >= BASELINE ? 1 : 0);
