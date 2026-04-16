const fs = require('fs');
const path = require('path');

const BASE = 'C:/AiNeed/apps/mobile/src/features';

// Replacement rules: [filePath, search, replace]
const replacements = [
  // 1. AdvisorProfileScreen.tsx - #555 -> text.secondary
  [
    'consultant/screens/AdvisorProfileScreen.tsx',
    'color: "#555"',
    'color: DesignTokens.colors.text.secondary',
  ],

  // 2. PostDetailScreen.tsx - multiple replacements
  [
    'community/screens/PostDetailScreen.tsx',
    'color={post.isLiked ? "#FF4757" : theme.colors.textSecondary} // custom color',
    'color={post.isLiked ? DesignTokens.colors.semantic.error : theme.colors.textSecondary}',
  ],
  [
    'community/screens/PostDetailScreen.tsx',
    'color={post.isBookmarked ? "#F1C40F" : theme.colors.textSecondary} // custom color',
    'color={post.isBookmarked ? DesignTokens.colors.semantic.warning : theme.colors.textSecondary}',
  ],
  [
    'community/screens/PostDetailScreen.tsx',
    'backgroundColor: "#F1C40F", // custom color',
    'backgroundColor: DesignTokens.colors.semantic.warning,',
  ],
  [
    'community/screens/PostDetailScreen.tsx',
    'backgroundColor: "#F0EDFF", // custom color',
    'backgroundColor: DesignTokens.colors.backgrounds.secondary, // lavender-tinted bg',
  ],
  [
    'community/screens/PostDetailScreen.tsx',
    'actionCountLiked: { color: "#FF4757" }, // custom color',
    'actionCountLiked: { color: DesignTokens.colors.semantic.error },',
  ],

  // 3. FollowButton.tsx - #FFFFFF -> text.inverse
  [
    'community/components/social/FollowButton.tsx',
    'color="#FFFFFF"',
    'color={DesignTokens.colors.text.inverse}',
  ],
  [
    'community/components/social/FollowButton.tsx',
    'color: "#FFFFFF"',
    'color: DesignTokens.colors.text.inverse',
  ],

  // 4. TrendingCard.tsx
  [
    'community/components/TrendingCard.tsx',
    'up: { icon: "arrow-up", color: "#27AE60" }',
    'up: { icon: "arrow-up", color: DesignTokens.colors.semantic.success }',
  ],
  [
    'community/components/TrendingCard.tsx',
    'down: { icon: "arrow-down", color: "#E74C3C" }',
    'down: { icon: "arrow-down", color: DesignTokens.colors.semantic.error }',
  ],
  [
    'community/components/TrendingCard.tsx',
    'backgroundColor: "#FFFFFF",',
    'backgroundColor: DesignTokens.colors.backgrounds.primary,',
  ],
  [
    'community/components/TrendingCard.tsx',
    'backgroundColor: "#F0EDFF",',
    'backgroundColor: DesignTokens.colors.backgrounds.secondary, // lavender-tinted bg',
  ],

  // 5. BookmarkSheet.tsx - #F0EDFF
  [
    'community/components/BookmarkSheet.tsx',
    'backgroundColor: "#F0EDFF", // custom color',
    'backgroundColor: DesignTokens.colors.backgrounds.secondary, // lavender-tinted bg',
  ],

  // 6. MerchantApplyScreen.tsx - #FFB0B0
  [
    'commerce/screens/MerchantApplyScreen.tsx',
    'submitButtonDisabled: { backgroundColor: "#FFB0B0" }',
    'submitButtonDisabled: { backgroundColor: DesignTokens.colors.semantic.error } // lighter error for disabled state',
  ],

  // 7. SKUSelector.tsx - #FFF5F5
  [
    'commerce/components/SKUSelector.tsx',
    'sizeButtonSelected: { borderColor: "DesignTokens.colors.semantic.error", backgroundColor: "#FFF5F5" }, // custom color',
    'sizeButtonSelected: { borderColor: DesignTokens.colors.semantic.error, backgroundColor: DesignTokens.colors.backgrounds.secondary }, // error-tinted bg',
  ],

  // 8. ProductImageCarousel.tsx - #FF4D4F, #FFFFFF
  [
    'commerce/components/ProductImageCarousel.tsx',
    'backgroundColor: "#FF4D4F", // custom color',
    'backgroundColor: DesignTokens.colors.semantic.error,',
  ],
  [
    'commerce/components/ProductImageCarousel.tsx',
    'color: "#FFFFFF"',
    'color: DesignTokens.colors.text.inverse',
  ],

  // 9. AISizeBadge.tsx - #3D5E4D
  [
    'stylist/components/AISizeBadge.tsx',
    'color: "#3D5E4D"',
    'color: DesignTokens.colors.semantic.success',
  ],

  // 10. FeedbackModal.tsx - #FFB800
  [
    'stylist/components/FeedbackModal.tsx',
    'color={star <= rating ? "#FFB800" : DesignTokens.colors.neutral[300]}',
    'color={star <= rating ? DesignTokens.colors.semantic.warning : DesignTokens.colors.neutral[300]}',
  ],

  // 11. PhotoQualityIndicator.tsx - #E5E5E0
  [
    'tryon/components/PhotoQualityIndicator.tsx',
    'backgroundColor: "#E5E5E0"',
    'backgroundColor: DesignTokens.colors.neutral[200]',
  ],

  // 12. TimeSlotItem.tsx - #FFF8F5
  [
    'consultant/components/TimeSlotItem.tsx',
    'backgroundColor: "#FFF8F5"',
    'backgroundColor: DesignTokens.colors.backgrounds.secondary, // warm-tinted bg',
  ],

  // 13. CaseCard.tsx - #444
  [
    'consultant/components/CaseCard.tsx',
    'color: "#444"',
    'color: DesignTokens.colors.text.secondary',
  ],

  // 14. HeartRecommendScreen.tsx - #FFF3E0, #E65100
  [
    'home/components/heartrecommend/HeartRecommendScreen.tsx',
    "backgroundColor: '#FFF3E0', padding: Spacing.sm, paddingHorizontal: Spacing.md",
    'backgroundColor: DesignTokens.colors.backgrounds.secondary, padding: Spacing.sm, paddingHorizontal: Spacing.md, // warm-tinted bg',
  ],
  [
    'home/components/heartrecommend/HeartRecommendScreen.tsx',
    "color: '#E65100'",
    'color: DesignTokens.colors.semantic.warning',
  ],

  // 15. SmartRecommendations.tsx - #EFF6FF, #F5F3FF, #FEF2F2
  [
    'home/components/SmartRecommendations.tsx',
    'bgColor: "#EFF6FF" }, // custom color',
    'bgColor: DesignTokens.colors.backgrounds.secondary }, // info-tinted bg',
  ],
  [
    'home/components/SmartRecommendations.tsx',
    'bgColor: "#F5F3FF" }, // custom color',
    'bgColor: DesignTokens.colors.backgrounds.secondary }, // suggestion-tinted bg',
  ],
  [
    'home/components/SmartRecommendations.tsx',
    'bgColor: "#FEF2F2" }, // custom color',
    'bgColor: DesignTokens.colors.backgrounds.secondary }, // warning-tinted bg',
  ],

  // 16. RecommendationFeedCard.tsx - #4ADE80
  [
    'home/components/RecommendationFeedCard.tsx',
    'color: "#4ADE80", // custom color',
    'color: DesignTokens.colors.semantic.success,',
  ],

  // 17. SwipeCard.tsx - #F5D5C5
  [
    'home/components/heartrecommend/SwipeCard.tsx',
    'color: "#F5D5C5", // custom color',
    'color: DesignTokens.colors.brand.terracottaLight,',
  ],

  // 18. OnboardingSteps.tsx - #6E7A62
  [
    'onboarding/components/OnboardingSteps.tsx',
    '"#6E7A62"',
    'DesignTokens.colors.brand.sage',
  ],
];

let totalReplacements = 0;
const modifiedFiles = new Set();

for (const [relPath, search, replace] of replacements) {
  const filePath = path.join(BASE, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${relPath}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(filePath, content, 'utf8');
    totalReplacements++;
    modifiedFiles.add(relPath);
    console.log(`OK: ${relPath}`);
  } else {
    console.log(`SKIP (pattern not found): ${relPath} - looking for: ${search.substring(0, 60)}`);
  }
}

console.log(`\nTotal replacements: ${totalReplacements}`);
console.log(`Modified files: ${modifiedFiles.size}`);
for (const f of modifiedFiles) {
  console.log(`  - ${f}`);
}
