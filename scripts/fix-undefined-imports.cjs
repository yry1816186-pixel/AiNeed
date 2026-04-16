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

function getRelPath(filePath, targetDir) {
  const fileDir = path.dirname(filePath);
  let rel = path.relative(fileDir, path.join(ROOT, targetDir)).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function fixUndefinedImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes("from 'undefined'") && !content.includes('from "undefined"')) return null;

  const ctxPath = getRelPath(filePath, 'shared/contexts/ThemeContext');
  content = content.replace(/from ['"]undefined['"]/g, `from '${ctxPath}'`);

  return content;
}

const files = findFiles(ROOT, '.tsx');
let fixed = 0;

for (const file of files) {
  try {
    const result = fixUndefinedImports(file);
    if (!result) continue;
    fs.writeFileSync(file, result, 'utf8');
    fixed++;
  } catch (err) {
    console.error(`ERR: ${path.relative(ROOT, file)}: ${err.message}`);
  }
}
console.log(`${fixed} files fixed`);
