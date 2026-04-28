import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";

const SRC_DIR = "apps/mobile/src";
const BASELINE = {
  "hardcoded-color": 364,
  "hardcoded-spacing": 354,
  "hardcoded-border-radius": 355,
  "hardcoded-font-size": 20,
  "nonstandard-animation": 253,
  total: 1980,
};

const HEX_COLOR_RE = /#[0-9A-Fa-f]{6}\b/g;
const RGBA_RE = /rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g;
const HARDCODED_SPACING_RE = /(?:width|height|padding|margin|gap|top|bottom|left|right)\s*:\s*(\d{2,})\b(?!\s*%|\s*px|\.|,|\s*\])/g;
const BORDER_RADIUS_RE = /borderRadius\s*:\s*(\d{1,3})\b/g;
const FONT_SIZE_RE = /fontSize\s*:\s*(\d{1,3})\b/g;
const ANIMATION_DURATION_RE = /duration\s*:\s*(\d{2,4})\b/g;

const TOKEN_COLORS = new Set([
  "#C44536", "#DC3545", "#FAFAF8", "#FFFFFF", "#1A1A18",
  "#52524D", "#73736D", "#8B9A7D", "#B5A08C", "#7B8FA2",
  "#8A4E32", "#686862", "#567080", "#FF9090",
]);

const TOKEN_BORDER_RADIUS = new Set([0, 2, 4, 6, 12, 16, 24, 32, 9999]);

const IGNORE_DIRS = new Set([
  "node_modules", ".expo", "dist", "build", "__tests__",
  "generated", "__mocks__", "coverage",
]);

const IGNORE_EXTENSIONS = new Set([
  ".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx",
]);

function shouldIgnoreDir(dirName) {
  return IGNORE_DIRS.has(dirName);
}

function shouldIgnoreFile(fileName) {
  for (const ext of IGNORE_EXTENSIONS) {
    if (fileName.endsWith(ext)) return true;
  }
  return false;
}

async function getAllFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!shouldIgnoreDir(entry.name)) {
        files.push(...await getAllFiles(join(dir, entry.name)));
      }
    } else if (/\.(ts|tsx)$/.test(entry.name) && !shouldIgnoreFile(entry.name)) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

function countPattern(content, regex) {
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

function findPatternLines(content, regex, relPath) {
  const lines = content.split("\n");
  const results = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("/*")) {
      continue;
    }
    const matches = line.match(regex);
    if (matches) {
      results.push(`  ${relPath}:${i + 1}`);
    }
  }
  return results;
}

function countHardcodedColors(content, relPath) {
  let count = 0;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("/*")) {
      continue;
    }
    const hexMatches = line.match(HEX_COLOR_RE);
    if (hexMatches) {
      for (const m of hexMatches) {
        if (!TOKEN_COLORS.has(m)) {
          count++;
        }
      }
    }
    const rgbaMatches = line.match(RGBA_RE);
    if (rgbaMatches) {
      count += rgbaMatches.length;
    }
  }
  return count;
}

function countHardcodedSpacing(content) {
  const lines = content.split("\n");
  let count = 0;
  for (const line of lines) {
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("/*")) {
      continue;
    }
    const matches = [...line.matchAll(HARDCODED_SPACING_RE)];
    for (const m of matches) {
      const val = parseInt(m[1], 10);
      if (val >= 8 && ![4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96, 128].includes(val)) {
        count++;
      }
    }
  }
  return count;
}

function countHardcodedBorderRadius(content) {
  const lines = content.split("\n");
  let count = 0;
  for (const line of lines) {
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("/*")) {
      continue;
    }
    const matches = [...line.matchAll(BORDER_RADIUS_RE)];
    for (const m of matches) {
      const val = parseInt(m[1], 10);
      if (!TOKEN_BORDER_RADIUS.has(val)) {
        count++;
      }
    }
  }
  return count;
}

