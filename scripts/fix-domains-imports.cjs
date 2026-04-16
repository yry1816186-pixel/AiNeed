const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const backendSrc = path.join(projectRoot, 'apps', 'backend', 'src');

const moduleToDomain = {
  'ai': 'domains/ai-core/ai',
  'ai-safety': 'domains/ai-core/ai-safety',
  'ai-stylist': 'domains/ai-core/ai-stylist',
  'photos': 'domains/ai-core/photos',
  'try-on': 'domains/ai-core/try-on',
};

const parentCommit = '3ecd99d1~1';

let fixed = 0;
let failed = 0;

for (const [moduleName, domainPath] of Object.entries(moduleToDomain)) {
  const domainDir = path.join(backendSrc, domainPath);
  
  const listOutput = execSync(
    `git ls-tree -r --name-only ${parentCommit} -- apps/backend/src/modules/${moduleName}/`,
    { cwd: projectRoot, encoding: 'utf8' }
  ).trim();
  
  if (!listOutput) {
    console.log(`No files found for module ${moduleName}`);
    continue;
  }
  
  const files = listOutput.split('\n').filter(Boolean);
  console.log(`Module ${moduleName}: ${files.length} files`);
  
  for (const gitFilePath of files) {
    if (!gitFilePath.endsWith('.ts')) continue;
    
    const relativePath = gitFilePath.replace(`apps/backend/src/modules/${moduleName}/`, '');
    const targetPath = path.join(domainDir, relativePath);
    
    try {
      const content = execSync(
        `git show ${parentCommit}:${gitFilePath}`,
        { cwd: projectRoot, encoding: 'utf8' }
      );
      
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content, 'utf8');
      fixed++;
    } catch (e) {
      console.error(`Failed: ${gitFilePath}`);
      failed++;
    }
  }
}

console.log(`\nRestored: ${fixed}, Failed: ${failed}`);
console.log('Now need to fix import paths in domains/ files...');
