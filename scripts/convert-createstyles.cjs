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

  if (!content.includes('StyleSheet.create')) return null;

  const ssMatch = content.match(/const\s+(\w+)\s*=\s*StyleSheet\.create\s*\(\s*\{/);
  if (!ssMatch) return null;

  const stylesVarName = ssMatch[1];

  if (!content.includes('colors.')) return null;

  if (content.includes('createStyles')) return null;

  const ctxPath = getRelPath(filePath, 'shared/contexts/ThemeContext');
  if (!content.includes('useTheme')) {
    const lastImportIndex = content.lastIndexOf("import ");
    if (lastImportIndex === -1) return null;
    const lineEnd = content.indexOf('\n', lastImportIndex);
    content = content.substring(0, lineEnd + 1) + `import { useTheme, createStyles } from '${ctxPath}';\n` + content.substring(lineEnd + 1);
  } else if (!content.includes('createStyles')) {
    content = content.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*shared\/contexts\/ThemeContext['"];?/,
      (match, imports) => {
        const items = imports.split(',').map(s => s.trim()).filter(Boolean);
        if (!items.includes('createStyles')) items.push('createStyles');
        return `import { ${items.join(', ')} } from '${ctxPath}';`;
      }
    );
  }

  const useStylesVarName = stylesVarName === 'styles' ? 'useStyles' : `use${stylesVarName.charAt(0).toUpperCase() + stylesVarName.slice(1)}`;

  content = content.replace(
    `const ${stylesVarName} = StyleSheet.create({`,
    `const ${useStylesVarName} = createStyles((colors) => ({`
  );

  const lastStylesBrace = findLastBrace(content, content.indexOf(`const ${useStylesVarName}`));
  if (lastStylesBrace !== -1) {
    const before = content.substring(0, lastStylesBrace);
    const after = content.substring(lastStylesBrace);
    content = before + '}))' + after.replace(/^\}\);/, '');
  }

  const componentPatterns = [
    /(export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*\{)/,
    /(export\s+const\s+\w+\s*:\s*React\.FC[^=]*=\s*\(\s*(?:\{[^}]*\})?\s*\)\s*=>\s*\{)/,
    /(export\s+const\s+\w+\s*=\s*\(\s*\)\s*=>\s*\{)/,
  ];

  for (const pat of componentPatterns) {
    const match = content.match(pat);
    if (!match) continue;
    const funcName = match[1].match(/(\w+)\s*[\(:]/);
    if (funcName && ['useTheme', 'createStyles', 'buildFlatColors', useStylesVarName].includes(funcName[1])) continue;

    const funcStart = content.indexOf(match[0]) + match[0].length;

    const hasUseTheme = content.substring(funcStart, funcStart + 200).includes('useTheme()');
    const useThemeLine = hasUseTheme ? '' : '\n  const { colors } = useTheme();';
    const useStylesLine = `\n  const ${stylesVarName} = ${useStylesVarName}(colors);`;

    let insertPos = funcStart;
    while (insertPos < content.length && content[insertPos] === '\n') insertPos++;

    content = content.substring(0, funcStart) + useThemeLine + useStylesLine + content.substring(funcStart);
    break;
  }

  if (content === original) return null;
  return content;
}

function findLastBrace(content, startPos) {
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
    if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
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
console.log(`${fixed} files converted to createStyles`);
