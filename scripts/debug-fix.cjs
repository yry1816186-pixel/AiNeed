const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'apps', 'backend', 'src');
const DOMAINS_DIR = path.join(SRC_DIR, 'domains');

const testFile = path.join(DOMAINS_DIR, 'fashion', 'clothing', 'dto', 'clothing.dto.ts');
const content = fs.readFileSync(testFile, 'utf8');

const rel = path.relative(path.dirname(testFile), SRC_DIR);
const correctPath = rel.split(path.sep).join('/') + '/types/prisma-enums';

console.log('correctPath:', correctPath);
console.log('content includes prisma-enums:', content.includes('prisma-enums'));

const regex = /from\s+["'][^"']*prisma-enums["']/g;
const matches = content.match(regex);
console.log('matches:', matches);

const newContent = content.replace(regex, `from "${correctPath}"`);
console.log('newContent === content:', newContent === content);

const diff = content.split('\n').filter((l, i) => l !== newContent.split('\n')[i]);
console.log('diff lines:', diff.length);
if (diff.length > 0) {
  diff.forEach(l => console.log('  ', JSON.stringify(l)));
}

fs.writeFileSync(testFile, newContent, 'utf8');
console.log('Written!');
