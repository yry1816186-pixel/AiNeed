const fs = require("fs");
const path = require("path");

const MOBILE_SRC = path.join(__dirname, "..", "apps", "mobile", "src");

function getAllTsxFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === "0") continue;
    if (entry.isDirectory()) {
      results.push(...getAllTsxFiles(fullPath));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findLastImportEnd(content) {
  const lines = content.split("\n");
  let lastImportEndLine = -1;
  let inImport = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*import\s/.test(line) || /^\s*import\s*type\s/.test(line)) {
      inImport = true;
    }
    if (inImport && /from\s+['"][^'"]+['"]\s*;?\s*$/.test(line)) {
      lastImportEndLine = i;
      inImport = false;
    }
    if (inImport && /;\s*$/.test(line) && !/from\s+['"]/.test(line)) {
      lastImportEndLine = i;
      inImport = false;
    }
  }
  return lastImportEndLine;
}

function insertAfterImports(content, newLine) {
  const lines = content.split("\n");
  const idx = findLastImportEnd(content);
  if (idx >= 0) {
    lines.splice(idx + 1, 0, newLine);
    return lines.join("\n");
  }
  return newLine + "\n" + content;
}

function computeImportPath(filePath, targetRelFromSrc) {
  const relToSrc = path.relative(path.dirname(filePath), MOBILE_SRC).replace(/\\/g, "/");
  const prefix = relToSrc.startsWith(".") ? relToSrc : "./" + relToSrc;
  return prefix + "/" + targetRelFromSrc;
}

function hasModuleLevelFlatColorsImport(content) {
  return /import\s+\{[^}]*flatColors\s+as\s+colors[^}]*\}\s*from/.test(content);
}

