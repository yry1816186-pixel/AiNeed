const fs = require("fs");
const path = require("path");

const COLOR_MAP = {
  "#ffffff": "DesignTokens.colors.backgrounds.primary",
  "#FFFFFF": "DesignTokens.colors.backgrounds.primary",
  "#fff": "DesignTokens.colors.backgrounds.primary",
  "#FFF": "DesignTokens.colors.backgrounds.primary",
  "#fafafa": "DesignTokens.colors.backgrounds.secondary",
  "#FAFAFA": "DesignTokens.colors.backgrounds.secondary",
  "#f5f5f5": "DesignTokens.colors.backgrounds.tertiary",
  "#F5F5F5": "DesignTokens.colors.backgrounds.tertiary",
  "#f8f9fa": "DesignTokens.colors.backgrounds.tertiary",
  "#f5f5f3": "DesignTokens.colors.backgrounds.tertiary",
  "#F5F5F3": "DesignTokens.colors.backgrounds.tertiary",
  "#fafaf8": "DesignTokens.colors.backgrounds.secondary",
  "#FAFAF8": "DesignTokens.colors.backgrounds.secondary",
  "#1a1a18": "DesignTokens.colors.text.primary",
  "#1A1A18": "DesignTokens.colors.text.primary",
  "#1a1a2e": "DesignTokens.colors.text.primary",
  "#1A1A2E": "DesignTokens.colors.text.primary",
  "#000000": "DesignTokens.colors.text.primary",
  "#000": "DesignTokens.colors.text.primary",
  "#333": "DesignTokens.colors.text.primary",
  "#333333": "DesignTokens.colors.text.primary",
  "#222": "DesignTokens.colors.text.primary",
  "#222222": "DesignTokens.colors.text.primary",
  "#282825": "DesignTokens.colors.neutral[800]",
  "#52524d": "DesignTokens.colors.text.secondary",
  "#52524D": "DesignTokens.colors.text.secondary",
  "#666": "DesignTokens.colors.text.secondary",
  "#666666": "DesignTokens.colors.text.secondary",
  "#888": "DesignTokens.colors.text.secondary",
  "#888888": "DesignTokens.colors.text.secondary",
  "#999": "DesignTokens.colors.text.tertiary",
  "#999999": "DesignTokens.colors.text.tertiary",
  "#6b7280": "DesignTokens.colors.text.tertiary",
  "#6B7280": "DesignTokens.colors.text.tertiary",
  "#73736d": "DesignTokens.colors.text.tertiary",
  "#73736D": "DesignTokens.colors.text.tertiary",
  "#aaa": "DesignTokens.colors.text.tertiary",
  "#AAA": "DesignTokens.colors.text.tertiary",
  "#bbb": "DesignTokens.colors.text.tertiary",
  "#BBB": "DesignTokens.colors.text.tertiary",
  "#ccc": "DesignTokens.colors.text.tertiary",
  "#CCC": "DesignTokens.colors.text.tertiary",
  "#c67b5c": "DesignTokens.colors.brand.terracotta",
  "#C67B5C": "DesignTokens.colors.brand.terracotta",
  "#d4917a": "DesignTokens.colors.brand.terracottaLight",
  "#D4917A": "DesignTokens.colors.brand.terracottaLight",
  "#a86548": "DesignTokens.colors.brand.terracottaDark",
  "#A86548": "DesignTokens.colors.brand.terracottaDark",
  "#8b9a7d": "DesignTokens.colors.brand.sage",
  "#8B9A7D": "DesignTokens.colors.brand.sage",
  "#b5a08c": "DesignTokens.colors.brand.camel",
  "#B5A08C": "DesignTokens.colors.brand.camel",
  "#7b8fa2": "DesignTokens.colors.brand.slate",
  "#7B8FA2": "DesignTokens.colors.brand.slate",
  "#5f6f7f": "DesignTokens.colors.brand.slateDark",
  "#5F6F7F": "DesignTokens.colors.brand.slateDark",
  "#5b8a72": "DesignTokens.colors.semantic.success",
  "#5B8A72": "DesignTokens.colors.semantic.success",
  "#d9a441": "DesignTokens.colors.semantic.warning",
  "#D9A441": "DesignTokens.colors.semantic.warning",
  "#c44536": "DesignTokens.colors.semantic.error",
  "#C44536": "DesignTokens.colors.semantic.error",
  "#4caf50": "DesignTokens.colors.semantic.success",
  "#4CAF50": "DesignTokens.colors.semantic.success",
  "#66bb6a": "DesignTokens.colors.semantic.success",
  "#66BB6A": "DesignTokens.colors.semantic.success",
  "#81c784": "DesignTokens.colors.semantic.successLight",
  "#81C784": "DesignTokens.colors.semantic.successLight",
  "#ffc107": "DesignTokens.colors.semantic.warning",
  "#FFC107": "DesignTokens.colors.semantic.warning",
  "#ffd54f": "DesignTokens.colors.semantic.warningLight",
  "#FFD54F": "DesignTokens.colors.semantic.warningLight",
  "#f44336": "DesignTokens.colors.semantic.error",
  "#F44336": "DesignTokens.colors.semantic.error",
  "#ef5350": "DesignTokens.colors.semantic.error",
  "#EF5350": "DesignTokens.colors.semantic.error",
  "#e57373": "DesignTokens.colors.semantic.errorLight",
  "#E57373": "DesignTokens.colors.semantic.errorLight",
  "#2196f3": "DesignTokens.colors.semantic.info",
  "#2196F3": "DesignTokens.colors.semantic.info",
  "#42a5f5": "DesignTokens.colors.semantic.info",
  "#42A5F5": "DesignTokens.colors.semantic.info",
  "#64b5f6": "DesignTokens.colors.semantic.infoLight",
  "#64B5F6": "DesignTokens.colors.semantic.infoLight",
  "#e91e63": "DesignTokens.colors.brand.terracotta",
  "#E91E63": "DesignTokens.colors.brand.terracotta",
  "#9c27b0": "DesignTokens.colors.brand.terracottaDark",
  "#9C27B0": "DesignTokens.colors.brand.terracottaDark",
  "#673ab7": "DesignTokens.colors.brand.slateDark",
  "#673AB7": "DesignTokens.colors.brand.slateDark",
  "#3f51b5": "DesignTokens.colors.brand.slate",
  "#3F51B5": "DesignTokens.colors.brand.slate",
  "#00bcd4": "DesignTokens.colors.brand.sage",
  "#00BCD4": "DesignTokens.colors.brand.sage",
  "#009688": "DesignTokens.colors.brand.sage",
  "#ff5722": "DesignTokens.colors.brand.terracotta",
  "#FF5722": "DesignTokens.colors.brand.terracotta",
  "#795548": "DesignTokens.colors.brand.camel",
  "#607d8b": "DesignTokens.colors.brand.slate",
  "#607D8B": "DesignTokens.colors.brand.slate",
  "#e8f3ee": "DesignTokens.colors.semantic.successLight",
  "#E8F3EE": "DesignTokens.colors.semantic.successLight",
  "#fdf5e6": "DesignTokens.colors.semantic.warningLight",
  "#FDF5E6": "DesignTokens.colors.semantic.warningLight",
  "#fdecea": "DesignTokens.colors.semantic.errorLight",
  "#FDECEA": "DesignTokens.colors.semantic.errorLight",
  "#eef1f4": "DesignTokens.colors.semantic.infoLight",
  "#EEF1F4": "DesignTokens.colors.semantic.infoLight",
  "#ebebe8": "DesignTokens.colors.neutral[200]",
  "#EBEBE8": "DesignTokens.colors.neutral[200]",
  "#d4d4d0": "DesignTokens.colors.neutral[300]",
  "#D4D4D0": "DesignTokens.colors.neutral[300]",
  "#8a8a85": "DesignTokens.colors.neutral[400]",
  "#8A8A85": "DesignTokens.colors.neutral[400]",
  "#3d3d39": "DesignTokens.colors.neutral[700]",
  "#3D3D39": "DesignTokens.colors.neutral[700]",
  "#0d0d0c": "DesignTokens.colors.neutral.black",
  "#0D0D0C": "DesignTokens.colors.neutral.black",
  "#d4a853": "DesignTokens.colors.semantic.warning",
  "#D4A853": "DesignTokens.colors.semantic.warning",
  "#eee": "DesignTokens.colors.borders.light",
  "#EEE": "DesignTokens.colors.borders.light",
  "#e5e5e5": "DesignTokens.colors.borders.light",
  "#E5E5E5": "DesignTokens.colors.borders.light",
  "#ddd": "DesignTokens.colors.borders.default",
  "#DDD": "DesignTokens.colors.borders.default",
  "#e0e0e0": "DesignTokens.colors.borders.default",
  "#E0E0E0": "DesignTokens.colors.borders.default",
  "#f59e0b": "DesignTokens.colors.semantic.warning",
  "#F59E0B": "DesignTokens.colors.semantic.warning",
  "#f43f5e": "DesignTokens.colors.semantic.error",
  "#F43F5E": "DesignTokens.colors.semantic.error",
  "#10b981": "DesignTokens.colors.semantic.success",
  "#10B981": "DesignTokens.colors.semantic.success",
  "#0ea5e9": "DesignTokens.colors.semantic.info",
  "#0EA5E9": "DesignTokens.colors.semantic.info",
  "#fbbf24": "DesignTokens.colors.semantic.warning",
  "#FBBF24": "DesignTokens.colors.semantic.warning",
};

