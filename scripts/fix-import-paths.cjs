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
  let modified = false;

  const relPath = path.relative(MOBILE_SRC, filePath).replace(/\\/g, "/");

  // Skip design-system theme files
  if (relPath.includes("design-system/theme/")) return false;
  if (relPath.includes("shared/contexts/ThemeContext")) return false;
  if (relPath.includes("contexts/ThemeContext.tsx")) return false;

  // Fix 1: Wrong ThemeContext import paths
  // Only fix paths that resolve to the OLD src/contexts/ThemeContext (not src/shared/contexts/ThemeContext)
  // Files in src/shared/components/XXX/ use ../../contexts/ThemeContext which correctly resolves to src/shared/contexts/ThemeContext
  // Only fix if the path actually doesn't resolve to a real file
  
  // Pattern: from '../../../contexts/ThemeContext' in features/ files (resolves to src/contexts/ which is wrong)
  // Pattern: from '../../../../contexts/ThemeContext' in deeper files
  // DO NOT fix ../../contexts/ThemeContext in shared/components/ files - that's correct!
  
  if (relPath.startsWith("features/") || relPath.startsWith("design-system/")) {
    content = content.replace(
      /from\s+['"]\.\.\/\.\.\/contexts\/ThemeContext['"]/g,
      (match) => {
        const correctPath = computeImportPath(filePath, "shared/contexts/ThemeContext");
        return `from '${correctPath}'`;
      }
    );
    content = content.replace(
      /from\s+['"]\.\.\/\.\.\/\.\.\/contexts\/ThemeContext['"]/g,
      (match) => {
        const correctPath = computeImportPath(filePath, "shared/contexts/ThemeContext");
        return `from '${correctPath}'`;
      }
    );
  }

  // Fix 2: Wrong theme import paths in design-system/primitives
  // Pattern: from '../theme' in primitives/ComponentName/ files
  // Should be: from '../../theme'
  if (relPath.includes("design-system/primitives/")) {
    content = content.replace(/from\s+['"]\.\.\/theme['"]/g, "from '../../theme'");
    content = content.replace(/from\s+['"]\.\.\/design-system\/theme['"]/g, "from '../../theme'");
  }

  // Fix 3: Wrong theme import paths in design-system/ui
  if (relPath.includes("design-system/ui/")) {
    content = content.replace(/from\s+['"]\.\.\/design-system\/theme['"]/g, "from '../theme'");
  }

  // Fix 4: Wrong design-tokens import paths in features
  content = content.replace(
    /from\s+['"]\.\.\/theme\/tokens\/design-tokens['"]/g,
    (match) => {
      const correctPath = computeImportPath(filePath, "design-system/theme/tokens/design-tokens");
      return `from '${correctPath}'`;
    }
  );

  if (modified || content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  }
  return false;
}

function computeImportPath(filePath, targetRelFromSrc) {
  const relToSrc = path.relative(path.dirname(filePath), MOBILE_SRC).replace(/\\/g, "/");
  const prefix = relToSrc.startsWith(".") ? relToSrc : "./" + relToSrc;
  return prefix + "/" + targetRelFromSrc;
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
