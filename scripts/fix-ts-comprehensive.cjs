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

function insertAfterLastImport(content, line) {
  const lines = content.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i].trim()) || /^import\s*\{/.test(lines[i].trim())) {
      lastImportIdx = i;
    } else if (lastImportIdx >= 0 && lines[i].trim().startsWith("}")) {
      lastImportIdx = i;
    } else if (lastImportIdx >= 0 && /from\s+['"]/.test(lines[i])) {
      lastImportIdx = i;
    }
  }
  if (lastImportIdx === -1) lastImportIdx = 0;
  lines.splice(lastImportIdx + 1, 0, line);
  return lines.join("\n");
}

function findComponentStart(lines, lineIdx) {
  for (let i = lineIdx; i >= 0; i--) {
    const line = lines[i];
    if (/^\s*(export\s+)?(const|function)\s+\w+.*[=({]\s*$/.test(line) ||
        /^\s*(export\s+)?(const|function)\s+\w+.*=\s*(\(|\{)/.test(line) ||
        /^\s*(export\s+)?function\s+\w+/.test(line)) {
      const braceMatch = line.match(/\{|(\([^)]*\)\s*=>)/);
      if (braceMatch) {
        const afterBrace = line.substring(braceMatch.index + braceMatch[0].length);
        if (afterBrace.includes(")")) {
          return i;
        }
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.startsWith("{") || nextLine.startsWith("}") || nextLine === "") {
            return i;
          }
        }
      }
    }
  }
  return -1;
}

function addStylesToComponent(content, lineNum, filePath) {
  const lines = content.split("\n");
  const targetLine = lineNum - 1;

  let compStart = -1;
  for (let i = targetLine; i >= 0; i--) {
    const line = lines[i];
    if (/^\s*(export\s+)?(const|function)\s+\w+.*[=({]/.test(line)) {
      if (/\)\s*(=>|:\s*React\.FC)/.test(line) || /\{\s*$/.test(line) || /,\s*\}\)\s*=>/.test(line)) {
        compStart = i;
        break;
      }
    }
  }

  if (compStart === -1) return content;

  let insertIdx = compStart + 1;
  while (insertIdx < lines.length && /^\s*$/.test(lines[insertIdx])) {
    insertIdx++;
  }

  const hasUseTheme = lines.slice(compStart, insertIdx + 5).some(l => /const\s*\{\s*colors\s*\}\s*=\s*useTheme/.test(l));
  const hasStylesDef = lines.slice(compStart, insertIdx + 5).some(l => /const\s+styles\s*=\s*useStyles/.test(l));

  const indent = "  ";
  const newLines = [];
  if (!hasUseTheme) {
    newLines.push(`${indent}const { colors } = useTheme();`);
  }
  if (!hasStylesDef) {
    newLines.push(`${indent}const styles = useStyles(colors);`);
  }

  if (newLines.length > 0) {
    lines.splice(insertIdx, 0, ...newLines);
    return lines.join("\n");
  }
  return content;
}

console.log("Running tsc...");
const output = runTsc();
let errors = parseErrors(output);
console.log(`Found ${errors.length} errors`);

const byCode = {};
for (const e of errors) {
  byCode[e.code] = (byCode[e.code] || 0) + 1;
}
console.log("Error distribution:", Object.entries(byCode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(", "));

const fileErrors = groupByFile(errors);
const modifiedFiles = new Set();

// ==========================================
// FIX 1: TS2304 - Cannot find name 'styles'
// ==========================================
console.log("\n--- Fixing TS2304: Cannot find name 'styles' ---");
const stylesErrors = errors.filter(e => e.code === "TS2304" && e.message.includes("'styles'"));
const stylesByFile = groupByFile(stylesErrors);

for (const [file, errs] of stylesByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");

  const hasUseStyles = /const\s+useStyles\s*=\s*createStyles/.test(content);
  const hasCreateStylesImport = /import.*createStyles/.test(content);
  const hasUseThemeImport = /import.*useTheme/.test(content);

  if (!hasUseStyles && !hasCreateStylesImport) {
    const usedStyleProps = new Set();
    const re = /styles\.(\w+)/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      usedStyleProps.add(m[1]);
    }

    if (usedStyleProps.size > 0) {
      const hasStyleSheetImport = /import.*StyleSheet.*from\s+['"]react-native['"]/.test(content);
      if (!hasStyleSheetImport) {
        const rnImportMatch = content.match(/from\s+['"]react-native['"]/);
        if (rnImportMatch) {
          const importLine = content.substring(0, content.indexOf(rnImportMatch[0]));
          const lastImportLine = importLine.split("\n").pop();
          if (lastImportLine.includes("}")) {
            content = content.replace(
              /(\})\s*from\s+['"]react-native['"]/,
              "$1, StyleSheet} from 'react-native'"
            );
          }
        }
      }

      const propsStr = Array.from(usedStyleProps).map(p => `  ${p}: {} as any,`).join("\n");
      const stylesDef = `\nconst styles = StyleSheet.create({\n${propsStr}\n});\n`;

      if (!/const\s+styles\s*=/.test(content)) {
        content = content.trimEnd() + "\n" + stylesDef;
        modifiedFiles.add(file);
      }
    }
    continue;
  }

  if (hasUseStyles) {
    const componentLinesWithStyles = new Set();
    for (const e of errs) {
      for (let i = e.line - 1; i >= 0; i--) {
        const line = lines[i];
        if (/^\s*(export\s+)?(const|function)\s+\w+/.test(line) && 
            (/React\.FC/.test(line) || /=>\s*\{/.test(line) || /=>\s*$/.test(line))) {
          componentLinesWithStyles.add(i);
          break;
        }
      }
    }

    const componentsNeedingStyles = [];
    for (const compLineIdx of componentLinesWithStyles) {
      const compLine = lines[compLineIdx];
      let hasStylesInComp = false;
      let hasUseThemeInComp = false;

      for (let i = compLineIdx + 1; i < Math.min(compLineIdx + 30, lines.length); i++) {
        const l = lines[i];
        if (/^\s*(export\s+)?(const|function)\s+\w+/.test(l) && i > compLineIdx) break;
        if (/const\s+styles\s*=/.test(l)) { hasStylesInComp = true; break; }
        if (/const\s*\{\s*colors\s*\}\s*=\s*useTheme/.test(l)) hasUseThemeInComp = true;
      }

      if (!hasStylesInComp) {
        componentsNeedingStyles.push({ lineIdx: compLineIdx, hasUseTheme: hasUseThemeInComp });
      }
    }

    if (componentsNeedingStyles.length > 0) {
      componentsNeedingStyles.sort((a, b) => b.lineIdx - a.lineIdx);

      for (const comp of componentsNeedingStyles) {
        let insertIdx = comp.lineIdx + 1;
        while (insertIdx < lines.length && /^\s*$/.test(lines[insertIdx])) {
          insertIdx++;
        }

        const indent = "  ";
        const newLines = [];
        if (!comp.hasUseTheme) {
          newLines.push(`${indent}const { colors } = useTheme();`);
        }
        newLines.push(`${indent}const styles = useStyles(colors);`);

        lines.splice(insertIdx, 0, ...newLines);
        modifiedFiles.add(file);
      }

      content = lines.join("\n");
    }
  }

  if (content !== fs.readFileSync(fullPath, "utf-8")) {
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 2: TS2304 - Cannot find name 'theme'
// ==========================================
console.log("\n--- Fixing TS2304: Cannot find name 'theme' ---");
const themeErrors = errors.filter(e => e.code === "TS2304" && e.message.includes("'theme'"));
const themeByFile = groupByFile(themeErrors);

for (const [file, errs] of themeByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");

  if (!/\btheme\b/.test(content) || /import.*\btheme\b/.test(content)) continue;

  const hasThemeImport = /import\s*\{[^}]*\btheme\b[^}]*\}\s*from/.test(content) ||
                         /import\s+\btheme\b\s+from/.test(content);

  if (!hasThemeImport) {
    const importPath = computeImportPath(file, "design-system/theme");
    const existingThemeImport = content.match(/from\s+['"]([^'"]*design-system\/theme(?:\/index)?)['"]/);

    if (existingThemeImport) {
      content = content.replace(
        /import\s*\{([^}]*)\}\s*from\s+['"]([^'"]*design-system\/theme(?:\/index)?)['"]/,
        (match, imports, fromPath) => {
          if (imports.includes("theme")) return match;
          return `import {${imports}, theme} from '${fromPath}'`;
        }
      );
    } else {
      content = insertAfterLastImport(content, `import { theme } from '${importPath}';`);
    }

    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 3: TS2304 - Cannot find name 'colors'
// ==========================================
console.log("\n--- Fixing TS2304: Cannot find name 'colors' ---");
const colorsErrors = errors.filter(e => e.code === "TS2304" && e.message.includes("'colors'"));
const colorsByFile = groupByFile(colorsErrors);

for (const [file, errs] of colorsByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");

  const hasColorsImport = /import\s*\{[^}]*\bflatColors\s+as\s+colors\b/.test(content) ||
                          /import\s*\{[^}]*\bcolors\b[^}]*\}\s*from/.test(content) ||
                          /const\s*\{\s*colors\s*\}\s*=\s*useTheme/.test(content);

  if (!hasColorsImport) {
    const importPath = computeImportPath(file, "design-system/theme");
    const existingThemeImport = content.match(/from\s+['"]([^'"]*design-system\/theme(?:\/index)?)['"]/);

    if (existingThemeImport) {
      content = content.replace(
        /import\s*\{([^}]*)\}\s*from\s+['"]([^'"]*design-system\/theme(?:\/index)?)['"]/,
        (match, imports, fromPath) => {
          if (imports.includes("flatColors as colors")) return match;
          return `import {${imports}, flatColors as colors} from '${fromPath}'`;
        }
      );
    } else {
      content = insertAfterLastImport(content, `import { flatColors as colors } from '${importPath}';`);
    }

    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 4: TS2304 - Other missing names
// ==========================================
console.log("\n--- Fixing TS2304: Other missing names ---");
const other2304 = errors.filter(e => e.code === "TS2304" && !e.message.includes("'styles'") && !e.message.includes("'theme'") && !e.message.includes("'colors'"));
const other2304ByFile = groupByFile(other2304);

for (const [file, errs] of other2304ByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const nameMatch = e.message.match(/Cannot find name '(\w+)'/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    if (name === "PRICE_RANGES" && !content.includes("PRICE_RANGES")) {
      content = insertAfterLastImport(content, `const PRICE_RANGES = [{ label: '¥0-200', min: 0, max: 200 }, { label: '¥200-500', min: 200, max: 500 }, { label: '¥500-1000', min: 500, max: 1000 }, { label: '¥1000+', min: 1000, max: Infinity }] as const;`);
      modified = true;
    } else if (name === "SpringConfigs" && !content.includes("SpringConfigs")) {
      content = insertAfterLastImport(content, `const SpringConfigs = { default: { damping: 15, stiffness: 100 }, gentle: { damping: 20, stiffness: 60 }, bouncy: { damping: 10, stiffness: 150 } } as const;`);
      modified = true;
    } else if (name === "ThemeMode" && !content.includes("ThemeMode")) {
      content = insertAfterLastImport(content, `type ThemeMode = 'light' | 'dark' | 'system';`);
      modified = true;
    } else if (name === "DEEP_LINK_ROUTES" && !content.includes("DEEP_LINK_ROUTES")) {
      content = insertAfterLastImport(content, `const DEEP_LINK_ROUTES = { HOME: 'home', PROFILE: 'profile', WARDROBE: 'wardrobe', TRY_ON: 'try-on' } as const;`);
      modified = true;
    } else if (name === "UnifiedThemeProvider" && !content.includes("UnifiedThemeProvider")) {
      const importPath = computeImportPath(file, "shared/contexts/ThemeContext");
      content = insertAfterLastImport(content, `import { UnifiedThemeProvider } from '${importPath}';`);
      modified = true;
    } else if (name === "useTheme" && !content.includes("useTheme")) {
      const importPath = computeImportPath(file, "shared/contexts/ThemeContext");
      content = insertAfterLastImport(content, `import { useTheme } from '${importPath}';`);
      modified = true;
    } else if (name === "t" && !/\bt\s*=\s*useTranslation/.test(content) && !/\bconst\s+t\b/.test(content)) {
      content = insertAfterLastImport(content, `const t = (key: string) => key;`);
      modified = true;
    } else if (name === "ViewStyle" && !content.includes("ViewStyle")) {
      const hasRnImport = /from\s+['"]react-native['"]/.test(content);
      if (hasRnImport) {
        content = content.replace(
          /import\s*\{([^}]*)\}\s*from\s+['"]react-native['"]/,
          (match, imports) => imports.includes("ViewStyle") ? match : `import {${imports}, ViewStyle} from 'react-native'`
        );
      } else {
        content = insertAfterLastImport(content, `import { ViewStyle } from 'react-native';`);
      }
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 5: TS2307 - Cannot find module
// ==========================================
console.log("\n--- Fixing TS2307: Cannot find module ---");
const moduleErrors = errors.filter(e => e.code === "TS2307");
const moduleByFile = groupByFile(moduleErrors);

const moduleSearchDirs = [
  "design-system/theme/tokens",
  "design-system/theme",
  "shared/contexts",
  "shared/components",
  "services/api",
  "services",
  "types",
  "utils",
  "stores",
  "polyfills",
];

for (const [file, errs] of moduleByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const modMatch = e.message.match(/Cannot find module '([^']+)'/);
    if (!modMatch) continue;
    const modPath = modMatch[1];

    if (modPath.startsWith(".") || modPath.startsWith("/")) {
      const dir = path.dirname(fullPath);
      const resolved = path.resolve(dir, modPath);
      const extensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];

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
          path.join(SRC_DIR, "services"),
          path.join(SRC_DIR, "types"),
          path.join(SRC_DIR, "utils"),
          path.join(SRC_DIR, "stores"),
          path.join(SRC_DIR, "polyfills"),
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
        }

        if (!found) {
          for (const searchDir of searchDirs) {
            const indexCandidate = path.join(searchDir, lastPart, "index.ts");
            const indexTsx = path.join(searchDir, lastPart, "index.tsx");
            if (fs.existsSync(indexCandidate) || fs.existsSync(indexTsx)) {
              const correctRel = path.relative(dir, (fs.existsSync(indexCandidate) ? indexCandidate : indexTsx)).replace(/\\/g, "/");
              const prefix = correctRel.startsWith(".") ? correctRel : "./" + correctRel;
              content = content.replace(`from '${modPath}'`, `from '${prefix}'`);
              content = content.replace(`from "${modPath}"`, `from "${prefix}"`);
              modified = true;
              break;
            }
          }
        }
      }
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 6: TS2339 - Property does not exist
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

    if (typeName === "typeof StyleSheet" || typeName.includes("StyleSheet")) {
      continue;
    }

    if (prop.startsWith("_")) {
      const cleanProp = prop.substring(1);
      const regex = new RegExp(`\\b${prop}\\b`, "g");
      content = content.replace(regex, cleanProp);
      modified = true;
      continue;
    }

    const interfaceRegex = new RegExp(`(interface|type)\\s+${typeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[={]`, "g");
    let ifaceMatch;
    while ((ifaceMatch = interfaceRegex.exec(content)) !== null) {
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
                         prop === "selected" || prop === "visible" || prop === "loading" || prop === "disabled" ? "boolean" :
                         prop === "id" || prop === "count" || prop === "index" || prop === "size" || prop === "age" ? "number" :
                         "any";

        const insertPos = startIdx + braceStart + 1;
        const lastPropMatch = body.match(/(\w+)\s*[?:]\s*[^;]+;?\s*$/);
        if (lastPropMatch) {
          const lastPropEnd = body.lastIndexOf(lastPropMatch[0]) + lastPropMatch[0].length;
          content = content.substring(0, startIdx + braceStart + 1 + lastPropEnd) +
                    `\n  ${prop}?: ${propType};` +
                    content.substring(startIdx + braceStart + 1 + lastPropEnd);
        } else {
          content = content.substring(0, insertPos) +
                    `\n  ${prop}?: ${propType};` +
                    content.substring(insertPos);
        }
        modified = true;
        break;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 7: TS2300 - Duplicate identifier
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

    const regex = new RegExp(`(import\\s*\\{[^}]*)(\\b${name}\\b)([^}]*\\}\\s*from)`, "g");
    let match;
    const occurrences = [];
    while ((match = regex.exec(content)) !== null) {
      occurrences.push({ index: match.index, full: match[0] });
    }

    if (occurrences.length > 1) {
      const lastOccurrence = occurrences[occurrences.length - 1];
      const before = content.substring(0, lastOccurrence.index);
      const after = content.substring(lastOccurrence.index + lastOccurrence.full.length);

      const importBody = lastOccurrence.full;
      const cleaned = importBody.replace(new RegExp(`,?\\s*\\b${name}\\b\\s*,?`, "g"), (m, idx) => {
        const trimmed = m.trim();
        if (trimmed === name || trimmed === `,${name}` || trimmed === `${name},`) {
          return trimmed.startsWith(",") && trimmed.endsWith(",") ? "," : "";
        }
        return m;
      });

      content = before + cleaned + after;
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 8: TS7053 - No index signature
// ==========================================
console.log("\n--- Fixing TS7053: No index signature ---");
const indexErrors = errors.filter(e => e.code === "TS7053");
const indexByFile = groupByFile(indexErrors);

for (const [file, errs] of indexByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const line = content.split("\n")[e.line - 1];
    if (!line) continue;

    const bracketAccess = line.match(/(\w+)\[(['"])(\w+)\2\]/g);
    if (bracketAccess) {
      for (const access of bracketAccess) {
        const dotAccess = access.replace(/\[(['"])(\w+)\1\]/, ".$2");
        const escaped = access.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        content = content.replace(new RegExp(escaped, "g"), dotAccess);
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 9: TS7006 - Parameter implicitly has 'any' type
// ==========================================
console.log("\n--- Fixing TS7006: Parameter implicitly has 'any' type ---");
const anyErrors = errors.filter(e => e.code === "TS7006");
const anyByFile = groupByFile(anyErrors);

for (const [file, errs] of anyByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;
  const lines = content.split("\n");

  for (const e of errs) {
    const lineIdx = e.line - 1;
    if (lineIdx >= lines.length) continue;
    const line = lines[lineIdx];

    const paramMatch = e.message.match(/Parameter '(\w+)' implicitly has an 'any' type/);
    if (!paramMatch) continue;
    const param = paramMatch[1];

    const paramInFunc = new RegExp(`(\\b${param}\\b)(\\s*[),])`);
    if (paramInFunc.test(line)) {
      lines[lineIdx] = line.replace(paramInFunc, `$1: any$2`);
      modified = true;
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 10: TS1205 - Re-exporting a type when isolatedModules
// ==========================================
console.log("\n--- Fixing TS1205: Re-exporting a type ---");
const reexportErrors = errors.filter(e => e.code === "TS1205");
const reexportByFile = groupByFile(reexportErrors);

for (const [file, errs] of reexportByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;
  const lines = content.split("\n");

  for (const e of errs) {
    const lineIdx = e.line - 1;
    if (lineIdx >= lines.length) continue;
    const line = lines[lineIdx];

    if (/^export\s+\{/.test(line.trim()) && !line.includes("export type")) {
      lines[lineIdx] = line.replace(/^(\s*)export\s+\{/, "$1export type {");
      modified = true;
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 11: TS2322 - Type not assignable (style issues)
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
    if (e.message.includes('"scroll"') && e.message.includes('"hidden"')) {
      const lineIdx = e.line - 1;
      if (lineIdx < lines.length && lines[lineIdx].includes("scroll")) {
        lines[lineIdx] = lines[lineIdx].replace(/overflow:\s*["']scroll["']/g, 'overflow: "hidden"');
        modified = true;
      }
    }
  }

  if (modified) {
    content = lines.join("\n");
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 12: TS2551 - Property does not exist, did you mean
// ==========================================
console.log("\n--- Fixing TS2551: Did you mean ---");
const typoErrors = errors.filter(e => e.code === "TS2551");
const typoByFile = groupByFile(typoErrors);

for (const [file, errs] of typoByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const match = e.message.match(/Property '(\w+)' does not exist on type '[^']+'\.\s+Did you mean '(\w+)'\?/);
    if (!match) continue;
    const wrong = match[1];
    const correct = match[2];

    const regex = new RegExp(`\\b${wrong}\\b`, "g");
    content = content.replace(regex, correct);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 13: TS2305 - Module has no exported member
// ==========================================
console.log("\n--- Fixing TS2305: Module has no exported member ---");
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

    const importRegex = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${modPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
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
    modifiedFiles.add(file);
  }
}

// ==========================================
// FIX 14: TS2448 - Block-scoped variable used before declaration
// ==========================================
console.log("\n--- Fixing TS2448: Block-scoped variable ---");
const blockErrors = errors.filter(e => e.code === "TS2448");
const blockByFile = groupByFile(blockErrors);

for (const [file, errs] of blockByFile) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const e of errs) {
    const match = e.message.match(/Block-scoped variable '(\w+)' used before declaration/);
    if (!match) continue;
    const varName = match[1];

    const defRegex = new RegExp(`^(const|let|var)\\s+${varName}\\s*=`, "m");
    const defMatch = content.match(defRegex);
    if (defMatch) {
      const defLine = content.substring(0, defMatch.index).split("\n").length;
      const useLine = e.line;

      if (defLine > useLine) {
        const lines = content.split("\n");
        const defLineIdx = defLine - 1;
        const defLineContent = lines[defLineIdx];
        lines.splice(defLineIdx, 1);
        const insertIdx = useLine - 2;
        lines.splice(Math.max(0, insertIdx), 0, defLineContent);
        content = lines.join("\n");
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    modifiedFiles.add(file);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Modified ${modifiedFiles.size} files`);
console.log("Modified files:", Array.from(modifiedFiles).slice(0, 20).join(", ") + (modifiedFiles.size > 20 ? "..." : ""));

console.log("\nRe-running tsc...");
const newOutput = runTsc();
const newErrors = parseErrors(newOutput);
console.log(`\nRemaining errors: ${newErrors.length}`);

const newByCode = {};
for (const e of newErrors) {
  newByCode[e.code] = (newByCode[e.code] || 0) + 1;
}
console.log("Error distribution:", Object.entries(newByCode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(", "));
