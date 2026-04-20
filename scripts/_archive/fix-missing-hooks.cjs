const fs = require('fs');
const path = require('path');

const mobileSrc = path.resolve(__dirname, '..', 'apps', 'mobile', 'src');

function findTsxFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const orig = content;

  if (!content.includes('createStyles')) return false;

  const hasUseStyles = content.includes('const useStyles = createStyles');
  const hasStylesRef = /\bstyles\.\w+/.test(content);
  const hasUseThemeImport = content.includes('useTheme') && content.includes('ThemeContext');

  if (!hasUseStyles || !hasStylesRef) return false;

  const componentPattern = /(?:export\s+(?:const|function)\s+(\w+)|(?:const|function)\s+(\w+))\s*[=<(]/g;
  const components = [];
  let match;
  while ((match = componentPattern.exec(content)) !== null) {
    const name = match[1] || match[2];
    if (!name || name === 'useStyles' || name === 'useS') continue;
    const isReactComponent = /^[A-Z]/.test(name);
    if (!isReactComponent) continue;
    components.push({ name, index: match.index });
  }

  if (components.length === 0) return false;

  let modified = false;

  for (const comp of components) {
    const afterName = content.indexOf('{', comp.index);
    if (afterName === -1) continue;

    const searchStart = afterName + 1;
    const nextComp = components.find(c => c.index > comp.index);
    const searchEnd = nextComp ? nextComp.index : content.indexOf('const useStyles', comp.index);
    const compBody = searchEnd > 0 ? content.substring(searchStart, searchEnd) : content.substring(searchStart);

    const hasUseThemeCall = /\buseTheme\s*\(\s*\)/.test(compBody);
    const hasStylesCall = /\bconst\s+styles\s*=\s*useStyles\s*\(\s*colors\s*\)/.test(compBody);
    const usesStyles = /\bstyles\.\w+/.test(compBody);
    const usesColors = /\bcolors\.\w+/.test(compBody);

    if (!usesStyles && !usesColors) continue;

    if (!hasUseThemeCall || !hasStylesCall) {
      const insertPos = findInsertPosition(content, searchStart);

      let insertion = '';
      if (!hasUseThemeCall) {
        insertion += '  const { colors } = useTheme();\n';
      }
      if (!hasStylesCall && usesStyles) {
        insertion += '  const styles = useStyles(colors);\n';
      }

      if (insertion) {
        content = content.substring(0, insertPos) + insertion + content.substring(insertPos);
        modified = true;
      }
    }
  }

  if (content !== orig) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function findInsertPosition(content, afterBrace) {
  let depth = 0;
  let i = afterBrace;
  for (; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      if (depth === 0) break;
      depth--;
    }
  }

  const bodyStart = afterBrace + 1;
  const firstNonWhitespace = bodyStart + content.substring(bodyStart).search(/\S/);
  return firstNonWhitespace;
}

const files = findTsxFiles(mobileSrc);
let fixed = 0;

for (const file of files) {
  try {
    if (fixFile(file)) {
      console.log(`Fixed: ${path.relative(mobileSrc, file)}`);
      fixed++;
    }
  } catch (e) {
    console.error(`Error in ${path.relative(mobileSrc, file)}: ${e.message}`);
  }
}

console.log(`\nTotal fixed: ${fixed}`);
