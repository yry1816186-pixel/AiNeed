const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'apps', 'mobile', 'src', 'features', 'customization', 'screens', 'CustomizationOrderDetailScreen.tsx');
const tmp = f + '.tmp';
let c = fs.readFileSync(f, 'utf8');
c = c.replace("import { Colors, Spacing, BorderRadius, Shadows } from '../../../design-system/theme';",
  "import { Spacing, BorderRadius, Shadows } from '../../../design-system/theme';\nimport { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';");
c = c.replace('import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";', '');
c = c.replace("import { flatColors as colors } from '../../../design-system/theme';", '');
c = c.replace('export const CustomizationOrderDetailScreen: React.FC = () => {',
  'export const CustomizationOrderDetailScreen: React.FC = () => {\n  const { colors } = useTheme();');
c = c.replace(/DesignTokens\.colors\.neutral\.white/g, 'colors.surface');
c = c.replace(/DesignTokens\.colors\.brand\.terracotta/g, 'colors.primary');
c = c.replace(/DesignTokens\.colors\.text\.primary/g, 'colors.textPrimary');
c = c.replace(/DesignTokens\.colors\.text\.secondary/g, 'colors.textSecondary');
c = c.replace(/DesignTokens\.colors\.text\.tertiary/g, 'colors.textTertiary');
c = c.replace(/DesignTokens\.colors\.backgrounds\.primary/g, 'colors.surface');
c = c.replace(/Colors\.primary/g, 'colors.primary');
c = c.replace(/Colors\.surface/g, 'colors.surface');
c = c.replace(/Colors\.neutral\[400\]/g, 'colors.neutral[400]');
fs.writeFileSync(tmp, c, 'utf8');
console.log('Written to tmp');
