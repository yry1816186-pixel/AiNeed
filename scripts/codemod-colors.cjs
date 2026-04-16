const fs = require("fs");
const path = require("path");

const COLOR_MAP = {
  "#FFFFFF": "DesignTokens.colors.backgrounds.primary",
  "#ffffff": "DesignTokens.colors.backgrounds.primary",
  "#FFF": "DesignTokens.colors.backgrounds.primary",
  "#fff": "DesignTokens.colors.backgrounds.primary",
  "#FAFAF8": "DesignTokens.colors.backgrounds.secondary",
  "#fafaf8": "DesignTokens.colors.backgrounds.secondary",
  "#FAFAFA": "DesignTokens.colors.backgrounds.secondary",
  "#fafafa": "DesignTokens.colors.backgrounds.secondary",
  "#F5F5F3": "DesignTokens.colors.backgrounds.tertiary",
  "#f5f5f3": "DesignTokens.colors.backgrounds.tertiary",
  "#F5F5F5": "DesignTokens.colors.backgrounds.tertiary",
  "#f5f5f5": "DesignTokens.colors.backgrounds.tertiary",
  "#F8F9FA": "DesignTokens.colors.backgrounds.tertiary",
  "#f8f9fa": "DesignTokens.colors.backgrounds.tertiary",
  "#1A1A18": "DesignTokens.colors.text.primary",
  "#1a1a18": "DesignTokens.colors.text.primary",
  "#1A1A2E": "DesignTokens.colors.text.primary",
  "#1a1a2e": "DesignTokens.colors.text.primary",
  "#1C1917": "DesignTokens.colors.text.primary",
  "#1c1917": "DesignTokens.colors.text.primary",
  "#171717": "DesignTokens.colors.text.primary",
  "#000000": "DesignTokens.colors.text.primary",
  "#000": "DesignTokens.colors.text.primary",
  "#333333": "DesignTokens.colors.text.primary",
  "#333": "DesignTokens.colors.text.primary",
  "#222222": "DesignTokens.colors.text.primary",
  "#222": "DesignTokens.colors.text.primary",
  "#282825": "DesignTokens.colors.neutral[800]",
  "#52524D": "DesignTokens.colors.text.secondary",
  "#52524d": "DesignTokens.colors.text.secondary",
  "#57534E": "DesignTokens.colors.text.secondary",
  "#57534e": "DesignTokens.colors.text.secondary",
  "#666666": "DesignTokens.colors.text.secondary",
  "#666": "DesignTokens.colors.text.secondary",
  "#888888": "DesignTokens.colors.text.secondary",
  "#888": "DesignTokens.colors.text.secondary",
  "#999999": "DesignTokens.colors.text.tertiary",
  "#999": "DesignTokens.colors.text.tertiary",
  "#6B7280": "DesignTokens.colors.text.tertiary",
  "#6b7280": "DesignTokens.colors.text.tertiary",
  "#73736D": "DesignTokens.colors.text.tertiary",
  "#73736d": "DesignTokens.colors.text.tertiary",
  "#A8A29E": "DesignTokens.colors.text.tertiary",
  "#a8a29e": "DesignTokens.colors.text.tertiary",
  "#AAAAAA": "DesignTokens.colors.text.tertiary",
  "#aaa": "DesignTokens.colors.text.tertiary",
  "#AAA": "DesignTokens.colors.text.tertiary",
  "#BBBBBB": "DesignTokens.colors.text.tertiary",
  "#bbb": "DesignTokens.colors.text.tertiary",
  "#CCC": "DesignTokens.colors.text.tertiary",
  "#ccc": "DesignTokens.colors.text.tertiary",
  "#C67B5C": "DesignTokens.colors.brand.terracotta",
  "#c67b5c": "DesignTokens.colors.brand.terracotta",
  "#D4917A": "DesignTokens.colors.brand.terracottaLight",
  "#d4917a": "DesignTokens.colors.brand.terracottaLight",
  "#A86548": "DesignTokens.colors.brand.terracottaDark",
  "#a86548": "DesignTokens.colors.brand.terracottaDark",
  "#8B9A7D": "DesignTokens.colors.brand.sage",
  "#8b9a7d": "DesignTokens.colors.brand.sage",
  "#B5A08C": "DesignTokens.colors.brand.camel",
  "#b5a08c": "DesignTokens.colors.brand.camel",
  "#7B8FA2": "DesignTokens.colors.brand.slate",
  "#7b8fa2": "DesignTokens.colors.brand.slate",
  "#5F6F7F": "DesignTokens.colors.brand.slateDark",
  "#5f6f7f": "DesignTokens.colors.brand.slateDark",
  "#5B8A72": "DesignTokens.colors.semantic.success",
  "#5b8a72": "DesignTokens.colors.semantic.success",
  "#D9A441": "DesignTokens.colors.semantic.warning",
  "#d9a441": "DesignTokens.colors.semantic.warning",
  "#C44536": "DesignTokens.colors.semantic.error",
  "#c44536": "DesignTokens.colors.semantic.error",
  "#4CAF50": "DesignTokens.colors.semantic.success",
  "#4caf50": "DesignTokens.colors.semantic.success",
  "#66BB6A": "DesignTokens.colors.semantic.success",
  "#66bb6a": "DesignTokens.colors.semantic.success",
  "#81C784": "DesignTokens.colors.semantic.successLight",
  "#81c784": "DesignTokens.colors.semantic.successLight",
  "#22C55E": "DesignTokens.colors.semantic.success",
  "#22c55e": "DesignTokens.colors.semantic.success",
  "#27AE60": "DesignTokens.colors.semantic.success",
  "#27ae60": "DesignTokens.colors.semantic.success",
  "#FFC107": "DesignTokens.colors.semantic.warning",
  "#ffc107": "DesignTokens.colors.semantic.warning",
  "#FFD54F": "DesignTokens.colors.semantic.warningLight",
  "#ffd54f": "DesignTokens.colors.semantic.warningLight",
  "#F1C40F": "DesignTokens.colors.semantic.warning",
  "#f1c40f": "DesignTokens.colors.semantic.warning",
  "#F44336": "DesignTokens.colors.semantic.error",
  "#f44336": "DesignTokens.colors.semantic.error",
  "#EF5350": "DesignTokens.colors.semantic.error",
  "#ef5350": "DesignTokens.colors.semantic.error",
  "#E57373": "DesignTokens.colors.semantic.errorLight",
  "#e57373": "DesignTokens.colors.semantic.errorLight",
  "#F43F5E": "DesignTokens.colors.semantic.error",
  "#f43f5e": "DesignTokens.colors.semantic.error",
  "#2196F3": "DesignTokens.colors.semantic.info",
  "#2196f3": "DesignTokens.colors.semantic.info",
  "#42A5F5": "DesignTokens.colors.semantic.info",
  "#42a5f5": "DesignTokens.colors.semantic.info",
  "#64B5F6": "DesignTokens.colors.semantic.infoLight",
  "#64b5f6": "DesignTokens.colors.semantic.infoLight",
  "#1677FF": "DesignTokens.colors.semantic.info",
  "#1677ff": "DesignTokens.colors.semantic.info",
  "#0EA5E9": "DesignTokens.colors.semantic.info",
  "#0ea5e9": "DesignTokens.colors.semantic.info",
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
  "#E8F3EE": "DesignTokens.colors.semantic.successLight",
  "#e8f3ee": "DesignTokens.colors.semantic.successLight",
  "#DCFCE7": "DesignTokens.colors.semantic.successLight",
  "#dcfce7": "DesignTokens.colors.semantic.successLight",
  "#FDF5E6": "DesignTokens.colors.semantic.warningLight",
  "#fdf5e6": "DesignTokens.colors.semantic.warningLight",
  "#FDECEA": "DesignTokens.colors.semantic.errorLight",
  "#fdecea": "DesignTokens.colors.semantic.errorLight",
  "#EEF1F4": "DesignTokens.colors.semantic.infoLight",
  "#eef1f4": "DesignTokens.colors.semantic.infoLight",
  "#EBEBE8": "DesignTokens.colors.neutral[200]",
  "#ebebe8": "DesignTokens.colors.neutral[200]",
  "#E7E5E4": "DesignTokens.colors.neutral[200]",
  "#e7e5e4": "DesignTokens.colors.neutral[200]",
  "#D4D4D0": "DesignTokens.colors.neutral[300]",
  "#d4d4d0": "DesignTokens.colors.neutral[300]",
  "#8A8A85": "DesignTokens.colors.neutral[400]",
  "#8a8a85": "DesignTokens.colors.neutral[400]",
  "#3D3D39": "DesignTokens.colors.neutral[700]",
  "#3d3d39": "DesignTokens.colors.neutral[700]",
  "#0D0D0C": "DesignTokens.colors.neutral.black",
  "#0d0d0c": "DesignTokens.colors.neutral.black",
  "#D4A853": "DesignTokens.colors.semantic.warning",
  "#d4a853": "DesignTokens.colors.semantic.warning",
  "#EEE": "DesignTokens.colors.borders.light",
  "#eee": "DesignTokens.colors.borders.light",
  "#E5E5E5": "DesignTokens.colors.borders.light",
  "#e5e5e5": "DesignTokens.colors.borders.light",
  "#E0E0E0": "DesignTokens.colors.borders.default",
  "#e0e0e0": "DesignTokens.colors.borders.default",
  "#DDD": "DesignTokens.colors.borders.default",
  "#ddd": "DesignTokens.colors.borders.default",
  "#F59E0B": "DesignTokens.colors.semantic.warning",
  "#f59e0b": "DesignTokens.colors.semantic.warning",
  "#FBBF24": "DesignTokens.colors.semantic.warning",
  "#fbbf24": "DesignTokens.colors.semantic.warning",
  "#10B981": "DesignTokens.colors.semantic.success",
  "#10b981": "DesignTokens.colors.semantic.success",
  "#FF9800": "DesignTokens.colors.semantic.warning",
  "#ff9800": "DesignTokens.colors.semantic.warning",
  "#07C160": "DesignTokens.colors.semantic.success",
  "#07c160": "DesignTokens.colors.semantic.success",
  "#FDF8F5": "DesignTokens.colors.neutral[50]",
  "#fdf8f5": "DesignTokens.colors.neutral[50]",
  "#FAEDE6": "DesignTokens.colors.neutral[100]",
  "#faede6": "DesignTokens.colors.neutral[100]",
  "#FFF5F0": "DesignTokens.colors.neutral[50]",
  "#fff5f0": "DesignTokens.colors.neutral[50]",
  "#FFF8F0": "DesignTokens.colors.neutral[50]",
  "#fff8f0": "DesignTokens.colors.neutral[50]",
  "#F0F5FF": "DesignTokens.colors.semantic.infoLight",
  "#f0f5ff": "DesignTokens.colors.semantic.infoLight",
  "#F5F5FA": "DesignTokens.colors.backgrounds.tertiary",
  "#f5f5fa": "DesignTokens.colors.backgrounds.tertiary",
  "#FFF1F2": "DesignTokens.colors.semantic.errorLight",
  "#fff1f2": "DesignTokens.colors.semantic.errorLight",
  "#FFFBEB": "DesignTokens.colors.semantic.warningLight",
  "#ffbeb": "DesignTokens.colors.semantic.warningLight",
  "#ECFDF5": "DesignTokens.colors.semantic.successLight",
  "#ecfdf5": "DesignTokens.colors.semantic.successLight",
  "#F0F9FF": "DesignTokens.colors.semantic.infoLight",
  "#f0f9ff": "DesignTokens.colors.semantic.infoLight",
};

