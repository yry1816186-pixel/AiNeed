const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory() && !p.includes('node_modules') && !p.includes('features')) {
        files.push(...walk(p));
      } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        files.push(p);
      }
    });
  } catch {}
  return files;
}

let fixed = 0;
walk('src').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  
  // Fix pattern: import {\nimport { colors } from '...';\n  ...rest of imports
  // This happens when fix-colors-import.js inserted import { colors } inside an existing import
  c = c.replace(/import \{\nimport \{ colors \} from '[^']+';\n/g, "import { colors } from '../../theme';\nimport {\n");
  
  // Fix pattern: , colors} from '...'; (colors appended to existing import with comma)
  // This is actually valid if the import is from the same module
  
  // Fix pattern: } from '...';\nimport { colors } - duplicate, remove the standalone
  // Actually this is fine
  
  // Fix pattern where import { colors } was inserted mid-import
  // Pattern: "  SomeImport,\nimport { colors } from '../../theme';\n  OtherImport,"
  // Should be: "  SomeImport,\n  OtherImport,"
  // with import { colors } at the top
  
  const lines = c.split('\n');
  let inImport = false;
  let importStart = -1;
  let newLines = [];
  let colorsImportAdded = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect start of multi-line import
    if (line.match(/^import \{$/) && !inImport) {
      inImport = true;
      importStart = i;
      newLines.push(line);
      continue;
    }
    
    // If we're inside an import and find a nested import { colors }
    if (inImport && line.match(/^import \{ colors \} from/)) {
      // Skip this line - it's a broken insertion
      colorsImportAdded = true;
      continue;
    }
    
    // Detect end of import
    if (inImport && line.match(/^\} from/)) {
      inImport = false;
      newLines.push(line);
      // Add the colors import after if needed
      if (colorsImportAdded) {
        newLines.push("import { colors } from '../../theme';");
        colorsImportAdded = false;
      }
      continue;
    }
    
    newLines.push(line);
  }
  
  c = newLines.join('\n');
  
  if (c !== orig) {
    fs.writeFileSync(f, c);
    fixed++;
    console.log('Fixed:', f);
  }
});
console.log('Total fixed:', fixed);
