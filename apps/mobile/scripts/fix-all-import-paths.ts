import fs from "fs";
import path from "path";

const SRC_DIR = path.join(__dirname, "..", "src");
const EXCLUDE_DIRS = ["node_modules", ".expo", "dist", "coverage"];

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

function resolveImportPath(fromFile: string, importPath: string): string | null {
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, importPath);
  const relToSrc = path.relative(SRC_DIR, resolved).replace(/\\/g, "/");

  if (relToSrc.startsWith("design-system/theme")) {
    const correctRel = path.relative(dir, path.join(SRC_DIR, "design-system", "theme")).replace(/\\/g, "/");
    if (importPath !== correctRel) {
      return correctRel;
    }
  }

  if (relToSrc.startsWith("design-system/theme/tokens")) {
    const correctRel = path.relative(dir, path.join(SRC_DIR, "design-system", "theme", "tokens")).replace(/\\/g, "/");
    if (importPath !== correctRel) {
      return correctRel;
    }
  }

  return null;
}

function main() {
  const files = getAllFiles(SRC_DIR);
  let fixed = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, "utf-8");
    const original = content;

    const importRegex = /from\s+["'](\.\.?\/[^"']*design-system[^"']*)["']/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const corrected = resolveImportPath(file, importPath);
      if (corrected) {
        content = content.replace(match[0], `from "${corrected}"`);
      }
    }

    if (content !== original) {
      fs.writeFileSync(file, content, "utf-8");
      const relPath = path.relative(path.join(__dirname, ".."), file);
      console.log(`Fixed: ${relPath}`);
      fixed++;
    }
  }

  console.log(`\nTotal: ${fixed} files fixed`);
}

main();
