const fs = require('fs');
const path = require('path');

const featuresDir = 'apps/mobile/src/features';
const features = fs.readdirSync(featuresDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

let totalUpdated = 0;

const replacements = [
  { pattern: /from ['"]\.\.\/stores\/index['"]/g, replacement: "from '../../../stores'" },
  { pattern: /from ['"]\.\.\/stores['"]/g, replacement: "from '../../../stores'" },
  { pattern: /from ['"]\.\.\/services\/api\//g, replacement: "from '../../../services/api/" },
  { pattern: /from ['"]\.\.\/services\/auth\//g, replacement: "from '../../../services/auth/" },
  { pattern: /from ['"]\.\.\/design-system\//g, replacement: "from '../../../design-system/" },
  { pattern: /from ['"]\.\.\/theme\//g, replacement: "from '../../../theme/" },
  { pattern: /from ['"]\.\.\/types\//g, replacement: "from '../../../types/" },
  { pattern: /from ['"]\.\.\/i18n['"]/g, replacement: "from '../../../i18n'" },
  { pattern: /from ['"]\.\.\/utils\//g, replacement: "from '../../../utils/" },
  { pattern: /from ['"]\.\.\/hooks\//g, replacement: "from '../../../hooks/" },
  { pattern: /from ['"]\.\.\/contexts\//g, replacement: "from '../../../contexts/" },
  { pattern: /from ['"]\.\.\/components\//g, replacement: "from '../../../components/" },
];

const localStoreFeatures = ['auth', 'style-quiz'];
const localStoreReplacements = [
  { pattern: /from ['"]\.\.\/stores\/index['"]/g, replacement: "from '../stores'" },
  { pattern: /from ['"]\.\.\/stores['"]/g, replacement: "from '../stores'" },
];

features.forEach(feature => {
  const screensDir = path.join(featuresDir, feature, 'screens');
  if (!fs.existsSync(screensDir)) return;

  const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

  files.forEach(file => {
    const filePath = path.join(screensDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    const reps = localStoreFeatures.includes(feature)
      ? [...localStoreReplacements, ...replacements.slice(2)]
      : replacements;

    reps.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalUpdated++;
      console.log('Updated: ' + path.join(feature, 'screens', file));
    }
  });
});

console.log('\nTotal updated: ' + totalUpdated + ' screen files');
