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

const output = runTsc();
const errors = parseErrors(output);
console.log(`Total errors: ${errors.length}`);

const syntaxErrors = errors.filter(e => ["TS1005", "TS1109", "TS1131", "TS1128", "TS1003"].includes(e.code));
const syntaxByFile = new Map();
for (const e of syntaxErrors) {
  if (!syntaxByFile.has(e.file)) syntaxByFile.set(e.file, []);
  syntaxByFile.get(e.file).push(e);
}

console.log(`Files with syntax errors: ${syntaxByFile.size}`);

for (const [file, errs] of syntaxByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)/.test(line)) {
      let prevLine = i > 0 ? lines[i - 1] : "";
      let nextLine = i + 1 < lines.length ? lines[i + 1] : "";

      if (/=\s*\(\s*\{\s*$/.test(prevLine) || /=\s*\(\s*$/.test(prevLine)) {
        const nextUseStyles = /^\s*const\s+styles\s*=\s*useStyles\(colors\)/.test(nextLine);

        let searchIdx = i + (nextUseStyles ? 2 : 1);
        while (searchIdx < lines.length) {
          const searchLine = lines[searchIdx];
          if (/^\}\)\s*=>\s*\{/.test(searchLine.trim()) || /^\}\)\s*=>\s*$/.test(searchLine.trim())) {
            const insertIdx = searchIdx + 1;
            const indent = line.match(/^(\s*)/)[1];

            lines.splice(i, nextUseStyles ? 2 : 1);
            const newInsertIdx = insertIdx - (nextUseStyles ? 2 : 1);

            lines.splice(newInsertIdx, 0, `${indent}const { colors } = useTheme();`);
            if (nextUseStyles) {
              lines.splice(newInsertIdx + 1, 0, `${indent}const styles = useStyles(colors);`);
            }

            modified = true;
            i = newInsertIdx + (nextUseStyles ? 2 : 1);
            break;
          }
          searchIdx++;
        }
      }
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`Fixed misplaced hooks in: ${file}`);
  }
}

// Also fix double commas in imports
const allFiles = new Set();
for (const e of errors) {
  allFiles.add(e.file);
}

for (const file of allFiles) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  const original = content;

  content = content.replace(/,\s*,/g, ",");
  content = content.replace(/\{\s*,/g, "{");
  content = content.replace(/,\s*\}/g, "}");

  if (content !== original) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`Fixed double commas in: ${file}`);
  }
}

console.log("\nRe-running tsc...");
const newOutput = runTsc();
const newErrors = parseErrors(newOutput);
console.log(`Remaining errors: ${newErrors.length}`);

const byCode = {};
for (const e of newErrors) {
  byCode[e.code] = (byCode[e.code] || 0) + 1;
}
console.log("Error distribution:", Object.entries(byCode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(", "));
