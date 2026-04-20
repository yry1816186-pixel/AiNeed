const fs = require('fs');
const f = 'C:/AiNeed/apps/mobile/src/features/customization/stores/customizationEditorStore.ts';
let c = fs.readFileSync(f, 'utf8');
c = c.replace('import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";\n', '');
c = c.replace('DesignTokens.colors.neutral.black', 'colors.neutral[900]');
fs.writeFileSync(f + '.tmp', c, 'utf8');
try { fs.renameSync(f + '.tmp', f); } catch (e) { fs.unlinkSync(f + '.tmp'); fs.writeFileSync(f, c, 'utf8'); }
console.log('Fixed');
