const fs = require('fs');
const path = require('path');

const resolvedCache = new Map();

const IGNORED_MODULES = [
  'source-map',
  'source-map-support',
  'istanbul-lib-source-maps',
];

function splitPackageRequest(request) {
  const segments = request.split('/');

  if (request.startsWith('@')) {
    return {
      packageName: segments.slice(0, 2).join('/'),
      subPath: segments.slice(2).join('/'),
    };
  }

  return {
    packageName: segments[0],
    subPath: segments.slice(1).join('/'),
  };
}

function findFromPnpmStore(request, rootDir) {
  const cacheKey = `${rootDir}::${request}`;
  if (resolvedCache.has(cacheKey)) {
    return resolvedCache.get(cacheKey);
  }

  const storeRoot = path.resolve(rootDir, '../../node_modules/.pnpm');
  const { packageName, subPath } = splitPackageRequest(request);
  const packagePrefix = `${packageName.replace('/', '+')}@`;

  let storeEntries = [];
  try {
    storeEntries = fs
      .readdirSync(storeRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(packagePrefix))
      .map((entry) => entry.name)
      .sort()
      .reverse();
  } catch {
    resolvedCache.set(cacheKey, null);
    return null;
  }

  for (const entryName of storeEntries) {
    const baseCandidate = path.join(
      storeRoot,
      entryName,
      'node_modules',
      ...packageName.split('/'),
    );
    const candidate = subPath
      ? path.join(baseCandidate, subPath)
      : baseCandidate;

    try {
      const resolved = require.resolve(candidate);
      resolvedCache.set(cacheKey, resolved);
      return resolved;
    } catch {
      // Continue searching across versions in the pnpm store.
    }
  }

  resolvedCache.set(cacheKey, null);
  return null;
}

module.exports = (request, options) => {
  if (IGNORED_MODULES.includes(request)) {
    return options.defaultResolver(request, {
      ...options,
      paths: [path.resolve(options.rootDir, '../../node_modules')],
    });
  }

  try {
    return options.defaultResolver(request, options);
  } catch (error) {
    const extraPaths = [
      options.basedir,
      path.resolve(options.rootDir),
      path.resolve(options.rootDir, 'node_modules'),
      path.resolve(options.rootDir, '../../node_modules'),
      path.resolve(options.rootDir, '../../node_modules/.pnpm/node_modules'),
    ].filter(Boolean);

    try {
      return require.resolve(request, { paths: extraPaths });
    } catch {
      const storeResolved = findFromPnpmStore(request, options.rootDir);
      if (storeResolved) {
        return storeResolved;
      }

      return options.defaultResolver(request, {
        ...options,
        paths: [...(options.paths || []), ...extraPaths],
      });
    }
  }
};