function countHardcodedFontSize(content) {
  const lines = content.split("\n");
  let count = 0;
  const tokenFontSizes = new Set([10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60]);
  for (const line of lines) {
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("/*")) {
      continue;
    }
    const matches = [...line.matchAll(FONT_SIZE_RE)];
    for (const m of matches) {
      const val = parseInt(m[1], 10);
      if (!tokenFontSizes.has(val)) {
        count++;
      }
    }
  }
  return count;
}

function countNonstandardAnimation(content) {
  const lines = content.split("\n");
  let count = 0;
  const standardDurations = new Set([100, 200, 300, 500, 800]);
  for (const line of lines) {
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("/*")) {
      continue;
    }
    if (line.includes("Animated.") || line.includes("withTiming") || line.includes("withSpring") || line.includes("withDecay")) {
      const matches = [...line.matchAll(ANIMATION_DURATION_RE)];
      for (const m of matches) {
        const val = parseInt(m[1], 10);
        if (!standardDurations.has(val)) {
          count++;
        }
      }
    }
  }
  return count;
}

async function main() {
  console.log("=== Hardcoded Value Audit ===");
  console.log(`Scanning: ${SRC_DIR}\n`);

  const files = await getAllFiles(SRC_DIR);
  console.log(`Files scanned: ${files.length}\n`);

  const categories = {
    "hardcoded-color": { count: 0, refs: [] },
    "hardcoded-spacing": { count: 0, refs: [] },
    "hardcoded-border-radius": { count: 0, refs: [] },
    "hardcoded-font-size": { count: 0, refs: [] },
    "nonstandard-animation": { count: 0, refs: [] },
  };

  for (const filePath of files) {
    const relPath = relative(".", filePath);
    const content = await readFile(filePath, "utf-8");

    const hc = countHardcodedColors(content, relPath);
    if (hc > 0) {
      categories["hardcoded-color"].count += hc;
      const refs = findPatternLines(content, HEX_COLOR_RE, relPath).slice(0, 5);
      categories["hardcoded-color"].refs.push(...refs);
    }

    const hs = countHardcodedSpacing(content);
    if (hs > 0) {
      categories["hardcoded-spacing"].count += hs;
    }

    const hbr = countHardcodedBorderRadius(content);
    if (hbr > 0) {
      categories["hardcoded-border-radius"].count += hbr;
    }

    const hfs = countHardcodedFontSize(content);
    if (hfs > 0) {
      categories["hardcoded-font-size"].count += hfs;
    }

    const na = countNonstandardAnimation(content);
    if (na > 0) {
      categories["nonstandard-animation"].count += na;
    }
  }

  let totalCount = 0;
  console.log("=== Results by Category ===\n");

  for (const [category, data] of Object.entries(categories)) {
    const baseline = BASELINE[category];
    const diff = data.count - baseline;
    const trend = diff < 0 ? `↓${Math.abs(diff)}` : diff > 0 ? `↑${diff}` : "=";
    console.log(`${category}: ${data.count} (baseline: ${baseline}, ${trend})`);
    totalCount += data.count;
  }

  console.log(`\n---\nTotal: ${totalCount} (baseline: ${BASELINE.total})`);
  const totalDiff = totalCount - BASELINE.total;
  if (totalDiff < 0) {
    console.log(`Progress: ${Math.abs(totalDiff)} fewer hardcoded values since Phase 13 audit ✓`);
  } else if (totalDiff === 0) {
    console.log("Progress: No change from Phase 13 audit baseline");
  } else {
    console.log(`Regressed: ${totalDiff} more hardcoded values since Phase 13 audit ✗`);
  }

  console.log("\n=== Top hardcoded color references (sample) ===");
  const colorRefs = categories["hardcoded-color"].refs.slice(0, 20);
  for (const ref of colorRefs) {
    console.log(ref);
  }
  if (categories["hardcoded-color"].refs.length > 20) {
    console.log(`  ... and ${categories["hardcoded-color"].refs.length - 20} more`);
  }

  process.exit(totalCount >= BASELINE.total ? 1 : 0);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(2);
});
