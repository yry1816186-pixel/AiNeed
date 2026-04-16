const fs = require('fs');
const path = require('path');

const srcRoot = path.join(__dirname, 'src');
const featuresRoot = path.join(srcRoot, 'features');

const importTargets = {};

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    const content = fs.readFileSync(full, 'utf8');
    content.split('\n').forEach(line => {
      const m = line.match(/from\s+['"]([^'"]+)['"]/);
      if (m && m[1].startsWith('.')) {
        const imp = m[1];
        const parts = imp.split('/');
        const upCount = parts.filter(p => p === '..').length;
        const target = parts.slice(upCount).join('/');
        const key = `${upCount}up:${target}`;
        if (!importTargets[key]) importTargets[key] = { count: 0, examples: [] };
        importTargets[key].count++;
        if (importTargets[key].examples.length < 3) {
          importTargets[key].examples.push(path.relative(srcRoot, full) + ': ' + line.trim());
        }
      }
    });
  }
}

walk(featuresRoot);

const sorted = Object.entries(importTargets).sort((a, b) => b[1].count - a[1].count);
console.log('Import patterns in features/ (sorted by frequency):');
sorted.slice(0, 40).forEach(([key, val]) => {
  console.log(`  ${key}: ${val.count}x`);
  val.examples.forEach(ex => console.log(`    ${ex}`));
});
