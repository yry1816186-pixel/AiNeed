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
  
  // Fix mismatched quotes: opening single, closing double
  c = c.replace(/from '([^']*)"/g, "from '$1'");
  // Fix mismatched quotes: opening double, closing single
  c = c.replace(/from "([^"]*)'/g, "from \"$1\"");
  // Fix import type with mismatched quotes
  c = c.replace(/import type \{[^}]*\} from '([^']*)"/g, (m, p1) => m.replace(/"$/, "'"));
  // Fix any line ending with ';" that should be ';
  c = c.replace(/'([^'\n]*)";/g, "'$1';");
  // Fix any line ending with "'; that should be ";
  c = c.replace(/"([^"\n]*)';/g, "\"$1\";");
  
  if (c !== orig) {
    fs.writeFileSync(f, c);
    fixed++;
    console.log('Fixed:', f);
  }
});
console.log('Total fixed:', fixed);
