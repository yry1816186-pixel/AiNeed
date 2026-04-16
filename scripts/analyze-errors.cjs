const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'tsc-output.txt');
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

const ts2307Errors = lines.filter(l => l.includes('TS2307'));
const ts2305Errors = lines.filter(l => l.includes('TS2305'));

console.log(`TS2307: ${ts2307Errors.length}, TS2305: ${ts2305Errors.length}`);

const modulePaths = ts2307Errors.map(l => {
  const m = l.match(/Cannot find module '([^']+)'/);
  return m ? m[1] : null;
}).filter(Boolean);

const uniqueModules = [...new Set(modulePaths)];
console.log(`\nUnique missing modules (${uniqueModules.length}):`);
uniqueModules.sort().forEach(m => console.log(`  ${m}`));
