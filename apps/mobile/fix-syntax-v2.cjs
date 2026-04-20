const fs = require('fs');
const path = require('path');

const srcRoot = path.join(__dirname, 'src');
let totalFixed = 0;
const details = [];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const lines = content.split('\n');
  const fixedLines = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];

    // Fix 1: Remove stray "import { Colors } from '...';" lines that break import blocks
    // These are standalone lines that appear inside other import blocks
    if (/^import \{ Colors \} from ['"][^'"]*['"];?\s*$/.test(line.trim())) {
      // Check if the previous line is part of an import block (ends with comma or has import keyword)
      const prevLine = fixedLines.length > 0 ? fixedLines[fixedLines.length - 1] : '';
      if (prevLine.trim().endsWith(',') || prevLine.match(/import\s+\{/)) {
        // This is a stray Colors import inside another import block - skip it
        i++;
        continue;
      }
    }

    // Fix 2: Fix mismatched quotes in from/import statements
    // from 'path" -> from 'path'
    if (/from\s+'[^'\n]*"/.test(line) && !/from\s+'[^'\n]*'/.test(line)) {
      line = line.replace(
        /(from\s+)'([^'\n]*)"(\s*;?\s*$)/,
        (m, fromKw, p, end) => `${fromKw}'${p}'${end}`
      );
    }
    // from "path' -> from "path"
    if (/from\s+"[^"\n]*'/.test(line) && !/from\s+"[^"\n]*"/.test(line)) {
      line = line.replace(
        /(from\s+)"([^"\n]*)'(\s*;?\s*$)/,
        (m, fromKw, p, end) => `${fromKw}"${p}"${end}`
      );
    }

    // Fix 3: Fix broken Chinese characters (mojibake) in JSX text content
    line = line.replace(/请稍后重�?\)/g, '请稍后重试")');
    line = line.replace(/营业执照�?\/Text>/g, '营业执照号</Text>');
    line = line.replace(/联系�?\/Text>/g, '联系人</Text>');
    line = line.replace(/手机�?\/Text>/g, '手机号</Text>');
    line = line.replace(/申请审核�?\/Text>/g, '申请审核中</Text>');
    line = line.replace(/完成审�?\/Text>/g, '完成审核</Text>');

    // Fix 4: Fix renderStatusTimeline arrow function pattern
    // () => ( followed by const { colors } = useTheme(); should be () => { const... return (
    if (/const renderStatusTimeline = \(\) => \(\s*$/.test(line.trim())) {
      line = line.replace(/\(\)\s*=>\s*\(/, '() => {');
      // The next line should have const { colors } = useTheme();
      fixedLines.push(line);
      i++;
      if (i < lines.length && lines[i].includes('const { colors } = useTheme()')) {
        fixedLines.push(lines[i]);
        i++;
        // Add return (
        fixedLines.push(line.match(/^(\s*)/)[0] + '  return (');
      }
      continue;
    }

    fixedLines.push(line);
    i++;
  }

  content = fixedLines.join('\n');
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
    details.push(path.relative(srcRoot, filePath));
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    fixFile(full);
  }
}

walk(path.join(srcRoot, 'features'));
walk(path.join(srcRoot, 'design-system'));
walk(path.join(srcRoot, 'shared'));
walk(path.join(srcRoot, 'navigation'));

console.log(`Fixed ${totalFixed} files:`);
details.forEach(d => console.log(`  ${d}`));
