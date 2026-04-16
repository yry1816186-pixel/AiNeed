import fs from "fs";
import path from "path";

const SRC_DIR = path.join(__dirname, "..", "src");
const EXCLUDE_DIRS = ["node_modules", ".expo", "dist", "coverage", "design-system/theme/tokens"];

const COLOR_MAP: Record<string, string> = {
  "#a855f7": "DesignTokens.colors.brand.terracotta",
  "#A855F7": "DesignTokens.colors.brand.terracotta",
  "#ec4899": "DesignTokens.colors.brand.camel",
  "#EC4899": "DesignTokens.colors.brand.camel",
  "#6C5CE7": "DesignTokens.colors.brand.terracotta",
  "#6c5ce7": "DesignTokens.colors.brand.terracotta",
  "#F3F1FF": "DesignTokens.colors.backgrounds.tertiary",
  "#f3f1ff": "DesignTokens.colors.backgrounds.tertiary",
  "#8B5CF6": "DesignTokens.colors.brand.terracottaDark",
  "#8b5cf6": "DesignTokens.colors.brand.terracottaDark",
  "#7C3AED": "DesignTokens.colors.brand.terracottaDark",
  "#7c3aed": "DesignTokens.colors.brand.terracottaDark",
  "#6D28D9": "DesignTokens.colors.brand.terracottaDark",
  "#6d28d9": "DesignTokens.colors.brand.terracottaDark",
  "#5B21B6": "DesignTokens.colors.brand.slateDark",
  "#5b21b6": "DesignTokens.colors.brand.slateDark",
  "#4C1D95": "DesignTokens.colors.neutral[800]",
  "#4c1d95": "DesignTokens.colors.neutral[800]",
  "#EDE9FE": "DesignTokens.colors.backgrounds.secondary",
  "#ede9fe": "DesignTokens.colors.backgrounds.secondary",
  "#DDD6FE": "DesignTokens.colors.brand.terracottaLight",
  "#ddd6fe": "DesignTokens.colors.brand.terracottaLight",
  "#C4B5FD": "DesignTokens.colors.brand.terracotta",
  "#c4b5fd": "DesignTokens.colors.brand.terracotta",
  "#A78BFA": "DesignTokens.colors.brand.terracotta",
  "#a78bfa": "DesignTokens.colors.brand.terracotta",
};

const RGBA_MAP: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /rgba\(\s*168\s*,\s*85\s*,\s*247\s*,\s*([\d.]+)\s*\)/g, replacement: "rgba(198, 123, 92, $1)" },
  { pattern: /rgba\(\s*108\s*,\s*92\s*,\s*231\s*,\s*([\d.]+)\s*\)/g, replacement: "rgba(198, 123, 92, $1)" },
  { pattern: /rgba\(\s*139\s*,\s*92\s*,\s*246\s*,\s*([\d.]+)\s*\)/g, replacement: "rgba(168, 101, 72, $1)" },
  { pattern: /rgba\(\s*236\s*,\s*72\s*,\s*153\s*,\s*([\d.]+)\s*\)/g, replacement: "rgba(181, 160, 140, $1)" },
];

const DESIGN_TOKENS_IMPORT = "import { DesignTokens } from \"../../design-system/theme/tokens/design-tokens\";";
const DESIGN_TOKENS_IMPORT_ALT = "import { DesignTokens } from \"../design-system/theme/tokens/design-tokens\";";
const DESIGN_TOKENS_IMPORT_ALT2 = "import { DesignTokens } from \"../../../design-system/theme/tokens/design-tokens\";";

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

function needsDesignTokensImport(content: string): boolean {
  return content.includes("DesignTokens.colors") && !content.includes("import { DesignTokens }");
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

  for (const [hex, token] of Object.entries(COLOR_MAP)) {
    const regex = new RegExp(`["'\`]${hex}["'\`]`, "gi");
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, token);
      replacements += matches.length;
    }
  }

  for (const { pattern, replacement } of RGBA_MAP) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      replacements += matches.length;
    }
  }

  if (replacements > 0 && needsDesignTokensImport(content)) {
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
