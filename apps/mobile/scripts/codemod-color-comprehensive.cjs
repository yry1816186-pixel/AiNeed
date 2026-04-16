const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
const EXCLUDE_DIRS = ["node_modules", ".expo", "dist", "coverage", "design-system/theme/tokens", "theme/tokens"];

const COLOR_MAP = {
  "#C86B5C": "DesignTokens.colors.brand.terracotta",
  "#c86b5c": "DesignTokens.colors.brand.terracotta",
  "#B5A08C": "DesignTokens.colors.brand.camel",
  "#b5a08c": "DesignTokens.colors.brand.camel",
  "#6B7B8D": "DesignTokens.colors.brand.slate",
  "#6b7b8d": "DesignTokens.colors.brand.slate",
  "#7C9A8E": "DesignTokens.colors.brand.sage",
  "#7c9a8e": "DesignTokens.colors.brand.sage",
  "#A68560": "DesignTokens.colors.brand.camel",
  "#a68560": "DesignTokens.colors.brand.camel",
  "#FFFFFF": "DesignTokens.colors.backgrounds.primary",
  "#ffffff": "DesignTokens.colors.backgrounds.primary",
  "#FFF": "DesignTokens.colors.backgrounds.primary",
  "#fff": "DesignTokens.colors.backgrounds.primary",
  "#000000": "DesignTokens.colors.neutral.black",
  "#000": "DesignTokens.colors.neutral.black",
  "#F9FAFB": "DesignTokens.colors.backgrounds.secondary",
  "#f9fafb": "DesignTokens.colors.backgrounds.secondary",
  "#F3F4F6": "DesignTokens.colors.backgrounds.tertiary",
  "#f3f4f6": "DesignTokens.colors.backgrounds.tertiary",
  "#E5E7EB": "DesignTokens.colors.borders.light",
  "#e5e7eb": "DesignTokens.colors.borders.light",
  "#D1D5DB": "DesignTokens.colors.borders.default",
  "#d1d5db": "DesignTokens.colors.borders.default",
  "#9CA3AF": "DesignTokens.colors.text.tertiary",
  "#9ca3af": "DesignTokens.colors.text.tertiary",
  "#6B7280": "DesignTokens.colors.text.secondary",
  "#6b7280": "DesignTokens.colors.text.secondary",
  "#4B5563": "DesignTokens.colors.text.secondary",
  "#4b5563": "DesignTokens.colors.text.secondary",
  "#374151": "DesignTokens.colors.text.primary",
  "#374151": "DesignTokens.colors.text.primary",
  "#1F2937": "DesignTokens.colors.text.primary",
  "#1f2937": "DesignTokens.colors.text.primary",
  "#111827": "DesignTokens.colors.text.primary",
  "#111827": "DesignTokens.colors.text.primary",
  "#EF4444": "DesignTokens.colors.semantic.error",
  "#ef4444": "DesignTokens.colors.semantic.error",
  "#F87171": "DesignTokens.colors.semantic.errorLight",
  "#f87171": "DesignTokens.colors.semantic.errorLight",
  "#FEE2E2": "DesignTokens.colors.semantic.errorLight",
  "#fee2e2": "DesignTokens.colors.semantic.errorLight",
  "#10B981": "DesignTokens.colors.semantic.success",
  "#10b981": "DesignTokens.colors.semantic.success",
  "#34D399": "DesignTokens.colors.semantic.successLight",
  "#34d399": "DesignTokens.colors.semantic.successLight",
  "#D1FAE5": "DesignTokens.colors.semantic.successLight",
  "#d1fae5": "DesignTokens.colors.semantic.successLight",
  "#F59E0B": "DesignTokens.colors.semantic.warning",
  "#f59e0b": "DesignTokens.colors.semantic.warning",
  "#FBBF24": "DesignTokens.colors.semantic.warningLight",
  "#fbbf24": "DesignTokens.colors.semantic.warningLight",
  "#FEF3C7": "DesignTokens.colors.semantic.warningLight",
  "#fef3c7": "DesignTokens.colors.semantic.warningLight",
  "#3B82F6": "DesignTokens.colors.semantic.info",
  "#3b82f6": "DesignTokens.colors.semantic.info",
  "#60A5FA": "DesignTokens.colors.semantic.infoLight",
  "#60a5fa": "DesignTokens.colors.semantic.infoLight",
  "#DBEAFE": "DesignTokens.colors.semantic.infoLight",
  "#dbeafe": "DesignTokens.colors.semantic.infoLight",
  "#C86B5C": "DesignTokens.colors.brand.terracotta",
  "#A68560": "DesignTokens.colors.brand.camel",
  "#6B7B8D": "DesignTokens.colors.brand.slate",
  "#7C9A8E": "DesignTokens.colors.brand.sage",
  "#1A1A2E": "DesignTokens.colors.text.primary",
  "#16213E": "DesignTokens.colors.text.primary",
  "#0F3460": "DesignTokens.colors.brand.slate",
  "#E94560": "DesignTokens.colors.brand.terracotta",
  "#533483": "DesignTokens.colors.brand.terracottaDark",
  "#FF6B6B": "DesignTokens.colors.semantic.error",
  "#4ECDC4": "DesignTokens.colors.brand.sage",
  "#45B7D1": "DesignTokens.colors.semantic.info",
  "#96CEB4": "DesignTokens.colors.brand.sage",
  "#FFEAA7": "DesignTokens.colors.semantic.warningLight",
  "#DDA0DD": "DesignTokens.colors.brand.terracottaLight",
  "#FF69B4": "DesignTokens.colors.brand.terracottaLight",
  "#FF8C00": "DesignTokens.colors.brand.terracotta",
  "#FF4500": "DesignTokens.colors.brand.terracotta",
  "#FFA07A": "DesignTokens.colors.brand.terracottaLight",
  "#CD853F": "DesignTokens.colors.brand.camel",
  "#DEB887": "DesignTokens.colors.brand.camel",
  "#D2691E": "DesignTokens.colors.brand.terracottaDark",
  "#8B4513": "DesignTokens.colors.brand.terracottaDark",
  "#2E8B57": "DesignTokens.colors.brand.sage",
  "#3CB371": "DesignTokens.colors.brand.sage",
  "#20B2AA": "DesignTokens.colors.brand.sage",
  "#4682B4": "DesignTokens.colors.brand.slate",
  "#5F9EA0": "DesignTokens.colors.brand.slate",
  "#708090": "DesignTokens.colors.brand.slate",
  "#778899": "DesignTokens.colors.brand.slate",
  "#B0C4DE": "DesignTokens.colors.brand.slate",
  "#FFE4E1": "DesignTokens.colors.brand.terracottaLight",
  "#FAEBD7": "DesignTokens.colors.brand.camel",
  "#F5DEB3": "DesignTokens.colors.brand.camel",
  "#F0E68C": "DesignTokens.colors.semantic.warningLight",
  "#E6E6FA": "DesignTokens.colors.backgrounds.tertiary",
  "#FFF0F5": "DesignTokens.colors.brand.terracottaLight",
  "#F0FFF0": "DesignTokens.colors.semantic.successLight",
  "#F0F8FF": "DesignTokens.colors.semantic.infoLight",
  "#FFFACD": "DesignTokens.colors.semantic.warningLight",
  "#F5F5DC": "DesignTokens.colors.backgrounds.tertiary",
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

  for (const [hex, token] of Object.entries(COLOR_MAP)) {
    const regex = new RegExp(`["'\`]${hex}["'\`]`, "gi");
    let match;
    while ((match = regex.exec(content)) !== null) {
      content = content.slice(0, match.index) + token + content.slice(match.index + match[0].length);
      replacements++;
      regex.lastIndex = match.index + token.length;
    }
  }

  if (replacements > 0 && content.includes("DesignTokens.colors") && !content.includes("import { DesignTokens }")) {
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
