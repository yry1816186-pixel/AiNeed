const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Escape workspace root path for use in RegExp (handles Windows backslashes)
const ws = workspaceRoot.replace(/[/\\]/g, '[/\\\\]');

const aliases = {
  '@xuno/types': path.resolve(projectRoot, '../../packages/types/src/index.ts'),
  // Polyfills for Expo modules used in source but not available in bare RN
  'expo-router': path.resolve(projectRoot, 'src/polyfills/expo-router.tsx'),
  'expo-image-picker': path.resolve(projectRoot, 'src/polyfills/expo-image-picker.ts'),
  'expo-blur': path.resolve(projectRoot, 'src/polyfills/expo-blur.tsx'),
  'expo-camera': path.resolve(projectRoot, 'src/polyfills/expo-camera.tsx'),
  'expo-media-library': path.resolve(projectRoot, 'src/polyfills/expo-media-library.ts'),
  'expo-file-system': path.resolve(projectRoot, 'src/polyfills/expo-file-system.ts'),
  'expo-linear-gradient': path.resolve(projectRoot, 'src/polyfills/expo-linear-gradient.tsx'),
  // Native module polyfills
  '@shopify/flash-list': path.resolve(projectRoot, 'src/polyfills/flash-list.tsx'),
  'react-native-fast-image': path.resolve(projectRoot, 'src/polyfills/react-native-fast-image.tsx'),
};

const config = {
  // 🚀 优化模块序列化 - 减少启动时的 native bridge 调用
  serializer: {
    getModulesRunBeforeMainModulePath() {
      return require.resolve('react-native/Libraries/Core/InitializeCore');
    },
  },

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // ✅ 已启用内联 requires
      },
    }),
    // 🚀 代码压缩配置 - 进一步减小 bundle 体积
    minifierConfig: {
      keep_fnames: false, // 不保留函数名（减小体积）
      mangle: {
        keep_classnames: false, // 不保留类名（减小体积）
      },
      output: {
        comments: false, // 移除注释
        ascii_only: true, // 仅 ASCII 字符（减小体积）
      },
      compress: {
        drop_console: __DEV__ ? false : true, // 生产环境移除 console
        drop_debugger: __DEV__ ? false : true, // 生产环境移除 debugger
        passes: 2, // 压缩轮次
      },
    },
  },
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    unstable_enableSymlinks: false,
    blockList: [
      // Large binary files that crash Metro's file map (>2GB on Node.js)
      new RegExp('\\.zip$'),
      new RegExp('\\.exe$'),
      new RegExp('\\.pt$'),
      new RegExp('\\.tar(\\.gz|\\.bz2)?$'),
      new RegExp('\\.7z$'),
      new RegExp('\\.rar$'),
      new RegExp('\\.whl$'),
      new RegExp('\\.tar\\.gz$'),
      // Non-JS directories in the monorepo root
      new RegExp('^' + ws + '/ml/.*'),
      new RegExp('^' + ws + '/models/.*'),
      new RegExp('^' + ws + '/data/.*'),
      new RegExp('^' + ws + '/checkpoints/.*'),
      new RegExp('^' + ws + '/\\.venv-ml/.*'),
      new RegExp('^' + ws + '/archive/.*'),
      new RegExp('^' + ws + '/delivery/.*'),
      new RegExp('^' + ws + '/monitoring/.*'),
      new RegExp('^' + ws + '/k8s/.*'),
      new RegExp('^' + ws + '/docs/.*'),
      new RegExp('^' + ws + '/\\.hvigor/.*'),
      new RegExp('^' + ws + '/\\.expo/.*'),
      new RegExp('^' + ws + '/\\.git/.*'),
      new RegExp('^' + ws + '/\\.pnpm-store/.*'),
      new RegExp('^' + ws + '/literature-processing/.*'),
      new RegExp('^' + ws + '/_template/.*'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      // Handle @/ path alias (maps to project root)
      if (moduleName.startsWith('@/')) {
        const resolvedPath = path.resolve(projectRoot, moduleName.substring(2));
        return context.resolveRequest(context, resolvedPath, platform);
      }
      if (aliases[moduleName]) {
        return context.resolveRequest(context, aliases[moduleName], platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
  watchFolders: [workspaceRoot],
  projectRoot,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
