const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const IDENTITY_MODULES = ['auth', 'onboarding', 'privacy', 'users', 'profile'];
const PLATFORM_MODULES = ['health', 'metrics', 'merchant', 'notification', 'queue', 'analytics', 'feature-flags', 'recommendations', 'admin'];
const ALL_MIGRATED = [...IDENTITY_MODULES, ...PLATFORM_MODULES];

function walkTsFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      files = files.concat(walkTsFiles(p));
    } else if (entry.name.endsWith('.ts')) {
      files.push(p);
    }
  }
  return files;
}

function updateFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  for (const { from, to } of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      modified = true;
    }
  }
  if (modified) fs.writeFileSync(filePath, content, 'utf8');
  return modified;
}

let fixCount = 0;

const allFiles = walkTsFiles(SRC_DIR);

for (const file of allFiles) {
  const rel = path.relative(SRC_DIR, file);
  const parts = rel.split(path.sep);

  const replacements = [];

  if (rel.startsWith('domains' + path.sep + 'identity' + path.sep)) {
    const depthInModule = parts.length - 3;
    for (const mod of ALL_MIGRATED) {
      const identityMods = IDENTITY_MODULES.filter(m => m !== parts[2]);
      const platformMods = PLATFORM_MODULES;
      for (const im of identityMods) {
        if (depthInModule === 0) {
          replacements.push({ from: `../${im}/`, to: `../${im}/` });
        } else if (depthInModule === 1) {
          replacements.push({ from: `../../${im}/`, to: `../${im}/` });
        }
      }
      for (const pm of platformMods) {
        if (depthInModule === 0) {
          replacements.push({ from: `../${pm}/`, to: `../../platform/${pm}/` });
        } else if (depthInModule === 1) {
          replacements.push({ from: `../${pm}/`, to: `../../../platform/${pm}/` });
          replacements.push({ from: `../../${pm}/`, to: `../../../platform/${pm}/` });
        } else if (depthInModule === 2) {
          replacements.push({ from: `../${pm}/`, to: `../../../../platform/${pm}/` });
          replacements.push({ from: `../../${pm}/`, to: `../../../../platform/${pm}/` });
        }
      }
    }
    if (depthInModule === 0) {
      replacements.push({ from: '../../common/', to: '../../../common/' });
    } else if (depthInModule === 1) {
      replacements.push({ from: '../../common/', to: '../../../common/' });
    } else if (depthInModule === 2) {
      replacements.push({ from: '../../../common/', to: '../../../../common/' });
      replacements.push({ from: '../../common/', to: '../../../../common/' });
    }
  } else if (rel.startsWith('domains' + path.sep + 'platform' + path.sep)) {
    const depthInModule = parts.length - 3;
    for (const mod of IDENTITY_MODULES) {
      if (depthInModule === 0) {
        replacements.push({ from: `../${mod}/`, to: `../../identity/${mod}/` });
      } else if (depthInModule === 1) {
        replacements.push({ from: `../${mod}/`, to: `../../../identity/${mod}/` });
        replacements.push({ from: `../../${mod}/`, to: `../../../identity/${mod}/` });
      } else if (depthInModule === 2) {
        replacements.push({ from: `../${mod}/`, to: `../../../../identity/${mod}/` });
        replacements.push({ from: `../../${mod}/`, to: `../../../../identity/${mod}/` });
      }
    }
    const platformMods = PLATFORM_MODULES.filter(m => m !== parts[2]);
    for (const pm of platformMods) {
      if (depthInModule === 1) {
        replacements.push({ from: `../../${pm}/`, to: `../${pm}/` });
      }
    }
    if (depthInModule === 0) {
      replacements.push({ from: '../../common/', to: '../../../common/' });
    } else if (depthInModule === 1) {
      replacements.push({ from: '../../common/', to: '../../../common/' });
    } else if (depthInModule === 2) {
      replacements.push({ from: '../../../common/', to: '../../../../common/' });
      replacements.push({ from: '../../common/', to: '../../../../common/' });
    }
  } else if (rel.startsWith('domains' + path.sep + 'fashion' + path.sep)) {
    const depthInFashion = parts.length - 3;
    for (const mod of IDENTITY_MODULES) {
      if (depthInFashion === 0) {
        replacements.push({ from: `../${mod}/`, to: `../identity/${mod}/` });
      } else if (depthInFashion === 1) {
        replacements.push({ from: `../${mod}/`, to: `../../identity/${mod}/` });
        replacements.push({ from: `../../${mod}/`, to: `../../identity/${mod}/` });
      } else if (depthInFashion === 2) {
        replacements.push({ from: `../../${mod}/`, to: `../../../identity/${mod}/` });
      } else if (depthInFashion === 3) {
        replacements.push({ from: `../../../../${mod}/`, to: `../../../../../identity/${mod}/` });
        replacements.push({ from: `../../../${mod}/`, to: `../../../../identity/${mod}/` });
      }
    }
    for (const mod of PLATFORM_MODULES) {
      if (depthInFashion === 0) {
        replacements.push({ from: `../${mod}/`, to: `../platform/${mod}/` });
      } else if (depthInFashion === 1) {
        replacements.push({ from: `../${mod}/`, to: `../../platform/${mod}/` });
        replacements.push({ from: `../../${mod}/`, to: `../../platform/${mod}/` });
      } else if (depthInFashion === 2) {
        replacements.push({ from: `../../${mod}/`, to: `../../../platform/${mod}/` });
      } else if (depthInFashion === 3) {
        replacements.push({ from: `../../../../${mod}/`, to: `../../../../../platform/${mod}/` });
        replacements.push({ from: `../../../${mod}/`, to: `../../../../platform/${mod}/` });
      }
    }
  } else if (rel.startsWith('modules' + path.sep)) {
    const depth = parts.length - 1;
    for (const mod of IDENTITY_MODULES) {
      if (depth === 1) {
        replacements.push({ from: `../${mod}/`, to: `../domains/identity/${mod}/` });
      } else if (depth === 2) {
        replacements.push({ from: `../${mod}/`, to: `../../domains/identity/${mod}/` });
        replacements.push({ from: `../../${mod}/`, to: `../../domains/identity/${mod}/` });
      } else if (depth >= 3) {
        replacements.push({ from: `../${mod}/`, to: `../../domains/identity/${mod}/` });
        replacements.push({ from: `../../${mod}/`, to: `../../../domains/identity/${mod}/` });
      }
    }
    for (const mod of PLATFORM_MODULES) {
      if (depth === 1) {
        replacements.push({ from: `../${mod}/`, to: `../domains/platform/${mod}/` });
      } else if (depth === 2) {
        replacements.push({ from: `../${mod}/`, to: `../../domains/platform/${mod}/` });
        replacements.push({ from: `../../${mod}/`, to: `../../domains/platform/${mod}/` });
      } else if (depth >= 3) {
        replacements.push({ from: `../${mod}/`, to: `../../domains/platform/${mod}/` });
        replacements.push({ from: `../../${mod}/`, to: `../../../domains/platform/${mod}/` });
      }
    }
  } else if (rel.startsWith('common' + path.sep)) {
    for (const mod of IDENTITY_MODULES) {
      replacements.push({ from: `../modules/${mod}/`, to: `../domains/identity/${mod}/` });
    }
    for (const mod of PLATFORM_MODULES) {
      replacements.push({ from: `../modules/${mod}/`, to: `../domains/platform/${mod}/` });
    }
  }

  if (updateFile(file, replacements)) {
    fixCount++;
    console.log(`  Fixed: ${rel}`);
  }
}

console.log(`\nTotal fixes: ${fixCount}`);
