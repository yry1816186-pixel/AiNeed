const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) {
        files.push(...walk(p));
      } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        files.push(p);
      }
    });
  } catch {}
  return files;
}

let fixed = 0;
walk('src').forEach(f => {
  if (f.includes('node_modules')) return;
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  
  // Fix lines where a string starts with " and ends with ' (or vice versa)
  // Pattern: "something' or 'something" inside JSX/style objects
  const lines = c.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Fix patterns like: "center' -> "center"
    lines[i] = lines[i].replace(/"([^"\n]*)'/g, (match, p1) => {
      // Only fix if it looks like a mismatched quote pair
      if (p1.includes("'")) return match; // has internal single quotes, skip
      return `"${p1}"`;
    });
    // Fix patterns like: 'something" -> 'something'
    lines[i] = lines[i].replace(/'([^'\n]*)"/g, (match, p1) => {
      if (p1.includes('"')) return match; // has internal double quotes, skip
      return `'${p1}'`;
    });
  }
  c = lines.join('\n');
  
  if (c !== orig) {
    fs.writeFileSync(f, c);
    fixed++;
    console.log('Fixed:', f);
  }
});
console.log('Total fixed:', fixed);
