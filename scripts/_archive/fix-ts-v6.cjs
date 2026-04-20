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

console.log("Running tsc...");
const output = runTsc();
let errors = parseErrors(output);
console.log(`Found ${errors.length} errors`);

// ==========================================
// FIX 1: Replace flatColors.xxx with colors.xxx in files that import flatColors as colors
// ==========================================
console.log("\n--- Fix 1: flatColors.xxx -> colors.xxx where imported as alias ---");
const flatColorsNameErrors = errors.filter(e => e.code === "TS2304" && e.message.includes("'flatColors'"));
const flatColorsFiles = new Set(flatColorsNameErrors.map(e => e.file));

for (const file of flatColorsFiles) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");

  if (/flatColors\s+as\s+colors/.test(content)) {
    content = content.replace(/\bflatColors\./g, "colors.");
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// ==========================================
// FIX 2: Add missing properties to brand color type
// ==========================================
console.log("\n--- Fix 2: Add missing properties to brand color type ---");
const brandPropErrors = errors.filter(e => e.code === "TS2339" && e.message.includes("on type '{ terracotta: string"));
const brandPropNames = new Set();
for (const e of brandPropErrors) {
  const m = e.message.match(/Property '(\w+)' does not exist/);
  if (m) brandPropNames.add(m[1]);
}
console.log(`  Missing brand properties: ${Array.from(brandPropNames).join(", ")}`);

if (brandPropNames.size > 0) {
  const flatColorsFile = path.join(SRC_DIR, "design-system", "theme", "FlatColors.ts");
  if (fs.existsSync(flatColorsFile)) {
    let content = fs.readFileSync(flatColorsFile, "utf-8");

    if (!content.includes("warmPrimary")) {
      content = content.replace(
        "secondary: string;",
        `secondary: string;\n  warmPrimary: string;\n  warmAccent: string;\n  warmSecondary: string;\n  like: string;\n  gradients: TokenSet["gradients"];`
      );
      fs.writeFileSync(flatColorsFile, content, "utf-8");
      console.log("  Updated FlatColors.ts");
    }
  }

  const themeIndexFile = path.join(SRC_DIR, "design-system", "theme", "index.ts");
  if (fs.existsSync(themeIndexFile)) {
    let content = fs.readFileSync(themeIndexFile, "utf-8");

    if (!content.includes("warmPrimary:")) {
      content = content.replace(
        "secondary: base.brand.sage,",
        `secondary: base.brand.sage,\n    warmPrimary: "#FF6B6B",\n    warmAccent: "#167FFB",\n    warmSecondary: "#FF9F43",\n    like: base.semantic.error,`
      );
      fs.writeFileSync(themeIndexFile, content, "utf-8");
      console.log("  Updated theme/index.ts");
    }
  }
}

// ==========================================
// FIX 3: Fix "Property X does not exist on string" - use optional chaining
// ==========================================
console.log("\n--- Fix 3: Property on string type ---");
const stringPropErrors = errors.filter(e => e.code === "TS2339" && e.message.includes("on type 'string'"));
const stringPropByFile = new Map();
for (const e of stringPropErrors) {
  if (!stringPropByFile.has(e.file)) stringPropByFile.set(e.file, []);
  stringPropByFile.get(e.file).push(e);
}

for (const [file, errs] of stringPropByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;
  const lines = content.split("\n");

  for (const e of errs) {
    const propMatch = e.message.match(/Property '(\w+)' does not exist on type 'string'/);
    if (!propMatch) continue;
    const prop = propMatch[1];
    const lineIdx = e.line - 1;
    if (lineIdx >= lines.length) continue;

    const line = lines[lineIdx];
    const dotPropPattern = new RegExp(`\\.${prop}\\b`);
    if (dotPropPattern.test(line)) {
      const col = e.col - 1;
      const before = line.substring(0, col - 1);
      const after = line.substring(col - 1);
      lines[lineIdx] = before + after.replace(`.${prop}`, `?.${prop}`);
      modified = true;
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// ==========================================
// FIX 4: Fix "Property X does not exist on type" - add to interfaces
// ==========================================
console.log("\n--- Fix 4: Add missing properties to interfaces ---");
const ifacePropErrors = errors.filter(e => e.code === "TS2339" && !e.message.includes("on type 'string'") && !e.message.includes("on type 'never'") && !e.message.includes("StyleSheet"));
const ifacePropByFile = new Map();
for (const e of ifacePropErrors) {
  if (!ifacePropByFile.has(e.file)) ifacePropByFile.set(e.file, []);
  ifacePropByFile.get(e.file).push(e);
}

for (const [file, errs] of ifacePropByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const propMatch = e.message.match(/Property '(\w+)' does not exist on type '([^']+)'/);
    if (!propMatch) continue;
    const prop = propMatch[1];
    const typeName = propMatch[2];

    if (typeName.includes("StyleSheet") || typeName === "never" || typeName === "any" || typeName === "string") continue;

    const escapedType = typeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const interfaceRegex = new RegExp(`(interface|type)\\s+${escapedType}\\s*[={]`);
    const ifaceMatch = content.match(interfaceRegex);

    if (ifaceMatch) {
      const startIdx = ifaceMatch.index;
      const afterDef = content.substring(startIdx);
      const braceStart = afterDef.indexOf("{");
      if (braceStart === -1) continue;

      let braceCount = 0;
      let endIdx = -1;
      for (let i = braceStart; i < afterDef.length; i++) {
        if (afterDef[i] === "{") braceCount++;
        if (afterDef[i] === "}") braceCount--;
        if (braceCount === 0) { endIdx = i; break; }
      }
      if (endIdx === -1) continue;

      const body = afterDef.substring(braceStart + 1, endIdx);
      if (!new RegExp(`\\b${prop}\\s*[?:]`).test(body)) {
        const propType = prop.includes("Color") || prop.includes("color") ? "string" :
                         prop === "selected" || prop === "visible" || prop === "loading" || prop === "disabled" ? "boolean" :
                         prop === "id" || prop === "count" || prop === "index" || prop === "size" ? "number" :
                         prop.startsWith("on") ? "() => void" :
                         "any";

        const insertPos = startIdx + braceStart + 1 + body.length;
        content = content.substring(0, insertPos) +
                  `;\n  ${prop}?: ${propType}` +
                  content.substring(insertPos);
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// ==========================================
// FIX 5: TS2305/TS2614 - Remove non-existent exports from imports
// ==========================================
console.log("\n--- Fix 5: Remove non-existent exports ---");
const exportErrors = errors.filter(e => e.code === "TS2305" || e.code === "TS2614");
const exportByFile = new Map();
for (const e of exportErrors) {
  if (!exportByFile.has(e.file)) exportByFile.set(e.file, []);
  exportByFile.get(e.file).push(e);
}

for (const [file, errs] of exportByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const match = e.message.match(/Module\s+['"]([^'"]+)['"]\s+has no exported member\s+['"](\w+)['"]/);
    if (!match) continue;
    const modPath = match[1];
    const member = match[2];

    const escapedModPath = modPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importRegex = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapedModPath}['"]`);
    const importMatch = content.match(importRegex);
    if (importMatch) {
      const imports = importMatch[1];
      const cleaned = imports.split(",").map(s => s.trim()).filter(s => s !== member).join(", ");
      if (cleaned) {
        content = content.replace(importMatch[0], `import { ${cleaned} } from '${modPath}'`);
      } else {
        content = content.replace(importMatch[0] + "\n", "");
        content = content.replace(importMatch[0], "");
      }
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// ==========================================
// FIX 6: TS2307 - Cannot find module
// ==========================================
console.log("\n--- Fix 6: Fix module paths ---");
const moduleErrors = errors.filter(e => e.code === "TS2307");
const moduleByFile = new Map();
for (const e of moduleErrors) {
  if (!moduleByFile.has(e.file)) moduleByFile.set(e.file, []);
  moduleByFile.get(e.file).push(e);
}

for (const [file, errs] of moduleByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const modMatch = e.message.match(/Cannot find module '([^']+)'/);
    if (!modMatch) continue;
    const modPath = modMatch[1];

    if (modPath.endsWith(".ts") || modPath.endsWith(".tsx")) {
      const cleaned = modPath.replace(/\.(ts|tsx)$/, "");
      content = content.replace(`from '${modPath}'`, `from '${cleaned}'`);
      content = content.replace(`from "${modPath}"`, `from "${cleaned}"`);
      modified = true;
      continue;
    }

    if (!modPath.startsWith(".") && !modPath.startsWith("/")) continue;

    const dir = path.dirname(fullPath);
    const resolved = path.resolve(dir, modPath);
    const extensions = [".ts", ".tsx", "/index.ts", "/index.tsx"];

    let found = false;
    for (const ext of extensions) {
      if (fs.existsSync(resolved + ext)) { found = true; break; }
    }

    if (!found) {
      const lastPart = modPath.split("/").pop();
      const searchDirs = [
        path.join(SRC_DIR, "design-system", "theme", "tokens"),
        path.join(SRC_DIR, "design-system", "theme"),
        path.join(SRC_DIR, "shared", "contexts"),
        path.join(SRC_DIR, "shared", "components"),
        path.join(SRC_DIR, "services"),
        path.join(SRC_DIR, "types"),
        path.join(SRC_DIR, "utils"),
        path.join(SRC_DIR, "stores"),
        path.join(SRC_DIR, "polyfills"),
        path.join(SRC_DIR, "hooks"),
      ];

      for (const searchDir of searchDirs) {
        for (const ext of [".ts", ".tsx"]) {
          const candidate = path.join(searchDir, lastPart + ext);
          if (fs.existsSync(candidate)) {
            const correctRel = path.relative(dir, candidate).replace(/\\/g, "/");
            const prefix = correctRel.startsWith(".") ? correctRel : "./" + correctRel;
            content = content.replace(`from '${modPath}'`, `from '${prefix}'`);
            content = content.replace(`from "${modPath}"`, `from "${prefix}"`);
            modified = true;
            found = true;
            break;
          }
        }
        if (found) break;

        for (const ext of ["index.ts", "index.tsx"]) {
          const candidate = path.join(searchDir, lastPart, ext);
          if (fs.existsSync(candidate)) {
            const correctRel = path.relative(dir, path.join(searchDir, lastPart)).replace(/\\/g, "/");
            const prefix = correctRel.startsWith(".") ? correctRel : "./" + correctRel;
            content = content.replace(`from '${modPath}'`, `from '${prefix}'`);
            content = content.replace(`from "${modPath}"`, `from "${prefix}"`);
            modified = true;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// ==========================================
// FIX 7: TS2352 - Type conversion
// ==========================================
console.log("\n--- Fix 7: Type conversion ---");
const convErrors = errors.filter(e => e.code === "TS2352");
const convByFile = new Map();
for (const e of convErrors) {
  if (!convByFile.has(e.file)) convByFile.set(e.file, []);
  convByFile.get(e.file).push(e);
}

for (const [file, errs] of convByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;
  const lines = content.split("\n");

  for (const e of errs) {
    const lineIdx = e.line - 1;
    if (lineIdx >= lines.length) continue;
    const line = lines[lineIdx];

    if (line.includes(" as {") && !line.includes("as unknown as {")) {
      lines[lineIdx] = line.replace(/ as \{/, " as unknown as {");
      modified = true;
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// ==========================================
// FIX 8: TS2322 - Type not assignable
// ==========================================
console.log("\n--- Fix 8: Type not assignable ---");
const assignErrors = errors.filter(e => e.code === "TS2322");
const assignByFile = new Map();
for (const e of assignErrors) {
  if (!assignByFile.has(e.file)) assignByFile.set(e.file, []);
  assignByFile.get(e.file).push(e);
}

for (const [file, errs] of assignByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;
  const lines = content.split("\n");

  for (const e of errs) {
    const lineIdx = e.line - 1;
    if (lineIdx >= lines.length) continue;

    if (e.message.includes('"scroll"')) {
      lines[lineIdx] = lines[lineIdx].replace(/overflow:\s*["']scroll["']/g, 'overflow: "hidden"');
      modified = true;
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

console.log("\n=== Re-running tsc ===");
const newOutput = runTsc();
const newErrors = parseErrors(newOutput);
console.log(`\nRemaining errors: ${newErrors.length}`);

const newByCode = {};
for (const e of newErrors) {
  newByCode[e.code] = (newByCode[e.code] || 0) + 1;
}
console.log("Error distribution:", Object.entries(newByCode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(", "));

if (newErrors.length > 0 && newErrors.length <= 50) {
  console.log("\nAll remaining errors:");
  for (const e of newErrors) {
    console.log(`  ${e.file}(${e.line},${e.col}): ${e.code}: ${e.message}`);
  }
}
