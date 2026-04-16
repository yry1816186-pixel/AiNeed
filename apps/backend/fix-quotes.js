const fs = require('fs');
const path = require('path');

function fixDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixDir(fullPath);
    } else if (entry.name.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      content = content.replace(/from\s+'([^']+)'\u201d/g, "from '$1'");
      content = content.replace(/from\s+'([^']+)'\u0022/g, "from '$1'");
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed:', fullPath);
      }
    }
  }
}

const target = path.join(__dirname, 'src', 'domains', 'ai-core', 'try-on');
fixDir(target);
console.log('Done');
