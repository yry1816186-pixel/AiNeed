const fs = require('fs');
const path = require('path');

const fixes = {
  'apps/mobile/src/design-system/ui/ChatBubble.tsx': {
    old: `import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

// 引入主题令牌
import { DesignTokens } from "../theme/tokens/design-tokens";
import {
import { useTheme, createStyles } from '../../shared/contexts/ThemeContext';
import { Spacing } from '../../design-system/theme';
  Colors,
  Spacing as ThemeSpacing,
  BorderRadius as ThemeBorderRadius,
  Shadows as ThemeShadows,
  Typography as ThemeTypography,
} from '../theme';`,
    new: `import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useTheme, createStyles } from '../../shared/contexts/ThemeContext';
import {
  Spacing as ThemeSpacing,
  BorderRadius as ThemeBorderRadius,
  Shadows as ThemeShadows,
  Typography as ThemeTypography,
} from '../theme';`
  },
  'apps/mobile/src/design-system/ui/GradientButton.tsx': {
    old: `// 引入主题令牌
import {
import { useTheme } from '../../design-system/theme';
  Colors,
  Typography as ThemeTypography,
  Spacing as ThemeSpacing,
  BorderRadius as ThemeBorderRadius,
  Shadows as ThemeShadows,
  DesignTokens,
  SpringConfigs,
} from '../../design-system/theme';`,
    new: `import { useTheme } from '../../shared/contexts/ThemeContext';
import {
  Typography as ThemeTypography,
  Spacing as ThemeSpacing,
  BorderRadius as ThemeBorderRadius,
  Shadows as ThemeShadows,
  SpringConfigs,
} from '../../design-system/theme';`
  },
  'apps/mobile/src/features/stylist/components/OutfitCard.tsx': {
    old: `import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing, flatColors as colors } from '../../../design-system/theme';

import {
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
  AiStylistResolution,
  AiStylistOutfitPlan,
  AiStylistOutfitItem,
} from '../../../services/api/ai-stylist.api';`,
    new: `import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { Spacing } from '../../../design-system/theme';
import {
  AiStylistResolution,
  AiStylistOutfitPlan,
  AiStylistOutfitItem,
} from '../../../services/api/ai-stylist.api';`
  },
  'apps/mobile/src/features/customization/stores/customizationEditorStore.ts': {
    old: `import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import type {
import { useTheme } from '../../../design-system/theme/tokens/design-tokens';
import { flatColors as colors } from '../../../design-system/theme';

  CustomizationTemplate as ApiTemplate,`,
    new: `import type {
  CustomizationTemplate as ApiTemplate,`
  }
};

for (const [file, { old, new: newVal }] of Object.entries(fixes)) {
  const fullPath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(old)) {
    content = content.replace(old, newVal);
    const tmp = fullPath + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    try { fs.renameSync(tmp, fullPath); } catch (e) {
      fs.unlinkSync(tmp);
      fs.writeFileSync(fullPath, content, 'utf8');
    }
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`Pattern not found in: ${file}`);
  }
}
