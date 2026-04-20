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

  const lines = content.split('\n');
  const newLines = [];
  let modified = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const funcMatch = line.match(/^(export\s+)?(function|const)\s+([A-Z]\w+)\s*[=<(]/);
    if (funcMatch) {
      const componentName = funcMatch[3];
      const isExport = !!funcMatch[1];
      const declType = funcMatch[2];

      let fullDecl = line;
      let j = i + 1;
      let braceDepth = 0;
      let foundBodyOpen = false;

      for (let k = 0; k < line.length; k++) {
        if (line[k] === '(') braceDepth++;
        else if (line[k] === ')') braceDepth--;
      }

      while (j < lines.length && !foundBodyOpen) {
        fullDecl += '\n' + lines[j];
        for (let k = 0; k < lines[j].length; k++) {
          if (lines[j][k] === '(') braceDepth++;
          else if (lines[j][k] === ')') braceDepth--;
        }

        const bodyOpenMatch = lines[j].match(/\)\s*(?::\s*[^{]+)?\{/);
        if (bodyOpenMatch && braceDepth <= 0) {
          foundBodyOpen = true;
        }
        j++;
      }

      if (!foundBodyOpen) {
        newLines.push(line);
        i++;
        continue;
      }

      const bodyStartLine = j - 1;
      const bodyContent = content.substring(
        content.indexOf('{', content.split('\n').slice(0, bodyStartLine + 1).join('\n').length - lines[bodyStartLine].length) + 1
      );

      const nextComponentIdx = findNextComponent(lines, j);
      const componentEnd = nextComponentIdx > 0 ? nextComponentIdx : lines.length;
      const componentBody = lines.slice(j, componentEnd).join('\n');

      const hasUseThemeCall = /\buseTheme\s*\(\s*\)/.test(componentBody);
      const hasStylesCall = /const\s+styles\s*=\s*useStyles\s*\(\s*colors\s*\)/.test(componentBody);
      const usesStyles = /\bstyles\.\w+/.test(componentBody);
      const usesColors = /\bcolors\.\w+/.test(componentBody);

      if (!usesStyles && !usesColors) {
        newLines.push(line);
        i++;
        continue;
      }

      if (hasUseThemeCall && (hasStylesCall || !usesStyles)) {
        newLines.push(line);
        i++;
        continue;
      }

      for (let k = i; k < j; k++) {
        newLines.push(lines[k]);
      }

      if (!hasUseThemeCall) {
        newLines.push('  const { colors } = useTheme();');
        modified = true;
      }
      if (!hasStylesCall && usesStyles) {
        newLines.push('  const styles = useStyles(colors);');
        modified = true;
      }

      i = j;
      continue;
    }

    newLines.push(line);
    i++;
  }

  if (modified) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    return true;
  }
  return false;
}

function findNextComponent(lines, startIdx) {
  for (let i = startIdx; i < lines.length; i++) {
    const match = lines[i].match(/^(export\s+)?(function|const)\s+([A-Z]\w+)\s*[=<(]/);
    if (match) return i;
    if (lines[i].match(/^const\s+useStyles\s*=\s*createStyles/)) return i;
  }
  return -1;
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
