const fs = require('fs');
const path = require('path');

const backendSrc = path.resolve(__dirname, '..', 'apps', 'backend', 'src');
const prismaSchemaPath = path.resolve(__dirname, '..', 'apps', 'backend', 'prisma', 'schema.prisma');

const schema = fs.readFileSync(prismaSchemaPath, 'utf8');

const enumMatches = [...schema.matchAll(/enum\s+(\w+)\s*\{([^}]+)\}/g)];

const enumDeclarations = enumMatches.map(([_, name, values]) => {
  const members = values.trim().split('\n').map(v => v.trim()).filter(Boolean);
  return `export enum ${name} {\n${members.map(m => `  ${m} = '${m}',`).join('\n')}\n}`;
}).join('\n\n');

const outputPath = path.join(backendSrc, 'types', 'prisma-enums.ts');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `// Auto-generated from Prisma schema\n// Re-run: node scripts/generate-prisma-enums.cjs\n\n${enumDeclarations}\n`, 'utf8');

console.log(`Generated ${enumMatches.length} enum declarations to ${outputPath}`);
console.log('Enums:', enumMatches.map(m => m[1]).join(', '));
