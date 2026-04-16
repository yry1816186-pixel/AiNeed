const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'apps', 'mobile', 'src');
const DRY_RUN = process.argv.includes('--dry-run');
const TARGET = process.argv.find(a => a.startsWith('--target='))?.split('=')[1];

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

function getRelPath(filePath, targetDir) {
  const fileDir = path.dirname(filePath);
  let rel = path.relative(fileDir, path.join(ROOT, targetDir)).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.match(/import.*\btheme\b.*from.*design-system\/theme/)) return null;
  if (filePath.includes('design-system/theme/index')) return null;
  if (filePath.includes('design-system/ui/PaperThemeProvider')) return null;
  if (filePath.includes('shared/contexts/ThemeContext')) return null;

  const original = content;
  const themeImportRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]*design-system\/theme)['"];?/;
  const m = content.match(themeImportRe);
  if (!m) return null;

  const imports = m[1].split(',').map(s => s.trim()).filter(Boolean);
  const hasTheme = imports.includes('theme');
  const others = imports.filter(i => i !== 'theme');

  const ctxPath = getRelPath(filePath, 'shared/contexts/ThemeContext');
  const newCtxImport = `import { useTheme, createStyles } from '${ctxPath}';`;

  if (others.length > 0) {
    const themePath = getRelPath(filePath, 'design-system/theme');
    const otherImport = `import { ${others.join(', ')} } from '${themePath}';`;
    content = content.replace(m[0], otherImport + '\n' + newCtxImport);
  } else {
    content = content.replace(m[0], newCtxImport);
  }

  content = content.replace(/theme\.colors\./g, 'colors.');
  content = content.replace(/backgroundColor:\s*["']#FFFFFF["']/g, 'backgroundColor: colors.surface');
  content = content.replace(/backgroundColor:\s*["']#FFF5F0["']/g, 'backgroundColor: colors.cartLight');
  content = content.replace(/backgroundColor:\s*["']#FFF8F5["']/g, 'backgroundColor: colors.subtleBg');
  content = content.replace(/backgroundColor:\s*["']#FFF0F0["']/g, 'backgroundColor: colors.subtleBg');
  content = content.replace(/backgroundColor:\s*["']#FFF5F5["']/g, 'backgroundColor: colors.subtleBg');
  content = content.replace(/backgroundColor:\s*["']#FFF8F8["']/g, 'backgroundColor: colors.backgroundSecondary');
  content = content.replace(/barStyle="dark-content"/g, 'barStyle={isDark ? "light-content" : "dark-content"}');
  content = content.replace(/barStyle="light-content"/g, 'barStyle={isDark ? "light-content" : "dark-content"}');

  if (content === original) return null;
  return content;
}

const files = findFiles(ROOT, '.tsx');
let migrated = 0, skipped = 0;

for (const file of files) {
  try {
    const result = migrateFile(file);
    if (!result) { skipped++; continue; }
    const rel = path.relative(ROOT, file);
    if (DRY_RUN) {
      console.log(`[DRY] ${rel}`);
    } else {
      fs.writeFileSync(file, result, 'utf8');
      console.log(`OK: ${rel}`);
    }
    migrated++;
  } catch (err) {
    console.error(`ERR: ${path.relative(ROOT, file)}: ${err.message}`);
  }
}
console.log(`\n${migrated} migrated, ${skipped} skipped`);
