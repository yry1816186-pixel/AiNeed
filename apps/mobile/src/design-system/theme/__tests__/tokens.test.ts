import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const APP_ROOT = join(__dirname, "..", "..", "..", "..");
const GENERATED_DIR = join(APP_ROOT, "src", "design-system", "theme", "tokens", "generated");
const TOKENS_DIR = join(APP_ROOT, "tokens");

describe("Design Token Pipeline", () => {
  beforeAll(() => {
    execSync("node scripts/build-tokens.mjs", {
      cwd: APP_ROOT,
      timeout: 30000,
    });
  });

  describe("Build Pipeline", () => {
    it("generates primitive-tokens.ts", () => {
      const filePath = join(GENERATED_DIR, "primitive-tokens.ts");
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, "utf-8");
      expect(content.length).toBeGreaterThan(500);
    });

    it("generates semantic-tokens.ts", () => {
      const filePath = join(GENERATED_DIR, "semantic-tokens.ts");
      expect(existsSync(filePath)).toBe(true);
    });

    it("generates component-tokens.ts", () => {
      const filePath = join(GENERATED_DIR, "component-tokens.ts");
      expect(existsSync(filePath)).toBe(true);
    });

    it("generates index.ts barrel export", () => {
      const filePath = join(GENERATED_DIR, "index.ts");
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, "utf-8");
      expect(content).toContain("primitiveTokens");
      expect(content).toContain("semanticTokens");
      expect(content).toContain("componentTokens");
    });
  });

  describe("Primitive Tokens", () => {
    let primitiveContent: string;

    beforeAll(() => {
      primitiveContent = readFileSync(join(GENERATED_DIR, "primitive-tokens.ts"), "utf-8");
    });

    it("contains all 6 categories", () => {
      expect(primitiveContent).toContain("colors:");
      expect(primitiveContent).toContain("spacing:");
      expect(primitiveContent).toContain("typography:");
      expect(primitiveContent).toContain("radius:");
      expect(primitiveContent).toContain("shadows:");
      expect(primitiveContent).toContain("motion:");
    });

    it("brand terracotta.500 is #C44536 (D-01)", () => {
      expect(primitiveContent).toContain('"500": "#C44536"');
      expect(primitiveContent).toContain("terracotta:");
    });

    it("status error is #DC3545 (D-03 cold red)", () => {
      expect(primitiveContent).toContain('error: "#DC3545"');
    });
  });

  describe("Semantic Tokens", () => {
    let semanticContent: string;

    beforeAll(() => {
      semanticContent = readFileSync(join(GENERATED_DIR, "semantic-tokens.ts"), "utf-8");
    });

    it("has light and dark variants for surface colors", () => {
      expect(semanticContent).toMatch(/primary:\s*\{[^}]*light:/);
      expect(semanticContent).toMatch(/primary:\s*\{[^}]*dark:/);
    });

    it("has light and dark variants for text colors", () => {
      const textSection = semanticContent.split("text:").pop()?.split("interactive:")[0];
      expect(textSection).toContain("light:");
      expect(textSection).toContain("dark:");
    });

    it("has light and dark variants for interactive colors", () => {
      const interactiveSection = semanticContent.split("interactive:").pop()?.split("status:")[0];
      expect(interactiveSection).toContain("light:");
      expect(interactiveSection).toContain("dark:");
    });

    it("has light and dark variants for status colors", () => {
      const statusSection = semanticContent.split("status:").pop()?.split("border:")[0];
      expect(statusSection).toContain("light:");
      expect(statusSection).toContain("dark:");
    });

    it("references are fully resolved (no {primitives. remaining)", () => {
      expect(semanticContent).not.toContain("{primitives.");
      expect(semanticContent).not.toContain("{semantics.");
    });

    it("interactive.primary.light is terracotta #C44536", () => {
      expect(semanticContent).toContain('"#C44536"');
    });

    it("interactive.primary.dark is coral (NOT terracotta)", () => {
      const primarySection = semanticContent.split("primary:").pop()?.split("secondary:")[0];
      expect(primarySection).toBeTruthy();
      const lightMatch = primarySection?.match(/light:\s*"([^"]+)"/);
      const darkMatch = primarySection?.match(/dark:\s*"([^"]+)"/);
      expect(lightMatch).toBeTruthy();
      expect(darkMatch).toBeTruthy();
      expect(lightMatch![1]).toBe("#C44536");
      expect(darkMatch![1]).not.toBe("#C44536");
    });
  });

  describe("Component Tokens", () => {
    let componentContent: string;

    beforeAll(() => {
      componentContent = readFileSync(join(GENERATED_DIR, "component-tokens.ts"), "utf-8");
    });

    it("references are fully resolved (no {semantics. remaining)", () => {
      expect(componentContent).not.toContain("{semantics.");
      expect(componentContent).not.toContain("{primitives.");
    });

    it("contains all 7 component types", () => {
      expect(componentContent).toContain("button:");
      expect(componentContent).toContain("card:");
      expect(componentContent).toContain("input:");
      expect(componentContent).toContain("avatar:");
      expect(componentContent).toContain("badge:");
      expect(componentContent).toContain("bottomSheet:");
      expect(componentContent).toContain("toast:");
    });
  });

  describe("YAML Source Files", () => {
    it("has 6 primitive YAML files", () => {
      const primitivesDir = join(TOKENS_DIR, "primitives");
      const files = readdirSync(primitivesDir).filter((f) => f.endsWith(".yaml"));
      expect(files).toHaveLength(6);
    });

    it("has 6 semantic YAML files", () => {
      const semanticsDir = join(TOKENS_DIR, "semantics");
      const files = readdirSync(semanticsDir).filter((f) => f.endsWith(".yaml"));
      expect(files).toHaveLength(6);
    });

    it("has 7 component YAML files", () => {
      const componentsDir = join(TOKENS_DIR, "components");
      const files = readdirSync(componentsDir).filter((f) => f.endsWith(".yaml"));
      expect(files).toHaveLength(7);
    });

    it("total 19 YAML files", () => {
      let total = 0;
      for (const sub of ["primitives", "semantics", "components"]) {
        const subDir = join(TOKENS_DIR, sub);
        total += readdirSync(subDir).filter((f) => f.endsWith(".yaml")).length;
      }
      expect(total).toBe(19);
    });
  });
});
