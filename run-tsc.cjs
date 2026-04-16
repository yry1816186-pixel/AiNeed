const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const tscPath = path.join(__dirname, 'node_modules', 'typescript', 'bin', 'tsc');
const backendDir = path.join(__dirname, 'apps', 'backend');

try {
  const result = execSync(`node "${tscPath}" --noEmit --pretty false`, {
    cwd: backendDir,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    timeout: 120000,
  });
  fs.writeFileSync(path.join(__dirname, 'tsc-output.txt'), result || '(no output)');
} catch (err) {
  const output = (err.stdout || '') + (err.stderr || '');
  fs.writeFileSync(path.join(__dirname, 'tsc-output.txt'), output);
  console.log(`Exit code: ${err.status}`);
  console.log(`Output length: ${output.length}`);
}
