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

  if (!content.includes('createStyles')) return { fixed: false, count: 0 };

  const useStylesDefMatch = content.match(/const\s+useStyles\s*=\s*createStyles/);
  if (!useStylesDefMatch) return { fixed: false, count: 0 };

  const componentRegex = /((?:export\s+)?(?:const|function)\s+)([A-Z]\w+)((?:\s*[=:]\s*(?:React\.FC|memo|forwardRef)[\s\S]*?)?(?:\s*\{))/g;

  let match;
  const insertions = [];

  while ((match = componentRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const componentName = match[2];
    const matchEnd = match.index + match[0].length;

    if (componentName === 'useStyles' || componentName === 'useS') continue;

    const nextComponentOrStyles = content.indexOf('\nconst useStyles', match.index);
    const nextExport = content.indexOf('\nexport default', match.index);
    let searchLimit = content.length;
    if (nextComponentOrStyles > 0) searchLimit = Math.min(searchLimit, nextComponentOrStyles);
    if (nextExport > 0) searchLimit = Math.min(searchLimit, nextExport);

    const componentBody = content.substring(matchEnd, searchLimit);

    const hasUseThemeCall = /\buseTheme\s*\(\s*\)/.test(componentBody);
    const hasStylesCall = /const\s+styles\s*=\s*useStyles\s*\(\s*colors\s*\)/.test(componentBody);
    const usesStyles = /\bstyles\.\w+/.test(componentBody);
    const usesColors = /\bcolors\.\w+/.test(componentBody);

    if (!usesStyles && !usesColors) continue;
    if (hasUseThemeCall && (hasStylesCall || !usesStyles)) continue;

    const lastBrace = fullMatch.lastIndexOf('{');
    if (lastBrace === -1) continue;

    const insertPos = match.index + lastBrace + 1;
    const afterInsert = content.substring(insertPos, insertPos + 20).trimStart();
    if (afterInsert.startsWith('const { colors }') || afterInsert.startsWith('const styles')) continue;

    let insertion = '';
    if (!hasUseThemeCall) {
      insertion += '\n  const { colors } = useTheme();';
    }
    if (!hasStylesCall && usesStyles) {
      insertion += '\n  const styles = useStyles(colors);';
    }

    if (insertion) {
      insertions.push({ pos: insertPos, text: insertion, component: componentName });
    }
  }

  if (insertions.length === 0) return { fixed: false, count: 0 };

  insertions.sort((a, b) => b.pos - a.pos);

  for (const ins of insertions) {
    content = content.substring(0, ins.pos) + ins.text + content.substring(ins.pos);
  }

  if (content !== orig) {
    fs.writeFileSync(filePath, content, 'utf8');
    return { fixed: true, count: insertions.length, components: insertions.map(i => i.component) };
  }
  return { fixed: false, count: 0 };
}

const files = findTsxFiles(mobileSrc);
let totalFixed = 0;
let totalInsertions = 0;

for (const file of files) {
  try {
    const result = fixFile(file);
    if (result.fixed) {
      console.log(`Fixed ${path.relative(mobileSrc, file)}: ${result.components.join(', ')}`);
      totalFixed++;
      totalInsertions += result.count;
    }
  } catch (e) {
    console.error(`Error in ${path.relative(mobileSrc, file)}: ${e.message}`);
  }
}

console.log(`\nTotal files fixed: ${totalFixed}`);
console.log(`Total insertions: ${totalInsertions}`);
