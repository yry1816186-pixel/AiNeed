const fs = require('fs');
const path = require('path');

const ROOT = 'C:/AiNeed/apps/mobile/src';

const fixes = [
  {
    file: 'shared/contexts/ThemeContext.tsx',
    desc: 'Remove wrong useTheme import from design-system/theme',
    fix: (c) => {
      c = c.replace(/import \{ useTheme[^}]*\} from ['"][^'"]*design-system\/theme['"];?\n?/g, '');
      return c;
    }
  },
  {
    file: 'shared/hooks/useAdvancedAnimations.ts',
    desc: 'Fix useTheme import path',
    fix: (c) => {
      c = c.replace(/import \{ useTheme[^}]*\} from ['"][^'"]*design-system\/theme['"];?/g,
        "import { useTheme } from '../contexts/ThemeContext';");
      return c;
    }
  },
  {
    file: 'stores/__tests__/recommendationFeedStore.test.ts',
    desc: 'Fix useTheme import path',
    fix: (c) => {
      c = c.replace(/import \{ useTheme[^}]*\} from ['"][^'"]*design-system\/theme['"];?/g,
        "import { useTheme } from '../../shared/contexts/ThemeContext';");
      return c;
    }
  },
  {
    file: 'theme/__tests__/compat.test.ts',
    desc: 'Fix useTheme import path',
    fix: (c) => {
      c = c.replace(/import \{ useTheme[^}]*\} from ['"][^'"]*design-system\/theme['"];?/g,
        "import { useTheme } from '../../shared/contexts/ThemeContext';");
      return c;
    }
  },
  {
    file: 'stores/customizationEditorStore.ts',
    desc: 'Remove wrong useTheme import from design-tokens',
    fix: (c) => {
      c = c.replace(/import \{ useTheme[^}]*\} from ['"][^'"]*design-tokens['"];?\n?/g, '');
      return c;
    }
  },
];

for (const { file, desc, fix } of fixes) {
  const fullPath = path.join(ROOT, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;
  content = fix(content);
  if (content !== original) {
    const tmp = fullPath + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    try { fs.renameSync(tmp, fullPath); } catch (e) {
      fs.unlinkSync(tmp);
      fs.writeFileSync(fullPath, content, 'utf8');
    }
    console.log(`Fixed: ${file} (${desc})`);
  } else {
    console.log(`No change: ${file}`);
  }
}

console.log('\n--- Fixing remaining wrong useTheme imports ---');
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

const allFiles = findFiles(ROOT, '.ts');
let fixedCount = 0;
for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  if (content.includes("useTheme") && content.includes("design-system/theme") && !content.includes("shared/contexts/ThemeContext")) {
    const ctxPath = getRelPath(file, 'shared/contexts/ThemeContext');
    content = content.replace(
      /import \{([^}]*)useTheme([^}]*)\} from ['"][^'"]*design-system\/theme['"];?/g,
      (match, before, after) => {
        const items = (before + after).split(',').map(s => s.trim()).filter(s => s && s !== 'useTheme');
        if (items.length > 0) {
          return `import { ${items.join(', ')} } from '${path.relative(path.dirname(file), path.join(ROOT, 'design-system/theme')).replace(/\\/g, '/')}';\nimport { useTheme } from '${ctxPath}';`;
        }
        return `import { useTheme } from '${ctxPath}';`;
      }
    );
  }
  if (content !== original) {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    try { fs.renameSync(tmp, file); } catch (e) {
      fs.unlinkSync(tmp);
      fs.writeFileSync(file, content, 'utf8');
    }
    fixedCount++;
    console.log(`Fixed: ${path.relative(ROOT, file)}`);
  }
}
console.log(`${fixedCount} .ts files fixed`);
