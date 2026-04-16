/**
 * Codemod: Replace hardcoded fontSize and spacing values with DesignTokens/Spacing references.
 *
 * Usage: node scripts/codemod-spacing-tokens.mjs
 */
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('c:/AiNeed/apps/mobile/src');

// ── Font size token mapping ──────────────────────────────────────────────
const FONT_SIZE_MAP = {
  10: "DesignTokens.typography.sizes.xs",   // approximate (actual 11, diff 1)
  11: "DesignTokens.typography.sizes.xs",
  12: "DesignTokens.typography.sizes.sm",
  13: "DesignTokens.typography.sizes.sm",   // approximate (actual 12, diff 1)
  14: "DesignTokens.typography.sizes.base",
  15: "DesignTokens.typography.sizes.base", // approximate (actual 14, diff 1)
  16: "DesignTokens.typography.sizes.md",
  17: "DesignTokens.typography.sizes.md",   // approximate (actual 16, diff 1)
  18: "DesignTokens.typography.sizes.lg",
  20: "DesignTokens.typography.sizes.xl",
  22: "DesignTokens.typography.sizes.xl",   // approximate (actual 20, diff 2)
  24: "DesignTokens.typography.sizes['2xl']",
  28: "DesignTokens.typography.sizes['3xl']", // approximate (actual 30, diff 2)
  30: "DesignTokens.typography.sizes['3xl']",
  36: "DesignTokens.typography.sizes['4xl']",
  48: "DesignTokens.typography.sizes['5xl']",
  60: "DesignTokens.typography.sizes['6xl']",
};

// ── Spacing alias mapping (preferred) ────────────────────────────────────
const SPACING_ALIAS_MAP = {
  4:  "Spacing.xs",
  8:  "Spacing.sm",
  16: "Spacing.md",
  24: "Spacing.lg",
  32: "Spacing.xl",
  48: "Spacing['2xl']",
  64: "Spacing['3xl']",
  80: "Spacing['4xl']",
  96: "Spacing['5xl']",
};

// ── Spacing token mapping (for non-alias values) ─────────────────────────
const SPACING_TOKEN_MAP = {
  1:  "DesignTokens.spacing.px",
  2:  "DesignTokens.spacing['0.5']",
  6:  "DesignTokens.spacing['1.5']",
  10: "DesignTokens.spacing['2.5']",
  12: "DesignTokens.spacing[3]",
  14: "DesignTokens.spacing['3.5']",
  20: "DesignTokens.spacing[5]",
  28: "DesignTokens.spacing[7]",
  36: "DesignTokens.spacing[9]",
  40: "DesignTokens.spacing[10]",
  44: "DesignTokens.spacing[11]",
  56: "DesignTokens.spacing[14]",
};

// ── Property patterns ────────────────────────────────────────────────────
const SPACING_PROPS = [
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'paddingHorizontal', 'paddingVertical',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical',
  'gap', 'rowGap', 'columnGap',
].join('|');

const DIMENSION_PROPS = [
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
].join('|');

// ── Helpers ──────────────────────────────────────────────────────────────

function getRelativeThemePath(filePath) {
  const relativeToSrc = path.relative(SRC_DIR, path.dirname(filePath));
  const parts = relativeToSrc.split(path.sep).filter(Boolean);
  return parts.map(() => '..').join('/') + '/design-system/theme';
}

function isTokenDefinitionFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.includes('design-system/theme/tokens/') ||
         normalized.includes('design-system/theme/index.ts');
}

function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

// ── Import handling ──────────────────────────────────────────────────────

function addImports(content, filePath, needsDesignTokens, needsSpacing) {
  const themePath = getRelativeThemePath(filePath);

  // Check if DesignTokens / Spacing are already imported from ANY path
  const hasDesignTokensImport = /import\s*\{[^}]*\bDesignTokens\b[^}]*\}\s*from/.test(content);
  const hasSpacingImport = /import\s*\{[^}]*\bSpacing\b[^}]*\}\s*from/.test(content);

  const needsDTImport = needsDesignTokens && !hasDesignTokensImport;
  const needsSPImport = needsSpacing && !hasSpacingImport;

  if (!needsDTImport && !needsSPImport) return content;

  // Try to find existing import from design-system/theme
  const themeImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*design-system\/theme)['"]\s*;?/;
  const themeImportMatch = content.match(themeImportRegex);

  if (themeImportMatch) {
    let existingImports = themeImportMatch[1];
    let newImports = existingImports;

    if (needsDTImport && !/\bDesignTokens\b/.test(existingImports)) {
      newImports += ', DesignTokens';
    }
    if (needsSPImport && !/\bSpacing\b/.test(existingImports)) {
      newImports += ', Spacing';
    }

    if (newImports !== existingImports) {
      content = content.replace(
        themeImportMatch[0],
        `import { ${newImports.trim()} } from '${themeImportMatch[2]}'`
      );
    }
  } else {
    // Add new import line
    const imports = [];
    if (needsDTImport) imports.push('DesignTokens');
    if (needsSPImport) imports.push('Spacing');

    const importLine = `import { ${imports.join(', ')} } from '${themePath}';`;

    // Insert after the last import line
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) {
        lastImportIdx = i;
      }
    }

    if (lastImportIdx !== -1) {
      lines.splice(lastImportIdx + 1, 0, importLine);
      content = lines.join('\n');
    } else {
      content = importLine + '\n' + content;
    }
  }

  return content;
}

