import fs from "fs";
import path from "path";

const SRC_DIR = path.join(__dirname, "..", "src");
const EXCLUDE_DIRS = ["node_modules", ".expo", "dist", "coverage", "theme/tokens", "design-system/theme/tokens"];

const COLOR_PROPS = [
  "color", "backgroundColor", "borderColor", "borderBottomColor", "borderTopColor",
  "borderLeftColor", "borderRightColor", "tintColor", "placeholderTextColor",
  "underlineColorAndroid", "shadowColor", "overlayColor",
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

function inferSemanticContext(propName: string): string {
  if (/^(color|text.*Color|tint.*Color)$/.test(propName)) return "text";
  if (/^(background|bg)/.test(propName)) return "background";
  if (/^border/.test(propName)) return "border";
  return "other";
}

function inferPropertyFromLine(line: string): string {
  const colorPropMatch = line.match(/(\w+(?:Color|Background))\s*:/);
  if (colorPropMatch) return colorPropMatch[1];
  const simpleMatch = line.match(/(color|backgroundColor|borderColor|tintColor)\s*:/);
  if (simpleMatch) return simpleMatch[1];
  return "unknown";
}

function auditColors() {
  const files = getAllFiles(SRC_DIR);
  const byFile: Record<string, { count: number; values: Array<{ line: number; value: string; property: string; context: string }> }> = {};
  const bySemanticContext: Record<string, string[]> = { text: [], background: [], border: [], other: [] };
  let total = 0;

  const HEX_RE = /["'`]#([0-9a-fA-F]{3,8})["'`]/g;
  const RGBA_RE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const fileMatches: Array<{ line: number; value: string; property: string; context: string }> = [];

    lines.forEach((rawLine, idx) => {
      const trimmed = rawLine.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;

      let match: RegExpExecArray | null;
      HEX_RE.lastIndex = 0;
      while ((match = HEX_RE.exec(trimmed)) !== null) {
        const value = match[0].replace(/["'`]/g, "");
        const propName = inferPropertyFromLine(trimmed);
        const context = inferSemanticContext(propName);
        fileMatches.push({ line: idx + 1, value, property: propName, context });
        bySemanticContext[context].push(value);
        total++;
      }

      RGBA_RE.lastIndex = 0;
      while ((match = RGBA_RE.exec(trimmed)) !== null) {
        const value = match[0];
        const propName = inferPropertyFromLine(trimmed);
        const context = inferSemanticContext(propName);
        fileMatches.push({ line: idx + 1, value, property: propName, context });
        bySemanticContext[context].push(value);
        total++;
      }
    });

    if (fileMatches.length > 0) {
      const relPath = path.relative(path.join(__dirname, ".."), file);
      byFile[relPath] = { count: fileMatches.length, values: fileMatches };
    }
  }

  const report = { total, byFile, bySemanticContext };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

auditColors();
