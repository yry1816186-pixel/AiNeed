const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'apps', 'mobile', 'src');

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

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const rel = path.relative(ROOT, filePath);

  if (rel.includes('shared/contexts/ThemeContext.tsx')) return null;
  if (rel.includes('design-system/theme/')) return null;
  if (rel.includes('design-system/primitives/')) return null;

  const hasDesignTokensColors = content.includes('DesignTokens.colors.');
  const hasStyleSheetCreate = content.includes('StyleSheet.create');
  const alreadyHasCreateStyles = content.includes('createStyles');

  if (!hasDesignTokensColors) return null;
  if (alreadyHasCreateStyles) {
    content = content.replace(/DesignTokens\.colors\.neutral\.white/g, 'colors.surface');
    content = content.replace(/DesignTokens\.colors\.brand\.terracottaLight/g, 'colors.primaryLight');
    content = content.replace(/DesignTokens\.colors\.brand\.terracottaDark/g, 'colors.primaryDark');
    content = content.replace(/DesignTokens\.colors\.brand\.terracotta/g, 'colors.primary');
    content = content.replace(/DesignTokens\.colors\.brand\.sage/g, 'colors.secondary');
    content = content.replace(/DesignTokens\.colors\.brand\.sageLight/g, 'colors.secondary');
    content = content.replace(/DesignTokens\.colors\.brand\.sageDark/g, 'colors.secondary');
    content = content.replace(/DesignTokens\.colors\.brand\.slateLight/g, 'colors.neutral[300]');
    content = content.replace(/DesignTokens\.colors\.brand\.slateDark/g, 'colors.neutral[700]');
    content = content.replace(/DesignTokens\.colors\.brand\.slate/g, 'colors.neutral[500]');
    content = content.replace(/DesignTokens\.colors\.brand\.camel/g, 'colors.primary');
    content = content.replace(/DesignTokens\.colors\.brand\.camelLight/g, 'colors.primaryLight');
    content = content.replace(/DesignTokens\.colors\.brand\.camelDark/g, 'colors.primaryDark');
    content = content.replace(/DesignTokens\.colors\.text\.primary/g, 'colors.textPrimary');
    content = content.replace(/DesignTokens\.colors\.text\.secondary/g, 'colors.textSecondary');
    content = content.replace(/DesignTokens\.colors\.text\.tertiary/g, 'colors.textTertiary');
    content = content.replace(/DesignTokens\.colors\.text\.inverse/g, 'colors.textInverse');
    content = content.replace(/DesignTokens\.colors\.text\.brand/g, 'colors.textBrand');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.primary/g, 'colors.surface');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.secondary/g, 'colors.backgroundSecondary');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.tertiary/g, 'colors.backgroundTertiary');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.elevated/g, 'colors.surfaceElevated');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.overlay/g, 'colors.overlay');
    content = content.replace(/DesignTokens\.colors\.borders\.default/g, 'colors.border');
    content = content.replace(/DesignTokens\.colors\.borders\.light/g, 'colors.borderLight');
    content = content.replace(/DesignTokens\.colors\.borders\.strong/g, 'colors.borderStrong');
    content = content.replace(/DesignTokens\.colors\.borders\.brand/g, 'colors.borderBrand');
    content = content.replace(/DesignTokens\.colors\.semantic\.error/g, 'colors.error');
    content = content.replace(/DesignTokens\.colors\.semantic\.errorLight/g, 'colors.errorLight');
    content = content.replace(/DesignTokens\.colors\.semantic\.success/g, 'colors.success');
    content = content.replace(/DesignTokens\.colors\.semantic\.successLight/g, 'colors.successLight');
    content = content.replace(/DesignTokens\.colors\.semantic\.warning/g, 'colors.warning');
    content = content.replace(/DesignTokens\.colors\.semantic\.warningLight/g, 'colors.warningLight');
    content = content.replace(/DesignTokens\.colors\.semantic\.info/g, 'colors.info');
    content = content.replace(/DesignTokens\.colors\.semantic\.infoLight/g, 'colors.infoLight');
    content = content.replace(/DesignTokens\.colors\.neutral\.black/g, 'colors.neutral[900]');
    if (content === original) return null;
    return content;
  }

  if (hasStyleSheetCreate && hasDesignTokensColors) {
    const ssMatch = content.match(/const\s+(\w+)\s*=\s*StyleSheet\.create\s*\(\s*\{/);
    if (!ssMatch) return null;
    const stylesVarName = ssMatch[1];
    const useStylesVarName = stylesVarName === 'styles' ? 'useStyles' : `use${stylesVarName.charAt(0).toUpperCase() + stylesVarName.slice(1)}`;

    const ctxPath = getRelPath(filePath, 'shared/contexts/ThemeContext');
    if (!content.includes('useTheme')) {
      const lastImportIndex = content.lastIndexOf("import ");
      if (lastImportIndex === -1) return null;
      const lineEnd = content.indexOf('\n', lastImportIndex);
      content = content.substring(0, lineEnd + 1) + `import { useTheme, createStyles } from '${ctxPath}';\n` + content.substring(lineEnd + 1);
    } else {
      content = content.replace(
        /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*shared\/contexts\/ThemeContext['"];?/,
        (match, imports) => {
          const items = imports.split(',').map(s => s.trim()).filter(Boolean);
          if (!items.includes('createStyles')) items.push('createStyles');
          return `import { ${items.join(', ')} } from '${ctxPath}';`;
        }
      );
    }

    content = content.replace(
      `const ${stylesVarName} = StyleSheet.create({`,
      `const ${useStylesVarName} = createStyles((colors) => ({`
    );

    const stylesStart = content.indexOf(`const ${useStylesVarName}`);
    const lastBrace = findMatchingBrace(content, stylesStart);
    if (lastBrace !== -1) {
      const before = content.substring(0, lastBrace);
      const after = content.substring(lastBrace);
      content = before + '}))' + after.replace(/^\}\);/, '');
    }

    content = content.replace(/DesignTokens\.colors\.neutral\.white/g, 'colors.surface');
    content = content.replace(/DesignTokens\.colors\.brand\.terracottaLight/g, 'colors.primaryLight');
    content = content.replace(/DesignTokens\.colors\.brand\.terracottaDark/g, 'colors.primaryDark');
    content = content.replace(/DesignTokens\.colors\.brand\.terracotta/g, 'colors.primary');
    content = content.replace(/DesignTokens\.colors\.brand\.sage/g, 'colors.secondary');
    content = content.replace(/DesignTokens\.colors\.brand\.sageLight/g, 'colors.secondary');
    content = content.replace(/DesignTokens\.colors\.brand\.sageDark/g, 'colors.secondary');
    content = content.replace(/DesignTokens\.colors\.brand\.slateLight/g, 'colors.neutral[300]');
    content = content.replace(/DesignTokens\.colors\.brand\.slateDark/g, 'colors.neutral[700]');
    content = content.replace(/DesignTokens\.colors\.brand\.slate/g, 'colors.neutral[500]');
    content = content.replace(/DesignTokens\.colors\.brand\.camel/g, 'colors.primary');
    content = content.replace(/DesignTokens\.colors\.brand\.camelLight/g, 'colors.primaryLight');
    content = content.replace(/DesignTokens\.colors\.brand\.camelDark/g, 'colors.primaryDark');
    content = content.replace(/DesignTokens\.colors\.text\.primary/g, 'colors.textPrimary');
    content = content.replace(/DesignTokens\.colors\.text\.secondary/g, 'colors.textSecondary');
    content = content.replace(/DesignTokens\.colors\.text\.tertiary/g, 'colors.textTertiary');
    content = content.replace(/DesignTokens\.colors\.text\.inverse/g, 'colors.textInverse');
    content = content.replace(/DesignTokens\.colors\.text\.brand/g, 'colors.textBrand');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.primary/g, 'colors.surface');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.secondary/g, 'colors.backgroundSecondary');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.tertiary/g, 'colors.backgroundTertiary');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.elevated/g, 'colors.surfaceElevated');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.overlay/g, 'colors.overlay');
    content = content.replace(/DesignTokens\.colors\.borders\.default/g, 'colors.border');
    content = content.replace(/DesignTokens\.colors\.borders\.light/g, 'colors.borderLight');
    content = content.replace(/DesignTokens\.colors\.borders\.strong/g, 'colors.borderStrong');
    content = content.replace(/DesignTokens\.colors\.borders\.brand/g, 'colors.borderBrand');
    content = content.replace(/DesignTokens\.colors\.semantic\.error/g, 'colors.error');
    content = content.replace(/DesignTokens\.colors\.semantic\.errorLight/g, 'colors.errorLight');
    content = content.replace(/DesignTokens\.colors\.semantic\.success/g, 'colors.success');
    content = content.replace(/DesignTokens\.colors\.semantic\.successLight/g, 'colors.successLight');
    content = content.replace(/DesignTokens\.colors\.semantic\.warning/g, 'colors.warning');
    content = content.replace(/DesignTokens\.colors\.semantic\.warningLight/g, 'colors.warningLight');
    content = content.replace(/DesignTokens\.colors\.semantic\.info/g, 'colors.info');
    content = content.replace(/DesignTokens\.colors\.semantic\.infoLight/g, 'colors.infoLight');
    content = content.replace(/DesignTokens\.colors\.neutral\.black/g, 'colors.neutral[900]');

    const componentPatterns = [
      /(export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*\{)/,
      /(export\s+const\s+\w+\s*:\s*React\.FC[^=]*=\s*\(\s*(?:\{[^}]*\})?\s*\)\s*=>\s*\{)/,
      /(export\s+const\s+\w+\s*=\s*\(\s*(?:\{[^}]*\})?\s*\)\s*=>\s*\{)/,
    ];

    for (const pat of componentPatterns) {
      const match = content.match(pat);
      if (!match) continue;
      const funcName = match[1].match(/(\w+)\s*[\(:]/);
      if (funcName && ['useTheme', 'createStyles', 'buildFlatColors', useStylesVarName].includes(funcName[1])) continue;

      const funcStart = content.indexOf(match[0]) + match[0].length;
      const hasUseTheme = content.substring(funcStart, funcStart + 300).includes('useTheme()');
      const useThemeLine = hasUseTheme ? '' : '\n  const { colors } = useTheme();';
      const useStylesLine = `\n  const ${stylesVarName} = ${useStylesVarName}(colors);`;

      content = content.substring(0, funcStart) + useThemeLine + useStylesLine + content.substring(funcStart);
      break;
    }
  } else if (hasDesignTokensColors) {
    const ctxPath = getRelPath(filePath, 'shared/contexts/ThemeContext');
    if (!content.includes('useTheme')) {
      const lastImportIndex = content.lastIndexOf("import ");
      if (lastImportIndex === -1) return null;
      const lineEnd = content.indexOf('\n', lastImportIndex);
      content = content.substring(0, lineEnd + 1) + `import { useTheme } from '${ctxPath}';\n` + content.substring(lineEnd + 1);
    }

    content = content.replace(/DesignTokens\.colors\.neutral\.white/g, 'colors.surface');
    content = content.replace(/DesignTokens\.colors\.brand\.terracottaLight/g, 'colors.primaryLight');
    content = content.replace(/DesignTokens\.colors\.brand\.terracottaDark/g, 'colors.primaryDark');
    content = content.replace(/DesignTokens\.colors\.brand\.terracotta/g, 'colors.primary');
    content = content.replace(/DesignTokens\.colors\.brand\.sage/g, 'colors.secondary');
    content = content.replace(/DesignTokens\.colors\.brand\.sageLight/g, 'colors.secondary');
    content = content.replace(/DesignTokens\.colors\.brand\.sageDark/g, 'colors.secondary');
    content = content.replace(/DesignTokens\.colors\.brand\.slateLight/g, 'colors.neutral[300]');
    content = content.replace(/DesignTokens\.colors\.brand\.slateDark/g, 'colors.neutral[700]');
    content = content.replace(/DesignTokens\.colors\.brand\.slate/g, 'colors.neutral[500]');
    content = content.replace(/DesignTokens\.colors\.brand\.camel/g, 'colors.primary');
    content = content.replace(/DesignTokens\.colors\.brand\.camelLight/g, 'colors.primaryLight');
    content = content.replace(/DesignTokens\.colors\.brand\.camelDark/g, 'colors.primaryDark');
    content = content.replace(/DesignTokens\.colors\.text\.primary/g, 'colors.textPrimary');
    content = content.replace(/DesignTokens\.colors\.text\.secondary/g, 'colors.textSecondary');
    content = content.replace(/DesignTokens\.colors\.text\.tertiary/g, 'colors.textTertiary');
    content = content.replace(/DesignTokens\.colors\.text\.inverse/g, 'colors.textInverse');
    content = content.replace(/DesignTokens\.colors\.text\.brand/g, 'colors.textBrand');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.primary/g, 'colors.surface');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.secondary/g, 'colors.backgroundSecondary');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.tertiary/g, 'colors.backgroundTertiary');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.elevated/g, 'colors.surfaceElevated');
    content = content.replace(/DesignTokens\.colors\.backgrounds\.overlay/g, 'colors.overlay');
    content = content.replace(/DesignTokens\.colors\.borders\.default/g, 'colors.border');
    content = content.replace(/DesignTokens\.colors\.borders\.light/g, 'colors.borderLight');
    content = content.replace(/DesignTokens\.colors\.borders\.strong/g, 'colors.borderStrong');
    content = content.replace(/DesignTokens\.colors\.borders\.brand/g, 'colors.borderBrand');
    content = content.replace(/DesignTokens\.colors\.semantic\.error/g, 'colors.error');
    content = content.replace(/DesignTokens\.colors\.semantic\.errorLight/g, 'colors.errorLight');
    content = content.replace(/DesignTokens\.colors\.semantic\.success/g, 'colors.success');
    content = content.replace(/DesignTokens\.colors\.semantic\.successLight/g, 'colors.successLight');
    content = content.replace(/DesignTokens\.colors\.semantic\.warning/g, 'colors.warning');
    content = content.replace(/DesignTokens\.colors\.semantic\.warningLight/g, 'colors.warningLight');
    content = content.replace(/DesignTokens\.colors\.semantic\.info/g, 'colors.info');
    content = content.replace(/DesignTokens\.colors\.semantic\.infoLight/g, 'colors.infoLight');
    content = content.replace(/DesignTokens\.colors\.neutral\.black/g, 'colors.neutral[900]');

    const componentPatterns = [
      /(export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*\{)/,
      /(export\s+const\s+\w+\s*:\s*React\.FC[^=]*=\s*\(\s*(?:\{[^}]*\})?\s*\)\s*=>\s*\{)/,
      /(export\s+const\s+\w+\s*=\s*\(\s*(?:\{[^}]*\})?\s*\)\s*=>\s*\{)/,
    ];

    for (const pat of componentPatterns) {
      const match = content.match(pat);
      if (!match) continue;
      const funcName = match[1].match(/(\w+)\s*[\(:]/);
      if (funcName && ['useTheme', 'createStyles', 'buildFlatColors'].includes(funcName[1])) continue;

      const funcStart = content.indexOf(match[0]) + match[0].length;
      const hasUseTheme = content.substring(funcStart, funcStart + 300).includes('useTheme()');
      if (hasUseTheme) continue;

      const useThemeLine = '\n  const { colors } = useTheme();';
      content = content.substring(0, funcStart) + useThemeLine + content.substring(funcStart);
      break;
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

const files = findFiles(ROOT, '.tsx');
let fixed = 0;

for (const file of files) {
  try {
    const result = fixFile(file);
    if (!result) continue;
    const tmpFile = file + '.tmp';
    fs.writeFileSync(tmpFile, result, 'utf8');
    try { fs.renameSync(tmpFile, file); } catch (e) {
      fs.unlinkSync(tmpFile);
      fs.writeFileSync(file, result, 'utf8');
    }
    fixed++;
  } catch (err) {
    console.error(`ERR: ${path.relative(ROOT, file)}: ${err.message}`);
  }
}
console.log(`${fixed} files fixed`);
