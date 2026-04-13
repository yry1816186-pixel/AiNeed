#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const nodeModulesDir = path.join(projectRoot, "node_modules");

const expoModules = [
  "expo",
  "expo-modules-core",
  "expo-constants",
  "expo-blur",
  "expo-camera",
  "expo-file-system",
  "expo-font",
  "expo-haptics",
  "expo-image-loader",
  "expo-image-manipulator",
  "expo-image-picker",
  "expo-keep-awake",
  "expo-linear-gradient",
  "expo-secure-store",
  "expo-splash-screen",
  "expo-linking",
  "expo-asset",
];

const rnModules = [
  "react-native-reanimated",
  "react-native-gesture-handler",
  "react-native-screens",
  "react-native-safe-area-context",
  "react-native-svg",
  "react-native-fast-image",
  "@react-native-async-storage/async-storage",
];

const allModules = [...expoModules, ...rnModules];

const java17Block = [
  "  compileOptions {",
  "    sourceCompatibility JavaVersion.VERSION_17",
  "    targetCompatibility JavaVersion.VERSION_17",
  "  }",
  "",
  "  kotlinOptions {",
  "    jvmTarget = JavaVersion.VERSION_17.majorVersion",
  "  }",
].join("\n");

const safeExtGetBlock = `// Define safeExtGet at project level FIRST
ext.safeExtGet = { prop, fallback ->
  rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
}
`;

const fixes = {
  success: [],
  skipped: [],
  failed: [],
};

function patchFile(filePath, transform, description) {
  const relativePath = path.relative(projectRoot, filePath);
  
  if (!fs.existsSync(filePath)) {
    fixes.skipped.push({ file: relativePath, reason: "NOT_FOUND" });
    return false;
  }

  try {
    const original = fs.readFileSync(filePath, "utf8");
    const eol = original.includes("\r\n") ? "\r\n" : "\n";
    const normalized = original.replace(/\r\n/g, "\n");
    let updated = transform(normalized);

    if (!updated || updated === normalized) {
      fixes.skipped.push({ file: relativePath, reason: "NO_CHANGES_NEEDED" });
      return false;
    }

    if (!updated.endsWith("\n")) {
      updated += "\n";
    }

    updated = updated.replace(/\n/g, eol);

    if (updated === original) {
      fixes.skipped.push({ file: relativePath, reason: "ALREADY_FIXED" });
      return false;
    }

    fs.writeFileSync(filePath, updated);
    fixes.success.push({ file: relativePath, description });
    return true;
  } catch (error) {
    fixes.failed.push({ file: relativePath, error: error.message });
    return false;
  }
}

