const fs = require('fs');
const path = require('path');

const backendSrc = path.resolve(__dirname, '..', 'apps', 'backend', 'src');
const errorFile = path.resolve(__dirname, '..', 'tsc-backend-errors.txt');

const errors = fs.readFileSync(errorFile, 'utf8');
const lines = errors.split('\n');

const fileMissingEnums = {};
for (const line of lines) {
  const match = line.match(/^(src\/[^(]+)\(\d+,\d+\): error TS2305: Module .* has no exported member '(\w+)'/);
  if (match) {
    const [, filePath, memberName] = match;
    if (!fileMissingEnums[filePath]) fileMissingEnums[filePath] = new Set();
    fileMissingEnums[filePath].add(memberName);
  }
}

let totalFixed = 0;

for (const [relPath, members] of Object.entries(fileMissingEnums)) {
  const fullPath = path.join(backendSrc, relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const memberList = [...members].sort();
  
  const fileDir = path.dirname(fullPath);
  const relToTypes = path.relative(fileDir, path.join(backendSrc, 'types')).replace(/\\/g, '/');
  const importLine = `import { ${memberList.join(', ')} } from '${relToTypes}/prisma-enums';`;
  
  const lines = content.split('\n');
  const lastImportIdx = lines.findLastIndex(l => l.startsWith('import '));
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
    content = lines.join('\n');
  }
  
  for (const member of members) {
    content = content.replace(
      new RegExp(`(import\\s*\\{[^}]*?)\\b${member}\\b\\s*,?\\s*`, 'g'),
      '$1'
    );
    content = content.replace(/import\s*\{\s*\}\s*from\s*['"]@prisma\/client['"];?\n?/g, '');
    content = content.replace(/,\s*}/g, ' }');
    content = content.replace(/\{\s*,/g, '{ ');
  }
  
  fs.writeFileSync(fullPath, content, 'utf8');
  totalFixed++;
}

console.log(`Added prisma-enums imports to ${totalFixed} files`);
