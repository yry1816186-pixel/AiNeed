const fs = require('fs');
const path = require('path');

const srcRoot = path.join(__dirname, 'src');
const featuresRoot = path.join(srcRoot, 'features');
let totalFixed = 0;
let totalImports = 0;

function getFeatureName(filePath) {
  const rel = path.relative(featuresRoot, filePath);
  return rel.split(path.sep)[0];
}

function resolveImport(fromFile, importPath) {
  if (!importPath.startsWith('.')) return null;

  const fromDir = path.dirname(fromFile);
  const resolved = path.resolve(fromDir, importPath);

  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    if (fs.existsSync(resolved + ext)) return null;
  }

  const relFromSrc = path.relative(srcRoot, resolved);
  const featureName = getFeatureName(fromFile);
  const featureDir = path.join(featuresRoot, featureName);

  const candidates = [];

  const fileName = path.basename(resolved);
  const parentDir = path.dirname(relFromSrc);

  const searchDirs = [
    path.join(featureDir, 'services'),
    path.join(featureDir, 'types'),
    path.join(featureDir, 'hooks'),
    path.join(featureDir, 'stores'),
    path.join(featureDir, 'components'),
    path.join(srcRoot, 'shared', 'services'),
    path.join(srcRoot, 'shared', 'services', 'api'),
    path.join(srcRoot, 'shared', 'hooks'),
    path.join(srcRoot, 'shared', 'contexts'),
    path.join(srcRoot, 'shared', 'types'),
    path.join(srcRoot, 'shared', 'utils'),
    path.join(srcRoot, 'shared', 'stores'),
    path.join(srcRoot, 'navigation'),
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const ext of ['.ts', '.tsx']) {
      const candidate = path.join(dir, fileName + ext);
      if (fs.existsSync(candidate) && candidate !== fromFile) {
        candidates.push(candidate);
      }
      const indexCandidate = path.join(dir, fileName, 'index' + ext);
      if (fs.existsSync(indexCandidate)) {
        candidates.push(indexCandidate);
      }
    }
    if (fs.existsSync(path.join(dir, 'index.ts')) && fileName === path.basename(path.dirname(relFromSrc))) {
      candidates.push(path.join(dir, 'index.ts'));
    }
  }

  if (candidates.length > 0) {
    let newPath = path.relative(fromDir, candidates[0]).replace(/\\/g, '/');
    if (!newPath.startsWith('.')) newPath = './' + newPath;
    return newPath;
  }

  return null;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const lines = content.split('\n');
  const fixedLines = [];

  for (const line of lines) {
    let newLine = line;
    const importMatch = line.match(/^(import\s+(?:type\s+)?(?:\{[^}]*\}|[^;{]*)\s+from\s+)['"]([^'"]+)['"]/);

    if (importMatch) {
      const [fullMatch, importPrefix, importPath] = importMatch;
      const newPath = resolveImport(filePath, importPath);
      if (newPath && newPath !== importPath) {
        newLine = line.replace(importPath, newPath);
        totalImports++;
      }
    }

    fixedLines.push(newLine);
  }

  content = fixedLines.join('\n');
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    fixFile(full);
  }
}

walk(featuresRoot);
walk(path.join(srcRoot, 'shared'));
walk(path.join(srcRoot, 'navigation'));
walk(path.join(srcRoot, 'design-system'));
walk(path.join(srcRoot, 'i18n'));

console.log(`Fixed ${totalFixed} files, ${totalImports} imports resolved`);
