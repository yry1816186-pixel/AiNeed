const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const MODULES_DIR = path.join(SRC_DIR, 'modules');
const DOMAINS_DIR = path.join(SRC_DIR, 'domains');

const IDENTITY_MODULES = ['auth', 'onboarding', 'privacy', 'users', 'profile'];
const PLATFORM_MODULES = ['health', 'metrics', 'merchant', 'notification', 'queue', 'analytics', 'feature-flags', 'recommendations', 'admin'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function removeDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function walkTsFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      files = files.concat(walkTsFiles(p));
    } else if (entry.name.endsWith('.ts')) {
      files.push(p);
    }
  }
  return files;
}

function updateFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  for (const { from, to } of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      modified = true;
    }
  }
  if (modified) fs.writeFileSync(filePath, content, 'utf8');
  return modified;
}

function getDepthFromBase(filePath, baseDir) {
  return path.relative(baseDir, filePath).split(path.sep).length;
}

console.log('=== Phase 3: Identity + Platform Domain Migration ===\n');

console.log('Step 1: Copy modules to domain directories...');
for (const mod of IDENTITY_MODULES) {
  const src = path.join(MODULES_DIR, mod);
  const dest = path.join(DOMAINS_DIR, 'identity', mod);
  if (fs.existsSync(src)) {
    copyDir(src, dest);
    console.log(`  Copied: modules/${mod} -> domains/identity/${mod}`);
  }
}
for (const mod of PLATFORM_MODULES) {
  const src = path.join(MODULES_DIR, mod);
  const dest = path.join(DOMAINS_DIR, 'platform', mod);
  if (fs.existsSync(src)) {
    copyDir(src, dest);
    console.log(`  Copied: modules/${mod} -> domains/platform/${mod}`);
  }
}

console.log('\nStep 2: Update imports in domain files (common path depth)...');
const allDomainFiles = [
  ...walkTsFiles(path.join(DOMAINS_DIR, 'identity')),
  ...walkTsFiles(path.join(DOMAINS_DIR, 'platform')),
];

for (const file of allDomainFiles) {
  const identityRel = path.relative(path.join(DOMAINS_DIR, 'identity'), file);
  const platformRel = path.relative(path.join(DOMAINS_DIR, 'platform'), file);
  const isInIdentity = !identityRel.startsWith('..');
  const rel = isInIdentity ? identityRel : platformRel;
  const domainName = isInIdentity ? 'identity' : 'platform';
  const depth = rel.split(path.sep).length;

  const replacements = [];

  if (depth === 1) {
    replacements.push({ from: '../../common/', to: '../../../common/' });
  } else if (depth === 2) {
    replacements.push({ from: '../../common/', to: '../../../common/' });
  } else if (depth === 3) {
    replacements.push({ from: '../../../common/', to: '../../../../common/' });
    replacements.push({ from: '../../common/', to: '../../../../common/' });
  } else if (depth === 4) {
    replacements.push({ from: '../../../common/', to: '../../../../../common/' });
    replacements.push({ from: '../../common/', to: '../../../../../common/' });
  }

  const sameDomainModules = isInIdentity ? IDENTITY_MODULES : PLATFORM_MODULES;
  const otherDomainModules = isInIdentity ? PLATFORM_MODULES : IDENTITY_MODULES;
  const otherDomainName = isInIdentity ? 'platform' : 'identity';

  for (const mod of sameDomainModules) {
    // same-domain cross-module refs keep same relative path (../mod/)
    // no change needed
  }

  for (const mod of otherDomainModules) {
    if (depth === 1) {
      replacements.push({ from: `../${mod}/`, to: `../../${otherDomainName}/${mod}/` });
    } else if (depth === 2) {
      replacements.push({ from: `../${mod}/`, to: `../../${otherDomainName}/${mod}/` });
      replacements.push({ from: `../../${mod}/`, to: `../../../${otherDomainName}/${mod}/` });
    } else if (depth === 3) {
      replacements.push({ from: `../${mod}/`, to: `../../../${otherDomainName}/${mod}/` });
      replacements.push({ from: `../../${mod}/`, to: `../../../${otherDomainName}/${mod}/` });
    } else if (depth >= 4) {
      replacements.push({ from: `../../${mod}/`, to: `../../../../${otherDomainName}/${mod}/` });
    }
  }

  const allMigrated = [...IDENTITY_MODULES, ...PLATFORM_MODULES];
  const fashionModules = ['brands', 'clothing', 'wardrobe', 'search', 'style-assessment', 'weather'];
  const unmigratedModules = [];
  for (const d of fs.readdirSync(MODULES_DIR, { withFileTypes: true })) {
    if (d.isDirectory() && !allMigrated.includes(d.name) && !fashionModules.includes(d.name)) {
      unmigratedModules.push(d.name);
    }
  }

  for (const mod of unmigratedModules) {
    if (depth === 1) {
      replacements.push({ from: `../${mod}/`, to: `../../../modules/${mod}/` });
    } else if (depth === 2) {
      replacements.push({ from: `../${mod}/`, to: `../../../modules/${mod}/` });
    } else if (depth === 3) {
      replacements.push({ from: `../${mod}/`, to: `../../../../modules/${mod}/` });
      replacements.push({ from: `../../${mod}/`, to: `../../../../modules/${mod}/` });
    } else if (depth >= 4) {
      replacements.push({ from: `../../${mod}/`, to: `../../../../../modules/${mod}/` });
    }
  }

  for (const mod of fashionModules) {
    if (depth === 1) {
      replacements.push({ from: `../${mod}/`, to: `../../fashion/${mod}/` });
    } else if (depth === 2) {
      replacements.push({ from: `../${mod}/`, to: `../../fashion/${mod}/` });
      replacements.push({ from: `../../${mod}/`, to: `../../../fashion/${mod}/` });
    } else if (depth === 3) {
      replacements.push({ from: `../${mod}/`, to: `../../../fashion/${mod}/` });
      replacements.push({ from: `../../${mod}/`, to: `../../../fashion/${mod}/` });
    }
  }

  updateFile(file, replacements);
}

