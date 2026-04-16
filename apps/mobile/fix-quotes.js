const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      files.push(...walk(p));
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      files.push(p);
    }
  });
  return files;
}

let fixed = 0;
walk('src/features').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  c = c.replace(/from '([^']*)"/g, "from '$1'");
  if (c !== orig) {
    fs.writeFileSync(f, c);
    fixed++;
    console.log('Fixed:', f);
  }
});
console.log('Total fixed:', fixed);
