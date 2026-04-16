const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

const EXCLUDE_PATTERNS = [
  /shared[\\/]contexts[\\/]ThemeContext\.tsx$/,
];

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

function isExcluded(filePath) {
  const rel = path.relative(SRC, filePath);
  return EXCLUDE_PATTERNS.some(p => p.test(rel));
}

function getThemeContextPath(filePath) {
  const srcDir = path.join(SRC, "shared", "contexts", "ThemeContext");
  return path.relative(path.dirname(filePath), srcDir).replace(/\\/g, "/");
}

function fixFile(filePath) {
  if (isExcluded(filePath)) return false;

  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  if (/import\s*\{[^}]*\buseTheme\b[^}]*\}\s*from\s*['"][^'"]*design-system\/theme/.test(content)) {
    const themeContextPath = getThemeContextPath(filePath);

    content = content.replace(
      /import\s*\{\s*useTheme\s*\}\s*from\s*['"][^'"]*design-system\/theme[^'"]*['"]\s*;?/g,
      (match) => {
        changed = true;
        return `import { useTheme } from '${themeContextPath}';`;
      }
    );

    content = content.replace(
      /import\s*\{([^}]*)\buseTheme\b([^}]*)\}\s*from\s*['"][^'"]*design-system\/theme[^'"]*['"]\s*;?/g,
      (match, before, after) => {
        if (changed) return match;
        changed = true;
        const otherImports = (before + after).replace(/,\s*useTheme|useTheme\s*,/g, '').trim();
        let result = `import { useTheme } from '${themeContextPath}';\n`;
        if (otherImports) {
          const designSystemPath = match.match(/from\s*['"]([^'"]*)['"]/)?.[1] || '';
          result += `import { ${otherImports} } from '${designSystemPath}';`;
        }
        return result;
      }
    );

    if (/import\s*\{[^}]*\buseTheme\b[^}]*\}\s*from\s*['"][^'"]*design-system\/theme\/tokens/.test(content)) {
      content = content.replace(
        /import\s*\{\s*useTheme\s*\}\s*from\s*['"][^'"]*design-system\/theme\/tokens[^'"]*['"]\s*;?/g,
        `import { useTheme } from '${themeContextPath}';`
      );
      changed = true;
    }
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
