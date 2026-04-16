const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'apps', 'mobile', 'src');

function findFiles(dir, ext, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      findFiles(full, ext, results);
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

function fixDuplicateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const oldImportRe = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]*\/contexts\/ThemeContext['"];?\n?/g;
  const newImportRe = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]*shared\/contexts\/ThemeContext['"];?/;

  const oldMatches = [...content.matchAll(oldImportRe)];
  if (oldMatches.length === 0) return null;

  const newMatch = content.match(newImportRe);
  const newItems = newMatch ? newMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];

  const allOldItems = [];
  for (const m of oldMatches) {
    const items = m[1].split(',').map(s => s.trim()).filter(Boolean);
    allOldItems.push(...items);
  }

  const mergedItems = [...new Set([...newItems, ...allOldItems])];

  if (newMatch) {
    content = content.replace(newMatch[0], `import { ${mergedItems.join(', ')} } from '${newMatch[2]}';`);
  } else {
    const ctxPath = getRelPath(filePath, 'shared/contexts/ThemeContext');
    const insertLine = `import { ${mergedItems.join(', ')} } from '${ctxPath}';\n`;
    const firstOldImport = oldMatches[0];
    content = content.replace(firstOldImport[0], insertLine);
  }

  content = content.replace(oldImportRe, '');

  if (content === original) return null;
  return content;
}

function getRelPath(filePath, targetDir) {
  const fileDir = path.dirname(filePath);
  let rel = path.relative(fileDir, path.join(ROOT, targetDir)).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

const files = findFiles(ROOT, '.tsx');
let fixed = 0;

for (const file of files) {
  try {
    const result = fixDuplicateImports(file);
    if (!result) continue;
    fs.writeFileSync(file, result, 'utf8');
    console.log(`Fixed: ${path.relative(ROOT, file)}`);
    fixed++;
  } catch (err) {
    console.error(`ERR: ${path.relative(ROOT, file)}: ${err.message}`);
  }
}
console.log(`\n${fixed} files fixed`);
