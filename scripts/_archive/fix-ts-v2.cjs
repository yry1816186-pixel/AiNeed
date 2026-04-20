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

function computeImportPath(filePath, targetRelFromSrc) {
  const relToSrc = path.relative(path.dirname(filePath), MOBILE_SRC).replace(/\\/g, "/");
  const prefix = relToSrc.startsWith(".") ? relToSrc : "./" + relToSrc;
  return prefix + "/" + targetRelFromSrc;
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

function addToExistingImport(content, importPath, nameToAdd) {
  const escapedPath = escapeRegExp(importPath);
  const regex = new RegExp(`(import\\s*\\{)([^}]*)(\\}\\s*from\\s*['"]${escapedPath}['"])`);
  const match = content.match(regex);
  if (match) {
    const existing = match[2].trim();
    if (existing.includes(nameToAdd.split(" as ")[0].trim())) return content;
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

  if (relPath.includes("design-system/theme/")) return false;
  if (relPath.includes("shared/contexts/ThemeContext")) return false;
  if (relPath.includes("contexts/ThemeContext.tsx")) return false;

  const usesColors = /\bcolors\.\w+/.test(content);
  const hasFlatColorsImport = /import\s+[^;]*flatColors\s+as\s+colors/.test(content);

  // Check if colors is used at module level (outside any function)
  const usesColorsInModuleLevel = (() => {
    const lines = content.split("\n");
    let depth = 0;
    for (const line of lines) {
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      if (depth === 0 && /\bcolors\.\w+/.test(line) && !/^\s*\/\//.test(line) && !/^\s*const\s*\{\s*colors/.test(line) && !/^\s*\*/.test(line)) {
        return true;
      }
      depth += opens - closes;
      if (depth < 0) depth = 0;
    }
    return false;
  })();

  // Fix 1: Add flatColors import for module-level colors usage
  // This is needed even if component has useTheme(), because StyleSheet.create runs at module level
  // Also needed if createStyles is used (colors is a callback param, not available at module level)
  const usesColorsInStyleSheet = /StyleSheet\.create\s*\(\s*\{[\s\S]*?colors\.\w+/.test(content);
  const usesCreateStylesPattern = /\bcreateStyles\s*\(/.test(content);
  if (usesColors && (usesColorsInModuleLevel || usesColorsInStyleSheet || usesCreateStylesPattern) && !hasFlatColorsImport) {
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

  // Fix 2: Add useTheme import + destructure for component-level colors usage (only if no module-level usage)
  const hasColorsDestructure = /const\s*\{\s*colors\s*[:}]/.test(content);
  if (usesColors && !usesColorsInModuleLevel && !hasColorsDestructure && !hasFlatColorsImport) {
    const hasUseThemeImport = /import\s+[^;]*useTheme[^;]*from/.test(content);
    if (!hasUseThemeImport) {
      const importPath = computeImportPath(filePath, "shared/contexts/ThemeContext");
      const existingMatch = content.match(/from\s+['"]([^'"]*shared\/contexts\/ThemeContext)['"]/);
      if (existingMatch) {
        const result = addToExistingImport(content, existingMatch[1], "useTheme");
        if (result && result !== content) {
          content = result;
        } else {
          content = insertAfterImports(content, `import { useTheme } from '${importPath}';`);
        }
      } else {
        content = insertAfterImports(content, `import { useTheme } from '${importPath}';`);
      }
    }

    // Find component function opening and add destructure after the opening brace
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match function opening patterns that end with {
      if (line.match(/\)\s*(=>\s*)?\{\s*$/) &&
          !line.includes("StyleSheet") && !line.includes("import") &&
          !line.includes("createStyles") && !line.includes("useStyles") &&
          (line.match(/^(export\s+)?(function|const)\s+\w+/) || line.match(/^\s*\}\s*\)\s*=>\s*\{/))) {
        // Check next line doesn't already have useTheme/colors
        const nextLine = lines[i + 1] || "";
        if (!nextLine.includes("useTheme") && !nextLine.includes("colors")) {
          lines.splice(i + 1, 0, "  const { colors } = useTheme();");
          content = lines.join("\n");
          modified = true;
        }
        break;
      }
    }
  }

  // Fix 3: Add createStyles import if needed
  const usesCreateStyles = /\bcreateStyles\s*\(/.test(content);
  const hasCreateStylesImport = /import\s+[^;]*createStyles[^;]*from/.test(content);
  if (usesCreateStyles && !hasCreateStylesImport) {
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

  // Fix 4: Add missing styles definition (StyleSheet.create stub) - only for files that don't use createStyles/useStyles
  const usesStyles = /\bstyles\.\w+/.test(content);
  const hasStylesDef = /const\s+styles\s*=/.test(content);
  const usesUseStyles = /\buseStyles\s*\(/.test(content);
  if (usesStyles && !hasStylesDef && !usesUseStyles) {
    const stylesUsed = [];
    const re = /styles\.(\w+)/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (!stylesUsed.includes(m[1])) stylesUsed.push(m[1]);
    }
    if (stylesUsed.length > 0) {
      const obj = stylesUsed.map(s => `  ${s}: {} as any,`).join("\n");
      content = content.trimEnd() + `\n\nconst styles = StyleSheet.create({\n${obj}\n});\n`;
      modified = true;
    }
  }

  // Fix 5: theme variable not defined
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

  // Fix 6: Spacing not defined
  const usesSpacing = /\bSpacing\.\w+/.test(content);
  const hasSpacingImport = /import\s+[^;]*Spacing[^;]*from/.test(content);
  if (usesSpacing && !hasSpacingImport) {
    const importPath = computeImportPath(filePath, "design-system/theme");
    const existingMatch = content.match(/from\s+['"]([^'"]*design-system\/theme(?:\/index)?)['"]/);
    if (existingMatch) {
      const result = addToExistingImport(content, existingMatch[1], "Spacing");
      if (result && result !== content) {
        content = result;
        modified = true;
      }
    } else {
      content = insertAfterImports(content, `import { Spacing } from '${importPath}';`);
      modified = true;
    }
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
    console.error(`Error: ${file}: ${e.message}`);
  }
}
console.log(`\nTotal: ${fixedCount}`);
