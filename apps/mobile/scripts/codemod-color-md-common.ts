import fs from "fs";
import path from "path";

const SRC_DIR = path.join(__dirname, "..", "src");
const EXCLUDE_DIRS = ["node_modules", ".expo", "dist", "coverage", "design-system/theme/tokens"];

const MD_COLOR_MAP: Record<string, string> = {
  "#4CAF50": "DesignTokens.colors.semantic.success",
  "#4caf50": "DesignTokens.colors.semantic.success",
  "#66BB6A": "DesignTokens.colors.semantic.success",
  "#66bb6a": "DesignTokens.colors.semantic.success",
  "#81C784": "DesignTokens.colors.semantic.successLight",
  "#81c784": "DesignTokens.colors.semantic.successLight",
  "#FFC107": "DesignTokens.colors.semantic.warning",
  "#ffc107": "DesignTokens.colors.semantic.warning",
  "#FFD54F": "DesignTokens.colors.semantic.warningLight",
  "#ffd54f": "DesignTokens.colors.semantic.warningLight",
  "#F44336": "DesignTokens.colors.semantic.error",
  "#f44336": "DesignTokens.colors.semantic.error",
  "#EF5350": "DesignTokens.colors.semantic.error",
  "#ef5350": "DesignTokens.colors.semantic.error",
  "#E57373": "DesignTokens.colors.semantic.errorLight",
  "#e57373": "DesignTokens.colors.semantic.errorLight",
  "#2196F3": "DesignTokens.colors.semantic.info",
  "#2196f3": "DesignTokens.colors.semantic.info",
  "#42A5F5": "DesignTokens.colors.semantic.info",
  "#42a5f5": "DesignTokens.colors.semantic.info",
  "#64B5F6": "DesignTokens.colors.semantic.infoLight",
  "#64b5f6": "DesignTokens.colors.semantic.infoLight",
  "#E91E63": "DesignTokens.colors.brand.terracotta",
  "#e91e63": "DesignTokens.colors.brand.terracotta",
  "#9C27B0": "DesignTokens.colors.brand.terracottaDark",
  "#9c27b0": "DesignTokens.colors.brand.terracottaDark",
  "#673AB7": "DesignTokens.colors.brand.slateDark",
  "#673ab7": "DesignTokens.colors.brand.slateDark",
  "#3F51B5": "DesignTokens.colors.brand.slate",
  "#3f51b5": "DesignTokens.colors.brand.slate",
  "#00BCD4": "DesignTokens.colors.brand.sage",
  "#00bcd4": "DesignTokens.colors.brand.sage",
  "#009688": "DesignTokens.colors.brand.sage",
  "#FF5722": "DesignTokens.colors.brand.terracotta",
  "#ff5722": "DesignTokens.colors.brand.terracotta",
  "#795548": "DesignTokens.colors.brand.camel",
  "#607D8B": "DesignTokens.colors.brand.slate",
  "#607d8b": "DesignTokens.colors.brand.slate",
};

const COMMON_COLOR_MAP: Record<string, string> = {
  "#000000": "DesignTokens.colors.neutral.black",
  "#000": "DesignTokens.colors.neutral.black",
  "#1A1A2E": "DesignTokens.colors.text.primary",
  "#1a1a2e": "DesignTokens.colors.text.primary",
  "#333": "DesignTokens.colors.text.primary",
  "#333333": "DesignTokens.colors.text.primary",
  "#222": "DesignTokens.colors.text.primary",
  "#222222": "DesignTokens.colors.text.primary",
  "#1A1A18": "DesignTokens.colors.text.primary",
  "#666": "DesignTokens.colors.text.secondary",
  "#666666": "DesignTokens.colors.text.secondary",
  "#888": "DesignTokens.colors.text.secondary",
  "#888888": "DesignTokens.colors.text.secondary",
  "#999": "DesignTokens.colors.text.tertiary",
  "#999999": "DesignTokens.colors.text.tertiary",
  "#6B7280": "DesignTokens.colors.text.secondary",
  "#6b7280": "DesignTokens.colors.text.secondary",
  "#aaa": "DesignTokens.colors.text.tertiary",
  "#AAAAAA": "DesignTokens.colors.text.tertiary",
  "#aaaaaa": "DesignTokens.colors.text.tertiary",
  "#bbb": "DesignTokens.colors.text.tertiary",
  "#BBBBBB": "DesignTokens.colors.text.tertiary",
  "#cccccc": "DesignTokens.colors.neutral[300]",
  "#ccc": "DesignTokens.colors.neutral[300]",
  "#eee": "DesignTokens.colors.borders.light",
  "#EEEEEE": "DesignTokens.colors.borders.light",
  "#eeeeee": "DesignTokens.colors.borders.light",
  "#e5e5e5": "DesignTokens.colors.borders.light",
  "#E5E5E5": "DesignTokens.colors.borders.light",
  "#ddd": "DesignTokens.colors.borders.default",
  "#DDDDDD": "DesignTokens.colors.borders.default",
  "#dddddd": "DesignTokens.colors.borders.default",
  "#f5f5f5": "DesignTokens.colors.backgrounds.tertiary",
  "#F5F5F5": "DesignTokens.colors.backgrounds.tertiary",
  "#fafafa": "DesignTokens.colors.backgrounds.secondary",
  "#FAFAFA": "DesignTokens.colors.backgrounds.secondary",
  "#f8f9fa": "DesignTokens.colors.backgrounds.secondary",
  "#F8F9FA": "DesignTokens.colors.backgrounds.secondary",
};

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_DIRS.some(dir => filePath.includes(dir));
}

function getAllFiles(dir: string, ext = [".ts", ".tsx"]): string[] {
  const results: string[] = [];
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

function getImportPath(filePath: string): string {
  const rel = path.relative(path.dirname(filePath), path.join(SRC_DIR, "design-system", "theme", "tokens", "design-tokens.ts"));
  const normalized = rel.replace(/\\/g, "/").replace(/\.ts$/, "");
  return `import { DesignTokens } from "${normalized}";`;
}

function processFile(filePath: string): { changed: boolean; replacements: number } {
  let content = fs.readFileSync(filePath, "utf-8");
  let replacements = 0;
  const original = content;

  const allMaps = [MD_COLOR_MAP, COMMON_COLOR_MAP];
  for (const map of allMaps) {
    for (const [hex, token] of Object.entries(map)) {
      const regex = new RegExp(`["'\`]${hex}["'\`]`, "gi");
      let match;
      while ((match = regex.exec(content)) !== null) {
        content = content.slice(0, match.index) + token + content.slice(match.index + match[0].length);
        replacements++;
        regex.lastIndex = match.index + token.length;
      }
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
