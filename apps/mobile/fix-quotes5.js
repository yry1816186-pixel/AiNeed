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
  
  // Fix specific mismatched quote patterns in style objects and JSX
  // "something' -> "something" (when the content has no internal quotes)
  c = c.replace(/"([a-zA-Z0-9_\-\s]+)'/g, '"$1"');
  // 'something" -> 'something' (when the content has no internal quotes)
  c = c.replace(/'([a-zA-Z0-9_\-\s]+)"/g, "'$1'");
  
  if (c !== orig) {
    fs.writeFileSync(f, c);
    fixed++;
    console.log('Fixed:', f);
  }
});
console.log('Total fixed:', fixed);
