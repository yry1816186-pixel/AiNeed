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

function main() {
  const files = getAllFiles(SRC_DIR);
  let fixed = 0;

  const targets = [
    { module: "design-system/theme", dir: path.join(SRC_DIR, "design-system", "theme") },
    { module: "design-system/theme/tokens/design-tokens", dir: path.join(SRC_DIR, "design-system", "theme", "tokens") },
    { module: "theme/tokens/colors", dir: path.join(SRC_DIR, "theme", "tokens") },
    { module: "theme/tokens/spacing", dir: path.join(SRC_DIR, "theme", "tokens") },
    { module: "theme/tokens/typography", dir: path.join(SRC_DIR, "theme", "tokens") },
    { module: "theme/tokens/design-tokens", dir: path.join(SRC_DIR, "theme", "tokens") },
    { module: "theme/tokens/shadows", dir: path.join(SRC_DIR, "theme", "tokens") },
    { module: "theme/tokens/season-colors", dir: path.join(SRC_DIR, "theme", "tokens") },
  ];

  for (const file of files) {
    let content = fs.readFileSync(file, "utf-8");
    const original = content;
    const fileDir = path.dirname(file);

    for (const target of targets) {
      const regex = new RegExp(`from\\s+["'](\.\.\/[^"']*${target.module.replace(/\//g, "\\/")})["']`, "g");
      let match;
      while ((match = regex.exec(content)) !== null) {
        const importPath = match[1];
        const resolved = path.resolve(fileDir, importPath);
        const relToSrc = path.relative(SRC_DIR, resolved).replace(/\\/g, "/");

        if (relToSrc.startsWith("design-system/") || relToSrc.startsWith("theme/")) {
          const correctRel = path.relative(fileDir, target.dir).replace(/\\/g, "/");
          const correctImport = target.module.includes("tokens/") 
            ? correctRel + "/" + target.module.split("/").pop()
            : correctRel;
          
          if (importPath !== correctImport) {
            content = content.replace(match[0], `from "${correctImport}"`);
          }
        }
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