// ── Main processing ──────────────────────────────────────────────────────

function processFile(filePath) {
  if (isTokenDefinitionFile(filePath)) {
    return { modified: false, count: 0, details: [] };
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let needsDesignTokens = false;
  let needsSpacing = false;
  let count = 0;
  const details = [];

  // 1. Replace fontSize values
  content = content.replace(/\bfontSize:\s*(\d+)\b/g, (match, valueStr) => {
    const value = parseInt(valueStr, 10);
    const replacement = FONT_SIZE_MAP[value];
    if (replacement) {
      needsDesignTokens = true;
      count++;
      details.push(`fontSize: ${value} -> ${replacement}`);
      return `fontSize: ${replacement}`;
    }
    return match;
  });

  // 2. Replace spacing property values (padding/margin/gap)
  const spacingRegex = new RegExp(`\\b(${SPACING_PROPS}):\\s*(\\d+)\\b`, 'g');
  content = content.replace(spacingRegex, (match, propName, valueStr) => {
    const value = parseInt(valueStr, 10);
    if (value === 0) return match; // Skip zero

    // Check alias map first
    if (SPACING_ALIAS_MAP[value]) {
      needsSpacing = true;
      count++;
      details.push(`${propName}: ${value} -> ${SPACING_ALIAS_MAP[value]}`);
      return `${propName}: ${SPACING_ALIAS_MAP[value]}`;
    }
    // Then token map
    if (SPACING_TOKEN_MAP[value]) {
      needsDesignTokens = true;
      count++;
      details.push(`${propName}: ${value} -> ${SPACING_TOKEN_MAP[value]}`);
      return `${propName}: ${SPACING_TOKEN_MAP[value]}`;
    }
    return match;
  });

  // 3. Replace dimension property values (width/height - only spacing-scale values)
  const dimensionRegex = new RegExp(`\\b(${DIMENSION_PROPS}):\\s*(\\d+)\\b`, 'g');
  content = content.replace(dimensionRegex, (match, propName, valueStr) => {
    const value = parseInt(valueStr, 10);
    if (value === 0) return match;
    if (value < 2 || value > 96) return match; // Outside spacing scale

    // For width/height, prefer alias values; also accept token values <= 48
    if (SPACING_ALIAS_MAP[value]) {
      needsSpacing = true;
      count++;
      details.push(`${propName}: ${value} -> ${SPACING_ALIAS_MAP[value]}`);
      return `${propName}: ${SPACING_ALIAS_MAP[value]}`;
    }
    if (SPACING_TOKEN_MAP[value] && value <= 48) {
      needsDesignTokens = true;
      count++;
      details.push(`${propName}: ${value} -> ${SPACING_TOKEN_MAP[value]}`);
      return `${propName}: ${SPACING_TOKEN_MAP[value]}`;
    }
    return match;
  });

  if (content === originalContent) {
    return { modified: false, count: 0, details: [] };
  }

  // Add imports
  content = addImports(content, filePath, needsDesignTokens, needsSpacing);

  fs.writeFileSync(filePath, content, 'utf-8');
  return { modified: true, count, details };
}

// ── File discovery ───────────────────────────────────────────────────────

function findFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      files.push(...findFiles(fullPath));
    } else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// ── Run ──────────────────────────────────────────────────────────────────

const files = findFiles(SRC_DIR);
let totalModified = 0;
let totalReplacements = 0;
const modifiedFiles = [];

for (const file of files) {
  try {
    const result = processFile(file);
    if (result.modified) {
      totalModified++;
      totalReplacements += result.count;
      const relPath = path.relative(SRC_DIR, file);
      modifiedFiles.push(relPath);
      console.log(`\n[${result.count} replacements] ${relPath}`);
      for (const d of result.details) {
        console.log(`  ${d}`);
      }
    }
  } catch (err) {
    console.error(`ERROR processing ${file}: ${err.message}`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Codemod Summary`);
console.log(`${'='.repeat(60)}`);
console.log(`Files scanned:    ${files.length}`);
console.log(`Files modified:   ${totalModified}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log(`\nModified files:`);
modifiedFiles.forEach(f => console.log(`  ${f}`));
