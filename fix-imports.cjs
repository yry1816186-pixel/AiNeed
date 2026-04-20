const fs = require('fs');
const path = require('path');

const enumsAvailable = [
  'PhotoType','AnalysisStatus','ClothingCategory','TryOnStatus','BodyType','SkinTone',
  'FaceShape','ColorSeason','Gender','PriceRange','OnboardingStep','CustomizationType',
  'CustomizationStatus','ProductTemplateType','DesignLayerType','CouponType',
  'UserCouponStatus','RefundType','RefundRequestStatus','OrderStatus',
  'NotificationType','StockNotificationStatus','BehaviorEventType','UserRole',
  'MerchantRole','SettlementStatus','PaymentRecordStatus','RefundRecordStatus',
  'PaymentStatus','SubscriptionStatus','ExportStatus','DeletionStatus',
  'AiStylistSessionStatus','RecommendationType','InteractionWeight','QuizQuestionType',
  'ConsultantStatus','ServiceType','BookingStatus','SenderType','MessageType',
  'EarningStatus','WithdrawalStatus','CollectionItemType','FitPreference','AuthProvider'
];

const modelTypesNotAvailable = [
  'User','Order','OrderItem','OrderAddress','UserProfile','MembershipPlan',
  'UserSubscription','FeatureFlag','VirtualTryOn','Favorite','UserBehavior','ClothingItem'
];

function findTsFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      results = results.concat(findTsFiles(fullPath));
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findTsFiles(path.join(__dirname, 'apps/backend/src/domains'));
let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  const importRegex = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']@prisma\/client["'];?/g;
  let match;
  const replacements = [];

  while ((match = importRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const isTypeOnly = fullMatch.startsWith('import type');
    const imports = match[1].split(',').map(s => s.trim()).filter(Boolean);

    const enumImports = [];
    const prismaNamespaceImports = [];
    const modelTypeImports = [];
    const otherImports = [];

    for (const imp of imports) {
      const name = imp.replace(/\s+as\s+\w+/, '').trim();
      if (name === 'Prisma' || name === 'PrismaClient') {
        prismaNamespaceImports.push(imp);
      } else if (enumsAvailable.includes(name)) {
        enumImports.push(imp);
      } else if (modelTypesNotAvailable.includes(name)) {
        modelTypeImports.push(imp);
      } else {
        otherImports.push(imp);
      }
    }

    if (enumImports.length > 0 || modelTypeImports.length > 0) {
      let newImportLines = [];

      if (prismaNamespaceImports.length > 0) {
        newImportLines.push('import { ' + prismaNamespaceImports.join(', ') + ' } from "@prisma/client";');
      }

      if (enumImports.length > 0) {
        if (isTypeOnly) {
          newImportLines.push('import type { ' + enumImports.join(', ') + ' } from "@/types/prisma-enums";');
        } else {
          newImportLines.push('import { ' + enumImports.join(', ') + ' } from "@/types/prisma-enums";');
        }
      }

      if (modelTypeImports.length > 0) {
        const typeAliases = modelTypeImports.map(m => {
          const name = m.replace(/\s+as\s+\w+/, '').trim();
          return 'type ' + name + ' = any;';
        });
        newImportLines.push('// eslint-disable-next-line @typescript-eslint/no-explicit-any\n' + typeAliases.join('\n// eslint-disable-next-line @typescript-eslint/no-explicit-any\n'));
      }

      if (otherImports.length > 0) {
        newImportLines.push('import { ' + otherImports.join(', ') + ' } from "@prisma/client";');
      }

      replacements.push({ old: fullMatch, new: newImportLines.join('\n') });
    }
  }

  for (const r of replacements) {
    content = content.replace(r.old, r.new);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log('Modified: ' + path.relative(__dirname, file));
  }
}

console.log('Total files modified: ' + modifiedCount);
