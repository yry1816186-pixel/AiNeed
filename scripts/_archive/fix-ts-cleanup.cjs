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

// Fix 1: Remove .ts/.tsx extensions from imports
console.log("\n--- Fix 1: Remove .ts/.tsx extensions from imports ---");
const extErrors = errors.filter(e => e.code === "TS5097");
const extFiles = new Set(extErrors.map(e => e.file));
for (const file of extFiles) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, "utf-8");
  const original = content;
  content = content.replace(/from\s+['"]([^'"]+)\.ts['"]/g, (m, p) => `from '${p}'`);
  content = content.replace(/from\s+['"]([^'"]+)\.tsx['"]/g, (m, p) => `from '${p}'`);
  if (content !== original) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// Fix 2: Fix "used before declaration" - swap order of styles/colors
console.log("\n--- Fix 2: Fix used-before-declaration (swap styles/colors order) ---");
const usedBeforeErrors = errors.filter(e => e.code === "TS2448" || e.code === "TS2454");
const usedBeforeFiles = new Set(usedBeforeErrors.map(e => e.file));
for (const file of usedBeforeFiles) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  let modified = false;

  for (let i = 0; i < lines.length - 1; i++) {
    if (/const\s+styles\s*=\s*useStyles\(colors\)/.test(lines[i])) {
      if (i + 1 < lines.length && /const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)/.test(lines[i + 1])) {
        const temp = lines[i];
        lines[i] = lines[i + 1];
        lines[i + 1] = temp;
        modified = true;
      }
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// Fix 3: Remove duplicate "const styles = useStyles(colors)" declarations
console.log("\n--- Fix 3: Remove duplicate styles declarations ---");
const dupStyleErrors = errors.filter(e => e.code === "TS2451" && e.message.includes("'styles'"));
const dupStyleFiles = new Set(dupStyleErrors.map(e => e.file));
for (const file of dupStyleFiles) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  let modified = false;

  for (let i = 1; i < lines.length; i++) {
    if (/^\s*const\s+styles\s*=\s*useStyles\(colors\)/.test(lines[i])) {
      if (i > 0 && /^\s*const\s+styles\s*=\s*useStyles\(colors\)/.test(lines[i - 1])) {
        lines.splice(i, 1);
        i--;
        modified = true;
      }
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// Fix 4: Remove duplicate "const { colors } = useTheme()" declarations
console.log("\n--- Fix 4: Remove duplicate colors declarations ---");
const dupColorsErrors = errors.filter(e => e.code === "TS2451" && e.message.includes("'colors'"));
const dupColorsFiles = new Set(dupColorsErrors.map(e => e.file));
for (const file of dupColorsFiles) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  let modified = false;

  for (let i = 1; i < lines.length; i++) {
    if (/^\s*const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)/.test(lines[i])) {
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        if (/^\s*const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)/.test(lines[j])) {
          lines.splice(i, 1);
          i--;
          modified = true;
          break;
        }
        if (/^\s*const\s*\{\s*isDark\s*,\s*colors\s*\}\s*=\s*useUnifiedTheme\(\)/.test(lines[j])) {
          lines.splice(i, 1);
          i--;
          modified = true;
          break;
        }
      }
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// Fix 5: Fix TS2300 duplicate identifier 'colors' in AlgorithmVisualization
console.log("\n--- Fix 5: Fix duplicate identifier 'colors' ---");
const dupIdentErrors = errors.filter(e => e.code === "TS2300" && e.message.includes("'colors'"));
const dupIdentFiles = new Set(dupIdentErrors.map(e => e.file));
for (const file of dupIdentFiles) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  let modified = false;

  for (const e of dupIdentErrors.filter(er => er.file === file)) {
    const lineIdx = e.line - 1;
    if (lineIdx >= lines.length) continue;
    const line = lines[lineIdx];

    if (/^\s*colors,?\s*$/.test(line.trim())) {
      const prevLine = lineIdx > 0 ? lines[lineIdx - 1] : "";
      const nextLine = lineIdx + 1 < lines.length ? lines[lineIdx + 1] : "";

      if (prevLine.includes("import") || nextLine.includes("from")) {
        lines[lineIdx] = line.replace("colors,", "").replace("colors", "");
        if (lines[lineIdx].trim() === "" || lines[lineIdx].trim() === ",") {
          lines.splice(lineIdx, 1);
        }
        modified = true;
      }
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// Fix 6: Fix ThemeMode not found
console.log("\n--- Fix 6: Fix ThemeMode not found ---");
const themeModeErrors = errors.filter(e => e.code === "TS2304" && e.message.includes("'ThemeMode'"));
for (const e of themeModeErrors) {
  const fullPath = path.join(SRC_DIR, e.file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, "utf-8");
  if (!content.includes("ThemeMode")) continue;

  const hasThemeContextImport = /from\s+['"]([^'"]*ThemeContext)['"]/.test(content);
  if (hasThemeContextImport) {
    content = content.replace(
      /import\s*\{([^}]*)\}\s*from\s+['"]([^'"]*ThemeContext)['"]/,
      (match, imports, fromPath) => imports.includes("ThemeMode") ? match : `import {${imports}, ThemeMode} from '${fromPath}'`
    );
  } else {
    const lines = content.split("\n");
    const lastImportIdx = lines.reduce((last, l, i) => l.startsWith("import") ? i : last, 0);
    lines.splice(lastImportIdx + 1, 0, `type ThemeMode = 'light' | 'dark' | 'system';`);
    content = lines.join("\n");
  }

  fs.writeFileSync(fullPath, content, "utf-8");
  console.log(`  Fixed: ${e.file}`);
}

// Fix 7: Fix useUnifiedTheme not found
console.log("\n--- Fix 7: Fix useUnifiedTheme not found ---");
const unifiedThemeErrors = errors.filter(e => e.code === "TS2304" && e.message.includes("'useUnifiedTheme'"));
for (const e of unifiedThemeErrors) {
  const fullPath = path.join(SRC_DIR, e.file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, "utf-8");

  const hasThemeContextImport = /from\s+['"]([^'"]*ThemeContext)['"]/.test(content);
  if (hasThemeContextImport) {
    content = content.replace(
      /import\s*\{([^}]*)\}\s*from\s+['"]([^'"]*ThemeContext)['"]/,
      (match, imports, fromPath) => imports.includes("useUnifiedTheme") ? match : `import {${imports}, useUnifiedTheme} from '${fromPath}'`
    );
  }

  fs.writeFileSync(fullPath, content, "utf-8");
  console.log(`  Fixed: ${e.file}`);
}

// Fix 8: Fix TS2352 - as unknown as X pattern
console.log("\n--- Fix 8: Fix TS2352 - conversion errors ---");
const conversionErrors = errors.filter(e => e.code === "TS2352");
for (const e of conversionErrors) {
  const fullPath = path.join(SRC_DIR, e.file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  const lineIdx = e.line - 1;
  if (lineIdx >= lines.length) continue;

  const line = lines[lineIdx];
  if (line.includes(" as {")) {
    lines[lineIdx] = line.replace(" as {", " as unknown as {");
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${e.file}`);
  }
}

// Fix 9: Fix TS2345 - argument type mismatch in AlgorithmVisualization
console.log("\n--- Fix 9: Fix AlgorithmVisualization colors type mismatch ---");
const algoFile = path.join(SRC_DIR, "shared/components/visualization/AlgorithmVisualization.tsx");
if (fs.existsSync(algoFile)) {
  let content = fs.readFileSync(algoFile, "utf-8");
  const lines = content.split("\n");
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    if (/const\s+styles\s*=\s*useStyles\(colors\)/.test(lines[i])) {
      const prev5 = lines.slice(Math.max(0, i - 5), i).join("\n");
      if (prev5.includes("colorData") || prev5.includes("colorItem") || prev5.includes("colorAnalysis")) {
        lines[i] = lines[i].replace("useStyles(colors)", "useStyles(flatColors)");
        modified = true;
      }
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(algoFile, content, "utf-8");
    console.log(`  Fixed: AlgorithmVisualization.tsx`);
  }
}

console.log("\n=== Re-running tsc ===");
const newOutput = runTsc();
const newErrors = parseErrors(newOutput);
console.log(`Remaining errors: ${newErrors.length}`);

const byCode = {};
for (const e of newErrors) {
  byCode[e.code] = (byCode[e.code] || 0) + 1;
}
console.log("Error distribution:", Object.entries(byCode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(", "));
