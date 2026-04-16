import fs from "fs";
import path from "path";

const SRC_DIR = path.join(__dirname, "..", "src");
const EXCLUDE_DIRS = ["node_modules", ".expo", "dist", "coverage", "theme/tokens", "design-system/theme/tokens"];

const SPACING_PROPS = [
  "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
  "paddingHorizontal", "paddingVertical",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight",
  "marginHorizontal", "marginVertical",
  "gap", "rowGap", "columnGap",
  "left", "right", "top", "bottom",
];

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

function auditSpacing() {
  const files = getAllFiles(SRC_DIR);
  const byFile: Record<string, { count: number; values: Array<{ line: number; property: string; value: string }> }> = {};
  const byValue: Record<string, { count: number; files: string[] }> = {};
  const byProperty: Record<string, number> = {};
  let total = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const fileMatches: Array<{ line: number; property: string; value: string }> = [];

    lines.forEach((rawLine, idx) => {
      const trimmed = rawLine.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;

      for (const prop of SPACING_PROPS) {
        const regex = new RegExp(`${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)`, "g");
        let match: RegExpExecArray | null;
        while ((match = regex.exec(trimmed)) !== null) {
          const value = parseFloat(match[1]);
          if (value === 0 || value === 0.5 || value === 1) continue;

          fileMatches.push({ line: idx + 1, property: prop, value: match[1] });
          byValue[match[1]] = byValue[match[1]] || { count: 0, files: [] };
          byValue[match[1]].count++;
          byValue[match[1]].files.push(path.relative(path.join(__dirname, ".."), file));
          byProperty[prop] = (byProperty[prop] || 0) + 1;
          total++;
        }
      }
    });

    if (fileMatches.length > 0) {
      const relPath = path.relative(path.join(__dirname, ".."), file);
      byFile[relPath] = { count: fileMatches.length, values: fileMatches };
    }
  }

  const report = { total, byFile, byValue, byProperty };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

auditSpacing();
