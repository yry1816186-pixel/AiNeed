import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const ROOT = path.resolve(__dirname, "../..");
const BACKEND_SRC = path.join(ROOT, "apps/backend/src");

function grepRecursive(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        walk(full);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".spec.ts") &&
        !entry.name.endsWith(".test.ts")
      ) {
        const content = fs.readFileSync(full, "utf-8");
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (pattern.test(line)) {
            results.push(`${path.relative(ROOT, full)}:${i + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
  walk(dir);
  return results;
}

function test(name: string, fn: () => boolean) {
  try {
    const passed = fn();
    if (passed) {
      console.log(`  ✓ ${name}`);
    } else {
      console.log(`  ✗ ${name}`);
    }
    return passed;
  } catch (e: any) {
    console.log(`  ✗ ${name} — ${e.message}`);
    return false;
  }
}

console.log("\n🔒 Security Audit Tests\n");

let allPassed = true;

// Test 1: No $executeRawUnsafe or $queryRawUnsafe
allPassed =
  test("No $executeRawUnsafe/$queryRawUnsafe in backend source", () => {
    const results = grepRecursive(BACKEND_SRC, /\$executeRawUnsafe|\$queryRawUnsafe/);
    if (results.length > 0) {
      console.log("    Found:", results.join("\n    "));
      return false;
    }
    return true;
  }) && allPassed;

// Test 2: No TODO CONSENT markers
allPassed =
  test("No TODO.*CONSENT markers in backend source", () => {
    const results = grepRecursive(BACKEND_SRC, /TODO.*CONSENT/i);
    if (results.length > 0) {
      console.log("    Found:", results.join("\n    "));
      return false;
    }
    return true;
  }) && allPassed;

// Test 3: pnpm.overrides with at least 10 entries
allPassed =
  test("package.json has pnpm.overrides with ≥10 entries", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
    const overrides = pkg.pnpm?.overrides;
    if (!overrides) {
      console.log("    Missing pnpm.overrides section");
      return false;
    }
    const count = Object.keys(overrides).length;
    if (count < 10) {
      console.log(`    Only ${count} overrides found`);
      return false;
    }
    return true;
  }) && allPassed;

// Test 4: All 14 documented overrides present
const REQUIRED_OVERRIDES = [
  "xmldom",
  "@xmldom/xmldom@<0.8.13",
  "serialize-javascript@<7.0.5",
  "minimatch@<3.1.4",
  "braces@<3.0.3",
  "node-fetch@<2.6.7",
  "semver@>=7.0.0 <7.5.2",
  "http-cache-semantics@<4.1.1",
  "webpack@>=5.0.0-alpha.0 <5.94.0",
  "webpack-dev-server@<=5.2.0",
  "esbuild@<=0.24.2",
  "micromatch@<4.0.8",
  "@babel/runtime@<7.26.10",
  "got@<11.8.5",
];

allPassed =
  test("All 14 documented security overrides present", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
    const overrides = Object.keys(pkg.pnpm?.overrides || {});
    const missing = REQUIRED_OVERRIDES.filter((key) => !overrides.includes(key));
    if (missing.length > 0) {
      console.log(`    Missing overrides: ${missing.join(", ")}`);
      return false;
    }
    return true;
  }) && allPassed;

// Test 5: No plaintext passwords or hardcoded secrets in backend source
allPassed =
  test("No hardcoded passwords in backend source", () => {
    const results = grepRecursive(BACKEND_SRC, /password\s*[:=]\s*["'][^"']+["']/i);
    const filtered = results.filter(
      (r) =>
        !r.includes("passwordHash") &&
        !r.includes("password_reset") &&
        !r.includes("validatePassword") &&
        !r.includes("hashPassword") &&
        !r.includes("comparePassword") &&
        !r.includes("passwordField") &&
        !r.includes("POSTGRES_PASSWORD") &&
        !r.includes("REDIRECT") &&
        !r.includes("description") &&
        !r.includes("example") &&
        !r.includes("Body") &&
        !r.includes("Dto") &&
        !r.includes("typeof") &&
        !r.includes("MINIO_SECRET")
    );
    if (filtered.length > 0) {
      console.log(`    Warning: ${filtered.length} potential hardcoded passwords`);
      console.log("    ", filtered.slice(0, 5).join("\n    "));
      return false;
    }
    return true;
  }) && allPassed;

console.log(`\n${allPassed ? "✅ All security tests passed" : "❌ Some security tests failed"}\n`);

process.exit(allPassed ? 0 : 1);