const SKIP_DIRS = ["node_modules", ".git", "design-system/theme/tokens"];
const TARGET_DIRS = ["screens", "features", "components", "shared"];

function shouldSkip(filePath) {
  return SKIP_DIRS.some(
    (d) => filePath.includes(d) || filePath.includes(d.replace(/\//g, "\\"))
  );
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;
  let replaced = 0;

  for (const [hex, token] of Object.entries(COLOR_MAP)) {
    const escapedHex = hex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`['"\`]${escapedHex}['"\`]`, "gi");
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, (match) => {
        const quote = match[0];
        return `${quote}${token}${quote}`;
      });
      replaced += matches.length;
    }
  }

  if (content !== original) {
    if (
      !content.includes("import { DesignTokens }") &&
      !content.includes("import {DesignTokens}") &&
      !content.includes('from "./tokens/design-tokens"') &&
      !content.includes('from "../design-system/theme/tokens/design-tokens"') &&
      !content.includes("from '../../design-system/theme/tokens/design-tokens'") &&
      !content.includes('from "../../design-system/theme/tokens/design-tokens"') &&
      !content.includes("from '../../../design-system/theme/tokens/design-tokens'")
    ) {
      const srcIdx = filePath.indexOf("src\\");
      const depth = filePath.split("\\").length - filePath.indexOf("src\\") / 1 - 1;
      let importPath = "";
      const srcPath = filePath.substring(filePath.indexOf("src\\") + 4);
      const dirDepth = srcPath.split("\\").length - 1;
      importPath = "../".repeat(dirDepth) + "design-system/theme/tokens/design-tokens";

      const importLine = `import { DesignTokens } from '${importPath}';\n`;
      const lastImportIdx = content.lastIndexOf("import ");
      if (lastImportIdx !== -1) {
        const lineEnd = content.indexOf("\n", lastImportIdx);
        content = content.substring(0, lineEnd + 1) + importLine + content.substring(lineEnd + 1);
      } else {
        content = importLine + content;
      }
    }
    fs.writeFileSync(filePath, content, "utf8");
  }
  return replaced;
}

function walkDir(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkip(fullPath)) {
        results = results.concat(walkDir(fullPath));
      }
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      if (!shouldSkip(fullPath) && !entry.name.endsWith(".test.tsx") && !entry.name.endsWith(".test.ts")) {
        results.push(fullPath);
      }
    }
  }
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
