const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

const EXCLUDE_PATTERNS = [
  /design-system[\\/]theme[\\/]index\.ts$/,
  /design-system[\\/]theme[\\/]tokens[\\/]/,
  /shared[\\/]contexts[\\/]ThemeContext\.tsx$/,
  /theme[\\/]index\.ts$/,
  /theme[\\/]tokens[\\/]/,
  /theme[\\/]__tests__[\\/]/,
];

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

function isExcluded(filePath) {
  const rel = path.relative(SRC, filePath);
  return EXCLUDE_PATTERNS.some(p => p.test(rel));
}

function getDesignSystemImportPath(filePath) {
  const srcDir = path.join(SRC, "design-system", "theme");
  const rel = path.relative(path.dirname(filePath), srcDir).replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : "./" + rel;
}

function fixFile(filePath) {
  if (isExcluded(filePath)) return false;

  let content = fs.readFileSync(filePath, "utf8");

  if (!/\bcolors\.\w+/.test(content)) return false;

  if (/import\s*\{[^}]*\bcolors\b[^}]*\}\s*from\s*['"]/.test(content)) return false;

  if (/const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\)/.test(content)) return false;

  if (/const\s+\w+\s*=\s*useTheme\(\)/.test(content) && /\bcolors\b/.test(content)) return false;

  if (/useStyles\(colors\)/.test(content)) return false;

  const importPath = getDesignSystemImportPath(filePath);
  const importLine = `import { flatColors as colors } from '${importPath}';\n`;

  const lastImportMatch = content.match(/^import\s.+;$/gm);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPos = lastImportIndex + lastImport.length;
    content = content.slice(0, insertPos) + "\n" + importLine + content.slice(insertPos);
  } else {
    content = importLine + content;
  }

  fs.writeFileSync(filePath, content, "utf8");
  return true;
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
