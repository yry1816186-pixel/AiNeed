const fs = require("fs");
const path = require("path");

const PRIMITIVES_DIR = path.join(__dirname, "..", "src", "design-system", "primitives");

function getAllFiles(dir, ext = [".tsx"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const files = getAllFiles(PRIMITIVES_DIR);
  let fixed = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, "utf-8");
    const original = content;

    content = content.replace(/from\s+["']\.\.\/design-system\/theme["']/g, 'from "../../theme"');

    if (content !== original) {
      fs.writeFileSync(file, content, "utf-8");
      console.log(`Fixed: ${path.basename(path.dirname(file))}/${path.basename(file)}`);
      fixed++;
    }
  }

  console.log(`\nTotal: ${fixed} files fixed`);
}

main();
