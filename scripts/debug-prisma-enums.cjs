const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join('C:', 'AiNeed', 'apps', 'backend', 'src');
const DOMAINS_DIR = path.join(SRC_DIR, 'domains');

const testFile = path.join(DOMAINS_DIR, 'fashion', 'clothing', 'dto', 'clothing.dto.ts');
const content = fs.readFileSync(testFile, 'utf8');
const rel = path.relative(path.dirname(testFile), SRC_DIR);
const correctPath = rel.split(path.sep).join('/') + '/types/prisma-enums';

const importMatch = content.match(/from\s+['"]([^'"]*prisma-enums[^'"]*)['"]/);

console.log('File:', testFile);
console.log('Current import:', importMatch ? importMatch[1] : 'not found');
console.log('Correct path:', correctPath);
console.log('Match:', importMatch ? importMatch[1] === correctPath : false);

const allFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      walk(p);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      allFiles.push(p);
    }
  }
}
walk(DOMAINS_DIR);

let fixCount = 0;
for (const file of allFiles) {
  const c = fs.readFileSync(file, 'utf8');
  if (!c.includes('prisma-enums')) continue;

  const r = path.relative(path.dirname(file), SRC_DIR);
  const correct = r.split(path.sep).join('/') + '/types/prisma-enums';

  const m = c.match(/from\s+['"]([^'"]*prisma-enums[^'"]*)['"]/);
  if (m && m[1] !== correct) {
    console.log(`\nMISMATCH in ${path.relative(SRC_DIR, file)}:`);
    console.log(`  current: ${m[1]}`);
    console.log(`  correct: ${correct}`);
    fixCount++;
  }
}

console.log(`\nTotal mismatches: ${fixCount}`);
