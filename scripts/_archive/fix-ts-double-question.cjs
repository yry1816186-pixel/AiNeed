const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const MOBILE_DIR = path.join(__dirname, "..", "apps", "mobile");
const SRC_DIR = path.join(MOBILE_DIR, "src");

function runTsc() {
  try {
    const cmd = `node "${path.join(__dirname, "..", "node_modules", "typescript", "bin", "tsc")}" --noEmit 2>&1`;
    return execSync(cmd, { cwd: MOBILE_DIR, encoding: "utf-8", maxBuffer: 20 * 1024 * 1024 });
  } catch (e) {
    return e.stdout || e.message;
  }
}

function parseErrors(output) {
  const errors = [];
  for (const line of output.split("\n")) {
    const m = line.match(/^src[\\\/]([^(]+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)/);
    if (m) {
      errors.push({
        file: m[1].replace(/\\/g, "/"),
        line: parseInt(m[2]),
        col: parseInt(m[3]),
        code: m[4],
        message: m[5],
      });
    }
  }
  return errors;
}

// Fix ??  -> ?. (double question mark was incorrectly inserted)
console.log("Fixing double question marks...");
const filesToFix = [
  "features/community/screens/CommunityScreen.tsx",
  "features/profile/screens/components/BodyTypeCard.tsx",
  "features/profile/screens/components/ColorSeasonCard.tsx",
  "shared/components/screens/TryOnHistoryScreen.tsx",
];

for (const file of filesToFix) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  const original = content;

  content = content.replace(/\?\?\./g, "?.");

  if (content !== original) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

console.log("\nRe-running tsc...");
const output = runTsc();
const errors = parseErrors(output);
console.log(`Remaining errors: ${errors.length}`);

const byCode = {};
for (const e of errors) {
  byCode[e.code] = (byCode[e.code] || 0) + 1;
}
console.log("Error distribution:", Object.entries(byCode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(", "));

if (errors.length > 0 && errors.length <= 30) {
  console.log("\nAll remaining errors:");
  for (const e of errors) {
    console.log(`  ${e.file}(${e.line},${e.col}): ${e.code}: ${e.message}`);
  }
}
