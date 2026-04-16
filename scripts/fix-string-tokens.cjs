const fs = require('fs');
const path = require('path');

const BASE = 'C:/AiNeed/apps/mobile/src/features';

const files = [
  'consultant/components/CaseCard.tsx',
  'consultant/screens/AdvisorProfileScreen.tsx',
  'consultant/screens/AdvisorListScreen.tsx',
  'consultant/components/CalendarGrid.tsx',
  'consultant/components/ConsultantCard.tsx',
  'consultant/components/ProposalCard.tsx',
  'commerce/screens/OrderDetailScreen.tsx',
  'commerce/components/CouponSelector.tsx',
];

let total = 0;

for (const f of files) {
  const fp = path.join(BASE, f);
  if (!fs.existsSync(fp)) {
    console.log('SKIP:', f);
    continue;
  }
  let c = fs.readFileSync(fp, 'utf8');
  const orig = c;

  // Fix "DesignTokens.colors.neutral[N]" -> DesignTokens.colors.neutral[N]
  c = c.replace(/"DesignTokens\.colors\.neutral\[(\d+)\]"/g, 'DesignTokens.colors.neutral[$1]');

  // Fix "DesignTokens.colors.X.Y" -> DesignTokens.colors.X.Y
  c = c.replace(/"DesignTokens\.colors\.([a-zA-Z]+)\.([a-zA-Z]+)"/g, 'DesignTokens.colors.$1.$2');

  if (c !== orig) {
    fs.writeFileSync(fp, c, 'utf8');
    total++;
    console.log('FIXED:', f);
  } else {
    console.log('NO CHANGE:', f);
  }
}

console.log('Total fixed:', total);
