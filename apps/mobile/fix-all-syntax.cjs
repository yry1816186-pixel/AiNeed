const fs = require('fs');
const path = require('path');

const srcRoot = path.join(__dirname, 'src');
let totalFixed = 0;
const details = [];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix 1: Remove stray "import { Colors } from '...';" lines that break import blocks
  // Pattern: a line with just "import {" followed by a Colors import, inside another import block
  content = content.replace(/\nimport \{ Colors \} from ['"][^'"]*['"];?\n/g, '\n');

  // Fix 2: Fix mismatched quotes in from/import statements
  // from 'path" -> from 'path'
  content = content.replace(
    /(from\s+)'([^'\n]*)"(\s*;?\s*$)/gm,
    (m, fromKw, p, end) => `${fromKw}'${p}'${end}`
  );
  // from "path' -> from "path"
  content = content.replace(
    /(from\s+)"([^"\n]*)'(\s*;?\s*$)/gm,
    (m, fromKw, p, end) => `${fromKw}"${p}"${end}`
  );

  // Fix 3: Fix broken Chinese characters (mojibake) in JSX
  // Pattern: "中文</Tag>" where the closing tag is on the same line but the quote is missing
  content = content.replace(
    /([^\x00-\x7F]+)<\/(\w+)>/g,
    (m, text, tag) => {
      if (text.endsWith('"') || text.endsWith("'")) return m;
      return `${text}</${tag}>`;
    }
  );

  // Fix 4: Fix specific mojibake patterns
  content = content.replace(/请稍后重�?\)/g, '请稍后重试")');
  content = content.replace(/营业执照�?\/Text>/g, '营业执照号</Text>');
  content = content.replace(/联系�?\/Text>/g, '联系人</Text>');
  content = content.replace(/手机�?\/Text>/g, '手机号</Text>');
  content = content.replace(/申请审核�?\/Text>/g, '申请审核中</Text>');
  content = content.replace(/完成审�?\/Text>/g, '完成审核</Text>');

  // Fix 5: Fix renderStatusTimeline arrow function with useTheme inside
  content = content.replace(
    /const renderStatusTimeline = \(\) => \(\s*\n\s*const \{ colors \} = useTheme\(\);/g,
    'const renderStatusTimeline = () => {\n    const { colors } = useTheme();\n    return ('
  );

  // Fix 6: Fix closing of renderStatusTimeline
  // After fix 5, the function needs }; instead of );
  // This is handled per-file below

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

walk(srcRoot);
console.log(`Fixed ${totalFixed} files:`);
details.forEach(d => console.log(`  ${d}`));
