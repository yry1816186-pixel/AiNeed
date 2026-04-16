const fs = require('fs');
const path = require('path');

const SRC = 'apps/mobile/src';
const OLD_COMPONENTS = path.join(SRC, 'components');
const FEATURES = path.join(SRC, 'features');
const SHARED = path.join(SRC, 'shared/components');

const mapping = {
  address: { dest: 'commerce/components', type: 'feature' },
  aicompanion: { dest: 'stylist/components', type: 'feature' },
  aistylist: { dest: 'stylist/components', type: 'feature' },
  brand: { dest: 'commerce/components', type: 'feature' },
  charts: { dest: 'charts', type: 'shared' },
  clothing: { dest: 'wardrobe/components', type: 'feature' },
  community: { dest: 'community/components', type: 'feature' },
  consultant: { dest: 'consultant/components', type: 'feature' },
  customization: { dest: 'customization/components', type: 'feature' },
  flows: { dest: 'flows', type: 'shared' },
  heartrecommend: { dest: 'home/components/heartrecommend', type: 'feature' },
  home: { dest: 'home/components', type: 'feature' },
  onboarding: { dest: 'onboarding/components', type: 'feature' },
  photo: { dest: 'tryon/components', type: 'feature' },
  privacy: { dest: 'privacy', type: 'shared' },
  profile: { dest: 'profile/components', type: 'feature' },
  recommendations: { dest: 'home/components', type: 'feature' },
  screens: { dest: 'screens', type: 'shared' },
  search: { dest: 'search/components', type: 'feature' },
  social: { dest: 'community/components/social', type: 'feature' },
  theme: { dest: 'theme', type: 'shared' },
  wardrobe: { dest: 'wardrobe/components', type: 'feature' },
};

function updateImports(content, fromDir, toDir) {
  const depth = toDir.split('/').length;
  const prefix = '../'.repeat(depth + 1);

  const replacements = [
    [/from ['"]\.\.\/stores\/index['"]/g, `from '${prefix}stores'`],
    [/from ['"]\.\.\/stores['"]/g, `from '${prefix}stores'`],
    [/from ['"]\.\.\/services\/api\//g, `from '${prefix}services/api/`],
    [/from ['"]\.\.\/services\/auth\//g, `from '${prefix}services/auth/`],
    [/from ['"]\.\.\/design-system\//g, `from '${prefix}design-system/`],
    [/from ['"]\.\.\/theme\//g, `from '${prefix}theme/`],
    [/from ['"]\.\.\/types\//g, `from '${prefix}types/`],
    [/from ['"]\.\.\/i18n['"]/g, `from '${prefix}i18n'`],
    [/from ['"]\.\.\/utils\//g, `from '${prefix}utils/`],
    [/from ['"]\.\.\/hooks\//g, `from '${prefix}hooks/`],
    [/from ['"]\.\.\/contexts\//g, `from '${prefix}contexts/`],
  ];

  let result = content;
  replacements.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });

  return result;
}

let totalCopied = 0;
let totalSkipped = 0;

Object.entries(mapping).forEach(([oldDir, config]) => {
  const oldPath = path.join(OLD_COMPONENTS, oldDir);
  if (!fs.existsSync(oldPath)) {
    console.log(`SKIP: ${oldDir} - source not found`);
    return;
  }

  const destBase = config.type === 'shared' ? SHARED : FEATURES;
  const destPath = path.join(destBase, config.dest);

  fs.mkdirSync(destPath, { recursive: true });

  const files = fs.readdirSync(oldPath, { recursive: true })
    .filter(f => {
      const fullPath = path.join(oldPath, f);
      return fs.statSync(fullPath).isFile();
    });

  files.forEach(file => {
    const srcFile = path.join(oldPath, file);
    const destFile = path.join(destPath, file);

    if (fs.existsSync(destFile)) {
      console.log(`SKIP: ${oldDir}/${file} -> already exists at ${config.dest}/${file}`);
      totalSkipped++;
      return;
    }

    const destDir = path.dirname(destFile);
    fs.mkdirSync(destDir, { recursive: true });

    let content = fs.readFileSync(srcFile, 'utf8');
    content = updateImports(content, oldDir, config.dest);

    fs.writeFileSync(destFile, content, 'utf8');
    console.log(`COPY: ${oldDir}/${file} -> ${config.dest}/${file}`);
    totalCopied++;
  });
});

console.log(`\nTotal: ${totalCopied} copied, ${totalSkipped} skipped`);
