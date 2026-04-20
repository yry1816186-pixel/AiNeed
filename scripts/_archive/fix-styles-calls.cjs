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

  const hasUseStyles = content.match(/const\s+(\w+)\s*=\s*createStyles\s*\(/);
  if (!hasUseStyles) return null;

  const useStylesVarName = hasUseStyles[1];
  const stylesVarName = useStylesVarName === 'useStyles' ? 'styles' :
    useStylesVarName.startsWith('use') ?
      useStylesVarName.charAt(2).toLowerCase() + useStylesVarName.slice(3) :
      'styles';

  const alreadyHasStylesCall = content.includes(`const ${stylesVarName} = ${useStylesVarName}(colors)`) ||
    content.includes(`const ${stylesVarName} = ${useStylesVarName}(colors);`);
  if (alreadyHasStylesCall) return null;

  const componentPatterns = [
    /(export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*\{)/g,
    /(export\s+const\s+\w+\s*:\s*React\.FC[^=]*=\s*\(\s*(?:\{[^}]*\})?\s*\)\s*=>\s*\{)/g,
    /(export\s+const\s+\w+\s*=\s*\(\s*(?:\{[^}]*\})?\s*\)\s*=>\s*\{)/g,
  ];

  let added = false;
  for (const pat of componentPatterns) {
    pat.lastIndex = 0;
    const match = pat.exec(content);
    if (!match) continue;

    const funcName = match[1].match(/(\w+)\s*[\(:]/);
    if (funcName && ['useTheme', 'createStyles', 'buildFlatColors', useStylesVarName].includes(funcName[1])) continue;

    const funcStart = content.indexOf(match[0]) + match[0].length;

    const hasUseTheme = content.substring(funcStart, funcStart + 300).includes('useTheme()');
    const useThemeLine = hasUseTheme ? '' : '\n  const { colors } = useTheme();';
    const useStylesLine = `\n  const ${stylesVarName} = ${useStylesVarName}(colors);`;

    content = content.substring(0, funcStart) + useThemeLine + useStylesLine + content.substring(funcStart);
    added = true;
    break;
  }

  if (!added) return null;
  if (content === original) return null;
  return content;
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
