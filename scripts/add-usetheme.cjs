const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'apps', 'mobile', 'src');
const DRY_RUN = process.argv.includes('--dry-run');

function findFiles(dir, ext, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      findFiles(full, ext, results);
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

function addUseThemeCall(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('useTheme') || !content.includes('createStyles')) return null;
  if (content.includes('const { colors } = useTheme()') || content.includes('const { colors, isDark } = useTheme()')) return null;

  const original = content;
  const needsIsDark = content.includes('isDark ?') || content.includes('barStyle={isDark');

  const funcPatterns = [
    /export\s+default\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/,
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/,
    /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/,
    /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\(/,
  ];

  for (const pat of funcPatterns) {
    const match = content.match(pat);
    if (!match) continue;

    const funcName = match[1];
    if (funcName === 'useTheme' || funcName === 'createStyles') continue;

    const funcStart = content.indexOf(match[0]) + match[0].length;

    const useThemeLine = needsIsDark
      ? '\n    const { colors, isDark } = useTheme();'
      : '\n    const { colors } = useTheme();';

    let insertPos = funcStart;
    while (insertPos < content.length && content[insertPos] === '\n') insertPos++;

    content = content.substring(0, funcStart) + useThemeLine + content.substring(funcStart);
    break;
  }

  if (content === original) return null;
  return content;
}

const files = findFiles(ROOT, '.tsx');
let migrated = 0, skipped = 0;

for (const file of files) {
  try {
    const result = addUseThemeCall(file);
    if (!result) { skipped++; continue; }
    if (DRY_RUN) {
      console.log(`[DRY] ${path.relative(ROOT, file)}`);
    } else {
      fs.writeFileSync(file, result, 'utf8');
      console.log(`OK: ${path.relative(ROOT, file)}`);
    }
    migrated++;
  } catch (err) {
    console.error(`ERR: ${path.relative(ROOT, file)}: ${err.message}`);
  }
}
console.log(`\n${migrated} migrated, ${skipped} skipped`);
