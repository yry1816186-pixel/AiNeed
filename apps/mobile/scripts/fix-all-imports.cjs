const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

const EXCLUDE_PATTERNS = [
  /design-system[\\/]theme[\\/]index\.ts$/,
  /design-system[\\/]theme[\\/]tokens[\\/]/,
  /shared[\\/]contexts[\\/]ThemeContext\.tsx$/,
  /theme[\\/]index\.ts$/,
  /theme[\\/]tokens[\\/]/,
  /theme[\\/]__tests__[\\/]/,
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (/\.(tsx|ts)$/.test(file) && !file.endsWith(".d.ts")) {
      results.push(filePath);
    }
  }
  return results;
}

function isExcluded(filePath) {
  const rel = path.relative(SRC, filePath);
  return EXCLUDE_PATTERNS.some(p => p.test(rel));
}

function getDesignSystemPath(filePath) {
  const srcDir = path.join(SRC, "design-system", "theme");
  return path.relative(path.dirname(filePath), srcDir).replace(/\\/g, "/");
}

function getDesignTokensPath(filePath) {
  const srcDir = path.join(SRC, "design-system", "theme", "tokens", "design-tokens");
  return path.relative(path.dirname(filePath), srcDir).replace(/\\/g, "/");
}

function fixFile(filePath) {
  if (isExcluded(filePath)) return false;

  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  const needsColors = /\bcolors\.\w+/.test(content);
  const needsSpacing = /\bSpacing\.\w+/.test(content);
  const needsDesignTokens = /\bDesignTokens\.\w+/.test(content);

  const hasColorsImport = /import\s*\{[^}]*\bcolors\b[^}]*\}\s*from\s*['"]/.test(content) ||
    /const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)/.test(content) ||
    /const\s+\w+\s*=\s*useTheme\(\)/.test(content);
  const hasSpacingImport = /import\s*\{[^}]*\bSpacing\b[^}]*\}\s*from\s*['"]/.test(content);
  const hasDesignTokensImport = /import\s*\{[^}]*\bDesignTokens\b[^}]*\}\s*from\s*['"]/.test(content);

  const designSystemPath = getDesignSystemPath(filePath);
  const designTokensPath = getDesignTokensPath(filePath);

  if (needsColors && !hasColorsImport) {
    const existingDsImport = content.match(
      new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegex(designSystemPath)}['"]`)
    );
    if (existingDsImport) {
      const imports = existingDsImport[1];
      if (!imports.includes("flatColors")) {
        const newImports = imports.trim() + ", flatColors as colors";
        content = content.replace(
          new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*['"]${escapeRegex(designSystemPath)}['"]`),
          `import { ${newImports} } from '${designSystemPath}'`
        );
        changed = true;
      }
    } else {
      const importLine = `import { flatColors as colors } from '${designSystemPath}';\n`;
      content = appendImport(content, importLine);
      changed = true;
    }
  }

  if (needsSpacing && !hasSpacingImport) {
    const existingDsImport = content.match(
      new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegex(designSystemPath)}['"]`)
    );
    if (existingDsImport) {
      const imports = existingDsImport[1];
      if (!imports.includes("Spacing")) {
        const newImports = imports.trim() + ", Spacing";
        content = content.replace(
          new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*['"]${escapeRegex(designSystemPath)}['"]`),
          `import { ${newImports} } from '${designSystemPath}'`
        );
        changed = true;
      }
    } else {
      const importLine = `import { Spacing } from '${designSystemPath}';\n`;
      content = appendImport(content, importLine);
      changed = true;
    }
  }

  if (needsDesignTokens && !hasDesignTokensImport) {
    const existingDtImport = content.match(
      new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegex(designTokensPath)}['"]`)
    );
    if (existingDtImport) {
      const imports = existingDtImport[1];
      if (!imports.includes("DesignTokens")) {
        const newImports = imports.trim() + ", DesignTokens";
        content = content.replace(
          new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*['"]${escapeRegex(designTokensPath)}['"]`),
          `import { ${newImports} } from '${designTokensPath}'`
        );
        changed = true;
      }
    } else {
      const importLine = `import { DesignTokens } from '${designTokensPath}';\n`;
      content = appendImport(content, importLine);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function appendImport(content, importLine) {
  const lastImportMatch = content.match(/^import\s.+;$/gm);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPos = lastImportIndex + lastImport.length;
    return content.slice(0, insertPos) + "\n" + importLine + content.slice(insertPos);
  }
  return importLine + content;
}

const files = walk(SRC);
let fixed = 0;
for (const f of files) {
  if (fixFile(f)) {
    fixed++;
    console.log("Fixed:", path.relative(SRC, f));
  }
}
console.log(`\nTotal files fixed: ${fixed}`);
