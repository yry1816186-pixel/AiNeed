const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(walk(filePath));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const relPath = path.relative(SRC, filePath);

  // Skip design-system theme files
  if (relPath.includes('design-system\\theme') || relPath.includes('design-system/theme')) {
    return false;
  }

  // Fix 1: Replace createStyles with StyleSheet.create for files that have
  // sub-components using `styles` outside of the main component
  // Pattern: const useStyles = createStyles((colors) => ({...}))
  // becomes: const styles = StyleSheet.create({...}) with colors replaced inline
  // This is too complex for a simple script, so we take a different approach:
  // Add `const styles = useStyles(colors);` inside each sub-component that uses styles

  // Fix 2: Missing `colors` import - add it from the theme
  const hasColorsRef = /\bcolors\b/.test(content) && !content.includes('import') || 
    (content.includes('colors.') && !content.includes('import {')?.includes('colors'));
  
  // Check if colors is used but not imported/defined
  const usesColors = /\bcolors\.\w+/.test(content);
  const definesColors = /const colors\s*=|let colors\s*=|import.*colors.*from/.test(content);
  const hasUseTheme = /useTheme|createStyles/.test(content);
  
  if (usesColors && !definesColors && hasUseTheme) {
    // Need to add colors from useTheme
    if (content.includes('useTheme()') && !content.includes('const { colors }')) {
      content = content.replace(
        /const \{([^}]*)\}\s*=\s*useTheme\(\)/,
        (match, existing) => {
          if (existing.includes('colors')) return match;
          return `const { colors, ${existing.trim()} } = useTheme()`;
        }
      );
      changed = true;
    } else if (!content.includes('useTheme()')) {
      // Add useTheme import and call
      if (!content.includes("from '../../shared/contexts/ThemeContext'") && 
          !content.includes("from '../../../shared/contexts/ThemeContext'") &&
          !content.includes("from '../shared/contexts/ThemeContext'")) {
        // Find the right import path based on depth
        const depth = (relPath.match(/\\/g) || []).length;
        const prefix = '../'.repeat(depth + 1);
        const themePath = prefix + 'shared/contexts/ThemeContext';
        content = content.replace(
          /(import [^;]+;\n)/,
          `$1import { useTheme } from '${themePath}';\n`
        );
      }
      // Add const { colors } = useTheme() after the last import
      const lastImportIndex = content.lastIndexOf('import ');
      const endOfImport = content.indexOf('\n', content.indexOf(';', lastImportIndex));
      if (endOfImport > 0) {
        content = content.slice(0, endOfImport + 1) + 
                  'const { colors } = useTheme();\n' + 
                  content.slice(endOfImport + 1);
        changed = true;
      }
    }
  }

  // Fix 3: Fix logger import path
  if (content.includes("from './logger'") && relPath.includes('utils')) {
    content = content.replace("from './logger'", "from '../shared/utils/logger'");
    changed = true;
  }

  // Fix 4: Fix DesignTokens.spacing[11] - doesn't exist, use spacing[10] or spacing[12]
  content = content.replace(/DesignTokens\.spacing\[11\]/g, 'DesignTokens.spacing[12]');
  if (content.includes('DesignTokens.spacing[11]')) {
    // Already replaced above, but check
  }
  if (content.includes('DesignTokens.spacing[11]')) {
    changed = true;
  }

  // Fix 5: Fix isolatedModules export type issue
  if (content.includes("export {\n  ClothingItem,\n  Brand,") || 
      content.includes("export {\r\n  ClothingItem,\r\n  Brand,")) {
    // These are interfaces, need export type
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

const files = walk(SRC);
let fixed = 0;
for (const file of files) {
  try {
    if (fixFile(file)) {
      fixed++;
      console.log('Fixed:', path.relative(SRC, file));
    }
  } catch (e) {
    console.error('Error fixing:', file, e.message);
  }
}
console.log(`\nFixed ${fixed} files`);
