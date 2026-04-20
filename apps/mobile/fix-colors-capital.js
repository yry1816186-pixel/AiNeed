const fs = require("fs");
const path = require("path");

function walk(dir) {
  let files = [];
  try {
    fs.readdirSync(dir).forEach((f) => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory() && !p.includes("node_modules")) {
        files.push(...walk(p));
      } else if (f.endsWith(".tsx") || f.endsWith(".ts")) {
        files.push(p);
      }
    });
  } catch {}
  return files;
}

let fixed = 0;
walk("src").forEach((f) => {
  if (f.includes("__tests__") || f.includes(".test.") || f.includes(".spec.")) return;
  let c = fs.readFileSync(f, "utf8");
  const orig = c;

  const usesColors = /\bColors\.\w+/.test(c);
  const importsColors = /import\s+\{[^}]*\bColors\b[^}]*\}\s+from/.test(c);

  if (usesColors && !importsColors) {
    const relFromSrc = path.relative("src", path.dirname(f));
    const depth = relFromSrc.split(path.sep).filter(Boolean).length;
    const prefix = "../".repeat(depth);

    const themeImportMatch = c.match(/import\s+\{([^}]+)\}\s+from\s+['"](\.\.\/)+theme['"]/);
    if (themeImportMatch) {
      const existingImports = themeImportMatch[1];
      if (!existingImports.includes("Colors")) {
        c = c.replace(
          themeImportMatch[0],
          themeImportMatch[0].replace(/\{([^}]+)\}/, `{$1, Colors}`)
        );
      }
    } else {
      const designThemeMatch = c.match(
        /import\s+\{([^}]+)\}\s+from\s+['"](\.\.\/)+design-system\/theme['"]/
      );
      if (designThemeMatch) {
        const existingImports = designThemeMatch[1];
        if (!existingImports.includes("Colors")) {
          c = c.replace(
            designThemeMatch[0],
            designThemeMatch[0].replace(/\{([^}]+)\}/, `{$1, Colors}`)
          );
        }
      } else {
        const lastImportIndex = c.lastIndexOf("\nimport ");
        if (lastImportIndex !== -1) {
          const lineEnd = c.indexOf("\n", lastImportIndex + 1);
          const importLine = `\nimport { Colors } from '${prefix}theme';`;
          c = c.slice(0, lineEnd) + importLine + c.slice(lineEnd);
        }
      }
    }
  }

  if (c !== orig) {
    try {
      fs.writeFileSync(f, c);
      fixed++;
      console.log("Fixed:", f);
    } catch (e) {
      console.error("Error writing:", f, e.message);
    }
  }
});
console.log("Total fixed:", fixed);
