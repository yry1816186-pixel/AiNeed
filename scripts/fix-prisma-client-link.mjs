import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const pnpmStoreDir = path.join(repoRoot, "node_modules", ".pnpm");
const packageRoot = process.cwd();

function resolveClientDir() {
  const candidates = [
    path.join(packageRoot, "node_modules", "@prisma", "client"),
    path.join(repoRoot, "node_modules", "@prisma", "client"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function findGeneratedPrismaDir() {
  if (!fs.existsSync(pnpmStoreDir)) {
    return null;
  }

  const entries = fs.readdirSync(pnpmStoreDir).filter((entry) =>
    entry.startsWith("@prisma+client@"),
  );

  for (const entry of entries) {
    const candidate = path.join(
      pnpmStoreDir,
      entry,
      "node_modules",
      ".prisma",
    );
    const defaultClient = path.join(candidate, "client", "default.js");
    if (fs.existsSync(defaultClient)) {
      return candidate;
    }
  }

  return null;
}

function ensureLinkedDir(sourceDir, destDir) {
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.rmSync(destDir, { recursive: true, force: true });

  const relativeSource = path.relative(path.dirname(destDir), sourceDir);

  try {
    fs.symlinkSync(relativeSource, destDir, "dir");
    console.log(`Linked ${destDir} -> ${relativeSource}`);
    return;
  } catch (error) {
    console.warn(`Symlink failed, falling back to copy: ${error.message}`);
  }

  fs.cpSync(sourceDir, destDir, { recursive: true });
  console.log(`Copied ${sourceDir} -> ${destDir}`);
}

const clientDir = resolveClientDir();

if (!clientDir) {
  console.error(
    `Missing Prisma client directory under ${packageRoot} or ${repoRoot}`,
  );
  process.exit(1);
}

const generatedDir = findGeneratedPrismaDir();

if (!generatedDir) {
  console.error("Unable to locate generated Prisma client under node_modules/.pnpm");
  process.exit(1);
}

const targetDirs = [
  path.join(packageRoot, "node_modules", ".prisma"),
  path.join(repoRoot, "node_modules", ".prisma"),
  path.join(clientDir, ".prisma"),
  path.join(clientDir, "node_modules", ".prisma"),
];

for (const targetDir of targetDirs) {
  ensureLinkedDir(generatedDir, targetDir);
}
