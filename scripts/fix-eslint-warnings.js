/**
 * Ultra-Safe ESLint no-unused-vars Fix Script v4 (FINAL)
 *
 * ONLY fixes these 100% safe cases:
 * 1. Unused function parameters - prefix with _
 * 2. Unused destructured ARRAY elements - prefix with _
 *
 * Everything else is handled via ESLint config adjustments.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const eslintJsonPath = 'C:/AiNeed/eslint-current2.json';

console.log('Running ESLint to get current warnings...');
try {
  execSync(
    'node C:/AiNeed/node_modules/eslint/bin/eslint.js "{src,test}/**/*.ts" -f json -o ' + eslintJsonPath,
    { cwd: 'C:/AiNeed/apps/backend', stdio: 'pipe' }
  );
} catch (e) { /* expected */ }

const data = JSON.parse(fs.readFileSync(eslintJsonPath, 'utf8'));

const fileWarnings = {};
for (const fileResult of data) {
  const filePath = fileResult.filePath;
  const warnings = fileResult.messages.filter(
    (msg) => msg.ruleId === '@typescript-eslint/no-unused-vars'
  );
  if (warnings.length > 0) {
    fileWarnings[filePath] = warnings;
  }
}

let totalFixed = 0;
let filesModified = 0;

for (const [filePath, warnings] of Object.entries(fileWarnings)) {
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;

  const sortedWarnings = [...warnings].sort((a, b) => {
    if (b.line !== a.line) return b.line - a.line;
    return b.column - a.column;
  });

  for (const warning of sortedWarnings) {
    const lineIdx = warning.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) continue;

    const line = lines[lineIdx];
    const varNameMatch = warning.message.match(/'([^']+)'/);
    if (!varNameMatch) continue;
    const varName = varNameMatch[1];
    const col = warning.column - 1;

    // Only fix: unused function parameters and unused array destructuring elements
    const isUnusedArg = warning.message.includes('Allowed unused args must match');
    const isUnusedArrayElement = warning.message.includes('Allowed unused elements of array destructuring must match');

    if (isUnusedArg || isUnusedArrayElement) {
      const beforeVar = line.substring(0, col);
      const fromVar = line.substring(col);
      if (fromVar.startsWith(varName) && !varName.startsWith('_')) {
        lines[lineIdx] = beforeVar + '_' + varName + fromVar.substring(varName.length);
        modified = true;
        totalFixed++;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    filesModified++;
    console.log(`Fixed: ${path.relative('C:\\AiNeed\\apps\\backend', filePath)}`);
  }
}

console.log(`\nTotal fixes applied: ${totalFixed}`);
console.log(`Files modified: ${filesModified}`);
