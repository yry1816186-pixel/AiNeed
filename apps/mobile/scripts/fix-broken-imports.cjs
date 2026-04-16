const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (/\.(tsx?|cjs)$/.test(file)) {
      results.push(filePath);
    }
  }
  return results;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  const brokenImportRe = /^\s*import\s*\{\s*colors\s*\}\s*from\s*['"][^'"]*theme[^'"]*['"];\s*$/gm;

  if (!brokenImportRe.test(content)) return false;

  content = content.replace(brokenImportRe, "");
  changed = true;

  content = content.replace(
    /import\s*\{\s*\n\s*import\s*\{\s*colors\s*\}\s*from\s*['"][^'"]*['"];\s*\n/g,
    "import {\n"
  );

  content = content.replace(
    /,\s*colors\s*\}\s*from\s*['"][^'"]*theme['"];\s*\n/g,
    "} from '../design-system/theme';\n"
  );

  content = content.replace(
    /import\s*\{\s*$/gm,
    ""
  );

  const lines = content.split("\n");
  const cleaned = [];
  let skipNext = false;
  for (let i = 0; i < lines.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    const line = lines[i];
    if (/^\s*import\s*\{\s*$/.test(line)) {
      if (i + 1 < lines.length && /^\s*\}/.test(lines[i + 1])) {
        skipNext = true;
        continue;
      }
      if (i + 1 < lines.length && /import\s*\{/.test(lines[i + 1])) {
        continue;
      }
    }
    cleaned.push(line);
  }
  content = cleaned.join("\n");

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

const files = walk(SRC);
let fixed = 0;
for (const f of files) {
  if (fixFile(f)) {
    fixed++;
    console.log("Fixed:", path.relative(SRC, f));
  }
}
console.log(`\nTotal files fixed: ${fixed}`);
