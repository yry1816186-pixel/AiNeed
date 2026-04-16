const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");

function getAllFiles(dir, ext = [".ts", ".tsx"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".expo") continue;
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

function fixMismatchedQuotes(content) {
  return content.replace(/from\s+'([^']*?)"/g, (match, p1) => {
    return `from '${p1}'`;
  });
}

function main() {
  const files = getAllFiles(SRC_DIR);
  let fixed = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const fixedContent = fixMismatchedQuotes(content);
    if (content !== fixedContent) {
      fs.writeFileSync(file, fixedContent, "utf-8");
      const relPath = path.relative(path.join(__dirname, ".."), file);
      console.log(`Fixed: ${relPath}`);
      fixed++;
    }
  }
  console.log(`\nTotal: ${fixed} files fixed`);
}

main();
