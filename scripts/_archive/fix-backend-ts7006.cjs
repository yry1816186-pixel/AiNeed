const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendSrc = path.resolve(__dirname, '..', 'apps', 'backend', 'src');

function walkDir(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...walkDir(filePath));
    } else if (file.endsWith('.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = walkDir(backendSrc);
let totalFixed = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('// @ts-nocheck')) continue;
  
  const tscOutput = execSync(
    `node "${path.resolve(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc')}" --noEmit --pretty false 2>&1`,
    { cwd: path.resolve(__dirname, '..', 'apps', 'backend'), encoding: 'utf8', timeout: 60000 }
  );
  
  break;
}

console.log(`Script needs a different approach - use batch processing`);
