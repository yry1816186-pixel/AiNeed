const fs = require('fs');
const path = require('path');

const srcRoot = path.join(__dirname, 'src');
const featuresRoot = path.join(srcRoot, 'features');
let totalFixed = 0;
let totalImports = 0;
const details = [];

const FEATURE_MAP = {
  'services/api/auth.api': 'auth/services/auth.api',
  'services/auth/': 'auth/services/',
  'services/api/sms.api': 'auth/services/sms.api',
  'services/api/ai-stylist.api': 'stylist/services/ai-stylist.api',
  'services/api/outfit.api': 'stylist/services/outfit.api',
  'services/api/tryon.api': 'tryon/services/tryon.api',
  'services/api/photos.api': 'tryon/services/photos.api',
  'services/api/clothing.api': 'wardrobe/services/clothing.api',
  'services/api/commerce.api': 'commerce/services/commerce.api',
  'services/api/subscription.api': 'commerce/services/subscription.api',
  'services/api/brand-qr.api': 'commerce/services/brand-qr.api',
  'services/api/community.api': 'community/services/community.api',
  'services/api/blogger.api': 'community/services/blogger.api',
  'services/api/profile.api': 'profile/services/profile.api',
  'services/api/style-profiles.api': 'profile/services/style-profiles.api',
  'services/api/notification.api': 'notifications/services/notification.api',
  'services/api/customization.api': 'customization/services/customization.api',
  'services/api/consultant.api': 'consultant/services/consultant.api',
  'services/api/chat.api': 'consultant/services/chat.api',
  'services/api/recommendation-feed.api': 'home/services/recommendation-feed.api',
  'services/weatherService': 'home/services/weatherService',
  'services/onboardingService': 'onboarding/services/onboardingService',
  'services/profileReportService': 'profile/services/profileReportService',
  'services/quizService': 'style-quiz/services/quizService',
  'services/api/style-quiz.api': 'style-quiz/services/style-quiz.api',
  'types/clothing': 'wardrobe/types/clothing',
  'types/user': 'auth/types/user',
  'types/ai': 'stylist/types/ai',
  'types/outfit': 'stylist/types/outfit',
  'types/chat': 'consultant/types/chat',
  'types/consultant': 'consultant/types/consultant',
  'types/customization': 'customization/types/customization',
  'types/social': 'community/types/social',
  'hooks/useCameraPermissions': 'tryon/hooks/useCameraPermissions',
  'hooks/useAuth': 'auth/hooks/useAuth',
  'hooks/useVerify': 'auth/hooks/useVerify',
};

const SHARED_MAP = {
  'services/api/client': 'shared/services/api/client',
  'services/api/error': 'shared/services/api/error',
  'services/api/index': 'shared/services/api/index',
  'services/apiClient': 'shared/services/apiClient',
  'services/analytics': 'shared/services/analytics',
  'services/sentry': 'shared/services/sentry',
  'services/websocket': 'shared/services/websocket',
  'services/offline-cache': 'shared/services/offline-cache',
  'services/deeplinkService': 'shared/services/deeplinkService',
  'services/push-notification.service': 'shared/services/push-notification.service',
  'services/speech/': 'shared/services/speech/',
  'hooks/useAnalytics': 'shared/hooks/useAnalytics',
  'hooks/useReducedMotion': 'shared/hooks/useReducedMotion',
  'hooks/useFeatureFlag': 'shared/hooks/useFeatureFlag',
  'hooks/useAnimation': 'shared/hooks/useAnimation',
  'hooks/useAdvancedAnimations': 'shared/hooks/useAdvancedAnimations',
  'hooks/useApi': 'shared/hooks/useApi',
  'hooks/useForm': 'shared/hooks/useForm',
  'hooks/useInfiniteQuery': 'shared/hooks/useInfiniteQuery',
  'hooks/useInfiniteScroll': 'shared/hooks/useInfiniteScroll',
  'hooks/useLazyLoad': 'shared/hooks/useLazyLoad',
  'hooks/useMutationHooks': 'shared/hooks/useMutationHooks',
  'hooks/useNetwork': 'shared/hooks/useNetwork',
  'hooks/usePagination': 'shared/hooks/usePagination',
  'hooks/useQueryHooks': 'shared/hooks/useQueryHooks',
  'contexts/': 'shared/contexts/',
  'types/api': 'shared/types/api',
  'types/animations': 'shared/types/animations',
  'types/components': 'shared/types/components',
  'types/events': 'shared/types/events',
  'types/index': 'shared/types/index',
  'utils/': 'shared/utils/',
  'stores/': 'shared/stores/',
};

function getFeatureName(filePath) {
  const rel = path.relative(featuresRoot, filePath);
  const parts = rel.split(path.sep);
  return parts[0];
}

function calcRelativePath(fromFile, toPath) {
  const fromDir = path.dirname(fromFile);
  return path.relative(fromDir, toPath).replace(/\\/g, '/');
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const featureName = getFeatureName(filePath);
  const lines = content.split('\n');
  const fixedLines = [];

  for (const line of lines) {
    let newLine = line;
    const importMatch = line.match(/^(import\s+(?:type\s+)?(?:\{[^}]*\}|[^;{]*)\s+from\s+)['"]([^'"]+)['"]/);

    if (importMatch) {
      const [fullMatch, importPrefix, importPath] = importMatch;

      if (!importPath.startsWith('.')) {
        fixedLines.push(line);
        continue;
      }

      const parts = importPath.split('/');
      const upCount = parts.filter(p => p === '..').length;
      const targetPath = parts.slice(upCount).join('/');

      if (upCount < 2) {
        fixedLines.push(line);
        continue;
      }

      let newTarget = null;

      for (const [oldPrefix, newLocation] of Object.entries(FEATURE_MAP)) {
        if (targetPath === oldPrefix || targetPath.startsWith(oldPrefix)) {
          const newFeature = newLocation.split('/')[0];
          if (newFeature === featureName) {
            const localPath = newLocation.split('/').slice(1).join('/');
            const remaining = targetPath.slice(oldPrefix.length);
            newTarget = '../' + localPath + remaining;
          } else {
            const srcTarget = path.join(srcRoot, newLocation + (targetPath.slice(oldPrefix.length) || ''));
            newTarget = calcRelativePath(filePath, srcTarget);
            if (!newTarget.startsWith('.')) newTarget = './' + newTarget;
          }
          break;
        }
      }

      if (!newTarget) {
        for (const [oldPrefix, newLocation] of Object.entries(SHARED_MAP)) {
          if (targetPath === oldPrefix || targetPath.startsWith(oldPrefix)) {
            const srcTarget = path.join(srcRoot, newLocation + (targetPath.slice(oldPrefix.length) || ''));
            newTarget = calcRelativePath(filePath, srcTarget);
            if (!newTarget.startsWith('.')) newTarget = './' + newTarget;
            break;
          }
        }
      }

      if (newTarget) {
        newLine = line.replace(importPath, newTarget);
        totalImports++;
      }
    }

    fixedLines.push(newLine);
  }

  content = fixedLines.join('\n');
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
    details.push(path.relative(srcRoot, filePath));
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
console.log(`Fixed ${totalFixed} files, ${totalImports} imports updated:`);
details.slice(0, 20).forEach(d => console.log(`  ${d}`));
if (details.length > 20) console.log(`  ... and ${details.length - 20} more`);
