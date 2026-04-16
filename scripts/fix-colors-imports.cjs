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

function getRelativeImportPath(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

function hasColorsDefinition(content) {
  const patterns = [
    /const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)/,
    /const\s+colors\s*=\s*useTheme\(\)/,
    /import\s+\{[^}]*flatColors[^}]*\}\s*from/,
    /import\s+\{[^}]*colors[^}]*as\s+colors[^}]*\}\s*from/,
    /flatColors\s+as\s+colors/,
    /const\s+colors\s*=\s*flatColors/,
    /const\s+colors\s*=\s*\{/,
  ];
  return patterns.some((p) => p.test(content));
}

function hasStylesDefinition(content) {
  const patterns = [
    /const\s+styles\s*=\s*StyleSheet\.create/,
    /const\s+styles\s*=\s*makeStyles/,
    /const\s+styles\s*=\s*createStyles/,
    /const\s+styles\s*=\s*useStyles/,
  ];
  return patterns.some((p) => p.test(content));
}

function usesColorsVariable(content) {
  const usagePattern = /\bcolors\.\w+/;
  return usagePattern.test(content);
}

function usesStylesVariable(content) {
  const usagePattern = /\bstyles\.\w+/;
  return usagePattern.test(content);
}

function hasUseThemeImport(content) {
  return /import\s+\{[^}]*useTheme[^}]*\}\s*from/.test(content);
}

function hasCreateStylesImport(content) {
  return /import\s+\{[^}]*createStyles[^}]*\}\s*from/.test(content);
}

function findThemeContextImportPath(content) {
  const match = content.match(
    /import\s+\{[^}]*\}\s*from\s*['"]([^'"]*ThemeContext)['"]/
  );
  return match ? match[1] : null;
}

function findDesignSystemThemeImportPath(content) {
  const match = content.match(
    /import\s+\{[^}]*\}\s*from\s*['"]([^'"]*design-system\/theme[^'"]*|[^'"]*theme\/index)['"]/
  );
  return match ? match[1] : null;
}

function addColorsImportFromTheme(filePath, content) {
  const themeContextPath = findThemeContextImportPath(content);
  const designThemePath = findDesignSystemThemeImportPath(content);

  let importPath;
  if (themeContextPath) {
    importPath = themeContextPath;
  } else if (designThemePath) {
    importPath = designThemePath;
  } else {
    const srcDir = path.join(MOBILE_SRC);
    const relToSrc = path.relative(path.dirname(filePath), srcDir).replace(/\\/g, "/");
    const prefix = relToSrc.startsWith(".") ? relToSrc : "./" + relToSrc;
    importPath = prefix + "/shared/contexts/ThemeContext";
  }

  if (themeContextPath) {
    const existingImportRegex = new RegExp(
      `(import\\s*\\{[^}]*)\\}from\\s*['"]${escapeRegExp(importPath)}['"]`
    );
    const match = content.match(existingImportRegex);
    if (match) {
      const imports = match[1];
      if (!imports.includes("useTheme")) {
        content = content.replace(
          existingImportRegex,
          `${imports}, useTheme } from '${importPath}'`
        );
      }
    }
  } else {
    const lastImportIndex = content.lastIndexOf("\nimport ");
    const nextNewline = content.indexOf("\n", lastImportIndex + 1);
    content =
      content.slice(0, nextNewline) +
      `\nimport { useTheme } from '${importPath}';` +
      content.slice(nextNewline);
  }

  return content;
}

function addFlatColorsImport(filePath, content) {
  const designThemePath = findDesignSystemThemeImportPath(content);

  let importPath;
  if (designThemePath) {
    importPath = designThemePath;
  } else {
    const srcDir = path.join(MOBILE_SRC);
    const relToSrc = path.relative(path.dirname(filePath), srcDir).replace(/\\/g, "/");
    const prefix = relToSrc.startsWith(".") ? relToSrc : "./" + relToSrc;
    importPath = prefix + "/design-system/theme";
  }

  const existingImportRegex = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegExp(importPath)}['"]`
  );
  const match = content.match(existingImportRegex);
  if (match) {
    const imports = match[1];
    if (!imports.includes("flatColors")) {
      content = content.replace(
        existingImportRegex,
        `import {${imports}, flatColors as colors } from '${importPath}'`
      );
    }
  } else {
    const lastImportIndex = content.lastIndexOf("\nimport ");
    const nextNewline = content.indexOf("\n", lastImportIndex + 1);
    content =
      content.slice(0, nextNewline) +
      `\nimport { flatColors as colors } from '${importPath}';` +
      content.slice(nextNewline);
  }

  return content;
}

function addUseThemeDestructure(content) {
  const componentPatterns = [
    /(export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)/,
    /(export\s+const\s+\w+\s*:\s*React\.FC[^=]*=\s*\([^)]*\)\s*=>\s*\{)/,
    /(export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{)/,
    /(const\s+\w+\s*=\s*React\.memo\(\s*\([^)]*\)\s*=>\s*\{)/,
    /(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)/,
  ];

  for (const pattern of componentPatterns) {
    const match = content.match(pattern);
    if (match) {
      const insertPos = content.indexOf(match[0]) + match[0].length;
      const nextLine = content.indexOf("\n", insertPos);
      content =
        content.slice(0, nextLine + 1) +
        "  const { colors } = useTheme();\n" +
        content.slice(nextLine + 1);
      return content;
    }
  }

  return content;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;
  const originalContent = content;

  if (usesColorsVariable(content) && !hasColorsDefinition(content)) {
    const usesInStyleSheet =
      /StyleSheet\.create\s*\(\s*\{[\s\S]*?colors\.\w+/.test(content);

    if (usesInStyleSheet) {
      content = addFlatColorsImport(filePath, content);
    } else if (hasUseThemeImport(content)) {
      content = addUseThemeDestructure(content);
    } else {
      content = addColorsImportFromTheme(filePath, content);
      content = addUseThemeDestructure(content);
    }
    modified = true;
  }

  if (usesStylesVariable(content) && !hasStylesDefinition(content)) {
    const hasStyleSheetCreate = /StyleSheet\.create/.test(content);
    if (!hasStyleSheetCreate) {
      const lastBrace = content.lastIndexOf("\n}");
      if (lastBrace > 0) {
        const stylesUsed = [];
        const styleRegex = /styles\.(\w+)/g;
        let m;
        while ((m = styleRegex.exec(content)) !== null) {
          if (!stylesUsed.includes(m[1])) stylesUsed.push(m[1]);
        }

        const stylesObj = stylesUsed
          .map((s) => `  ${s}: { flex: 1 },`)
          .join("\n");

        content =
          content +
          `\n\nconst styles = StyleSheet.create({\n${stylesObj}\n});\n`;
        modified = true;
      }
    }
  }

  if (modified && content !== originalContent) {
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
