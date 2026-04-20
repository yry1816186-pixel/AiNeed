const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "apps", "mobile", "src");

function fixMisplacedHooks(content) {
  const lines = content.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    const isTypeAnnotationStart = /^\s*(export\s+)?(const|let|var)\s+\w+:\s*React\.FC<\{\s*$/.test(line) ||
                                  /^\s*(const|let|var)\s+\w+:\s*React\.FC<\{$/.test(line);

    if (isTypeAnnotationStart) {
      result.push(line);
      i++;

      const typeProps = [];
      const hookLines = [];

      while (i < lines.length) {
        const currentLine = lines[i];
        const currentTrimmed = currentLine.trim();

        if (/^const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)/.test(currentTrimmed) ||
            /^const\s+styles\s*=\s*useStyles\(colors\)/.test(currentTrimmed)) {
          hookLines.push(currentLine);
          i++;
          continue;
        }

        if (/^\}\>\s*=/.test(currentTrimmed) || /^\}\s*\>\s*=/.test(currentTrimmed)) {
          result.push(...typeProps);
          result.push(currentLine);
          i++;

          if (hookLines.length > 0) {
            const nextLine = i < lines.length ? lines[i] : "";
            if (/^\s*\{/.test(nextLine) || /^\s*\(\s*\{/.test(nextLine)) {
              result.push(nextLine);
              i++;
              const indent = hookLines[0].match(/^(\s*)/)[1];
              for (const hl of hookLines) {
                result.push(hl);
              }
            } else {
              for (const hl of hookLines) {
                result.push(hl);
              }
            }
          }
          break;
        }

        typeProps.push(currentLine);
        i++;
      }
      continue;
    }

    result.push(line);
    i++;
  }

  return result.join("\n");
}

const filesToFix = [
  "shared/components/visualization/AlgorithmVisualization.tsx",
];

for (const file of filesToFix) {
  const fullPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  const fixed = fixMisplacedHooks(content);

  if (fixed !== content) {
    fs.writeFileSync(fullPath, fixed, "utf-8");
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`No changes: ${file}`);
  }
}

// Also scan all files for the pattern
function scanAndFix(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let fixedCount = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixedCount += scanAndFix(fullPath);
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      let content = fs.readFileSync(fullPath, "utf-8");
      const original = content;

      content = fixMisplacedHooks(content);

      if (content !== original) {
        fs.writeFileSync(fullPath, content, "utf-8");
        fixedCount++;
        console.log(`Fixed: ${path.relative(SRC_DIR, fullPath)}`);
      }
    }
  }

  return fixedCount;
}

console.log("\nScanning all files...");
const totalFixed = scanAndFix(SRC_DIR);
console.log(`Total files fixed: ${totalFixed}`);
