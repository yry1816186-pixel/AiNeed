const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'apps', 'mobile', 'src');
const DRY_RUN = process.argv.includes('--dry-run');

function findFiles(dir, pattern, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      findFiles(full, pattern, results);
    } else if (pattern.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function getRelativeImportPath(filePath, targetDir) {
  const fileDir = path.dirname(filePath);
  let rel = path.relative(fileDir, path.join(ROOT, targetDir)).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  if (!content.includes("from '") && !content.includes('from "')) return null;
  if (!content.match(/import.*\btheme\b.*from.*design-system\/theme/)) return null;

  if (content.includes('design-system/theme/index') || content.includes('design-system/theme/index.ts')) {
    return null;
  }

  const hasThemeColors = content.includes('theme.colors');
  const hasStyleSheetCreate = content.includes('StyleSheet.create');
  const hasStatusBarHardcode = content.includes('barStyle="dark-content"') || content.includes('barStyle="light-content"');
  const hasHardcodedWhite = content.includes('"#FFFFFF"');

  const themeImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]*design-system\/theme['"];?/);
  if (!themeImportMatch) return null;

  const importedItems = themeImportMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  const needsThemeValue = importedItems.includes('theme');
  const otherImports = importedItems.filter(i => i !== 'theme');

  const themeContextPath = getRelativeImportPath(filePath, 'shared/contexts/ThemeContext');

  let newThemeContextImport = `import { useTheme, createStyles`;
  if (otherImports.length > 0) {
  }
  newThemeContextImport += ` } from '${themeContextPath}';`;

  if (otherImports.length > 0) {
    const designThemePath = getRelativeImportPath(filePath, 'design-system/theme');
    const otherImportLine = `import { ${otherImports.join(', ')} } from '${designThemePath}';`;
    content = content.replace(themeImportMatch[0], otherImportLine + '\n' + newThemeContextImport);
  } else {
    content = content.replace(themeImportMatch[0], newThemeContextImport);
  }

  content = content.replace(/theme\.colors\./g, 'colors.');

  if (hasStatusBarHardcode) {
    content = content.replace(/barStyle="dark-content"/g, 'barStyle={isDark ? "light-content" : "dark-content"}');
    content = content.replace(/barStyle="light-content"/g, 'barStyle={isDark ? "light-content" : "dark-content"}');
  }

  if (hasHardcodedWhite) {
    content = content.replace(/backgroundColor:\s*["']#FFFFFF["']/g, 'backgroundColor: colors.surface');
    content = content.replace(/backgroundColor:\s*["']#FFF5F0["']/g, 'backgroundColor: colors.cartLight');
    content = content.replace(/backgroundColor:\s*["']#FFF8F5["']/g, 'backgroundColor: colors.subtleBg');
    content = content.replace(/backgroundColor:\s*["']#FFF0F0["']/g, 'backgroundColor: colors.subtleBg');
    content = content.replace(/backgroundColor:\s*["']#FFF5F5["']/g, 'backgroundColor: colors.subtleBg');
    content = content.replace(/backgroundColor:\s*["']#FFF8F8["']/g, 'backgroundColor: colors.backgroundSecondary');
  }

  if (hasStyleSheetCreate && needsThemeValue) {
    const stylesMatch = content.match(/(?:const|let)\s+(\w+)\s*=\s*StyleSheet\.create\s*\(\s*\{/);
    if (stylesMatch) {
      const stylesVarName = stylesMatch[1];
      const useStylesVarName = stylesVarName === 'styles' ? 'useStyles' : `use${stylesVarName.charAt(0).toUpperCase() + stylesVarName.slice(1)}`;

      content = content.replace(
        stylesMatch[0],
        `const ${useStylesVarName} = createStyles((colors) => ({`
      );

      const lastBraceIndex = findMatchingBrace(content, content.indexOf(`const ${useStylesVarName}`));
      if (lastBraceIndex !== -1) {
        const beforeClosing = content.substring(0, lastBraceIndex);
        const afterClosing = content.substring(lastBraceIndex);
        content = beforeClosing + '}))' + afterClosing.replace(/^\}\);/, ''); 
      }

      const componentMatch = content.match(/(?:export\s+default\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/);
      if (componentMatch) {
        const funcStart = content.indexOf(componentMatch[0]) + componentMatch[0].length;
        const needIsDark = hasStatusBarHardcode;
        const useThemeLine = needIsDark
          ? `\n  const { colors, isDark } = useTheme();`
          : `\n  const { colors } = useTheme();`;
        const useStylesLine = `\n  const ${stylesVarName} = ${useStylesVarName}(colors);`;

        const insertPos = findFirstStatementPos(content, funcStart);
        if (insertPos !== -1) {
          content = content.substring(0, insertPos) + useThemeLine + useStylesLine + content.substring(insertPos);
        }
      }
    }
  } else if (needsThemeValue) {
    const componentMatch = content.match(/(?:export\s+default\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/);
    if (componentMatch) {
      const funcStart = content.indexOf(componentMatch[0]) + componentMatch[0].length;
      const needIsDark = hasStatusBarHardcode;
      const useThemeLine = needIsDark
        ? `\n  const { colors, isDark } = useTheme();`
        : `\n  const { colors } = useTheme();`;

      const insertPos = findFirstStatementPos(content, funcStart);
      if (insertPos !== -1) {
        content = content.substring(0, insertPos) + useThemeLine + content.substring(insertPos);
      }
    }
  }

  if (content === original) return null;
  return content;
}

function findMatchingBrace(content, startPos) {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let i = startPos;
  while (i < content.length) {
    const ch = content[i];
    if (inString) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === stringChar) inString = false;
      i++; continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = true; stringChar = ch; i++; continue; }
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

function findFirstStatementPos(content, funcBodyStart) {
  let i = funcBodyStart;
  while (i < content.length && /\s/.test(content[i])) i++;
  return i;
}

const files = findFiles(ROOT, /\.tsx?$/);
let migrated = 0;
let skipped = 0;
let errors = 0;

for (const file of files) {
  try {
    const result = migrateFile(file);
    if (result === null) {
      skipped++;
      continue;
    }
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would migrate: ${path.relative(ROOT, file)}`);
    } else {
      fs.writeFileSync(file, result, 'utf8');
      console.log(`Migrated: ${path.relative(ROOT, file)}`);
    }
    migrated++;
  } catch (err) {
    console.error(`Error processing ${path.relative(ROOT, file)}: ${err.message}`);
    errors++;
  }
}

console.log(`\nDone: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
