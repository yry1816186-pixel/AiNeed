const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname, '..', 'src');
const featuresDir = path.join(srcDir, 'features');
let totalFixed = 0;

function exists(p) {
  return fs.existsSync(p + '.ts') || fs.existsSync(p + '.tsx') || fs.existsSync(p + path.sep + 'index.ts') || fs.existsSync(p + path.sep + 'index.tsx');
}

function fixImportsInDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixImportsInDir(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const parts = fullPath.replace(/\\/g, '/').split('/');
      const featureIdx = parts.indexOf('features');
      const featureName = parts[featureIdx + 1];
      const screensIdx = parts.indexOf('screens');
      const depthFromScreens = parts.length - screensIdx - 2;

      // depthFromScreens: 0 = features/X/screens/file.tsx
      //                   1 = features/X/screens/components/file.tsx
      //                   2 = features/X/screens/steps/file.tsx

      const upToFeature = '../'.repeat(depthFromScreens + 1); // ../ for depth 0, ../../ for depth 1
      const upToSrc = '../'.repeat(depthFromScreens + 3);     // ../../../ for depth 0, ../../../../ for depth 1

      // Fix relative imports that go UP from screens dir

      // --- ../../stores/X (from depth 0) -> ../stores/X (feature-local) or ../../../stores/X (src-level) ---
      // --- ../stores/X (from depth 1) -> ../../stores/X (feature-local) or ../../../../stores/X (src-level) ---

      // Generic: any ../stores/ import -> feature-local if exists, otherwise src-level
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)stores\/([^'"]+)['"]/g, (match, prefix, storePath) => {
        const featureStorePath = path.join(featuresDir, featureName, 'stores', storePath);
        if (exists(featureStorePath)) return `from '${upToFeature}stores/${storePath}'`;
        return `from '${upToSrc}stores/${storePath}'`;
      });

      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)stores['"]/g, (match) => {
        return `from '${upToSrc}stores'`;
      });

      // Generic: ../components/X -> feature-local or src-level
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)components\/([^'"]+)['"]/g, (match, prefix, compPath) => {
        const featureCompPath = path.join(featuresDir, featureName, 'components', compPath);
        if (exists(featureCompPath)) return `from '${upToFeature}components/${compPath}'`;
        return `from '${upToSrc}components/${compPath}'`;
      });

      // Generic: ../hooks/X -> feature-local or src-level
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)hooks\/([^'"]+)['"]/g, (match, prefix, hookPath) => {
        const featureHookPath = path.join(featuresDir, featureName, 'hooks', hookPath);
        if (exists(featureHookPath)) return `from '${upToFeature}hooks/${hookPath}'`;
        return `from '${upToSrc}hooks/${hookPath}'`;
      });

      // Generic: ../services/X -> feature-local or src-level
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)services\/([^'"]+)['"]/g, (match, prefix, svcPath) => {
        const featureSvcPath = path.join(featuresDir, featureName, 'services', svcPath);
        if (exists(featureSvcPath)) return `from '${upToFeature}services/${svcPath}'`;
        return `from '${upToSrc}services/${svcPath}'`;
      });

      // Generic: ../types/X -> feature-local or src-level
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)types\/([^'"]+)['"]/g, (match, prefix, typePath) => {
        const featureTypePath = path.join(featuresDir, featureName, 'types', typePath);
        if (exists(featureTypePath)) return `from '${upToFeature}types/${typePath}'`;
        return `from '${upToSrc}types/${typePath}'`;
      });

      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)types['"]/g, (match) => {
        return `from '${upToSrc}types'`;
      });

      // Generic: ../theme/X -> design-system/theme/X
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)theme\/([^'"]+)['"]/g, (match, prefix, p) => {
        return `from '${upToSrc}design-system/theme/${p}'`;
      });

      // Generic: ../design-system/X -> src-level design-system
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)design-system\/([^'"]+)['"]/g, (match, prefix, p) => {
        return `from '${upToSrc}design-system/${p}'`;
      });

      // Generic: ../shared/X -> src-level shared
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)shared\/([^'"]+)['"]/g, (match, prefix, p) => {
        return `from '${upToSrc}shared/${p}'`;
      });

      // Generic: ../contexts/X -> src-level contexts
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)contexts\/([^'"]+)['"]/g, (match, prefix, p) => {
        const sharedCtx = path.join(srcDir, 'shared', 'contexts', p);
        if (exists(sharedCtx)) return `from '${upToSrc}shared/contexts/${p}'`;
        return `from '${upToSrc}contexts/${p}'`;
      });

      // Generic: ../i18n -> src-level
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)i18n['"]/g, (match) => {
        return `from '${upToSrc}i18n'`;
      });
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)i18n\/([^'"]+)['"]/g, (match, prefix, p) => {
        return `from '${upToSrc}i18n/${p}'`;
      });

      // Generic: ../constants/X -> src-level
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)constants\/([^'"]+)['"]/g, (match, prefix, p) => {
        const sharedConst = path.join(srcDir, 'shared', 'constants', p);
        if (exists(sharedConst)) return `from '${upToSrc}shared/constants/${p}'`;
        return `from '${upToSrc}constants/${p}'`;
      });

      // Generic: ../utils/X -> src-level
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)utils\/([^'"]+)['"]/g, (match, prefix, p) => {
        return `from '${upToSrc}utils/${p}'`;
      });

      // Generic: ../navigation/X -> src-level
      content = content.replace(/from ['"](\.\/+(?:\.\.\/)*)navigation\/([^'"]+)['"]/g, (match, prefix, p) => {
        return `from '${upToSrc}navigation/${p}'`;
      });

      // Fix ./community/CommunityHeader -> ./CommunityHeader (flat structure)
      content = content.replace(/from ['"]\.\/community\/([^'"]+)['"]/g, (match, p) => {
        return `from './${p}'`;
      });

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
