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
    } else if (/\.(tsx|ts)$/.test(file) && !file.endsWith(".d.ts")) {
      results.push(filePath);
    }
  }
  return results;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  const brokenPattern1 = /\b(function\s+\w+)\s*\n\s*const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)\s*;\s*\n\s*const\s+styles\s*=\s*useStyles\(colors\)\s*;\s*\(/g;
  if (brokenPattern1.test(content)) {
    content = content.replace(brokenPattern1, (match, funcDecl) => {
      changed = true;
      return funcDecl + "(";
    });
  }

  const brokenPattern2 = /\b(function\s+\w+)\s*\n\s*const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)\s*;\s*\n\s*const\s+\w+\s*=\s*useS\(colors\)\s*;\s*\(/g;
  if (brokenPattern2.test(content)) {
    content = content.replace(brokenPattern2, (match, funcDecl) => {
      changed = true;
      return funcDecl + "(";
    });
  }

  const brokenPattern3 = /\b(memo\(function\s+\w+)\s*\n\s*const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)\s*;\s*\n\s*const\s+styles\s*=\s*useStyles\(colors\)\s*;\s*\(/g;
  if (brokenPattern3.test(content)) {
    content = content.replace(brokenPattern3, (match, funcDecl) => {
      changed = true;
      return funcDecl + "(";
    });
  }

  const brokenPattern4 = /\b(memo\(function\s+\w+)\s*\n\s*const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)\s*;\s*\n\s*const\s+\w+\s*=\s*useS\(colors\)\s*;\s*\(/g;
  if (brokenPattern4.test(content)) {
    content = content.replace(brokenPattern4, (match, funcDecl) => {
      changed = true;
      return funcDecl + "(";
    });
  }

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
