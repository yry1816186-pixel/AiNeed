const fs = require('fs');
const path = require('path');

const srcRoot = path.join(__dirname, 'src');
let totalFixed = 0;
const details = [];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix pattern: "import {\n  specifier,\nimport {\n  specifier,"
  // Should be: "import {\n  specifier,\n  specifier,"
  // The pattern is: a line ending with comma, followed by "import {" on next line
  content = content.replace(/,\nimport \{\n/g, ',\n');

  // Also fix: "import React, {\n  createContext,\nimport {\n  useContext"
  // After first pass: "import React, {\n  createContext,\n  useContext"
  // This should already be correct after the first replacement

  // Fix pattern: "(argument,\nimport {\n" in function calls
  content = content.replace(/,\nimport \{\n/g, ',\n');

  // Fix pattern: "extra.ENABLE_UNVERIFIED_MOBILE_DEMOS,\nimport {\n"
  content = content.replace(/,\nimport \{\n/g, ',\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
    details.push(path.relative(__dirname, filePath));
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(ts|tsx)$/.test(entry.name) && !/\.cts$/.test(entry.name)) continue;
    fixFile(full);
  }
}

walk(srcRoot);
console.log(`Fixed ${totalFixed} files with broken import patterns:`);
details.forEach(d => console.log(`  ${d}`));
