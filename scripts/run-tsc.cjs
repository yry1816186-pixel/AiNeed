const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const tscPath = path.join(__dirname, 'node_modules', 'typescript', 'bin', 'tsc');
const backendDir = path.join(__dirname, 'apps', 'backend');
const outputFile = path.join(__dirname, 'tsc-output.txt');

const result = spawnSync('node', [tscPath, '--noEmit', '--pretty', 'false'], {
  cwd: backendDir,
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
  timeout: 120000
});

const output = (result.stdout || '') + (result.stderr || '');
fs.writeFileSync(outputFile, output || '(empty)');

const lines = output.split('\n');
const errorLines = lines.filter(l => l.includes('error TS'));
const ts2307 = lines.filter(l => l.includes('TS2307'));
const ts2305 = lines.filter(l => l.includes('TS2305'));
const ts7006 = lines.filter(l => l.includes('TS7006'));
const ts2694 = lines.filter(l => l.includes('TS2694'));
const ts2339 = lines.filter(l => l.includes('TS2339'));
const ts2724 = lines.filter(l => l.includes('TS2724'));

console.log(`Total error lines: ${errorLines.length}`);
console.log(`TS2307: ${ts2307.length}, TS2305: ${ts2305.length}, TS7006: ${ts7006.length}`);
console.log(`TS2694: ${ts2694.length}, TS2339: ${ts2339.length}, TS2724: ${ts2724.length}`);
console.log(`Output length: ${output.length} chars`);

if (ts2307.length > 0) {
  console.log('\nTS2307 errors:');
  ts2307.forEach(l => console.log(`  ${l.trim()}`));
}

if (ts2724.length > 0) {
  console.log('\nTS2724 errors:');
  ts2724.forEach(l => console.log(`  ${l.trim()}`));
}
