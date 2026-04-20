const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

try {
  const result = execSync(
    'node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit',
    { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  fs.writeFileSync(path.join(root, 'tsc-backend-full.txt'), result, 'utf8');
} catch (err) {
  const output = (err.stdout || '') + '\n' + (err.stderr || '');
  fs.writeFileSync(path.join(root, 'tsc-backend-full.txt'), output, 'utf8');
}

const content = fs.readFileSync(path.join(root, 'tsc-backend-full.txt'), 'utf8');
const matches = [...content.matchAll(/error TS(\d+)/g)];
const groups = {};
for (const m of matches) {
  const code = m[1];
  groups[code] = (groups[code] || 0) + 1;
}
console.log(`Total: ${matches.length}`);
Object.entries(groups)
  .sort((a, b) => b[1] - a[1])
  .forEach(([code, count]) => console.log(`TS${code}: ${count}`));