function usesColorsInStyleSheet(content) {
  return /StyleSheet\.create\s*\(\s*\{[\s\S]*?colors\.\w+/.test(content);
}

function usesColorsInModule(content) {
  const lines = content.split("\n");
  let inFunction = 0;
  for (const line of lines) {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (inFunction === 0 && /\bcolors\.\w+/.test(line) && !/^\s*\/\//.test(line)) {
      return true;
    }
    inFunction += opens - closes;
    if (inFunction < 0) inFunction = 0;
  }
  return false;
}

function addToExistingImport(content, importPath, nameToAdd) {
  const escapedPath = escapeRegExp(importPath);
  const regex = new RegExp(`(import\\s*\\{)([^}]*)(\\}\\s*from\\s*['"]${escapedPath}['"])`);
  const match = content.match(regex);
  if (match) {
    const existing = match[2].trim();
    if (existing.includes(nameToAdd) || existing.includes("flatColors")) return content;
    const newImports = existing ? `${existing}, ${nameToAdd}` : nameToAdd;
    return content.replace(regex, `import { ${newImports} } from '${importPath}'`);
  }
  return null;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  const original = content;
  let modified = false;

  const relPath = path.relative(MOBILE_SRC, filePath).replace(/\\/g, "/");

  // Skip design-system token files - they ARE the source of colors
  if (relPath.includes("design-system/theme/tokens/")) return false;
  if (relPath.includes("design-system/theme/FlatColors")) return false;
  if (relPath.includes("shared/contexts/ThemeContext")) return false;

  // Fix 1: Wrong import path - flatColors from design-tokens instead of theme index
  const wrongPathRegex = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*design-system\/theme\/tokens\/design-tokens)['"]/g;
  let m;
  while ((m = wrongPathRegex.exec(content)) !== null) {
    const imports = m[1];
    const oldPath = m[2];
    if (imports.includes("flatColors")) {
      const newPath = oldPath.replace(/\/tokens\/design-tokens$/, "");
      const otherImports = imports.replace(/,\s*flatColors\s+as\s+colors\s*,?/, ",").replace(/,\s*$/, "").replace(/^\s*,\s*/, "");
      if (otherImports.trim()) {
        content = content.replace(m[0], `import {${otherImports} } from '${oldPath}';\nimport { flatColors as colors } from '${newPath}';`);
      } else {
        content = content.replace(m[0], `import { flatColors as colors } from '${newPath}';`);
      }
      modified = true;
    }
    if (imports.includes("useTheme") || imports.includes("createStyles")) {
      const themeItems = [];
      const otherItems = [];
      imports.split(",").forEach(item => {
        const t = item.trim();
        if (t.includes("useTheme") || t.includes("createStyles")) themeItems.push(t);
        else if (t && !t.includes("flatColors")) otherItems.push(t);
      });
      const correctPath = computeImportPath(filePath, "shared/contexts/ThemeContext");
      if (otherItems.length > 0 && themeItems.length > 0) {
        content = content.replace(m[0], `import { ${otherItems.join(", ")} } from '${oldPath}';\nimport { ${themeItems.join(", ")} } from '${correctPath}';`);
      } else if (themeItems.length > 0) {
        content = content.replace(m[0], `import { ${themeItems.join(", ")} } from '${correctPath}';`);
      }
      modified = true;
    }
  }

  // Fix 2: If colors is used at module level (StyleSheet.create or other module-level code), need flatColors import
  const needsModuleLevelColors = usesColorsInStyleSheet(content) || usesColorsInModule(content);
  if (needsModuleLevelColors && !hasModuleLevelFlatColorsImport(content)) {
    const themeImportPath = computeImportPath(filePath, "design-system/theme");
    const existingThemeMatch = content.match(/from\s+['"]([^'"]*design-system\/theme(?:\/index)?)['"]/);
    if (existingThemeMatch) {
      const result = addToExistingImport(content, existingThemeMatch[1], "flatColors as colors");
      if (result && result !== content) {
        content = result;
        modified = true;
      } else {
        content = insertAfterImports(content, `import { flatColors as colors } from '${themeImportPath}';`);
        modified = true;
      }
    } else {
      content = insertAfterImports(content, `import { flatColors as colors } from '${themeImportPath}';`);
      modified = true;
    }
  }

  // Fix 3: If colors is used inside component functions but not at module level and not defined, add useTheme destructure
  const usesColors = /\bcolors\.\w+/.test(content);
  const hasColorsVar = hasModuleLevelFlatColorsImport(content) ||
    /const\s*\{\s*colors\s*[:}]/.test(content);

  if (usesColors && !hasColorsVar && !needsModuleLevelColors) {
    const hasUseThemeImport = /import\s+[^;]*useTheme[^;]*from/.test(content);
    if (!hasUseThemeImport) {
      const importPath = computeImportPath(filePath, "shared/contexts/ThemeContext");
      content = insertAfterImports(content, `import { useTheme } from '${importPath}';`);
    }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const funcMatch = lines[i].match(/^(export\s+(?:default\s+)?(?:function|const)\s+\w+[^{]*\{)/);
      if (funcMatch && !lines[i].includes("StyleSheet") && !lines[i].includes("import") && !lines[i].includes("type ")) {
        // Check if next line already has useTheme
        if (!lines[i + 1] || !lines[i + 1].includes("useTheme")) {
          lines.splice(i + 1, 0, "  const { colors } = useTheme();");
          content = lines.join("\n");
        }
        break;
      }
    }
    modified = true;
  }

  // Fix 4: styles variable not defined
  const usesStyles = /\bstyles\.\w+/.test(content);
  const hasStylesDef = /const\s+styles\s*=/.test(content);
  if (usesStyles && !hasStylesDef) {
    const stylesUsed = [];
    const re = /styles\.(\w+)/g;
    let sm;
    while ((sm = re.exec(content)) !== null) {
      if (!stylesUsed.includes(sm[1])) stylesUsed.push(sm[1]);
    }
    if (stylesUsed.length > 0) {
      const obj = stylesUsed.map(s => `  ${s}: {} as any,`).join("\n");
      content = content.trimEnd() + `\n\nconst styles = StyleSheet.create({\n${obj}\n});\n`;
      modified = true;
    }
  }

  // Fix 5: partStyles variable not defined
  const usesPartStyles = /\bpartStyles\.\w+/.test(content);
  const hasPartStylesDef = /const\s+partStyles\s*=/.test(content);
  if (usesPartStyles && !hasPartStylesDef) {
    const used = [];
    const re = /partStyles\.(\w+)/g;
    let sm;
    while ((sm = re.exec(content)) !== null) {
      if (!used.includes(sm[1])) used.push(sm[1]);
    }
    if (used.length > 0) {
      const obj = used.map(s => `  ${s}: {} as any,`).join("\n");
      content = content.trimEnd() + `\n\nconst partStyles = StyleSheet.create({\n${obj}\n});\n`;
      modified = true;
    }
  }

  // Fix 6: theme variable not defined (module level)
  const usesThemeVar = /\btheme\.(?:colors|spacing|typography|borderRadius|shadows|gradients|animation)\b/.test(content);
  const hasThemeVar = /import\s+.*\btheme\b.*from/.test(content) || /const\s+theme\s*=/.test(content);
  if (usesThemeVar && !hasThemeVar) {
    const importPath = computeImportPath(filePath, "design-system/theme");
    const existingMatch = content.match(/from\s+['"]([^'"]*design-system\/theme(?:\/index)?)['"]/);
    if (existingMatch) {
      const result = addToExistingImport(content, existingMatch[1], "theme");
      if (result && result !== content) {
        content = result;
        modified = true;
      }
    } else {
      content = insertAfterImports(content, `import { theme } from '${importPath}';`);
      modified = true;
    }
  }

  // Fix 7: createStyles not defined
  const usesCreateStyles = /\bcreateStyles\s*\(/.test(content);
  const hasCreateStyles = /import\s+[^;]*createStyles[^;]*from/.test(content);
  if (usesCreateStyles && !hasCreateStyles) {
    const importPath = computeImportPath(filePath, "shared/contexts/ThemeContext");
    const existingMatch = content.match(/from\s+['"]([^'"]*shared\/contexts\/ThemeContext)['"]/);
    if (existingMatch) {
      const result = addToExistingImport(content, existingMatch[1], "createStyles");
      if (result && result !== content) {
        content = result;
        modified = true;
      }
    } else {
      content = insertAfterImports(content, `import { createStyles } from '${importPath}';`);
      modified = true;
    }
  }

  // Fix 8: useUnifiedTheme not defined
  const usesUnifiedTheme = /\buseUnifiedTheme\s*\(/.test(content);
  const hasUnifiedTheme = /import\s+[^;]*useUnifiedTheme[^;]*from/.test(content);
  if (usesUnifiedTheme && !hasUnifiedTheme) {
    const importPath = computeImportPath(filePath, "shared/contexts/ThemeContext");
    content = insertAfterImports(content, `import { useTheme as useUnifiedTheme } from '${importPath}';`);
    modified = true;
  }

  if (modified && content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  }
  return false;
}

const files = getAllTsxFiles(MOBILE_SRC);
let fixedCount = 0;
for (const file of files) {
  try {
    if (fixFile(file)) {
      fixedCount++;
      console.log(`Fixed: ${path.relative(MOBILE_SRC, file)}`);
    }
  } catch (e) {
    console.error(`Error fixing ${file}: ${e.message}`);
  }
}
console.log(`\nTotal files fixed: ${fixedCount}`);
