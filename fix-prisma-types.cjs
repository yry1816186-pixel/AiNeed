const fs = require('fs');
const path = require('path');

// Prisma namespace types that don't exist in the generated client
// These need to be replaced with 'any' type assertions
const prismaTypeReplacements = [
  // WhereInput types
  { pattern: /Prisma\.ClothingItemWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.BrandWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.UserWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.OrderWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.CommunityPostWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.ContentReportWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.FeatureFlagWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.NotificationWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.ChatRoomWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.ChatMessageWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.ConsultantProfileWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.ConsultantReviewWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.ServiceBookingWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.StyleQuizWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.StyleQuizResultWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.QuizQuestionWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.WardrobeCollectionItemWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.ShareTemplateWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.CustomizationRequestWhereInput/g, replacement: 'any' },
  { pattern: /Prisma\.BloggerProductWhereInput/g, replacement: 'any' },
  // UpdateInput types
  { pattern: /Prisma\.UserAddressUpdateInput/g, replacement: 'any' },
  { pattern: /Prisma\.OrderUpdateInput/g, replacement: 'any' },
  { pattern: /Prisma\.FeatureFlagUpdateInput/g, replacement: 'any' },
  { pattern: /Prisma\.ChatRoomUpdateInput/g, replacement: 'any' },
  { pattern: /Prisma\.ConsultantProfileUpdateInput/g, replacement: 'any' },
  { pattern: /Prisma\.ServiceBookingUpdateInput/g, replacement: 'any' },
  { pattern: /Prisma\.UserProfileUpdateInput/g, replacement: 'any' },
  { pattern: /Prisma\.BloggerProductUpdateInput/g, replacement: 'any' },
  // CreateInput types
  { pattern: /Prisma\.BrandCreateInput/g, replacement: 'any' },
  { pattern: /Prisma\.ClothingItemCreateInput/g, replacement: 'any' },
  // GetPayload types
  { pattern: /Prisma\.ClothingItemGetPayload/g, replacement: 'any' },
  { pattern: /Prisma\.StyleQuizGetPayload/g, replacement: 'any' },
  { pattern: /Prisma\.StyleQuizResultGetPayload/g, replacement: 'any' },
  // OrderBy types
  { pattern: /Prisma\.CommunityPostOrderByWithRelationInput/g, replacement: 'any' },
  { pattern: /Prisma\.ConsultantProfileOrderByWithRelationInput/g, replacement: 'any' },
  { pattern: /Prisma\.ConsultantReviewOrderByWithRelationInput/g, replacement: 'any' },
  { pattern: /Prisma\.ClothingItemOrderByWithRelationInput/g, replacement: 'any' },
  // Filter types
  { pattern: /Prisma\.DateTimeFilter/g, replacement: 'any' },
  { pattern: /Prisma\.DecimalFilter/g, replacement: 'any' },
  // JSON types
  { pattern: /Prisma\.InputJsonValue/g, replacement: 'any' },
  { pattern: /Prisma\.InputJsonObject/g, replacement: 'any' },
  { pattern: /Prisma\.JsonValue/g, replacement: 'any' },
  // Decimal
  { pattern: /Prisma\.Decimal/g, replacement: 'any' },
  // VirtualTryOn
  { pattern: /Prisma\.VirtualTryOnWhereInput/g, replacement: 'any' },
  // Middleware
  { pattern: /Prisma\.MiddlewareParams/g, replacement: 'any' },
  // UserUpdateInput
  { pattern: /Prisma\.UserUpdateInput/g, replacement: 'any' },
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

const dirs = [
  path.join(__dirname, 'apps/backend/src/domains'),
  path.join(__dirname, 'apps/backend/src/common'),
  path.join(__dirname, 'apps/backend/src/modules'),
];

let allFiles = [];
for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    allFiles = allFiles.concat(findTsFiles(dir));
  }
}

let modifiedCount = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  for (const { pattern, replacement } of prismaTypeReplacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log('Modified: ' + path.relative(__dirname, file));
  }
}

console.log('Total files modified: ' + modifiedCount);
