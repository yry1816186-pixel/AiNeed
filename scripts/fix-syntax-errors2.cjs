const fs = require('fs');
const path = require('path');

const ROOT = 'C:/AiNeed';

const files = [
  'apps/mobile/src/design-system/ui/ChatBubble.tsx',
  'apps/mobile/src/design-system/ui/GradientButton.tsx',
  'apps/mobile/src/features/stylist/components/OutfitCard.tsx',
  'apps/mobile/src/features/customization/stores/customizationEditorStore.ts',
];

for (const file of files) {
  const fullPath = path.join(ROOT, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;

  content = content.replace(/^\uFEFF/, '');

  content = content.replace(/\nimport \{\nimport \{ useTheme, createStyles \} from '[^']*';\nimport \{ Spacing \} from '[^']*';\n  Colors,\n  Spacing as ThemeSpacing,\n  BorderRadius as ThemeBorderRadius,\n  Shadows as ThemeShadows,\n  Typography as ThemeTypography,\n\} from '\.\.\/theme';/g,
    `\nimport { useTheme, createStyles } from '../../shared/contexts/ThemeContext';\nimport {\n  Spacing as ThemeSpacing,\n  BorderRadius as ThemeBorderRadius,\n  Shadows as ThemeShadows,\n  Typography as ThemeTypography,\n} from '../theme';`);

  content = content.replace(/\nimport \{\nimport \{ useTheme \} from '[^']*';\n  Colors,\n  Typography as ThemeTypography,\n  Spacing as ThemeSpacing,\n  BorderRadius as ThemeBorderRadius,\n  Shadows as ThemeShadows,\n  DesignTokens,\n  SpringConfigs,\n\} from '[^']*';/g,
    `\nimport { useTheme } from '../../shared/contexts/ThemeContext';\nimport {\n  Typography as ThemeTypography,\n  Spacing as ThemeSpacing,\n  BorderRadius as ThemeBorderRadius,\n  Shadows as ThemeShadows,\n  SpringConfigs,\n} from '../../design-system/theme';`);

  content = content.replace(/\nimport \{\nimport \{ useTheme, createStyles \} from '[^']*';\n  AiStylistResolution,\n  AiStylistOutfitPlan,\n  AiStylistOutfitItem,\n\} from '[^']*ai-stylist\.api';/g,
    `\nimport { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';\nimport {\n  AiStylistResolution,\n  AiStylistOutfitPlan,\n  AiStylistOutfitItem,\n} from '../../../services/api/ai-stylist.api';`);

  content = content.replace(/\nimport type \{\nimport \{ useTheme \} from '[^']*';\nimport \{ flatColors as colors \} from '[^']*';\n\n  CustomizationTemplate as ApiTemplate,/g,
    `\nimport type {\n  CustomizationTemplate as ApiTemplate,`);

  if (content !== original) {
    const tmp = fullPath + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    try { fs.renameSync(tmp, fullPath); } catch (e) {
      fs.unlinkSync(tmp);
      fs.writeFileSync(fullPath, content, 'utf8');
    }
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`No change: ${file}`);
  }
}
