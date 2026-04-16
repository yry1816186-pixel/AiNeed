const fs = require('fs');
const path = require('path');
const featuresDir = path.join(__dirname, '..', 'src', 'features');
let totalFixed = 0;

function fixImportsInDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixImportsInDir(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      const parts = fullPath.split(path.sep);
      const featureIdx = parts.indexOf('features');
      const featureName = parts[featureIdx + 1];

      const replacements = [
        [/\.\.\/\.\.\/stores\//g, (m, p1) => {
          const storePath = p1;
          const featureStorePath = path.join(featuresDir, featureName, 'stores', storePath);
          const srcStorePath = path.join(__dirname, 'src', 'stores', storePath);
          if (fs.existsSync(featureStorePath + '.ts') || fs.existsSync(featureStorePath + '.tsx') || fs.existsSync(featureStorePath + path.sep + 'index.ts')) {
            return '../stores/' + storePath;
          }
          return '../../../stores/' + storePath;
        }],
      ];

      const simpleReplacements = [
        [/from ['"]\.\.\/\.\.\/stores['"]/g, "from '../../../stores'"],
        [/from ['"]\.\.\/\.\.\/theme\/([^'"]+)['"]/g, (m, p) => `from '../../../design-system/theme/${p}'`],
        [/from ['"]\.\.\/\.\.\/shared\/([^'"]+)['"]/g, (m, p) => `from '../../../shared/${p}'`],
        [/from ['"]\.\.\/\.\.\/contexts\/([^'"]+)['"]/g, (m, p) => {
          const sharedCtx = path.join(__dirname, 'src', 'shared', 'contexts', p);
          if (fs.existsSync(sharedCtx + '.ts') || fs.existsSync(sharedCtx + '.tsx')) {
            return `from '../../../shared/contexts/${p}'`;
          }
          return `from '../../../contexts/${p}'`;
        }],
        [/from ['"]\.\.\/\.\.\/i18n['"]/g, "from '../../../i18n'"],
        [/from ['"]\.\.\/\.\.\/i18n\/([^'"]+)['"]/g, (m, p) => `from '../../../i18n/${p}'`],
        [/from ['"]\.\.\/\.\.\/constants\/([^'"]+)['"]/g, (m, p) => {
          const sharedConst = path.join(__dirname, 'src', 'shared', 'constants', p);
          if (fs.existsSync(sharedConst + '.ts') || fs.existsSync(sharedConst + '.tsx')) {
            return `from '../../../shared/constants/${p}'`;
          }
          return `from '../../../constants/${p}'`;
        }],
        [/from ['"]\.\.\/\.\.\/types['"]/g, "from '../../../types'"],
        [/from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g, (m, p) => `from '../../../utils/${p}'`],
      ];

      for (const [regex, replacement] of simpleReplacements) {
        const newContent = content.replace(regex, replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }

      // Fix ../../stores/X -> feature-local or src-level
      content = content.replace(/from ['"]\.\.\/\.\.\/stores\/([^'"]+)['"]/g, (match, storePath) => {
        const featureStorePath = path.join(featuresDir, featureName, 'stores', storePath);
        if (fs.existsSync(featureStorePath + '.ts') || fs.existsSync(featureStorePath + '.tsx') || fs.existsSync(featureStorePath + path.sep + 'index.ts')) {
          return `from '../stores/${storePath}'`;
        }
        return `from '../../../stores/${storePath}'`;
      });

      // Fix ../../components/X -> feature-local or src-level
      content = content.replace(/from ['"]\.\.\/\.\.\/components\/([^'"]+)['"]/g, (match, compPath) => {
        const featureCompPath = path.join(featuresDir, featureName, 'components', compPath);
        if (fs.existsSync(featureCompPath + '.ts') || fs.existsSync(featureCompPath + '.tsx') || fs.existsSync(featureCompPath + path.sep + 'index.ts')) {
          return `from '../components/${compPath}'`;
        }
        return `from '../../../components/${compPath}'`;
      });

      // Fix ../../hooks/X -> feature-local or src-level
      content = content.replace(/from ['"]\.\.\/\.\.\/hooks\/([^'"]+)['"]/g, (match, hookPath) => {
        const featureHookPath = path.join(featuresDir, featureName, 'hooks', hookPath);
        if (fs.existsSync(featureHookPath + '.ts') || fs.existsSync(featureHookPath + '.tsx')) {
          return `from '../hooks/${hookPath}'`;
        }
        return `from '../../../hooks/${hookPath}'`;
      });

      // Fix ../../services/X -> feature-local or src-level
      content = content.replace(/from ['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g, (match, svcPath) => {
        const featureSvcPath = path.join(featuresDir, featureName, 'services', svcPath);
        if (fs.existsSync(featureSvcPath + '.ts') || fs.existsSync(featureSvcPath + '.tsx')) {
          return `from '../services/${svcPath}'`;
        }
        return `from '../../../services/${svcPath}'`;
      });

      // Fix ../../types/X -> feature-local or src-level
      content = content.replace(/from ['"]\.\.\/\.\.\/types\/([^'"]+)['"]/g, (match, typePath) => {
        const featureTypePath = path.join(featuresDir, featureName, 'types', typePath);
        if (fs.existsSync(featureTypePath + '.ts') || fs.existsSync(featureTypePath + '.tsx')) {
          return `from '../types/${typePath}'`;
        }
        return `from '../../../types/${typePath}'`;
      });

      // Check if content was actually modified by comparing
      const origContent = fs.readFileSync(fullPath, 'utf8');
      if (content !== origContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        totalFixed++;
      }
    }
  }
}

fixImportsInDir(featuresDir);
console.log('Fixed imports in ' + totalFixed + ' files');
