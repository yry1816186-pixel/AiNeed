const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'tsc-output.txt');
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

const ts2307Errors = lines.filter(l => l.includes('TS2307'));
const ts2305Errors = lines.filter(l => l.includes('TS2305'));
const ts2724Errors = lines.filter(l => l.includes('TS2724'));

console.log(`Total lines: ${lines.length}`);
console.log(`TS2307 (module not found): ${ts2307Errors.length}`);
console.log(`TS2305 (missing export): ${ts2305Errors.length}`);
console.log(`TS2724 (wrong name): ${ts2724Errors.length}`);

fs.writeFileSync(path.join(__dirname, 'ts2307-detailed.txt'), ts2307Errors.join('\n'));

const modulePaths = ts2307Errors.map(l => {
  const m = l.match(/Cannot find module '([^']+)'/);
  return m ? m[1] : null;
}).filter(Boolean);

const uniqueModules = [...new Set(modulePaths)];
console.log(`\nUnique missing modules (${uniqueModules.length}):`);
uniqueModules.sort().forEach(m => console.log(`  ${m}`));

const filesWithErrors = ts2307Errors.map(l => {
  const m = l.match(/^([^(]+)/);
  return m ? m[1].trim() : null;
}).filter(Boolean);
const uniqueFiles = [...new Set(filesWithErrors)];
console.log(`\nFiles with TS2307 (${uniqueFiles.length}):`);
uniqueFiles.sort().forEach(f => console.log(`  ${f}`));
