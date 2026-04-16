const { execSync } = require('child_process');
const output = execSync('node C:\\AiNeed\\node_modules\\typescript\\bin\\tsc --noEmit', {
  cwd: __dirname,
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe']
}).toString();

const lines = output.split('\n').filter(l => l.includes('error TS'));
const fileCounts = {};
for (const line of lines) {
  const match = line.match(/^(src\/[^(]+)/);
  if (match) {
    const file = match[1].trim();
    fileCounts[file] = (fileCounts[file] || 0) + 1;
  }
}

const sorted = Object.entries(fileCounts).sort((a, b) => b[1] - a[1]);
console.log('Total TS errors:', lines.length);
console.log('\nTop 15 files by error count:');
for (const [file, count] of sorted.slice(0, 15)) {
  console.log(`  ${count}  ${file}`);
}
