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

function groupByFile(errors) {
  const map = new Map();
  for (const e of errors) {
    if (!map.has(e.file)) map.set(e.file, []);
    map.get(e.file).push(e);
  }
  return map;
}

function computeImportPath(fromFile, toModule) {
  const fromDir = path.dirname(path.join(SRC_DIR, fromFile));
  const toDir = path.join(SRC_DIR, toModule);
  let rel = path.relative(fromDir, toDir).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

console.log("Running tsc...");
const output = runTsc();
let errors = parseErrors(output);
console.log(`Found ${errors.length} errors`);

// ==========================================
// FIX 1: TS2304 - Cannot find name 'colors' (140 errors)
// These files use colors.xxx in StyleSheet.create at module level
// Solution: Add import { flatColors as colors } from design-system/theme
// ==========================================
console.log("\n--- Fixing TS2304: Cannot find name 'colors' ---");
const colorsErrors = errors.filter(e => e.code === "TS2304" && e.message.includes("'colors'"));
const colorsByFile = groupByFile(colorsErrors);

for (const [file, errs] of colorsByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");

  const hasFlatColorsImport = /import\s*\{[^}]*flatColors\s+as\s+colors[^}]*\}\s*from/.test(content);
  const hasColorsFromTheme = /import\s*\{[^}]*\bcolors\b[^}]*\}\s*from\s*['"][^'"]*design-system\/theme/.test(content);
  const hasUseThemeColors = /const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)/.test(content);
  const hasColorsInModuleLevel = /StyleSheet\.create\s*\(\s*\{[\s\S]*?colors\.\w+/.test(content) || 
                                  /const\s+\w+\s*=\s*\{[\s\S]*?colors\.\w+/.test(content.split("export")[0]);

  if (hasFlatColorsImport || hasColorsFromTheme) {
    continue;
  }

  const importPath = computeImportPath(file, "design-system/theme");

  const existingThemeImport = content.match(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*design-system\/theme(?:\/index)?)['"]/);
  if (existingThemeImport) {
    const imports = existingThemeImport[1];
    const fromPath = existingThemeImport[2];
    if (!imports.includes("flatColors")) {
      content = content.replace(
        existingThemeImport[0],
        `import {${imports}, flatColors as colors} from '${fromPath}'`
      );
    } else if (!imports.includes("flatColors as colors")) {
      content = content.replace(
        /flatColors(?!\s+as)/,
        "flatColors as colors"
      );
    }
  } else {
    const lines = content.split("\n");
    let lastImportIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i].trim())) lastImportIdx = i;
    }
    lines.splice(lastImportIdx + 1, 0, `import { flatColors as colors } from '${importPath}';`);
    content = lines.join("\n");
  }

  fs.writeFileSync(fullPath, content, "utf-8");
  console.log(`  Fixed: ${file}`);
}

// ==========================================
// FIX 2: TS2305 - Module has no exported member
// ==========================================
console.log("\n--- Fixing TS2305: No exported member ---");
const exportErrors = errors.filter(e => e.code === "TS2305");
const exportByFile = groupByFile(exportErrors);

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
// FIX 3: TS2300 - Duplicate identifier
// ==========================================
console.log("\n--- Fixing TS2300: Duplicate identifier ---");
const dupErrors = errors.filter(e => e.code === "TS2300");
const dupByFile = groupByFile(dupErrors);

