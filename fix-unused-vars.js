#!/usr/bin/env node
/**
 * Auto-fix script for @typescript-eslint/no-unused-vars errors.
 * Strategy:
 *   - For unused imports: remove them entirely
 *   - For unused variables/args: prefix with underscore _
 *   - For unused destructured variables: prefix with underscore _
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MOBILE_ROOT = path.join(__dirname, 'apps', 'mobile');

// Run ESLint and get JSON output
console.log('Running ESLint to get unused-vars errors...');
const eslintBin = path.join(__dirname, 'node_modules', 'eslint', 'bin', 'eslint.js');
let eslintOutput;
try {
  eslintOutput = execSync(
    `node "${eslintBin}" "src/**/*.{ts,tsx}" -f json --no-color`,
    { cwd: MOBILE_ROOT, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }
  );
} catch (e) {
  eslintOutput = e.stdout;
}

let results;
try {
  results = JSON.parse(eslintOutput);
} catch (e) {
  console.error('Failed to parse ESLint JSON output. Trying to clean it...');
  // Try to find the JSON array start
  const startIdx = eslintOutput.indexOf('[');
  if (startIdx >= 0) {
    results = JSON.parse(eslintOutput.substring(startIdx));
  } else {
    console.error('Could not find JSON in ESLint output');
    process.exit(1);
  }
}

// Collect all no-unused-vars errors grouped by file
const fileErrors = {};
let totalErrors = 0;

for (const fileResult of results) {
  const { filePath, messages } = fileResult;
  const unusedErrors = messages.filter(m => m.ruleId === '@typescript-eslint/no-unused-vars');
  if (unusedErrors.length > 0) {
    fileErrors[filePath] = unusedErrors;
    totalErrors += unusedErrors.length;
  }
}

console.log(`Found ${totalErrors} no-unused-vars errors in ${Object.keys(fileErrors).length} files`);

// Process each file
let totalFixed = 0;

for (const [filePath, errors] of Object.entries(fileErrors)) {
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Sort errors by line number descending so we can modify from bottom to top
  // without affecting line numbers of earlier errors
  const sortedErrors = [...errors].sort((a, b) => b.line - a.line || b.column - a.column);

  for (const error of sortedErrors) {
    const lineIdx = error.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) continue;

    const line = lines[lineIdx];
    const col = error.column - 1; // 0-based

    // Extract the variable name from the error message
    // Message format: "'varName' is defined but never used..." or "'varName' is assigned a value but never used..."
    const varMatch = error.message.match(/^'(.+?)' is (defined|assigned a value) but never used/);
    if (!varMatch) continue;

    const varName = varMatch[1];
    const isArg = error.message.includes('Allowed unused args');

    // Try different fix strategies

    // Strategy 1: Check if it's an import statement - remove the import
    if (line.match(new RegExp(`import\\s+.*\\b${escapeRegex(varName)}\\b`))) {
      const fixed = fixImportLine(lines, lineIdx, varName);
      if (fixed) {
        totalFixed++;
        continue;
      }
    }

    // Strategy 2: Check if it's a destructured import - remove from destructuring
    if (line.match(new RegExp(`import\\s*\\{[^}]*\\b${escapeRegex(varName)}\\b`))) {
      const fixed = fixDestructuredImport(lines, lineIdx, varName);
      if (fixed) {
        totalFixed++;
        continue;
      }
    }

    // Strategy 3: Check if it's a type import - remove from type import
    if (line.match(new RegExp(`import\\s+type\\s+.*\\b${escapeRegex(varName)}\\b`))) {
      const fixed = fixImportLine(lines, lineIdx, varName);
      if (fixed) {
        totalFixed++;
        continue;
      }
    }

    // Strategy 4: For destructured variables (const { a, b, c } = ...), prefix with _
    if (line.match(new RegExp(`\\b${escapeRegex(varName)}\\b.*[,}]`)) &&
        (line.includes('const {') || line.includes('let {') || line.includes('use') || line.includes('useState'))) {
      // Replace the variable name with _varName in the destructuring
      const newLine = replaceVarInDestructuring(line, varName);
      if (newLine !== line) {
        lines[lineIdx] = newLine;
        totalFixed++;
        continue;
      }
    }

    // Strategy 5: For function parameters, prefix with _
    if (isArg) {
      const newLine = replaceFunctionArg(line, varName);
      if (newLine !== line) {
        lines[lineIdx] = newLine;
        totalFixed++;
        continue;
      }
    }

    // Strategy 6: For const/let/var declarations, prefix with _
    const declMatch = line.match(new RegExp(`(const|let|var)\\s+(${escapeRegex(varName)})\\s*=`));
    if (declMatch) {
      lines[lineIdx] = line.replace(
        new RegExp(`(const|let|var)\\s+${escapeRegex(varName)}(\\s*=)`),
        `$1 _${varName}$2`
      );
      totalFixed++;
      continue;
    }

    // Strategy 7: For standalone variable declarations without assignment
    const standaloneMatch = line.match(new RegExp(`(const|let|var)\\s+(${escapeRegex(varName)})\\s*[,;]`));
    if (standaloneMatch) {
      lines[lineIdx] = line.replace(
        new RegExp(`(const|let|var)\\s+${escapeRegex(varName)}(\\s*[,;])`),
        `$1 _${varName}$2`
      );
      totalFixed++;
      continue;
    }

    // Strategy 8: Generic replacement - prefix with _
    // This handles cases like: const { varName } = ... or function(varName)
    if (!varName.startsWith('_')) {
      // Try to find and prefix the variable name at the correct column
      const beforeCol = line.substring(0, col);
      const afterCol = line.substring(col);
      const newAfterCol = afterCol.replace(new RegExp(`^${escapeRegex(varName)}\\b`), `_${varName}`);
      if (newAfterCol !== afterCol) {
        lines[lineIdx] = beforeCol + newAfterCol;
        totalFixed++;
        continue;
      }

      // Last resort: replace first occurrence of the variable name in the line
      const newLine = line.replace(new RegExp(`\\b${escapeRegex(varName)}\\b`), `_${varName}`);
      if (newLine !== line && !newLine.includes(`__${varName}`)) {
        lines[lineIdx] = newLine;
        totalFixed++;
        continue;
      }
    }

    console.log(`  WARN: Could not fix ${filePath}:${error.line} - ${varName}`);
  }

  // Write the file back
  const newContent = lines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
}

