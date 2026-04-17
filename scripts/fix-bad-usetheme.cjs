const fs = require("fs");
const path = require("path");

const MOBILE_SRC = path.join(__dirname, "..", "apps", "mobile", "src");

function getAllTsxFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === "0") continue;
    if (entry.isDirectory()) {
      results.push(...getAllTsxFiles(fullPath));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  const original = content;

  const lines = content.split("\n");
  const linesToRemove = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "const { colors } = useTheme();") {
      let depth = 0;
      let foundObjectLiteral = false;

      for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
        const line = lines[j];
        for (let k = line.length - 1; k >= 0; k--) {
          if (line[k] === "}" || line[k] === ")") depth++;
          if (line[k] === "{" || line[k] === "(") depth--;
        }
        if (line.includes("StyleSheet.create") ||
            line.includes("= {") ||
            line.match(/^\s*(const|let|var)\s+\w+\s*=\s*\{/) ||
            line.match(/^\s*export\s+(const|let)\s+\w+\s*=\s*\{/) ||
            line.match(/^\s*\w+\s*:\s*\{/) ||
            line.match(/^\s*const\s+\w+\s*=\s*createStyles/)) {
          foundObjectLiteral = true;
          break;
        }
        if (line.match(/^\s*(export\s+)?(function|const)\s+\w+/) && !line.includes("=>")) {
          foundObjectLiteral = false;
          break;
        }
      }

      if (foundObjectLiteral || depth > 0) {
        let inComponent = false;
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].match(/^(export\s+)?(function|const)\s+\w+\s*[<(]/) ||
              lines[j].match(/^(export\s+)?const\s+\w+\s*=\s*\(/) ||
              lines[j].match(/^(export\s+)?const\s+\w+\s*=\s*React\.FC/) ||
              lines[j].match(/^(export\s+)?const\s+\w+\s*=\s*React\.memo/)) {
            inComponent = true;
            break;
          }
          if (lines[j].match(/^(const|export const)\s+\w+\s*=\s*StyleSheet\.create/) ||
              lines[j].match(/^(const|export const)\s+\w+\s*=\s*createStyles/) ||
              lines[j].match(/^(const|export const)\s+\w+\s*=\s*\{[^}]*$/)) {
            inComponent = false;
            break;
          }
        }

        if (!inComponent) {
          linesToRemove.add(i);
        }
      }
    }
  }

  if (linesToRemove.size > 0) {
    const newLines = lines.filter((_, i) => !linesToRemove.has(i));
    content = newLines.join("\n");
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  }
  return false;
}

const files = getAllTsxFiles(MOBILE_SRC);
let fixedCount = 0;

for (const file of files) {
  try {
    if (fixFile(file)) {
      fixedCount++;
      console.log(`Fixed: ${path.relative(MOBILE_SRC, file)}`);
    }
  } catch (e) {
    console.error(`Error: ${file}: ${e.message}`);
  }
}

console.log(`\nTotal: ${fixedCount}`);
