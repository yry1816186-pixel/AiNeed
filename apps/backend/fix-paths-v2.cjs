const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const IDENTITY_MODULES = ['auth', 'onboarding', 'privacy', 'users', 'profile'];
const PLATFORM_MODULES = ['health', 'metrics', 'merchant', 'notification', 'queue', 'analytics', 'feature-flags', 'recommendations', 'admin'];
const ALL_MIGRATED = [...IDENTITY_MODULES, ...PLATFORM_MODULES];

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

let fixCount = 0;
const allFiles = walkTsFiles(SRC_DIR);

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const replacements = [];

  for (const mod of ALL_MIGRATED) {
    const domainType = IDENTITY_MODULES.includes(mod) ? 'identity' : 'platform';

    const patterns = [
      `../modules/${mod}/`,
      `../../modules/${mod}/`,
      `../../../modules/${mod}/`,
      `../../../../modules/${mod}/`,
    ];

    for (const pat of patterns) {
      if (content.includes(pat)) {
        const upCount = (pat.match(/\.\.\//g) || []).length;
        let newPath = '';
        for (let i = 0; i < upCount; i++) newPath += '../';
        newPath += `domains/${domainType}/${mod}/`;
        replacements.push({ from: pat, to: newPath });
      }
    }
  }

  const overDeepCommon = [
    '../../../../../../../common/',
    '../../../../../../../../common/',
    '../../../../../../../../../common/',
  ];
  for (const od of overDeepCommon) {
    if (content.includes(od)) {
      const rel = path.relative(SRC_DIR, file);
      const depth = rel.split(path.sep).length;
      let correctPath = '';
      for (let i = 0; i < depth; i++) correctPath += '../';
      correctPath += 'common/';
      replacements.push({ from: od, to: correctPath });
    }
  }

  if (replacements.length > 0 && updateFile(file, replacements)) {
    fixCount++;
    console.log(`  Fixed: ${path.relative(SRC_DIR, file)}`);
  }
}

console.log(`\nTotal fixes: ${fixCount}`);
