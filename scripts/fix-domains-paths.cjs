const fs = require('fs');
const path = require('path');

const backendSrc = path.resolve(__dirname, '..', 'apps', 'backend', 'src');

function walkDir(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...walkDir(filePath));
    } else if (file.endsWith('.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

const domainDir = path.join(backendSrc, 'domains', 'ai-core');
const files = walkDir(domainDir);

const targetDirs = {
  '@/common/': path.join(backendSrc, 'common'),
  '@/modules/': path.join(backendSrc, 'modules'),
  '@/domains/ai-core/': path.join(backendSrc, 'domains', 'ai-core'),
};

let totalFixed = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  const fileDir = path.dirname(filePath);
  
  for (const [alias, targetDir] of Object.entries(targetDirs)) {
    const regex = new RegExp(`from ["']${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^"']+)["']`, 'g');
    
    content = content.replace(regex, (match, importPath) => {
      const resolvedTarget = path.resolve(targetDir, importPath);
      let relPath = path.relative(fileDir, resolvedTarget).replace(/\\/g, '/');
      if (!relPath.startsWith('.')) {
        relPath = './' + relPath;
      }
      return `from "${relPath}"`;
    });
    
    if (content !== fs.readFileSync(filePath, 'utf8')) {
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
  }
}

console.log(`Fixed import paths in ${totalFixed} files`);
