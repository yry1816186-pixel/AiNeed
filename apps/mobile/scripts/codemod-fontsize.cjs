const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
const EXCLUDE_DIRS = ["node_modules", ".expo", "dist", "coverage", "design-system/theme/tokens", "theme/tokens"];

const FONT_SIZE_MAP = {
  "11": "DesignTokens.typography.sizes.xs",
  "12": "DesignTokens.typography.sizes.sm",
  "14": "DesignTokens.typography.sizes.base",
  "16": "DesignTokens.typography.sizes.md",
  "18": "DesignTokens.typography.sizes.lg",
  "20": "DesignTokens.typography.sizes.xl",
  "24": "DesignTokens.typography.sizes['2xl']",
  "30": "DesignTokens.typography.sizes['3xl']",
  "36": "DesignTokens.typography.sizes['4xl']",
  "48": "DesignTokens.typography.sizes['5xl']",
  "60": "DesignTokens.typography.sizes['6xl']",
  "10": "DesignTokens.typography.sizes.xs",
  "13": "DesignTokens.typography.sizes.sm",
  "15": "DesignTokens.typography.sizes.base",
  "17": "DesignTokens.typography.sizes.md",
  "22": "DesignTokens.typography.sizes.xl",
  "26": "DesignTokens.typography.sizes['2xl']",
  "28": "DesignTokens.typography.sizes['3xl']",
  "32": "DesignTokens.typography.sizes['3xl']",
  "40": "DesignTokens.typography.sizes['4xl']",
};

function shouldExclude(filePath) {
  return EXCLUDE_DIRS.some(dir => filePath.includes(dir));
}

function getAllFiles(dir, ext = [".ts", ".tsx"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (shouldExclude(fullPath)) continue;
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

function getImportPath(filePath) {
  const rel = path.relative(path.dirname(filePath), path.join(SRC_DIR, "design-system", "theme", "tokens", "design-tokens.ts"));
  const normalized = rel.replace(/\\/g, "/").replace(/\.ts$/, "");
  return `import { DesignTokens } from "${normalized}";`;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let replacements = 0;
  const original = content;

  for (const [size, token] of Object.entries(FONT_SIZE_MAP)) {
    const regex = new RegExp(`fontSize\\s*:\\s*${size}\\b`, "g");
    let match;
    while ((match = regex.exec(content)) !== null) {
      content = content.slice(0, match.index) + `fontSize: ${token}` + content.slice(match.index + match[0].length);
      replacements++;
      regex.lastIndex = match.index + `fontSize: ${token}`.length;
    }
  }

  if (replacements > 0 && content.includes("DesignTokens.typography") && !content.includes("import { DesignTokens }")) {
    const importLine = getImportPath(filePath);
    const lastImportIndex = content.lastIndexOf("\nimport ");
    if (lastImportIndex !== -1) {
      const afterImport = content.indexOf("\n", lastImportIndex + 1);
      content = content.slice(0, afterImport) + "\n" + importLine + content.slice(afterImport);
    } else {
      content = importLine + "\n" + content;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    return { changed: true, replacements };
  }
  return { changed: false, replacements: 0 };
}

function main() {
  const files = getAllFiles(SRC_DIR);
  let totalChanged = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const result = processFile(file);
    if (result.changed) {
      const relPath = path.relative(path.join(__dirname, ".."), file);
      console.log(`✓ ${relPath}: ${result.replacements} replacements`);
      totalChanged++;
      totalReplacements += result.replacements;
    }
  }

  console.log(`\nTotal: ${totalChanged} files changed, ${totalReplacements} replacements`);
}

main();
