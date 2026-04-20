const fs = require('fs');
const path = require('path');

const ROOT = 'C:/AiNeed/apps/mobile/src';

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

  const useStylesMatch = content.match(/const\s+(\w+)\s*=\s*createStyles\s*\(/);
  if (!useStylesMatch) return null;

  const useStylesVarName = useStylesMatch[1];
  const stylesVarName = useStylesVarName === 'useStyles' ? 'styles' :
    useStylesVarName.startsWith('use') ?
      useStylesVarName.charAt(2).toLowerCase() + useStylesVarName.slice(3) :
      'styles';

  const alreadyHasCall = content.includes(`const ${stylesVarName} = ${useStylesVarName}(colors)`) ||
    content.includes(`const ${stylesVarName} = ${useStylesVarName}(colors);`);
  if (alreadyHasCall) return null;

  const allExportedFunctions = [];
  const funcRe = /(?:export\s+(?:default\s+)?)?(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*(?::\s*[^=]+)?=\s*(?:\([^)]*\)|\{[^}]*\})\s*=>\s*\{)/g;
  let m;
  while ((m = funcRe.exec(content)) !== null) {
    const name = m[1] || m[2];
    if (name && !['useTheme', 'createStyles', 'buildFlatColors', useStylesVarName].includes(name)) {
      allExportedFunctions.push({ name, index: m.index, fullMatch: m[0] });
    }
  }

  for (const func of allExportedFunctions) {
    const funcStart = content.indexOf(func.fullMatch) + func.fullMatch.length;

    const hasUseTheme = content.substring(funcStart, funcStart + 500).includes('useTheme()');
    const useThemeLine = hasUseTheme ? '' : '\n  const { colors } = useTheme();';
    const useStylesLine = `\n  const ${stylesVarName} = ${useStylesVarName}(colors);`;

    content = content.substring(0, funcStart) + useThemeLine + useStylesLine + content.substring(funcStart);
    break;
  }

  if (content === original) return null;
  return content;
}

const files = findFiles(ROOT, '.tsx');
let fixed = 0;

for (const file of files) {
  try {
    const result = fixFile(file);
    if (!result) continue;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, result, 'utf8');
    try { fs.renameSync(tmp, file); } catch (e) {
      fs.unlinkSync(tmp);
      fs.writeFileSync(file, result, 'utf8');
    }
    fixed++;
    console.log(`Fixed: ${path.relative(ROOT, file)}`);
  } catch (err) {
    console.error(`ERR: ${path.relative(ROOT, file)}: ${err.message}`);
  }
}
console.log(`${fixed} files fixed`);
