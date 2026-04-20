const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/wardrobe/screens/WardrobeScreen.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace colors.xxx with DesignTokens.Colors.xxx in StyleSheet.create block
// Find the StyleSheet.create block and replace colors references
const styleStart = content.indexOf('const styles = StyleSheet.create({');
const styleEnd = content.lastIndexOf('});');

if (styleStart !== -1 && styleEnd !== -1) {
  const before = content.substring(0, styleStart);
  const stylesBlock = content.substring(styleStart, styleEnd + 2);
  const after = content.substring(styleEnd + 2);

  const fixedStyles = stylesBlock.replace(/colors\./g, 'DesignTokens.Colors.');

  content = before + fixedStyles + after;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed WardrobeScreen.tsx: replaced colors. with DesignTokens.Colors. in StyleSheet');
} else {
  console.log('Could not find StyleSheet.create block');
}
