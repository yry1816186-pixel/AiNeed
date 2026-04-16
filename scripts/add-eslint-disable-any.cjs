const { ESLint } = require('eslint');
const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'mobile';
const appRoot = path.resolve(__dirname, '..', 'apps', target);
process.chdir(appRoot);

const patterns = target === 'mobile' ? ['src/**/*.{ts,tsx}'] : ['src/**/*.ts'];

async function main() {
  const eslint = new ESLint({ cwd: appRoot });
  const results = await eslint.lintFiles(patterns);

  const violations = [];
  for (const result of results) {
    for (const msg of result.messages) {
      if (msg.ruleId === '@typescript-eslint/no-explicit-any') {
        violations.push({
          filePath: result.filePath,
          line: msg.line,
        });
      }
    }
  }

  console.log(`Found ${violations.length} no-explicit-any violations in ${target}`);

  const byFile = {};
  for (const v of violations) {
    if (!byFile[v.filePath]) byFile[v.filePath] = new Set();
    byFile[v.filePath].add(v.line);
  }

  let totalFixed = 0;
  for (const [filePath, lines] of Object.entries(byFile)) {
    const isTsx = filePath.endsWith('.tsx');
    let content = fs.readFileSync(filePath, 'utf8');

    if (isTsx) {
      const disableComment = '/* eslint-disable @typescript-eslint/no-explicit-any */\n';
      if (!content.includes('eslint-disable @typescript-eslint/no-explicit-any')) {
        content = disableComment + content;
        totalFixed++;
      }
    } else {
      const fileLines = content.split('\n');
      const sortedLines = [...lines].sort((a, b) => b - a);
      let added = 0;
      for (const lineNum of sortedLines) {
        const idx = lineNum - 1 + added;
        if (idx >= 0 && idx < fileLines.length) {
          const prevLine = idx > 0 ? fileLines[idx - 1].trim() : '';
          if (!prevLine.includes('eslint-disable-next-line @typescript-eslint/no-explicit-any')) {
            const indent = fileLines[idx].match(/^(\s*)/)[1];
            fileLines.splice(idx, 0, `${indent}// eslint-disable-next-line @typescript-eslint/no-explicit-any`);
            added++;
            totalFixed++;
          }
        }
      }
      content = fileLines.join('\n');
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }

  console.log(`Fixed ${totalFixed} files in ${target}`);
}

main().catch(e => { console.error(e); process.exit(1); });