console.log('\nStep 3: Update external references (modules/, common/, app.module.ts)...');
const externalFiles = [
  ...walkTsFiles(MODULES_DIR),
  ...walkTsFiles(path.join(SRC_DIR, 'common')),
];

for (const file of externalFiles) {
  const rel = path.relative(SRC_DIR, file);
  const depth = rel.split(path.sep).length - 1;
  const replacements = [];

  for (const mod of IDENTITY_MODULES) {
    if (depth === 1) {
      replacements.push({ from: `../${mod}/`, to: `../../domains/identity/${mod}/` });
    } else if (depth === 2) {
      replacements.push({ from: `../${mod}/`, to: `../../domains/identity/${mod}/` });
      replacements.push({ from: `../../${mod}/`, to: `../../../domains/identity/${mod}/` });
    } else if (depth >= 3) {
      replacements.push({ from: `../${mod}/`, to: `../../domains/identity/${mod}/` });
      replacements.push({ from: `../../${mod}/`, to: `../../../domains/identity/${mod}/` });
    }
  }

  for (const mod of PLATFORM_MODULES) {
    if (depth === 1) {
      replacements.push({ from: `../${mod}/`, to: `../../domains/platform/${mod}/` });
    } else if (depth === 2) {
      replacements.push({ from: `../${mod}/`, to: `../../domains/platform/${mod}/` });
      replacements.push({ from: `../../${mod}/`, to: `../../../domains/platform/${mod}/` });
    } else if (depth >= 3) {
      replacements.push({ from: `../${mod}/`, to: `../../domains/platform/${mod}/` });
      replacements.push({ from: `../../${mod}/`, to: `../../../domains/platform/${mod}/` });
    }
  }

  updateFile(file, replacements);
}

const appModule = path.join(SRC_DIR, 'app.module.ts');
for (const mod of IDENTITY_MODULES) {
  updateFile(appModule, [{ from: `./modules/${mod}/`, to: `./domains/identity/${mod}/` }]);
}
for (const mod of PLATFORM_MODULES) {
  updateFile(appModule, [{ from: `./modules/${mod}/`, to: `./domains/platform/${mod}/` }]);
}
console.log('  Updated: app.module.ts');

const mainTs = path.join(SRC_DIR, 'main.ts');
if (fs.existsSync(mainTs)) {
  for (const mod of IDENTITY_MODULES) {
    updateFile(mainTs, [{ from: `./modules/${mod}/`, to: `./domains/identity/${mod}/` }]);
  }
  for (const mod of PLATFORM_MODULES) {
    updateFile(mainTs, [{ from: `./modules/${mod}/`, to: `./domains/platform/${mod}/` }]);
  }
  console.log('  Updated: main.ts');
}

console.log('\nStep 4: Remove old module directories...');
for (const mod of [...IDENTITY_MODULES, ...PLATFORM_MODULES]) {
  const dir = path.join(MODULES_DIR, mod);
  if (fs.existsSync(dir)) {
    removeDir(dir);
    console.log(`  Removed: modules/${mod}`);
  }
}

console.log('\n=== Migration complete! ===');
