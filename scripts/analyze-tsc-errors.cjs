const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const tscBin = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

let output;
try {
  output = execSync(`node "${tscBin}" --noEmit --project apps/mobile/tsconfig.json 2>&1`, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (e) {
  output = e.stdout || e.stderr || e.message;
}

const lines = output.split('\n').filter(l => l.includes('error TS'));
console.log(`Total error lines: ${lines.length}`);

const byCode = {};
const byFile = {};
const byName = {};

for (const line of lines) {
  const codeMatch = line.match(/error TS(\d+)/);
  const fileMatch = line.match(/^([^(]+)/);
  const nameMatch = line.match(/Cannot find name '(\w+)'/);

  if (codeMatch) {
    byCode[codeMatch[1]] = (byCode[codeMatch[1]] || 0) + 1;
  }
  if (fileMatch) {
    const f = fileMatch[1].trim().replace(/\\/g, '/');
    byFile[f] = (byFile[f] || 0) + 1;
  }
  if (nameMatch) {
    byName[nameMatch[1]] = (byName[nameMatch[1]] || 0) + 1;
  }
}

console.log('\n=== By Error Code ===');
Object.entries(byCode)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`  TS${k}: ${v}`));

console.log('\n=== By Undefined Name ===');
Object.entries(byName)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log('\n=== Top 30 Files by Error Count ===');
Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([k, v]) => console.log(`  ${v} ${k}`));
