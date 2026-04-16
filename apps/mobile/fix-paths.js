const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory() && !p.includes('node_modules') && !p.includes('features')) {
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
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  
  // Fix: from '../design-system/theme' when it should be '../../design-system/theme'
  // This happens when files are in src/components/subdir/ or src/screens/subdir/
  // Check if file is in a subdirectory (depth >= 2 from src/)
  const relFromSrc = path.relative('src', path.dirname(f));
  const depth = relFromSrc.split(path.sep).length;
  
  if (depth >= 2) {
    // Files in subdirectories need ../../design-system/theme
    c = c.replace(/from ['"]\.\.\/design-system\/theme['"]/g, "from '../../design-system/theme'");
    c = c.replace(/from ['"]\.\.\/design-system\/theme\/tokens\/([^'"]+)['"]/g, "from '../../design-system/theme/tokens/$1'");
  }
  
  if (c !== orig) {
    fs.writeFileSync(f, c);
    fixed++;
    console.log('Fixed:', f);
  }
});
console.log('Total fixed:', fixed);
