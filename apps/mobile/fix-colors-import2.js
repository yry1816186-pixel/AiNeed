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
  
  const usesColors = /\bcolors\.\w+/.test(c);
  const importsColors = /import\s+\{[^}]*\bcolors\b[^}]*\}\s+from/.test(c);
  const hasColorsConst = /const\s+colors\s*=/.test(c);
  const usesTheme = /\btheme\.\w+/.test(c);
  const importsTheme = /import\s+\{[^}]*\btheme\b[^}]*\}\s+from/.test(c);
  
  if (usesColors && !importsColors && !hasColorsConst) {
    const relFromSrc = path.relative('src', path.dirname(f));
    const depth = relFromSrc.split(path.sep).filter(Boolean).length;
    const prefix = '../'.repeat(depth);
    
    const themeImportMatch = c.match(/import\s+\{([^}]+)\}\s+from\s+['"](\.\.\/)+theme['"]/);
    if (themeImportMatch) {
      const existingImports = themeImportMatch[1];
      if (!existingImports.includes('colors')) {
        c = c.replace(
          themeImportMatch[0],
          themeImportMatch[0].replace(/\{([^}]+)\}/, `{$1, colors}`)
        );
      }
    } else {
      const lastImportIndex = c.lastIndexOf('\nimport ');
      if (lastImportIndex !== -1) {
        const lineEnd = c.indexOf('\n', lastImportIndex + 1);
        const importLine = `\nimport { colors } from '${prefix}theme';`;
        c = c.slice(0, lineEnd) + importLine + c.slice(lineEnd);
      }
    }
  }
  
  if (c !== orig) {
    fs.writeFileSync(f, c);
    fixed++;
    console.log('Fixed:', f);
  }
});
console.log('Total fixed:', fixed);
