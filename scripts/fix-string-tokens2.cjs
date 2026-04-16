const fs = require('fs');
const path = require('path');

// Fix string-form token references in ColorSeasonCard.tsx
const fp = 'C:/AiNeed/apps/mobile/src/features/profile/screens/components/ColorSeasonCard.tsx';
let content = fs.readFileSync(fp, 'utf8');
const orig = content;

// Fix "colors.xxx" -> colors.xxx (but not inside comments or other strings)
content = content.replace(/"colors\.([a-zA-Z]+)"/g, 'colors.$1');

// Fix "colors.xxx[N]" -> colors.xxx[N]
content = content.replace(/"colors\.([a-zA-Z]+)\[(\d+)\]"/g, 'colors.$1[$2]');

if (content !== orig) {
  fs.writeFileSync(fp, content, 'utf8');
  console.log('FIXED: ColorSeasonCard.tsx');
} else {
  console.log('NO CHANGE: ColorSeasonCard.tsx');
}

// Fix string-form token references in ColorPicker.tsx
const fp2 = 'C:/AiNeed/apps/mobile/src/features/customization/components/ColorPicker.tsx';
let content2 = fs.readFileSync(fp2, 'utf8');
const orig2 = content2;

content2 = content2.replace(/"colors\.([a-zA-Z]+)"/g, 'colors.$1');
content2 = content2.replace(/"colors\.([a-zA-Z]+)\[(\d+)\]"/g, 'colors.$1[$2]');

if (content2 !== orig2) {
  fs.writeFileSync(fp2, content2, 'utf8');
  console.log('FIXED: ColorPicker.tsx');
} else {
  console.log('NO CHANGE: ColorPicker.tsx');
}
