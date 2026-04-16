import fs from "fs";
import path from "path";

const SRC_DIR = path.join(__dirname, "..", "src");
const EXCLUDE_DIRS = ["node_modules", ".expo", "dist", "coverage", "theme/tokens", "design-system/theme/tokens"];

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

function auditTypography() {
  const files = getAllFiles(SRC_DIR);
  const byFile: Record<string, { count: number; values: Array<{ line: number; property: string; value: string }> }> = {};
  const byValue: Record<string, { count: number; files: string[] }> = {};
  let total = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const fileMatches: Array<{ line: number; property: string; value: string }> = [];

    lines.forEach((rawLine, idx) => {
      const trimmed = rawLine.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;

      const fontSizeMatch = trimmed.match(/fontSize\s*:\s*(\d+)/);
      if (fontSizeMatch) {
        const value = fontSizeMatch[1];
        fileMatches.push({ line: idx + 1, property: "fontSize", value });
        byValue[value] = byValue[value] || { count: 0, files: [] };
        byValue[value].count++;
        byValue[value].files.push(path.relative(path.join(__dirname, ".."), file));
        total++;
      }

      const fontWeightMatch = trimmed.match(/fontWeight\s*:\s*["'](\d+)["']/);
      if (fontWeightMatch) {
        const value = fontWeightMatch[1];
        fileMatches.push({ line: idx + 1, property: "fontWeight", value });
        byValue[`"${value}"`] = byValue[`"${value}"`] || { count: 0, files: [] };
        byValue[`"${value}"`].count++;
        byValue[`"${value}"`].files.push(path.relative(path.join(__dirname, ".."), file));
        total++;
      }

      const lineHeightMatch = trimmed.match(/lineHeight\s*:\s*(\d+)/);
      if (lineHeightMatch) {
        const value = lineHeightMatch[1];
        fileMatches.push({ line: idx + 1, property: "lineHeight", value });
        byValue[`lh_${value}`] = byValue[`lh_${value}`] || { count: 0, files: [] };
        byValue[`lh_${value}`].count++;
        byValue[`lh_${value}`].files.push(path.relative(path.join(__dirname, ".."), file));
        total++;
      }
    });

    if (fileMatches.length > 0) {
      const relPath = path.relative(path.join(__dirname, ".."), file);
      byFile[relPath] = { count: fileMatches.length, values: fileMatches };
    }
  }

  const report = { total, byFile, byValue };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

auditTypography();
