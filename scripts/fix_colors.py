import re
import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace colors. with flatColors. in StyleSheet.create blocks
pattern = r'(const styles = StyleSheet\.create\(\{.*?\}\);)'
def replace_colors_in_stylesheet(match):
    return match.group(1).replace('colors.', 'flatColors.')

new_content = re.sub(pattern, replace_colors_in_stylesheet, content, count=1, flags=re.DOTALL)

# Also replace in standalone function components that don't use useTheme()
# Find ColorHarmonyArc and CIEDE2000Arc functions and replace colors. with flatColors.
# These are between the main component and the StyleSheet.create
# Pattern: from "function ColorHarmonyArc" to "function CIEDE2000Arc" end, and from "function CIEDE2000Arc" to its end

# Replace colors.primary and colors.textInverse in SVG components (ColorHarmonyArc and CIEDE2000Arc)
# These are at module level, not inside a component with useTheme()
new_content = new_content.replace('stroke={colors.primary}', 'stroke={flatColors.primary}')
new_content = new_content.replace('fill={colors.textInverse}', 'fill={flatColors.textInverse}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Fixed {filepath}")
