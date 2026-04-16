const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

const SPACING_MAP = {
  "1": "DesignTokens.spacing.px",
  "2": "DesignTokens.spacing['0.5']",
  "4": "Spacing.xs",
  "6": "DesignTokens.spacing['1.5']",
  "8": "Spacing.sm",
  "10": "DesignTokens.spacing['2.5']",
  "12": "DesignTokens.spacing[3]",
  "14": "DesignTokens.spacing['3.5']",
  "16": "Spacing.md",
  "18": "DesignTokens.spacing[4]",
  "20": "DesignTokens.spacing[5]",
  "22": "DesignTokens.spacing[5]",
  "24": "Spacing.lg",
  "28": "DesignTokens.spacing[7]",
  "32": "Spacing.xl",
  "36": "DesignTokens.spacing[9]",
  "40": "DesignTokens.spacing[10]",
  "48": "Spacing['2xl']",
  "56": "DesignTokens.spacing[14]",
  "64": "Spacing['3xl']",
  "80": "Spacing['4xl']",
  "96": "Spacing['5xl']",
};

const EXCLUDE_PATTERNS = [
  /design-system[\\/]theme[\\/]/,
  /theme[\\/]tokens[\\/]/,
  /theme[\\/]__tests__[\\/]/,
  /scripts[\\/]/,
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

function fixFile(filePath) {
  if (isExcluded(filePath)) return false;

  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  const spacingProps = [
    "padding", "paddingHorizontal", "paddingVertical",
    "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
    "paddingStart", "paddingEnd",
    "margin", "marginHorizontal", "marginVertical",
    "marginTop", "marginBottom", "marginLeft", "marginRight",
    "marginStart", "marginEnd",
    "gap",
    "left", "right", "top", "bottom",
  ];

  for (const prop of spacingProps) {
    const regex = new RegExp(
      `(\\b${prop}\\s*:\\s*)(\\d+)\\s*([,;})\\n])`,
      "g"
    );

    content = content.replace(regex, (match, prefix, value, suffix) => {
      if (value === "0") return match;
      if (SPACING_MAP[value]) {
        changed = true;
        return `${prefix}${SPACING_MAP[value]}${suffix}`;
      }
      return match;
    });
  }

  if (changed) {
    if (!content.includes("import { Spacing }") && !content.includes("import { Spacing,")) {
      if (content.includes("Spacing.")) {
        const designSystemPath = getDesignSystemImportPath(filePath);
        if (content.includes(`from '${designSystemPath}'`)) {
          content = content.replace(
            `from '${designSystemPath}'`,
            `from '${designSystemPath}'`
          );
          if (!content.includes("Spacing") || !content.includes(`from '${designSystemPath}'`)) {
            content = addImport(content, filePath, "Spacing");
          }
        } else {
          content = addImport(content, filePath, "Spacing");
        }
      }
    }

    if (content.includes("DesignTokens.spacing") && !content.includes("import { DesignTokens }") && !content.includes("import { DesignTokens,")) {
      content = addDesignTokensImport(content, filePath);
    }

    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

function getDesignSystemImportPath(filePath) {
  const srcDir = path.join(SRC, "design-system", "theme");
  const rel = path.relative(path.dirname(filePath), srcDir).replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : "./" + rel;
}

function addImport(content, filePath, importName) {
  const importPath = getDesignSystemImportPath(filePath);

  const existingImportRegex = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`
  );

  const existingMatch = content.match(existingImportRegex);
  if (existingMatch) {
    const imports = existingMatch[1];
    if (!imports.includes(importName)) {
      const newImports = imports.trim() + ", " + importName;
      content = content.replace(existingImportRegex, `import { ${newImports} } from '${importPath}'`);
    }
    return content;
  }

  const importLine = `import { ${importName} } from '${importPath}';\n`;
  const lastImportMatch = content.match(/^import\s.+;$/gm);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPos = lastImportIndex + lastImport.length;
    content = content.slice(0, insertPos) + "\n" + importLine + content.slice(insertPos);
  } else {
    content = importLine + content;
  }
  return content;
}

function addDesignTokensImport(content, filePath) {
  const designTokensPath = getDesignTokensImportPath(filePath);

  if (content.includes(`from '${designTokensPath}'`)) {
    const existingImportRegex = new RegExp(
      `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${designTokensPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`
    );
    const existingMatch = content.match(existingImportRegex);
    if (existingMatch && !existingMatch[1].includes("DesignTokens")) {
      const newImports = existingMatch[1].trim() + ", DesignTokens";
      content = content.replace(existingImportRegex, `import { ${newImports} } from '${designTokensPath}'`);
    }
    return content;
  }

  const importLine = `import { DesignTokens } from '${designTokensPath}';\n`;
  const lastImportMatch = content.match(/^import\s.+;$/gm);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPos = lastImportIndex + lastImport.length;
    content = content.slice(0, insertPos) + "\n" + importLine + content.slice(insertPos);
  } else {
    content = importLine + content;
  }
  return content;
}

function getDesignTokensImportPath(filePath) {
  const srcDir = path.join(SRC, "design-system", "theme", "tokens", "design-tokens");
  const rel = path.relative(path.dirname(filePath), srcDir).replace(/\\/g, "/");
  return (rel.startsWith(".") ? rel : "./" + rel).replace(/\/design-tokens$/, "/design-tokens");
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
