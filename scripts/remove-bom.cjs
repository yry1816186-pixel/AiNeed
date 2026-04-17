const fs = require('fs');
const path = require('path');

const mobileSrc = path.resolve(__dirname, '..', 'apps', 'mobile', 'src');

function findTsxFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findTsxFiles(mobileSrc);
let fixed = 0;

for (const file of files) {
  const buf = fs.readFileSync(file);
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    fs.writeFileSync(file, buf.slice(3));
    console.log(`Removed BOM: ${path.relative(mobileSrc, file)}`);
    fixed++;
  }
}

console.log(`\nTotal BOM removed: ${fixed}`);
