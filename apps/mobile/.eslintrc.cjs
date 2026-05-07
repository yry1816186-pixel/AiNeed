module.exports = {
  "root": true,
  "extends": ["../../.eslintrc.json", "expo", "plugin:react/recommended", "plugin:@typescript-eslint/recommended-requiring-type-checking"],
  "plugins": ["@typescript-eslint", "react"],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "import/export": "off",
    "import/namespace": "off",
    "import/no-duplicates": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-argument": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-return": "warn",
    "@typescript-eslint/no-unsafe-enum-comparison": "off",
    "@typescript-eslint/no-floating-promises": "warn",
    "@typescript-eslint/no-misused-promises": "warn",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/unbound-method": "off",
    "@typescript-eslint/no-base-to-string": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_"
      }
    ],
    "curly": ["warn", "all"],
    "react-hooks/rules-of-hooks": "off",
    "@typescript-eslint/no-var-requires": "off",
    "react/display-name": "off",
    "@typescript-eslint/no-redundant-type-constituents": "off",
    "no-restricted-syntax": [
      "warn",
      {
        "selector": "Property[key.name='color'] > Literal[value=/^#[0-9a-fA-F]/]",
        "message": "Hardcoded hex color not allowed. Use DesignTokens.colors.* or useTheme()"
      },
      {
        "selector": "Property[key.name='backgroundColor'] > Literal[value=/^#[0-9a-fA-F]/]",
        "message": "Hardcoded hex color not allowed. Use DesignTokens.colors.* or useTheme()"
      },
      {
        "selector": "Property[key.name='borderColor'] > Literal[value=/^#[0-9a-fA-F]/]",
        "message": "Hardcoded hex color not allowed. Use DesignTokens.colors.* or useTheme()"
      },
      {
        "selector": "Property[key.name='tintColor'] > Literal[value=/^#[0-9a-fA-F]/]",
        "message": "Hardcoded hex color not allowed. Use DesignTokens.colors.* or useTheme()"
      },
      {
        "selector": "Property[key.name='placeholderTextColor'] > Literal[value=/^#[0-9a-fA-F]/]",
        "message": "Hardcoded hex color not allowed. Use DesignTokens.colors.* or useTheme()"
      },
      {
        "selector": "Property[key.name='shadowColor'] > Literal[value=/^#[0-9a-fA-F]/]",
        "message": "Hardcoded hex color not allowed. Use DesignTokens.colors.* or useTheme()"
      },
      {
        "selector": "Property[key.name='fontSize'] > Literal",
        "message": "Hardcoded fontSize not allowed. Use DesignTokens.typography.*"
      }
    ]
  },
  "ignorePatterns": [
    "node_modules",
    ".expo",
    "dist",
    "coverage",
    "*.config.js",
    "src/types/navigation.d.ts",
    "e2e",
    "scripts",
    "__tests__",
    "src/features/community",
    "src/features/consultant",
    "src/features/customization",
    "src/features/home/components/heartrecommend",
    "src/design-system/ui",
    "src/shared/components/screens/TryOnScreen.tsx",
    "src/shared/components/screens/TryOnHistoryScreen.tsx",
    "src/shared/components/immersive/ImmersiveComponents.tsx",
    "src/polyfills/expo-camera.tsx",
    "src/0"
  ]
}
;