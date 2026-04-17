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

function resolvePath(fromFile, relPath) {
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, relPath);
  return resolved.replace(/\\/g, "/");
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  const original = content;

  const relPath = path.relative(MOBILE_SRC, filePath).replace(/\\/g, "/");

  // Skip theme files
  if (relPath.includes("design-system/theme/")) return false;
  if (relPath.includes("shared/contexts/ThemeContext")) return false;
  if (relPath.includes("contexts/ThemeContext.tsx")) return false;

  // Find all import paths and check if they resolve to existing files
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  const fixes = [];

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip node_modules imports
    if (!importPath.startsWith(".")) continue;

    const resolved = resolvePath(filePath, importPath);
    
    // Check if the import resolves to an existing file
    const possibleExtensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];
    let exists = false;
    for (const ext of possibleExtensions) {
      if (fs.existsSync(resolved + ext)) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      // Try to find the correct path
      // Common patterns:
      // 1. ../../../theme/tokens/X -> should be ../../theme/tokens/X (from primitives)
      // 2. ../../theme/tokens/X -> should be ../../../theme/tokens/X (from ui)
      // 3. ./client -> should be ../../../services/api/client
      
      // Extract the target module name (last part of the path)
      const parts = importPath.split("/");
      const lastPart = parts[parts.length - 1];
      
      // Try different relative depths
      const dir = path.dirname(filePath);
      const srcDir = MOBILE_SRC;
      
      // Search for the module in the project
      const searchPatterns = [
        `design-system/theme/tokens/${lastPart}`,
        `design-system/theme/${lastPart}`,
        `shared/contexts/${lastPart}`,
        `services/api/${lastPart}`,
        `services/${lastPart}`,
        `types/${lastPart}`,
        `utils/${lastPart}`,
        `stores/${lastPart}`,
      ];

      for (const pattern of searchPatterns) {
        const candidate = path.join(srcDir, pattern);
        for (const ext of possibleExtensions) {
          if (fs.existsSync(candidate + ext)) {
            const correctRel = path.relative(dir, candidate).replace(/\\/g, "/");
            const prefix = correctRel.startsWith(".") ? correctRel : "./" + correctRel;
            if (prefix !== importPath) {
              fixes.push({ old: importPath, new: prefix });
            }
            exists = true;
            break;
          }
        }
        if (exists) break;
      }
    }
  }

  // Apply fixes
  for (const fix of fixes) {
    // Escape for regex
    const oldEscaped = fix.old.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    content = content.replace(
      new RegExp(`from\\s+['"]${oldEscaped}['"]`, "g"),
      `from '${fix.new}'`
    );
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
