const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'apps', 'mobile', 'src');

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

const REPLACEMENTS = [
  [/(?:DesignTokens|theme)\.colors\.neutral\.white/g, 'colors.surface'],
  [/(?:DesignTokens|theme)\.colors\.brand\.terracottaLight/g, 'colors.primaryLight'],
  [/(?:DesignTokens|theme)\.colors\.brand\.terracottaDark/g, 'colors.primaryDark'],
  [/(?:DesignTokens|theme)\.colors\.brand\.terracotta/g, 'colors.primary'],
  [/(?:DesignTokens|theme)\.colors\.brand\.sage/g, 'colors.secondary'],
  [/(?:DesignTokens|theme)\.colors\.brand\.gold/g, 'colors.gold'],
  [/(?:DesignTokens|theme)\.colors\.text\.primary/g, 'colors.textPrimary'],
  [/(?:DesignTokens|theme)\.colors\.text\.secondary/g, 'colors.textSecondary'],
  [/(?:DesignTokens|theme)\.colors\.text\.tertiary/g, 'colors.textTertiary'],
  [/(?:DesignTokens|theme)\.colors\.text\.inverse/g, 'colors.textInverse'],
  [/(?:DesignTokens|theme)\.colors\.text\.brand/g, 'colors.textBrand'],
  [/(?:DesignTokens|theme)\.colors\.backgrounds\.primary/g, 'colors.surface'],
  [/(?:DesignTokens|theme)\.colors\.backgrounds\.secondary/g, 'colors.backgroundSecondary'],
  [/(?:DesignTokens|theme)\.colors\.backgrounds\.tertiary/g, 'colors.backgroundTertiary'],
  [/(?:DesignTokens|theme)\.colors\.backgrounds\.elevated/g, 'colors.surfaceElevated'],
  [/(?:DesignTokens|theme)\.colors\.backgrounds\.overlay/g, 'colors.overlay'],
  [/(?:DesignTokens|theme)\.colors\.borders\.default/g, 'colors.border'],
  [/(?:DesignTokens|theme)\.colors\.borders\.light/g, 'colors.borderLight'],
  [/(?:DesignTokens|theme)\.colors\.borders\.strong/g, 'colors.borderStrong'],
  [/(?:DesignTokens|theme)\.colors\.borders\.brand/g, 'colors.borderBrand'],
  [/(?:DesignTokens|theme)\.colors\.semantic\.error/g, 'colors.error'],
  [/(?:DesignTokens|theme)\.colors\.semantic\.errorLight/g, 'colors.errorLight'],
  [/(?:DesignTokens|theme)\.colors\.semantic\.success/g, 'colors.success'],
  [/(?:DesignTokens|theme)\.colors\.semantic\.successLight/g, 'colors.successLight'],
  [/(?:DesignTokens|theme)\.colors\.semantic\.warning/g, 'colors.warning'],
  [/(?:DesignTokens|theme)\.colors\.semantic\.warningLight/g, 'colors.warningLight'],
  [/(?:DesignTokens|theme)\.colors\.semantic\.info/g, 'colors.info'],
  [/(?:DesignTokens|theme)\.colors\.semantic\.infoLight/g, 'colors.infoLight'],
  [/Colors\.primary/g, 'colors.primary'],
  [/Colors\.surface/g, 'colors.surface'],
  [/Colors\.background/g, 'colors.surface'],
  [/Colors\.backgroundSecondary/g, 'colors.backgroundSecondary'],
  [/Colors\.textPrimary/g, 'colors.textPrimary'],
  [/Colors\.textSecondary/g, 'colors.textSecondary'],
  [/Colors\.textTertiary/g, 'colors.textTertiary'],
  [/Colors\.border/g, 'colors.border'],
  [/Colors\.borderLight/g, 'colors.borderLight'],
  [/Colors\.error/g, 'colors.error'],
  [/Colors\.success/g, 'colors.success'],
  [/Colors\.warning/g, 'colors.warning'],
  [/Colors\.primaryLight/g, 'colors.primaryLight'],
  [/Colors\.overlay/g, 'colors.overlay'],
  [/Colors\.neutral\[(\d+)\]/g, 'colors.neutral[$1]'],
  [/Colors\.brand\.terracotta/g, 'colors.primary'],
  [/Colors\.brand\.sage/g, 'colors.secondary'],
];

const SKIP_DIRS = ['design-system/theme', 'shared/contexts/ThemeContext'];

function migrateFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (SKIP_DIRS.some(d => rel.includes(d))) return null;
  if (rel.includes('stores/') && !rel.endsWith('.tsx')) return null;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }

  if (content === original) return null;
  return content;
}

const files = findFiles(ROOT, '.tsx');
let migrated = 0;

for (const file of files) {
  try {
    const result = migrateFile(file);
    if (!result) continue;
    const tmpFile = file + '.tmp';
    fs.writeFileSync(tmpFile, result, 'utf8');
    try {
      fs.renameSync(tmpFile, file);
    } catch (e) {
      fs.unlinkSync(tmpFile);
      fs.writeFileSync(file, result, 'utf8');
    }
    migrated++;
  } catch (err) {
    console.error(`ERR: ${path.relative(ROOT, file)}: ${err.message}`);
  }
}
console.log(`${migrated} files migrated`);
