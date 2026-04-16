const fs = require('fs');
const path = require('path');

const srcRoot = path.join(__dirname, 'src');
let totalFixed = 0;
const details = [];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const relPath = path.relative(srcRoot, filePath);

  // Fix 1: Add missing DesignTokens import in design-system files
  if (content.includes('DesignTokens') && !content.includes("import { DesignTokens }") && !content.includes("import { DesignTokens,")) {
    const depth = relPath.split(path.sep).length - 1;
    const prefix = '../'.repeat(depth);
    const designTokensPath = prefix + 'design-system/theme/tokens/design-tokens';

    // Find the last import line and add after it
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^import\s+/)) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, `import { DesignTokens } from '${designTokensPath}';`);
      content = lines.join('\n');
    }
  }

  // Fix 2: Add missing Colors import in design-system files
  if (content.includes('Colors.') && !content.includes("import { Colors") && !content.includes("Colors } from") && !content.includes("Colors,")) {
    if (relPath.includes('design-system')) {
      const depth = relPath.split(path.sep).length - 1;
      const prefix = '../'.repeat(depth);
      const colorsPath = prefix + 'design-system/theme';

      const lines = content.split('\n');
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^import\s+/)) lastImportIdx = i;
      }
      if (lastImportIdx >= 0) {
        lines.splice(lastImportIdx + 1, 0, `import { Colors } from '${colorsPath}';`);
        content = lines.join('\n');
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
    details.push(relPath);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    fixFile(full);
  }
}

walk(path.join(srcRoot, 'design-system'));
console.log(`Fixed ${totalFixed} design-system files with missing imports:`);
details.forEach(d => console.log(`  ${d}`));
