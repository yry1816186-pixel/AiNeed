const fs = require('fs');
const path = require('path');

const srcRoot = path.join(__dirname, 'src');
let totalFixed = 0;

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const hasColorsUsage = /\bcolors\./.test(content) || /\bcolors\[/.test(content);
  const hasColorsDecl = /const\s*\{\s*colors\s*\}|\bcolors\s*=/.test(content);

  if (!hasColorsUsage || hasColorsDecl) return;

  const hasUseThemeImport = /import.*useTheme.*from/.test(content);
  const hasDesignTokensImport = /import.*DesignTokens.*from/.test(content);

  if (hasUseThemeImport) {
    const componentMatch = content.match(/export\s+(?:const|function)\s+(\w+)/);
    if (!componentMatch) return;

    const componentName = componentMatch[1];
    const componentStart = content.indexOf(componentMatch[0]);

    const beforeComponent = content.substring(0, componentStart);
    const afterComponentStart = content.substring(componentStart);

    const returnMatch = afterComponentStart.match(/return\s*\(/);
    if (!returnMatch) return;

    const insertPos = componentStart + afterComponentStart.indexOf(returnMatch.index);

    const lines = content.split('\n');
    let componentLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(componentMatch[0])) {
        componentLineIdx = i;
        break;
      }
    }

    if (componentLineIdx === -1) return;

    let insertIdx = componentLineIdx + 1;
    while (insertIdx < lines.length && !lines[insertIdx].includes('return')) {
      insertIdx++;
    }

    const indent = '  ';
    lines.splice(insertIdx, 0, `${indent}const { colors } = useTheme();`);
    content = lines.join('\n');
  } else if (hasDesignTokensImport) {
    content = content.replace(
      /colors\./g,
      'DesignTokens.colors.'
    );
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
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

walk(path.join(srcRoot, 'features'));
walk(path.join(srcRoot, 'design-system'));
walk(path.join(srcRoot, 'shared'));

console.log(`Fixed ${totalFixed} files with missing colors variable`);