function normalizeBuildGradle(content) {
  let next = content;

  // Fix safeExtGet scope issue - add at project level BEFORE any other code
  const hasProjectLevelSafeExtGet = /^ext\.safeExtGet\s*=/m.test(content);
  
  if (!hasProjectLevelSafeExtGet) {
    const pluginMatch = next.match(/^(apply plugin: ['"][^'"]+['"]\n)+/m);
    if (pluginMatch) {
      const insertPos = pluginMatch.index + pluginMatch[0].length;
      next = next.slice(0, insertPos) + "\n" + safeExtGetBlock + next.slice(insertPos);
    } else {
      const firstNonComment = next.search(/^[^/\s]/m);
      if (firstNonComment > 0) {
        next = next.slice(0, firstNonComment) + safeExtGetBlock + next.slice(firstNonComment);
      } else {
        next = safeExtGetBlock + next;
      }
    }
  }

  // Fix buildscript block - add safeExtGet inside buildscript if it uses ext.safeExtGet
  // This fixes the issue where buildscript has its own ext scope
  next = next.replace(
    /buildscript\s*\{\s*\n(\s*)\/\/ Ensures backward compatibility\n(\s*)ext\.getKotlinVersion = \{\n(\s*)if \(ext\.has\("kotlinVersion"\)\) \{\n(\s*)ext\.kotlinVersion\(\)\n(\s*)\} else \{\n(\s*)ext\.safeExtGet\("kotlinVersion", "[^"]+"\)\n(\s*)\}\n(\s*)\}/g,
    (match, indent1, indent2, indent3, indent4, indent5, indent6, indent7, indent8) => {
      return `buildscript {
${indent1}// Simple helper that allows the root project to override versions declared by this library.
${indent1}ext.safeExtGet = { prop, fallback ->
${indent1}  rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
${indent1}}

${indent1}// Ensures backward compatibility
${indent1}ext.getKotlinVersion = {
${indent1}  if (ext.has("kotlinVersion")) {
${indent1}    ext.kotlinVersion()
${indent1}  } else {
${indent1}    ext.safeExtGet("kotlinVersion", "1.8.10")
${indent1}  }
${indent1}}`;
    }
  );

  // compileSdkVersion → compileSdk
  next = next.replace(
    /compileSdkVersion\s+safeExtGet\("compileSdkVersion",\s*\d+\)/g,
    'compileSdk safeExtGet("compileSdkVersion", 36)'
  );

  // targetSdkVersion update
  next = next.replace(
    /targetSdkVersion\s+safeExtGet\("targetSdkVersion",\s*\d+\)/g,
    'targetSdkVersion safeExtGet("targetSdkVersion", 36)'
  );

  // minSdkVersion update
  next = next.replace(
    /minSdkVersion\s+safeExtGet\("minSdkVersion",\s*\d+\)/g,
    'minSdkVersion safeExtGet("minSdkVersion", 23)'
  );

  // classifier → archiveClassifier
  next = next.replace(/classifier\s*=\s*'sources'/g, "archiveClassifier = 'sources'");

  // Disable publishing blocks
  next = next.replace(
    /\nafterEvaluate\s*\{\s*publishing\s*\{[\s\S]*?\n\}\s*\n/gm,
    "\n// Publishing disabled for local builds\n\n"
  );

  next = next.replace(
    /\n([ \t]*)publishing\s*\{\n\1  singleVariant\("release"\)\s*\{\n\1    withSourcesJar\(\)\n\1  \}\n\1\}\n/g,
    "\n$1// Publishing disabled for local builds\n"
  );

  // JVM 17 - replace version checks with direct JVM 17 config
  next = next.replace(
    /  def agpVersion = com\.android\.Version\.ANDROID_GRADLE_PLUGIN_VERSION\n  if \(agpVersion\.tokenize\('\.'\)\[0\]\.toInteger\(\) < 8\) \{\n    compileOptions \{\n      sourceCompatibility JavaVersion\.VERSION_17\n      targetCompatibility JavaVersion\.VERSION_17\n    \}\n\n    kotlinOptions \{\n      jvmTarget = JavaVersion\.VERSION_17\.majorVersion\n    \}\n  \}/g,
    java17Block
  );

  // Replace old Java versions
  next = next.replace(/JavaVersion\.VERSION_1_8/g, "JavaVersion.VERSION_17");
  next = next.replace(/JavaVersion\.VERSION_11/g, "JavaVersion.VERSION_17");
  next = next.replace(/jvmTarget\s*=\s*["']1\.8["']/g, "jvmTarget = JavaVersion.VERSION_17.majorVersion");
  next = next.replace(/jvmTarget\s*=\s*["']11["']/g, "jvmTarget = JavaVersion.VERSION_17.majorVersion");

  // Ensure compileOptions with VERSION_17 exists in android block
  if (!/compileOptions\s*\{[\s\S]*?sourceCompatibility[\s\S]*?VERSION_17/.test(next)) {
    next = next.replace(
      /(android\s*\{\n\s*compileSdk[^\n]*\n)/,
      `$1\n${java17Block}\n`
    );
  }

  // Remove excessive newlines
  next = next.replace(/\n{3,}/g, "\n\n");
  return next;
}

function normalizeConstantsInterface(content) {
  if (content.includes("int getDeviceYearClass();")) {
    return content;
  }

  return content.replace(
    "  List<String> getSystemFonts();\n}",
    "  List<String> getSystemFonts();\n  int getDeviceYearClass();\n}"
  );
}

function normalizeConstantsService(content) {
  let next = content;
  
  next = next.replace(
    '"deviceYearClass" to deviceYearClass,',
    '"deviceYearClass" to getDeviceYearClass(),'
  );
  
  next = next.replace(
    '"deviceYearClass" to deviceYearClass',
    '"deviceYearClass" to getDeviceYearClass()'
  );
  
  return next;
}

function normalizePermissionsService(content) {
  return content.replace(
    "return requestedPermissions.contains(permission)",
    "return requestedPermissions?.contains(permission) ?: false"
  );
}

function normalizeExpoModulesCorePlugin(content) {
  let next = content;

  // Disable the android configuration block
  next = next.replace(
    /    \/\/ Setup build options that are common for all modules[\s\S]*?  }\n}\n\next\.applyKotlinExpoModulesCorePlugin =/m,
    [
      "    // Setup build options that are common for all modules",
      "    // Disabled - each module should configure its own android block",
      "  }",
      "}",
      "",
      "ext.applyKotlinExpoModulesCorePlugin =",
    ].join("\n")
  );

  // Disable publishing
  next = next.replace(
    /ext\.useExpoPublishing = \{[\s\S]*?\n\}(?=\n\next\.useCoreDependencies =)/m,
    ['ext.useExpoPublishing = {', '  // Publishing disabled for local builds', "}"].join("\n")
  );

  return next;
}

function normalizeReactNativeBuildGradle(content) {
  let next = content;

  // Add safeExtGet at project level if not present
  const hasProjectLevelSafeExtGet = /^ext\.safeExtGet\s*=/m.test(content);
  
  if (!hasProjectLevelSafeExtGet) {
    const pluginMatch = next.match(/^(apply plugin: ['"][^'"]+['"]\n)+/m);
    if (pluginMatch) {
      const insertPos = pluginMatch.index + pluginMatch[0].length;
      next = next.slice(0, insertPos) + "\n" + safeExtGetBlock + next.slice(insertPos);
    }
  }

  // Fix buildscript block - add safeExtGet inside buildscript if it uses ext.safeExtGet
  next = next.replace(
    /buildscript\s*\{\s*\n(\s*)\/\/ Ensures backward compatibility\n(\s*)ext\.getKotlinVersion = \{\n(\s*)if \(ext\.has\("kotlinVersion"\)\) \{\n(\s*)ext\.kotlinVersion\(\)\n(\s*)\} else \{\n(\s*)ext\.safeExtGet\("kotlinVersion", "[^"]+"\)\n(\s*)\}\n(\s*)\}/g,
    (match, indent1, indent2, indent3, indent4, indent5, indent6, indent7, indent8) => {
      return `buildscript {
${indent1}// Simple helper that allows the root project to override versions declared by this library.
${indent1}ext.safeExtGet = { prop, fallback ->
${indent1}  rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
${indent1}}

${indent1}// Ensures backward compatibility
${indent1}ext.getKotlinVersion = {
${indent1}  if (ext.has("kotlinVersion")) {
${indent1}    ext.kotlinVersion()
${indent1}  } else {
${indent1}    ext.safeExtGet("kotlinVersion", "1.8.10")
${indent1}  }
${indent1}}`;
    }
  );

  // compileSdkVersion → compileSdk
  next = next.replace(
    /compileSdkVersion\s+(\d+|safeExtGet\([^)]+\))/g,
    'compileSdk safeExtGet("compileSdkVersion", 36)'
  );

  // targetSdkVersion update
  next = next.replace(
    /targetSdkVersion\s+(\d+|safeExtGet\([^)]+\))/g,
    'targetSdkVersion safeExtGet("targetSdkVersion", 36)'
  );

  // Replace old Java versions
  next = next.replace(/JavaVersion\.VERSION_1_8/g, "JavaVersion.VERSION_17");
  next = next.replace(/JavaVersion\.VERSION_11/g, "JavaVersion.VERSION_17");
  next = next.replace(/jvmTarget\s*=\s*["']1\.8["']/g, "jvmTarget = JavaVersion.VERSION_17.majorVersion");
  next = next.replace(/jvmTarget\s*=\s*["']11["']/g, "jvmTarget = JavaVersion.VERSION_17.majorVersion");

  return next;
}

console.log("=".repeat(60));
console.log("寻裳 APK Build - Comprehensive Fix Script v3");
console.log("=".repeat(60));
console.log("");

console.log("Phase 1: Fixing Expo modules build.gradle files...");
console.log("-".repeat(40));
for (const moduleName of expoModules) {
  const buildGradlePath = path.join(nodeModulesDir, moduleName, "android", "build.gradle");
  patchFile(buildGradlePath, normalizeBuildGradle, `Fixed ${moduleName} build.gradle`);
}

console.log("");
console.log("Phase 2: Fixing React Native modules build.gradle files...");
console.log("-".repeat(40));
for (const moduleName of rnModules) {
  const buildGradlePath = path.join(nodeModulesDir, moduleName, "android", "build.gradle");
  patchFile(buildGradlePath, normalizeReactNativeBuildGradle, `Fixed ${moduleName} build.gradle`);
}

console.log("");
console.log("Phase 3: Fixing Java/Kotlin source files...");
console.log("-".repeat(40));

patchFile(
  path.join(
    nodeModulesDir,
    "expo-modules-core",
    "android",
    "src",
    "main",
    "java",
    "expo",
    "modules",
    "interfaces",
    "constants",
    "ConstantsInterface.java"
  ),
  normalizeConstantsInterface,
  "Added getDeviceYearClass() method"
);

patchFile(
  path.join(
    nodeModulesDir,
    "expo-constants",
    "android",
    "src",
    "main",
    "java",
    "expo",
    "modules",
    "constants",
    "ConstantsService.kt"
  ),
  normalizeConstantsService,
  "Fixed deviceYearClass reference"
);

patchFile(
  path.join(
    nodeModulesDir,
    "expo-modules-core",
    "android",
    "src",
    "main",
    "java",
    "expo",
    "modules",
    "adapters",
    "react",
    "permissions",
    "PermissionsService.kt"
  ),
  normalizePermissionsService,
  "Fixed null safety issue"
);

console.log("");
console.log("Phase 4: Fixing Gradle plugin files...");
console.log("-".repeat(40));

patchFile(
  path.join(nodeModulesDir, "expo-modules-core", "android", "ExpoModulesCorePlugin.gradle"),
  normalizeExpoModulesCorePlugin,
  "Disabled auto android configuration"
);

console.log("");
console.log("=".repeat(60));
console.log("Fix Summary");
console.log("=".repeat(60));

console.log("");
console.log(`✅ Successfully fixed: ${fixes.success.length} files`);
if (fixes.success.length > 0) {
  fixes.success.forEach(f => console.log(`   - ${f.file}: ${f.description}`));
}

console.log("");
console.log(`⏭️ Skipped: ${fixes.skipped.length} files`);
if (fixes.skipped.length > 0 && fixes.skipped.filter(f => f.reason !== "NO_CHANGES_NEEDED").length > 0) {
  fixes.skipped.filter(f => f.reason !== "NO_CHANGES_NEEDED").forEach(f => 
    console.log(`   - ${f.file}: ${f.reason}`)
  );
}

console.log("");
if (fixes.failed.length > 0) {
  console.log(`❌ Failed: ${fixes.failed.length} files`);
  fixes.failed.forEach(f => console.log(`   - ${f.file}: ${f.error}`));
  process.exit(1);
} else {
  console.log("🎉 All fixes applied successfully!");
  console.log("");
  console.log("Next steps:");
  console.log("  1. cd android");
  console.log("  2. .\\gradlew clean");
  console.log("  3. .\\gradlew assembleRelease");
  console.log("");
}
