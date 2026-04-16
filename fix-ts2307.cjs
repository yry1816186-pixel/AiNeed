const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'apps', 'backend', 'src');
const DOMAINS_DIR = path.join(SRC_DIR, 'domains');
const MODULES_DIR = path.join(SRC_DIR, 'modules');
const COMMON_DIR = path.join(SRC_DIR, 'common');

const IDENTITY_MODULES = ['auth', 'onboarding', 'privacy', 'users', 'profile'];
const PLATFORM_MODULES = ['health', 'metrics', 'merchant', 'notification', 'queue', 'analytics', 'feature-flags', 'recommendations', 'admin'];
const FASHION_MODULES = ['brands', 'clothing', 'search', 'style-assessment', 'wardrobe', 'weather'];
const AI_CORE_MODULES = ['ai', 'ai-safety', 'ai-stylist', 'photos', 'try-on'];
const COMMERCE_MODULES = ['subscription', 'payment', 'coupon', 'order', 'refund-request', 'stock-notification'];
const SOCIAL_MODULES = ['blogger', 'chat', 'community', 'consultant'];
const CUSTOMIZATION_MODULES = ['customization', 'share-template'];

const DOMAIN_MAP = {};
IDENTITY_MODULES.forEach(m => DOMAIN_MAP[m] = 'identity');
PLATFORM_MODULES.forEach(m => DOMAIN_MAP[m] = 'platform');
FASHION_MODULES.forEach(m => DOMAIN_MAP[m] = 'fashion');
AI_CORE_MODULES.forEach(m => DOMAIN_MAP[m] = 'ai-core');
COMMERCE_MODULES.forEach(m => DOMAIN_MAP[m] = 'commerce');
SOCIAL_MODULES.forEach(m => DOMAIN_MAP[m] = 'social');
CUSTOMIZATION_MODULES.forEach(m => DOMAIN_MAP[m] = 'customization');

function walkTsFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      files = files.concat(walkTsFiles(p));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(p);
    }
  }
  return files;
}

function findModuleFile(moduleName, subPath) {
  const domains = ['identity', 'platform', 'fashion', 'ai-core', 'commerce', 'social', 'customization'];
  for (const domain of domains) {
    const candidate = path.join(DOMAINS_DIR, domain, moduleName, subPath);
    if (fs.existsSync(candidate)) return candidate;
    const baseCandidate = path.join(DOMAINS_DIR, domain, moduleName);
    if (fs.existsSync(baseCandidate + '.ts') || fs.existsSync(baseCandidate + '.module.ts')) {
      return baseCandidate;
    }
  }
  const modulesCandidate = path.join(MODULES_DIR, moduleName, subPath);
  if (fs.existsSync(modulesCandidate)) return modulesCandidate;
  const commonCandidate = path.join(COMMON_DIR, moduleName, subPath);
  if (fs.existsSync(commonCandidate)) return commonCandidate;
  return null;
}

function resolveImportPath(fromFile, importPath) {
  if (!importPath.startsWith('.')) return null;

  const fromDir = path.dirname(fromFile);
  const resolved = path.resolve(fromDir, importPath);

  const extensions = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
  for (const ext of extensions) {
    if (fs.existsSync(resolved + ext)) return null;
  }

  const parts = importPath.split('/');
  let moduleName = null;
  let domainName = null;
  let remainingPath = null;

  for (let i = parts.length - 1; i >= 0; i--) {
    if (DOMAIN_MAP[parts[i]]) {
      moduleName = parts[i];
      domainName = DOMAIN_MAP[parts[i]];
      remainingPath = parts.slice(i + 1).join('/');
      break;
    }
  }

  if (!moduleName || !domainName) {
    if (importPath.includes('/modules/')) {
      const modIdx = parts.indexOf('modules');
      if (modIdx >= 0 && modIdx + 1 < parts.length) {
        const mod = parts[modIdx + 1];
        if (DOMAIN_MAP[mod]) {
          domainName = DOMAIN_MAP[mod];
          moduleName = mod;
          remainingPath = parts.slice(modIdx + 2).join('/');
        }
      }
    }
    if (!moduleName) return null;
  }

  const targetBase = path.join(DOMAINS_DIR, domainName, moduleName);
  let targetRel;
  if (remainingPath) {
    targetRel = path.relative(fromDir, path.join(targetBase, remainingPath));
  } else {
    targetRel = path.relative(fromDir, targetBase);
  }
  targetRel = targetRel.replace(/\\/g, '/');
  if (!targetRel.startsWith('.')) targetRel = './' + targetRel;

  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const checkPath = path.resolve(fromDir, targetRel + ext);
    if (fs.existsSync(checkPath)) {
      return targetRel;
    }
  }

  return null;
}

let fixCount = 0;
const allFiles = walkTsFiles(SRC_DIR);

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
  const replacements = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const resolved = resolveImportPath(file, importPath);
    if (resolved && resolved !== importPath) {
      replacements.push({ from: importPath, to: resolved });
    }
  }

  if (replacements.length > 0) {
    let newContent = content;
    for (const r of replacements) {
      const escaped = r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      newContent = newContent.replace(
        new RegExp(`from ['"]${escaped}['"]`, 'g'),
        `from '${r.to}'`
      );
    }
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      fixCount++;
      const rel = path.relative(SRC_DIR, file);
      console.log(`Fixed: ${rel} (${replacements.length} imports)`);
    }
  }
}

console.log(`\nTotal files fixed: ${fixCount}`);