console.log(`\nFixed ${totalFixed} of ${totalErrors} errors`);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fixImportLine(lines, lineIdx, varName) {
  const line = lines[lineIdx];

  // Single import: import X from 'y' -> remove entire line
  if (line.match(new RegExp(`^import\\s+${escapeRegex(varName)}\\s+from\\s+`)) ||
      line.match(new RegExp(`^import\\s+type\\s+${escapeRegex(varName)}\\s+from\\s+`))) {
    // Check if it's the only import
    lines.splice(lineIdx, 1);
    return true;
  }

  // Destructured import: import { X, Y, Z } from 'y' -> remove X from the list
  if (line.includes('{') && line.includes('}')) {
    const fixed = removeFromDestructuredImport(line, varName);
    if (fixed !== line) {
      lines[lineIdx] = fixed;
      return true;
    }
  }

  // Multi-line import
  if (line.includes('{') && !line.includes('}')) {
    return fixMultiLineImport(lines, lineIdx, varName);
  }

  return false;
}

function fixDestructuredImport(lines, lineIdx, varName) {
  return fixImportLine(lines, lineIdx, varName);
}

function removeFromDestructuredImport(line, varName) {
  // Handle: import { X, Y, Z } from 'y' or import { X as A, Y, Z } from 'y'
  // Also handle: import type { X, Y, Z } from 'y'
  const importMatch = line.match(/^(import\s+(?:type\s+)?)\{([^}]*)\}(\s+from\s+.+)$/);
  if (!importMatch) return line;

  const prefix = importMatch[1];
  const imports = importMatch[2];
  const suffix = importMatch[3];

  const items = imports.split(',').map(s => s.trim()).filter(s => s.length > 0);
  const filtered = items.filter(item => {
    const name = item.split(/\s+as\s+/)[0].trim();
    return name !== varName;
  });

  if (filtered.length === 0) {
    // All imports removed - remove the entire line
    return '';
  }

  return `${prefix}{ ${filtered.join(', ')} }${suffix}`;
}

function fixMultiLineImport(lines, startLineIdx, varName) {
  // Find the end of the import statement
  let endLineIdx = startLineIdx;
  while (endLineIdx < lines.length && !lines[endLineIdx].includes('}')) {
    endLineIdx++;
  }

  // Collect all import items
  let fullImport = '';
  for (let i = startLineIdx; i <= endLineIdx; i++) {
    fullImport += lines[i] + '\n';
  }

  // Parse the import
  const importMatch = fullImport.match(/^(import\s+(?:type\s+)?)\{([^}]*)\}(\s+from\s+.+)$/s);
  if (!importMatch) return false;

  const prefix = importMatch[1];
  const imports = importMatch[2];
  const suffix = importMatch[3].trim();

  const items = imports.split(',').map(s => s.trim()).filter(s => s.length > 0);
  const filtered = items.filter(item => {
    const name = item.split(/\s+as\s+/)[0].trim();
    return name !== varName;
  });

  if (filtered.length === 0) {
    // Remove all lines
    lines.splice(startLineIdx, endLineIdx - startLineIdx + 1);
    return true;
  }

  // Replace with single-line import
  const newImport = `${prefix}{ ${filtered.join(', ')} }${suffix}`;
  lines[startLineIdx] = newImport;
  lines.splice(startLineIdx + 1, endLineIdx - startLineIdx);
  return true;
}

function replaceVarInDestructuring(line, varName) {
  // Handle: const { varName, ... } = ...
  // Handle: const [varName, ...] = ...
  // Handle: const { varName: alias, ... } = ...

  // Replace in object destructuring: { varName, ... } -> { _varName, ... }
  // But be careful not to replace after ':' (that would be an alias)
  const regex = new RegExp(`(?<![\\w_])${escapeRegex(varName)}(?=\\s*[,}\\]])`, 'g');
  return line.replace(regex, `_${varName}`);
}

function replaceFunctionArg(line, varName) {
  // Replace function parameter: (varName) -> (_varName)
  // or (varName: Type) -> (_varName: Type)
  // or ({ varName }) -> ({ _varName })
  const regex = new RegExp(`(?<![\\w_])${escapeRegex(varName)}(?=\\s*[,):}\\]])`, 'g');
  return line.replace(regex, `_${varName}`);
}
