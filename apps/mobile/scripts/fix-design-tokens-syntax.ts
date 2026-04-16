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

function fixJsxAttribute(content: string): string {
  return content.replace(
    /=DesignTokens\.([a-zA-Z.[\]]+)/g,
    "={DesignTokens.$1}"
  );
}

function fixStringLiteralInObject(content: string): string {
  return content.replace(
    /"DesignTokens\.([a-zA-Z.[\]]+)"/g,
    "DesignTokens.$1"
  );
}

function fixSingleQuoteLiteralInObject(content: string): string {
  return content.replace(
    /'DesignTokens\.([a-zA-Z.[\]]+)'/g,
    "DesignTokens.$1"
  );
}

function main() {
  const files = getAllFiles(SRC_DIR);
  let fixed = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, "utf-8");
    const original = content;

    content = fixJsxAttribute(content);
    content = fixStringLiteralInObject(content);
    content = fixSingleQuoteLiteralInObject(content);

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
