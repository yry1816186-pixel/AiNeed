import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function getByPath(obj, pathStr) {
  const parts = pathStr.split(".");
  let current = obj;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else if (i > 0) {
      const combinedKey = parts.slice(i - 1).join(".");
      const parentPath = parts.slice(0, i - 1);
      let parent = obj;
      for (const p of parentPath) {
        if (parent && typeof parent === "object" && p in parent) {
          parent = parent[p];
        } else {
          return undefined;
        }
      }
      if (parent && typeof parent === "object" && combinedKey in parent) {
        current = parent[combinedKey];
        break;
      }
      return undefined;
    } else {
      return undefined;
    }
  }
  return current;
}

function resolveReferences(obj, root) {
  if (typeof obj === "string") {
    const refMatch = obj.match(/^\{([^}]+)\}$/);
    if (refMatch) {
      const resolved = getByPath(root, refMatch[1]);
      if (resolved !== undefined) {
        return resolveReferences(resolved, root);
      }
    }
    return obj.replace(/\{([^}]+)\}/g, (match, ref) => {
      const resolved = getByPath(root, ref);
      if (resolved !== undefined) {
        if (typeof resolved === "string" || typeof resolved === "number" || typeof resolved === "boolean") {
          return String(resolved);
        }
        if (typeof resolved === "object") {
          return JSON.stringify(resolved);
        }
      }
      return match;
    });
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveReferences(item, root));
  }
  if (obj && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveReferences(value, root);
    }
    return result;
  }
  return obj;
}

function deepResolve(obj, root, depth = 0) {
  if (depth > 20) return obj;
  const resolved = resolveReferences(obj, root);
  const before = JSON.stringify(obj);
  const after = JSON.stringify(resolved);
  if (after !== before) {
    return deepResolve(resolved, root, depth + 1);
  }
  return resolved;
}

function serializeToTs(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  const pad1 = "  ".repeat(indent + 1);

  if (obj === null || obj === undefined) return "undefined";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (typeof obj === "number") return String(obj);
  if (typeof obj === "boolean") return String(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    const items = obj.map((v) => `${pad1}${serializeToTs(v, indent + 1)}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";
    const items = entries.map(([key, value]) => {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      return `${pad1}${safeKey}: ${serializeToTs(value, indent + 1)}`;
    });
    return `{\n${items.join(",\n")}\n${pad}}`;
  }
  return String(obj);
}

function generateTsFile(name, data) {
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  return `export const ${name} = ${serializeToTs(data)} as const;\n\nexport type ${capitalizedName}Type = typeof ${name};\n`;
}

function buildTokens() {
  const tokensDir = join(__dirname, "..", "tokens");
  const outputDir = join(__dirname, "..", "src", "design-system", "theme", "tokens", "generated");

  mkdirSync(outputDir, { recursive: true });

  let allTokens = {};
  for (const sub of ["primitives", "semantics", "components"]) {
    const subDir = join(tokensDir, sub);
    try {
      const files = readdirSync(subDir).filter((f) => f.endsWith(".yaml"));
      for (const file of files) {
        const content = readFileSync(join(subDir, file), "utf-8");
        const parsed = YAML.parse(content);
        allTokens = deepMerge(allTokens, parsed);
      }
    } catch {
      // directory might not exist yet
    }
  }

  const resolved = deepResolve(allTokens, allTokens);

  const primitiveData = resolved.primitives || {};
  const semanticData = resolved.semantics || {};
  const componentData = resolved.components || {};

  writeFileSync(
    join(outputDir, "primitive-tokens.ts"),
    generateTsFile("primitiveTokens", primitiveData),
    "utf-8"
  );

  writeFileSync(
    join(outputDir, "semantic-tokens.ts"),
    generateTsFile("semanticTokens", semanticData),
    "utf-8"
  );

  writeFileSync(
    join(outputDir, "component-tokens.ts"),
    generateTsFile("componentTokens", componentData),
    "utf-8"
  );

  const indexContent = `export { primitiveTokens } from './primitive-tokens';\nexport { semanticTokens } from './semantic-tokens';\nexport { componentTokens } from './component-tokens';\n`;
  writeFileSync(join(outputDir, "index.ts"), indexContent, "utf-8");

  console.log("Tokens built successfully!");
  console.log("  Primitive keys:", Object.keys(primitiveData).join(", "));
  console.log("  Semantic keys:", Object.keys(semanticData).join(", "));
  console.log("  Component keys:", Object.keys(componentData).join(", "));
}

try {
  buildTokens();
} catch (err) {
  console.error("Token build failed:", err);
  process.exit(1);
}
