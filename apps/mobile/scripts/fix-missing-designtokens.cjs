const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");

const files = [
  "design-system/primitives/Button/Button.tsx",
  "design-system/primitives/Card/Card.tsx",
  "design-system/primitives/Input/Input.tsx",
  "screens/CustomizationPreviewScreen.tsx",
  "screens/CustomizationScreen.tsx",
  "screens/SettingsScreen.tsx",
  "screens/style-quiz/components/QuizImageCard.tsx",
  "screens/style-quiz/components/QuizProgress.tsx",
];

for (const relPath of files) {
  const filePath = path.join(SRC_DIR, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${relPath} not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, "utf-8");
  if (content.includes("import { DesignTokens }")) {
    console.log(`SKIP: ${relPath} already has DesignTokens import`);
    continue;
  }

  const dir = path.dirname(filePath);
  const rel = path.relative(dir, path.join(SRC_DIR, "design-system", "theme", "tokens", "design-tokens.ts"));
  const normalized = rel.replace(/\\/g, "/").replace(/\.ts$/, "");
  const importLine = `import { DesignTokens } from "${normalized}";`;

  const lastImportIndex = content.lastIndexOf("\nimport ");
  if (lastImportIndex !== -1) {
    const afterImport = content.indexOf("\n", lastImportIndex + 1);
    content = content.slice(0, afterImport) + "\n" + importLine + content.slice(afterImport);
  } else {
    content = importLine + "\n" + content;
  }

  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`FIXED: ${relPath}`);
}
