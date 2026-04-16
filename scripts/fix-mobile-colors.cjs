const fs = require('fs');
const path = require('path');

const mobileSrc = path.resolve(__dirname, '..', 'apps', 'mobile', 'src');

function walkDir(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...walkDir(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = walkDir(mobileSrc);
let totalFixed = 0;
let totalSkipped = 0;

for (const filePath of files) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    totalSkipped++;
    continue;
  }
  
  let modified = false;
  
  const hasColorsUsage = /\bcolors\./.test(content);
  const hasColorsDefinition = /const colors\b/.test(content) || /let colors\b/.test(content);
  const hasColorsImport = /import.*\bcolors\b.*from/.test(content);
  const hasColorsParam = /\(\{.*colors.*\}\)/.test(content) || /colors\s*:/.test(content);
  
  if (hasColorsUsage && !hasColorsDefinition && !hasColorsImport && !hasColorsParam) {
    content = content.replace(/\bcolors\./g, 'Colors.');
    modified = true;
    
    if (!content.includes("import { Colors }") && !content.includes("import { Colors,")) {
      const lines = content.split('\n');
      const lastImportIdx = lines.findLastIndex(l => l.startsWith('import '));
      
      if (lastImportIdx >= 0) {
        const fileDir = path.dirname(filePath);
        const relToDesignSystem = path.relative(fileDir, path.join(mobileSrc, 'design-system')).replace(/\\/g, '/');
        const prefix = relToDesignSystem.startsWith('.') ? relToDesignSystem : './' + relToDesignSystem;
        lines.splice(lastImportIdx + 1, 0, `import { Colors } from '${prefix}/theme';`);
        content = lines.join('\n');
      }
    }
  }
  
  if (modified) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFixed++;
    } catch (e) {
      totalSkipped++;
    }
  }
}

console.log(`Fixed colors -> Colors in ${totalFixed} files, skipped ${totalSkipped}`);
