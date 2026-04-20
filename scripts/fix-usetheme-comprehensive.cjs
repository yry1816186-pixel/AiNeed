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

  if (!content.includes('colors.')) return null;

  if (content.includes("const { colors } = useTheme()") || content.includes("const { colors, isDark } = useTheme()")) return null;

  if (!content.includes('useTheme') && !content.includes('createStyles')) {
    const ctxPath = getRelPath(filePath, 'shared/contexts/ThemeContext');
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex === -1) return null;
    const lineEnd = content.indexOf('\n', lastImportIndex);
    content = content.substring(0, lineEnd + 1) + `import { useTheme } from '${ctxPath}';\n` + content.substring(lineEnd + 1);
  }

  const funcPatterns = [
    /(export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*\{)/g,
    /(export\s+const\s+\w+\s*:\s*React\.FC[^=]*=\s*\(\s*\)\s*=>\s*\{)/g,
    /(const\s+\w+\s*=\s*\(\s*\)\s*=>\s*\{)/g,
  ];

  let added = false;
  for (const pat of funcPatterns) {
    const match = pat.exec(content);
    if (!match) continue;
    const funcName = match[1].match(/(\w+)\s*[\(:]/);
    if (funcName && ['useTheme', 'createStyles', 'buildFlatColors'].includes(funcName[1])) continue;

    const insertPos = match.index + match[0].length;
    const needsIsDark = content.includes('isDark ?') || content.includes('isDark;');
    const useThemeLine = needsIsDark
      ? `\n  const { colors, isDark } = useTheme();`
      : `\n  const { colors } = useTheme();`;

    content = content.substring(0, insertPos) + useThemeLine + content.substring(insertPos);
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
