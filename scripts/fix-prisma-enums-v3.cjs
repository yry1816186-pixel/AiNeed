const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'apps', 'backend', 'src');
const DOMAINS_DIR = path.join(SRC_DIR, 'domains');
let fixCount = 0;

function walk(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      files = files.concat(walk(p));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(p);
    }
  }
  return files;
}

const allFiles = walk(DOMAINS_DIR);

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('prisma-enums')) continue;

  const rel = path.relative(path.dirname(file), SRC_DIR);
  const correctPath = rel.split(path.sep).join('/') + '/types/prisma-enums';

  const newContent = content.replace(
    /from\s+['"][^'"]*prisma-enums['"]/g,
    `from '${correctPath}'`
  );

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    fixCount++;
    const fileRel = path.relative(SRC_DIR, file);
    console.log(`Fixed: ${fileRel}`);
  }
}

console.log(`\nTotal files fixed: ${fixCount}`);
