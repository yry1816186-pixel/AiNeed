/**
 * Batch fix import paths in features directory
 * 
 * Features files are at src/features/{name}/{subdir}/
 * They reference src/ level modules with ../ which resolves to src/features/
 * Need to use ../../ to reach src/ level
 */

const fs = require('fs');
const path = require('path');

const featuresDir = path.join(__dirname, '..', 'src', 'features');

// Map of incorrect import path patterns to correct ones
// These are for files in src/features/{name}/screens/ or src/features/{name}/components/ etc.
// From those dirs, ../ goes to src/features/{name}/, ../../ goes to src/features/, ../../../ goes to src/
const pathFixes = [
  // From features/{name}/{subdir}/ -> need ../../ to reach src/
  { from: /from\s+['"]\.\.\/design-system\/theme['"]/g, to: "from '../../design-system/theme'" },
  { from: /from\s+['"]\.\.\/types\/navigation['"]/g, to: "from '../../types/navigation'" },
  { from: /from\s+['"]\.\.\/theme\/tokens\/design-tokens['"]/g, to: "from '../../theme/tokens/design-tokens'" },
  { from: /from\s+['"]\.\.\/i18n['"]/g, to: "from '../../i18n'" },
  { from: /from\s+['"]\.\.\/services\/api\/commerce\.api['"]/g, to: "from '../../services/api/commerce.api'" },
  { from: /from\s+['"]\.\.\/hooks\/useAnalytics['"]/g, to: "from '../../hooks/useAnalytics'" },
  { from: /from\s+['"]\.\.\/navigation\/types['"]/g, to: "from '../../navigation/types'" },
  { from: /from\s+['"]\.\.\/polyfills\/expo-vector-icons['"]/g, to: "from '../../polyfills/expo-vector-icons'" },
  { from: /from\s+['"]\.\.\/services\/api\/community\.api['"]/g, to: "from '../../services/api/community.api'" },
  { from: /from\s+['"]\.\.\/services\/api\/clothing\.api['"]/g, to: "from '../../services/api/clothing.api'" },
  { from: /from\s+['"]\.\.\/services\/api\/auth\.api['"]/g, to: "from '../../services/api/auth.api'" },
  { from: /from\s+['"]\.\.\/contexts\/ThemeContext['"]/g, to: "from '../../contexts/ThemeContext'" },
  { from: /from\s+['"]\.\.\/types\/clothing['"]/g, to: "from '../../types/clothing'" },
  { from: /from\s+['"]\.\.\/shared\/components\/layout\/ScreenLayout['"]/g, to: "from '../../shared/components/layout/ScreenLayout'" },
  { from: /from\s+['"]\.\.\/shared\/components\/ErrorBoundary['"]/g, to: "from '../../shared/components/ErrorBoundary'" },
  { from: /from\s+['"]\.\.\/polyfills\/expo-linear-gradient['"]/g, to: "from '../../polyfills/expo-linear-gradient'" },
  { from: /from\s+['"]\.\.\/services\/api\/client['"]/g, to: "from '../../services/api/client'" },
  { from: /from\s+['"]\.\.\/services\/ai['"]/g, to: "from '../../services/ai'" },
  { from: /from\s+['"]\.\.\/stores\/consultantStore['"]/g, to: "from '../../stores/consultantStore'" },
  { from: /from\s+['"]\.\.\/hooks\/useCameraPermissions['"]/g, to: "from '../../hooks/useCameraPermissions'" },
  { from: /from\s+['"]\.\.\/hooks\/useAuth['"]/g, to: "from '../../hooks/useAuth'" },
  { from: /from\s+['"]\.\.\/config\/runtime['"]/g, to: "from '../../config/runtime'" },
  { from: /from\s+['"]\.\.\/navigation\/navigationService['"]/g, to: "from '../../navigation/navigationService'" },
  { from: /from\s+['"]\.\.\/services\/api\/notification\.api['"]/g, to: "from '../../services/api/notification.api'" },
  { from: /from\s+['"]\.\.\/polyfills\/expo-constants['"]/g, to: "from '../../polyfills/expo-constants'" },
  { from: /from\s+['"]\.\.\/services\/api\/tryon\.api['"]/g, to: "from '../../services/api/tryon.api'" },
  { from: /from\s+['"]\.\.\/services\/api\/photos\.api['"]/g, to: "from '../../services/api/photos.api'" },
  { from: /from\s+['"]\.\.\/theme\/tokens\/colors['"]/g, to: "from '../../theme/tokens/colors'" },
  { from: /from\s+['"]\.\.\/theme\/tokens\/typography['"]/g, to: "from '../../theme/tokens/typography'" },
  { from: /from\s+['"]\.\.\/theme\/tokens\/spacing['"]/g, to: "from '../../theme/tokens/spacing'" },
  { from: /from\s+['"]\.\.\/theme\/tokens\/shadows['"]/g, to: "from '../../theme/tokens/shadows'" },
  { from: /from\s+['"]\.\.\/theme\/tokens\/design-tokens['"]/g, to: "from '../../theme/tokens/design-tokens'" },
  { from: /from\s+['"]\.\.\/types\/user['"]/g, to: "from '../../types/user'" },
  { from: /from\s+['"]\.\.\/types\/outfit['"]/g, to: "from '../../types/outfit'" },
  { from: /from\s+['"]\.\.\/types\/social['"]/g, to: "from '../../types/social'" },
  { from: /from\s+['"]\.\.\/types\/ai['"]/g, to: "from '../../types/ai'" },
  { from: /from\s+['"]\.\.\/types\/consultant['"]/g, to: "from '../../types/consultant'" },
  { from: /from\s+['"]\.\.\/types\/chat['"]/g, to: "from '../../types/chat'" },
  { from: /from\s+['"]\.\.\/types\/customization['"]/g, to: "from '../../types/customization'" },
  { from: /from\s+['"]\.\.\/types\/form-data['"]/g, to: "from '../../types/form-data'" },
  { from: /from\s+['"]\.\.\/types\/index['"]/g, to: "from '../../types/index'" },
  // From features/{name}/{subdir}/{subsubdir}/ -> need ../../../ to reach src/
  { from: /from\s+['"]\.\.\/\.\.\/design-system\/theme['"]/g, to: "from '../../../design-system/theme'" },
  { from: /from\s+['"]\.\.\/\.\.\/theme\/tokens\/design-tokens['"]/g, to: "from '../../../theme/tokens/design-tokens'" },
  { from: /from\s+['"]\.\.\/\.\.\/polyfills\/expo-vector-icons['"]/g, to: "from '../../../polyfills/expo-vector-icons'" },
  { from: /from\s+['"]\.\.\/\.\.\/polyfills\/expo-linear-gradient['"]/g, to: "from '../../../polyfills/expo-linear-gradient'" },
  { from: /from\s+['"]\.\.\/\.\.\/types\/navigation['"]/g, to: "from '../../../types/navigation'" },
  { from: /from\s+['"]\.\.\/\.\.\/types\/consultant['"]/g, to: "from '../../../types/consultant'" },
  { from: /from\s+['"]\.\.\/\.\.\/theme\/tokens\/colors['"]/g, to: "from '../../../theme/tokens/colors'" },
  { from: /from\s+['"]\.\.\/\.\.\/theme\/tokens\/typography['"]/g, to: "from '../../../theme/tokens/typography'" },
  { from: /from\s+['"]\.\.\/\.\.\/theme\/tokens\/spacing['"]/g, to: "from '../../../theme/tokens/spacing'" },
  { from: /from\s+['"]\.\.\/\.\.\/theme\/tokens\/shadows['"]/g, to: "from '../../../theme/tokens/shadows'" },
  { from: /from\s+['"]\.\.\/\.\.\/stores\/onboardingStore['"]/g, to: "from '../../../stores/onboardingStore'" },
  { from: /from\s+['"]\.\.\/\.\.\/stores\/quizStore['"]/g, to: "from '../../../stores/quizStore'" },
  { from: /from\s+['"]\.\.\/\.\.\/design-system\/theme\/tokens\/design-tokens['"]/g, to: "from '../../../design-system/theme/tokens/design-tokens'" },
  { from: /from\s+['"]\.\.\/\.\.\/design-system\/theme\/tokens\/season-colors['"]/g, to: "from '../../../design-system/theme/tokens/season-colors'" },
  { from: /from\s+['"]\.\.\/\.\.\/design-system\/theme\/FlatColors['"]/g, to: "from '../../../design-system/theme/FlatColors'" },
];

// Also fix import() style paths
const importPathFixes = [
  { from: /import\s*\(\s*['"]\.\.\/design-system\/theme['"]\s*\)/g, to: "import('../../design-system/theme')" },
  { from: /import\s*\(\s*['"]\.\.\/shared\/stores\/uiStore['"]\s*\)/g, to: "import('../../shared/stores/uiStore')" },
  { from: /import\s*\(\s*['"]\.\.\/shared\/stores\/app\.store['"]\s*\)/g, to: "import('../../shared/stores/app.store')" },
  { from: /import\s*\(\s*['"]\.\.\/features\/auth\/stores\/authStore['"]\s*\)/g, to: "import('../../features/auth/stores/authStore')" },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Determine depth from features dir
  const relPath = path.relative(featuresDir, filePath);
  const depth = relPath.split(path.sep).length - 1; // features/{name} = 0, features/{name}/screens = 1
  
  // For files directly in features/{name}/ (depth=0), ../ should be ../../
  // For files in features/{name}/{subdir}/ (depth=1), ../ should be ../../ and ../../ should be ../../../
  // For files in features/{name}/{subdir}/{subsubdir}/ (depth=2), need even more
  
  let fixesToApply;
  if (depth >= 1) {
    fixesToApply = [...pathFixes, ...importPathFixes];
  } else {
    // Files directly in features/{name}/ - different fix needed
    fixesToApply = [];
  }
  
  for (const fix of fixesToApply) {
    const newContent = content.replace(fix.from, fix.to);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dir) {
  let fixedCount = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixedCount += walkDir(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      if (processFile(fullPath)) {
        console.log(`Fixed: ${path.relative(featuresDir, fullPath)}`);
        fixedCount++;
      }
    }
  }
  return fixedCount;
}

const count = walkDir(featuresDir);
console.log(`\nTotal files fixed: ${count}`);