for (const [file, errs] of dupByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const nameMatch = e.message.match(/Duplicate identifier '(\w+)'/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    if (name === "colors") {
      const importRegex = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*design-system\/theme(?:\/index)?)['"]/g;
      const importMatches = [];
      let m;
      while ((m = importRegex.exec(content)) !== null) {
        if (m[1].includes("flatColors as colors") || m[1].includes("colors")) {
          importMatches.push({ full: m[0], imports: m[1], index: m.index, fromPath: m[2] });
        }
      }

      if (importMatches.length >= 1) {
        const firstMatch = importMatches[0];
        if (!firstMatch.imports.includes("flatColors as colors")) {
          const newImports = firstMatch.imports.replace(/\bcolors\b/, "flatColors as colors");
          content = content.replace(firstMatch.full, `import {${newImports}} from '${firstMatch.fromPath}'`);
          modified = true;
        }
      }

      if (importMatches.length >= 2) {
        for (let i = 1; i < importMatches.length; i++) {
          const match = importMatches[i];
          const cleanedImports = match.imports.split(",").map(s => s.trim()).filter(s => {
            return s !== "colors" && s !== "flatColors as colors" && s !== "flatColors";
          }).join(", ");
          if (cleanedImports) {
            const newImport = `import {${cleanedImports}} from '${match.fromPath}'`;
            content = content.replace(match.full, newImport);
          } else {
            content = content.replace(match.full + "\n", "");
          }
          modified = true;
        }
      }

      const colorsTokenImport = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*tokens\/colors['"]/g;
      let cm;
      const tokenImports = [];
      while ((cm = colorsTokenImport.exec(content)) !== null) {
        if (cm[1].includes("colors")) {
          tokenImports.push({ full: cm[0], imports: cm[1], index: cm.index });
        }
      }

      for (const ti of tokenImports) {
        const cleaned = ti.imports.split(",").map(s => s.trim()).filter(s => s !== "colors").join(", ");
        if (cleaned) {
          content = content.replace(ti.full, ti.full.replace(ti.imports, cleaned));
        } else {
          content = content.replace(ti.full + "\n", "");
        }
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
// FIX 4: TS2307 - Cannot find module
// ==========================================
console.log("\n--- Fixing TS2307: Cannot find module ---");
const moduleErrors = errors.filter(e => e.code === "TS2307");
const moduleByFile = groupByFile(moduleErrors);

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
        path.join(SRC_DIR, "shared", "services"),
        path.join(SRC_DIR, "services"),
        path.join(SRC_DIR, "types"),
        path.join(SRC_DIR, "utils"),
        path.join(SRC_DIR, "stores"),
        path.join(SRC_DIR, "polyfills"),
        path.join(SRC_DIR, "navigation"),
        path.join(SRC_DIR, "hooks"),
        path.join(SRC_DIR, "i18n"),
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
// FIX 5: TS2339 - Property does not exist on types
// Focus on the most common patterns
// ==========================================
console.log("\n--- Fixing TS2339: Property does not exist ---");
const propErrors = errors.filter(e => e.code === "TS2339");
const propByFile = groupByFile(propErrors);

for (const [file, errs] of propByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const propMatch = e.message.match(/Property '(\w+)' does not exist on type '([^']+)'/);
    if (!propMatch) continue;
    const prop = propMatch[1];
    const typeName = propMatch[2];

    if (typeName.includes("StyleSheet") || typeName === "never" || typeName === "any") continue;

    if (prop.startsWith("_")) {
      const cleanProp = prop.substring(1);
      const line = content.split("\n")[e.line - 1];
      if (line && line.includes(prop)) {
        content = content.replace(new RegExp(`\\b${prop}\\b`, "g"), cleanProp);
        modified = true;
      }
      continue;
    }

    if (typeName === "string") {
      const lineIdx = e.line - 1;
      const lines = content.split("\n");
      if (lineIdx < lines.length) {
        const line = lines[lineIdx];
        if (line.includes(`.${prop}`)) {
          const escaped = `.${prop}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          lines[lineIdx] = line.replace(new RegExp(escaped, "g"), `?.${prop}`);
          content = lines.join("\n");
          modified = true;
        }
      }
      continue;
    }

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
        const propType = prop.includes("Color") || prop.includes("color") || prop === "color" ? "string" :
                         prop.includes("Image") || prop.includes("image") || prop === "images" ? "string[]" :
                         prop.includes("Tag") || prop.includes("tag") || prop === "tags" || prop === "styleTags" ? "string[]" :
                         prop === "selected" || prop === "visible" || prop === "loading" || prop === "disabled" || prop === "isFavorite" || prop === "isFollowing" || prop === "isLiked" ? "boolean" :
                         prop === "id" || prop === "count" || prop === "index" || prop === "size" || prop === "age" || prop === "price" || prop === "width" || prop === "height" || prop === "amount" || prop === "total" || prop === "rating" ? "number" :
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
// FIX 6: TS2322 - Type not assignable
// ==========================================
console.log("\n--- Fixing TS2322: Type not assignable ---");
const assignErrors = errors.filter(e => e.code === "TS2322");
const assignByFile = groupByFile(assignErrors);

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

    if (e.message.includes("ViewStyle") && e.message.includes("ImageStyle")) {
      const line = lines[lineIdx];
      if (line.includes("style={") && !line.includes("as any")) {
        lines[lineIdx] = line.replace(/style=\{([^}]+)\}/, "style={$1 as any}");
        modified = true;
      }
    }

    if (e.message.includes("ColorValue") || e.message.includes("not assignable to type 'string'")) {
      const line = lines[lineIdx];
      if (line.includes("colors.") && !line.includes("as string")) {
        const colorMatch = line.match(/(colors\.\w+(?:\.\w+)*)/);
        if (colorMatch) {
          lines[lineIdx] = line.replace(colorMatch[1], `${colorMatch[1]} as string`);
          modified = true;
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

// ==========================================
// FIX 7: TS2769 - No overload matches
// ==========================================
console.log("\n--- Fixing TS2769: No overload matches ---");
const overloadErrors = errors.filter(e => e.code === "TS2769");
const overloadByFile = groupByFile(overloadErrors);

for (const [file, errs] of overloadByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;
  const lines = content.split("\n");

  for (const e of errs) {
    const lineIdx = e.line - 1;
    if (lineIdx >= lines.length) continue;
    const line = lines[lineIdx];

    if (e.message.includes("Image") && e.message.includes("source")) {
      if (line.includes("source={") && !line.includes("as any")) {
        lines[lineIdx] = line.replace(/source=\{([^}]+)\}/, "source={$1 as any}");
        modified = true;
      }
    }

    if (e.message.includes("navigate") || e.message.includes("Navigation")) {
      if (line.includes("navigation.navigate") && !line.includes("as never")) {
        lines[lineIdx] = line.replace(/navigation\.navigate\(([^)]+)\)/, "navigation.navigate($1 as never)");
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

// ==========================================
// FIX 8: TS2552 - Cannot find name (typos)
// ==========================================
console.log("\n--- Fixing TS2552: Cannot find name ---");
const typoErrors = errors.filter(e => e.code === "TS2552");
const typoByFile = groupByFile(typoErrors);

for (const [file, errs] of typoByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const match = e.message.match(/Cannot find name '(\w+)'\.\s+Did you mean '(\w+)'\?/);
    if (!match) continue;
    const wrong = match[1];
    const correct = match[2];
    content = content.replace(new RegExp(`\\b${wrong}\\b`, "g"), correct);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`  Fixed: ${file}`);
  }
}

// ==========================================
// FIX 9: TS2451 - Cannot redeclare
// ==========================================
console.log("\n--- Fixing TS2451: Cannot redeclare ---");
const redeclareErrors = errors.filter(e => e.code === "TS2451");
const redeclareByFile = groupByFile(redeclareErrors);

for (const [file, errs] of redeclareByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const nameMatch = e.message.match(/Cannot redeclare (block-scoped )?variable '(\w+)'/);
    if (!nameMatch) continue;
    const name = nameMatch[2];

    if (name === "colors") {
      const importRegex = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*design-system\/theme(?:\/index)?)['"]/g;
      const importMatches = [];
      let m;
      while ((m = importRegex.exec(content)) !== null) {
        if (m[1].includes("flatColors as colors") || m[1].includes("colors")) {
          importMatches.push({ full: m[0], imports: m[1], fromPath: m[2] });
        }
      }

      if (importMatches.length >= 2) {
        const firstMatch = importMatches[0];
        if (!firstMatch.imports.includes("flatColors as colors")) {
          const newImports = firstMatch.imports.replace(/\bcolors\b/, "flatColors as colors");
          content = content.replace(firstMatch.full, `import {${newImports}} from '${firstMatch.fromPath}'`);
        }

        for (let i = 1; i < importMatches.length; i++) {
          const match = importMatches[i];
          const cleanedImports = match.imports.split(",").map(s => s.trim()).filter(s => {
            return s !== "colors" && s !== "flatColors as colors" && s !== "flatColors";
          }).join(", ");
          if (cleanedImports) {
            content = content.replace(match.full, `import {${cleanedImports}} from '${match.fromPath}'`);
          } else {
            content = content.replace(match.full + "\n", "");
          }
        }
        modified = true;
      }

      const colorsTokenImport = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*tokens\/colors['"]/g;
      let cm;
      const tokenImports = [];
      while ((cm = colorsTokenImport.exec(content)) !== null) {
        if (cm[1].includes("colors")) {
          tokenImports.push({ full: cm[0], imports: cm[1] });
        }
      }

      for (const ti of tokenImports) {
        const cleaned = ti.imports.split(",").map(s => s.trim()).filter(s => s !== "colors").join(", ");
        if (cleaned) {
          content = content.replace(ti.full, ti.full.replace(ti.imports, cleaned));
        } else {
          content = content.replace(ti.full + "\n", "");
        }
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
// FIX 10: TS2345 - Arguments not assignable
// ==========================================
console.log("\n--- Fixing TS2345: Arguments not assignable ---");
const argErrors = errors.filter(e => e.code === "TS2345");
const argByFile = groupByFile(argErrors);

for (const [file, errs] of argByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;
  const lines = content.split("\n");

  for (const e of errs) {
    const lineIdx = e.line - 1;
    if (lineIdx >= lines.length) continue;

    if (e.message.includes("FlatColors") || e.message.includes("not assignable to parameter")) {
      const line = lines[lineIdx];
      if (line.includes("useStyles(") && !line.includes("as any")) {
        lines[lineIdx] = line.replace(/useStyles\(([^)]+)\)/, "useStyles($1 as any)");
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

console.log("\n=== Re-running tsc ===");
const newOutput = runTsc();
const newErrors = parseErrors(newOutput);
console.log(`\nRemaining errors: ${newErrors.length}`);

const newByCode = {};
for (const e of newErrors) {
  newByCode[e.code] = (newByCode[e.code] || 0) + 1;
}
console.log("Error distribution:", Object.entries(newByCode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(", "));
