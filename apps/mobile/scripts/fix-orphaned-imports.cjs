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

  const lines = content.split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^\w[\w.]*\s*(as\s+\w+)?,?$/.test(trimmed) && !trimmed.startsWith("import") && !trimmed.startsWith("export") && !trimmed.startsWith("const") && !trimmed.startsWith("let") && !trimmed.startsWith("var") && !trimmed.startsWith("function") && !trimmed.startsWith("class") && !trimmed.startsWith("interface") && !trimmed.startsWith("type") && !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("return") && !trimmed.startsWith("if") && !trimmed.startsWith("for") && !trimmed.startsWith("while") && !trimmed.startsWith("switch") && !trimmed.startsWith("case") && !trimmed.startsWith("default")) {

      const prevLine = result.length > 0 ? result[result.length - 1] : "";
      const prevTrimmed = prevLine.trim();

      if (prevTrimmed === "" || prevTrimmed === "" || !prevTrimmed.startsWith("import")) {
        let j = i;
        let hasFromLine = false;
        while (j < lines.length) {
          if (/^\s*\}\s*from\s*['"]/.test(lines[j])) {
            hasFromLine = true;
            break;
          }
          if (/^\s*\}\s*$/.test(lines[j])) {
            hasFromLine = true;
            break;
          }
          j++;
          if (j - i > 30) break;
        }

        if (hasFromLine) {
          if (prevTrimmed === "") {
            result[result.length - 1] = "import {";
          } else {
            result.push("import {");
          }
          changed = true;
        }
      }
    }

    result.push(line);
  }

  if (changed) {
    content = result.join("\n");
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
