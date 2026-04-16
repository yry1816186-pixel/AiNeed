const fs = require('fs');
const path = require('path');

// Read one file to test the regex
const testFile = path.join(__dirname, 'src/features/auth/screens/LoginScreen.tsx');
const content = fs.readFileSync(testFile, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < Math.min(30, lines.length); i++) {
  const line = lines[i];
  // Check for mismatched quotes in from statements
  const hasFromSingleOpenDoubleClose = /from\s+'[^'\n]*"/.test(line);
  const hasFromSingleOpenSingleClose = /from\s+'[^'\n]*'/.test(line);
  
  if (hasFromSingleOpenDoubleClose) {
    console.log(`Line ${i+1}: MISMATCHED (single-open, double-close)`);
    console.log(`  Content: ${line}`);
    console.log(`  hasFromSingleOpenDoubleClose: ${hasFromSingleOpenDoubleClose}`);
    console.log(`  hasFromSingleOpenSingleClose: ${hasFromSingleOpenSingleClose}`);
    console.log(`  Should fix: ${hasFromSingleOpenDoubleClose && !hasFromSingleOpenSingleClose}`);
    
    // Try the replacement
    const fixed = line.replace(
      /(from\s+)'([^'\n]*)"(\s*;?\s*$)/,
      (m, fromKw, p, end) => `${fromKw}'${p}'${end}`
    );
    console.log(`  Fixed: ${fixed}`);
    console.log(`  Changed: ${line !== fixed}`);
  }
}
