const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'apps', 'backend', 'src');
const DOMAINS_DIR = path.join(SRC_DIR, 'domains');
let fixCount = 0;

function walkTsFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      files = files.concat(walkTsFiles(p));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(p);
    }
  }
  return files;
}

const allFiles = walkTsFiles(DOMAINS_DIR);

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('prisma-enums')) continue;

  const rel = path.relative(path.dirname(file), SRC_DIR);
  const correctPath = rel.split(path.sep).join('/') + '/types/prisma-enums';

  let newContent = content;
  const importRegex = /from\s+['"]([^'"]*prisma-enums[^'"]*)['"]/g;
  let match;
  let changed = false;

  while ((match = importRegex.exec(content)) !== null) {
    const oldPath = match[1];
    if (oldPath !== correctPath) {
      newContent = newContent.replace(`from '${oldPath}'`, `from '${correctPath}'`);
      newContent = newContent.replace(`from "${oldPath}"`, `from "${correctPath}"`);
      changed = true;
      console.log(`  ${oldPath} -> ${correctPath}`);
    }
  }

  if (changed && newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    fixCount++;
    const fileRel = path.relative(SRC_DIR, file);
    console.log(`Fixed: ${fileRel}`);
  }
}

console.log(`\nTotal files fixed: ${fixCount}`);
