const fs = require('fs');
const path = require('path');

const srcRoot = path.join(__dirname, 'src');
let totalFixed = 0;
const details = [];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const lines = content.split('\n');
  const fixedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const relPath = path.relative(__dirname, filePath);

    // Only fix import/from statements with mismatched quotes
    // Pattern: from 'path" -> from 'path'  (single-open, double-close)
    if (/from\s+'[^'\n]*"/.test(line) && !/from\s+'[^'\n]*'/.test(line)) {
      line = line.replace(
        /(from\s+)'([^'\n]*)"(\s*;?\s*$)/,
        (m, fromKw, p, end) => `${fromKw}'${p}'${end}`
      );
    }

    // Pattern: from "path' -> from "path"  (double-open, single-close)
    if (/from\s+"[^"\n]*'/.test(line) && !/from\s+"[^"\n]*"/.test(line)) {
      line = line.replace(
        /(from\s+)"([^"\n]*)'(\s*;?\s*$)/,
        (m, fromKw, p, end) => `${fromKw}"${p}"${end}`
      );
    }

    if (line !== lines[i]) {
      details.push(`  ${relPath}:${i + 1}: fixed`);
    }

    fixedLines.push(line);
  }

  content = fixedLines.join('\n');
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) fixFile(full);
  }
}

walk(path.join(srcRoot, 'features'));
walk(path.join(srcRoot, 'shared'));
walk(path.join(srcRoot, 'design-system'));
walk(path.join(srcRoot, 'navigation'));

console.log(`Fixed ${totalFixed} files with mismatched import quotes`);
details.forEach(d => console.log(d));
