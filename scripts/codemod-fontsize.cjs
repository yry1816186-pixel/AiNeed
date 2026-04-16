const fs = require("fs");
const path = require("path");

const FONT_SIZE_MAP = {
  11: "DesignTokens.typography.sizes.xs",
  12: "DesignTokens.typography.sizes.sm",
  13: "DesignTokens.typography.sizes.sm",
  14: "DesignTokens.typography.sizes.base",
  15: "DesignTokens.typography.sizes.base",
  16: "DesignTokens.typography.sizes.md",
  17: "DesignTokens.typography.sizes.md",
  18: "DesignTokens.typography.sizes.lg",
  19: "DesignTokens.typography.sizes.lg",
  20: "DesignTokens.typography.sizes.xl",
  22: "DesignTokens.typography.sizes.xl",
  24: "DesignTokens.typography.sizes['2xl']",
  26: "DesignTokens.typography.sizes['2xl']",
  28: "DesignTokens.typography.sizes['3xl']",
  30: "DesignTokens.typography.sizes['3xl']",
  32: "DesignTokens.typography.sizes['3xl']",
  36: "DesignTokens.typography.sizes['4xl']",
  40: "DesignTokens.typography.sizes['4xl']",
  42: "DesignTokens.typography.sizes['5xl']",
  48: "DesignTokens.typography.sizes['5xl']",
  60: "DesignTokens.typography.sizes['6xl']",
  64: "DesignTokens.typography.sizes['7xl']",
  72: "DesignTokens.typography.sizes['7xl']",
  8: "DesignTokens.typography.sizes.xs",
  9: "DesignTokens.typography.sizes.xs",
  10: "DesignTokens.typography.sizes.xs",
};

const SKIP_DIRS = ["node_modules", ".git", "design-system/theme/tokens", "__tests__"];
const TARGET_DIRS = ["screens", "features", "components", "shared", "design-system/primitives"];

function shouldSkip(filePath) {
  return SKIP_DIRS.some(
    (d) => filePath.includes(d) || filePath.includes(d.replace(/\//g, "\\"))
  );
}

function getImportPath(filePath) {
  const srcIdx = filePath.lastIndexOf("src");
  if (srcIdx === -1) return "../../design-system/theme/tokens/design-tokens";
  const afterSrc = filePath.substring(srcIdx + 4);
  const depth = afterSrc.split(/[/\\]/).length - 1;
  return "../".repeat(depth) + "design-system/theme/tokens/design-tokens";
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;
  let replaced = 0;

  content = content.replace(/fontSize:\s*(\d+)/g, (match, numStr) => {
    const num = parseInt(numStr, 10);
    const token = FONT_SIZE_MAP[num];
    if (token) {
      replaced++;
      return `fontSize: ${token}`;
    }
    return match;
  });

  if (content !== original) {
    const hasDesignTokensImport =
      content.includes("design-system/theme/tokens/design-tokens") ||
      content.includes("design-system/theme'") ||
      content.includes('design-system/theme"') ||
      content.includes("DesignTokens");

    if (!hasDesignTokensImport) {
      const importPath = getImportPath(filePath);
      const importLine = `import { DesignTokens } from '${importPath}';\n`;
      const lastImportIdx = content.lastIndexOf("\nimport ");
      if (lastImportIdx !== -1) {
        const lineEnd = content.indexOf("\n", lastImportIdx + 1);
        content = content.substring(0, lineEnd + 1) + importLine + content.substring(lineEnd + 1);
      } else {
        const firstImportIdx = content.indexOf("import ");
        if (firstImportIdx !== -1) {
          const lineEnd = content.indexOf("\n", firstImportIdx);
          content = content.substring(0, lineEnd + 1) + importLine + content.substring(lineEnd + 1);
        }
      }
    }
    fs.writeFileSync(filePath, content, "utf8");
  }
  return replaced;
}

function walkDir(dir) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!shouldSkip(fullPath)) {
          results = results.concat(walkDir(fullPath));
        }
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        if (!shouldSkip(fullPath)) {
          results.push(fullPath);
        }
      }
    }
  } catch (e) {}
  return results;
}

const mobileSrc = path.join(process.cwd(), "apps", "mobile", "src");
let totalReplaced = 0;
let filesModified = 0;

for (const targetDir of TARGET_DIRS) {
  const dirPath = path.join(mobileSrc, targetDir);
  if (!fs.existsSync(dirPath)) continue;
  const files = walkDir(dirPath);
  for (const file of files) {
    const count = processFile(file);
    if (count > 0) {
      filesModified++;
      totalReplaced += count;
      console.log(`  ${path.relative(mobileSrc, file)}: ${count} replacements`);
    }
  }
}

console.log(`\nTotal: ${totalReplaced} replacements in ${filesModified} files`);