const SKIP_DIRS = ["node_modules", ".git", "design-system/theme/tokens", "__tests__"];
const TARGET_DIRS = ["screens", "features", "components", "shared"];

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

  const hexPattern = /['"`](#[0-9A-Fa-f]{3,8})['"`]/g;
  content = content.replace(hexPattern, (match, hex) => {
    const upperHex = hex.toUpperCase();
    const lowerHex = hex.toLowerCase();
    const token = COLOR_MAP[hex] || COLOR_MAP[upperHex] || COLOR_MAP[lowerHex];
    if (token) {
      replaced++;
      const quote = match[0];
      return `${quote}${token}${quote}`;
    }
    return match;
  });

  if (content !== original) {
    const hasDesignTokensImport =
      content.includes("from './tokens/design-tokens'") ||
      content.includes('from "./tokens/design-tokens"') ||
      content.includes("design-system/theme/tokens/design-tokens") ||
      content.includes("design-system/theme'") ||
      content.includes("design-system/theme\"") ||
      content.includes("from '../../design-system") ||
      content.includes('from "../../design-system') ||
      content.includes("from '../../../design-system") ||
      content.includes('from "../../../design-system') ||
      content.includes("from '../design-system") ||
      content.includes('from "../design-system') ||
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

const mobileSrc = path.join(__dirname, "apps", "mobile", "src");
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
