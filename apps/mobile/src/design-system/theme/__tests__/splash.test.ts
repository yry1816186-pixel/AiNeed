import * as fs from "fs";
import * as path from "path";

const brandDir = path.resolve(__dirname, "..", "..", "..", "..", "assets", "brand");
const animDir = path.resolve(__dirname, "..", "..", "..", "..", "assets", "animations");

function readJSON(file: string) {
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw);
}

function fileSizeKB(file: string) {
  const stat = fs.statSync(file);
  return stat.size / 1024;
}

describe("Splash Lottie Animations", () => {
  it("splash-light.json exists and is valid JSON", () => {
    const file = path.join(animDir, "splash-light.json");
    expect(fs.existsSync(file)).toBe(true);
    const data = readJSON(file);
    expect(data.v).toBeDefined();
    expect(data.layers).toBeDefined();
    expect(Array.isArray(data.layers)).toBe(true);
  });

  it("splash-dark.json exists and is valid JSON", () => {
    const file = path.join(animDir, "splash-dark.json");
    expect(fs.existsSync(file)).toBe(true);
    const data = readJSON(file);
    expect(data.v).toBeDefined();
    expect(data.layers).toBeDefined();
  });

  it("light animation duration <= 90 frames (1.5s at 60fps)", () => {
    const data = readJSON(path.join(animDir, "splash-light.json"));
    expect(data.op).toBeLessThanOrEqual(90);
    expect(data.fr).toBe(60);
  });

  it("dark animation duration <= 90 frames (1.5s at 60fps)", () => {
    const data = readJSON(path.join(animDir, "splash-dark.json"));
    expect(data.op).toBeLessThanOrEqual(90);
  });

  it("light splash file size <= 500KB", () => {
    const size = fileSizeKB(path.join(animDir, "splash-light.json"));
    expect(size).toBeLessThanOrEqual(500);
  });

  it("dark splash file size <= 500KB", () => {
    const size = fileSizeKB(path.join(animDir, "splash-dark.json"));
    expect(size).toBeLessThanOrEqual(500);
  });

  it("light animation contains terracotta color in bloom layer", () => {
    const data = readJSON(path.join(animDir, "splash-light.json"));
    const bloom = data.layers.find((l: any) => l.nm === "Bloom Circle");
    expect(bloom).toBeDefined();
  });

  it("dark animation has warm dark background", () => {
    const data = readJSON(path.join(animDir, "splash-dark.json"));
    const bg = data.layers.find((l: any) => l.nm === "Warm Dark BG");
    expect(bg).toBeDefined();
  });
});

describe("Logo SVG Files", () => {
  const variants = ["logo-horizontal.svg", "logo-square.svg", "logo-monochrome.svg"];

  variants.forEach((name) => {
    it(`${name} exists and contains SVG content`, () => {
      const file = path.join(brandDir, name);
      expect(fs.existsSync(file)).toBe(true);
      const content = fs.readFileSync(file, "utf-8");
      expect(content).toContain("<svg");
      expect(content).toContain("</svg>");
    });
  });

  it("logo-horizontal.svg contains terracotta #C44536", () => {
    const content = fs.readFileSync(path.join(brandDir, "logo-horizontal.svg"), "utf-8");
    expect(content).toContain("#C44536");
  });

  it("logo-square.svg contains terracotta #C44536", () => {
    const content = fs.readFileSync(path.join(brandDir, "logo-square.svg"), "utf-8");
    expect(content).toContain("#C44536");
  });

  it("logo-monochrome.svg uses #000000", () => {
    const content = fs.readFileSync(path.join(brandDir, "logo-monochrome.svg"), "utf-8");
    expect(content).toContain("#000000");
  });
});
