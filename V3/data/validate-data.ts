import * as fs from "fs";
import * as path from "path";

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: Record<string, number>;
}

const KG_DIR = path.resolve(__dirname, "knowledge-graph");
const PRISMA_DIR = path.resolve(__dirname, "..", "apps", "backend", "prisma");

const REQUIRED_KG_FILES = [
  { name: "fashion-rules.json", type: "array", minCount: 100 },
  { name: "color-theory.json", type: "object", requiredKeys: ["four_season_theory", "classic_schemes", "color_taboos"] },
  { name: "body-type-guide.json", type: "object", requiredKeys: ["body_types"] },
  { name: "occasion-guide.json", type: "object", requiredKeys: ["occasions"] },
  { name: "style-taxonomy.json", type: "object", requiredKeys: ["styles"] },
];

const REQUIRED_PRISMA_FILES = ["schema.prisma", "seed.ts"];

function validateJsonFile(filePath: string): { data: unknown; parseError: string | null } {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    return { data, parseError: null };
  } catch (e) {
    return { data: null, parseError: (e as Error).message };
  }
}

function validateFashionRules(data: unknown[]): ValidationResult {
  const result: ValidationResult = { file: "fashion-rules.json", valid: true, errors: [], warnings: [], stats: {} };
  const rules = data as Record<string, unknown>[];
  result.stats["totalRules"] = rules.length;

  const categories = new Set<string>();
  const requiredFields = ["id", "category", "condition", "recommendation", "confidence", "source"];
  const validCategories = ["color_harmony", "body_type", "occasion", "style_mix", "seasonal"];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    for (const field of requiredFields) {
      if (!(field in rule)) {
        result.errors.push(`Rule ${i}: missing field "${field}"`);
        result.valid = false;
      }
    }
    if (rule.category && !validCategories.includes(rule.category as string)) {
      result.warnings.push(`Rule ${i}: unknown category "${rule.category}"`);
    }
    if (rule.category) categories.add(rule.category as string);
    if (typeof rule.confidence === "number" && (rule.confidence < 0 || rule.confidence > 1)) {
      result.errors.push(`Rule ${i}: confidence ${rule.confidence} out of range [0,1]`);
      result.valid = false;
    }
  }

  result.stats["categories"] = categories.size;
  result.stats["categoryBreakdown"] = Object.fromEntries(
    [...categories].map((c) => [c, rules.filter((r) => r.category === c).length])
  );

  if (rules.length < 100) {
    result.warnings.push(`Only ${rules.length} rules, recommended minimum is 100`);
  }

  return result;
}

function validateColorTheory(data: Record<string, unknown>): ValidationResult {
  const result: ValidationResult = { file: "color-theory.json", valid: true, errors: [], warnings: [], stats: {} };

  const fst = data.four_season_theory as Record<string, unknown>;
  if (!fst || !Array.isArray(fst.types)) {
    result.errors.push("four_season_theory.types is missing or not an array");
    result.valid = false;
  } else {
    result.stats["seasonTypes"] = fst.types.length;
    for (let i = 0; i < fst.types.length; i++) {
      const t = fst.types[i] as Record<string, unknown>;
      if (!t.suitableColors || !Array.isArray(t.suitableColors)) {
        result.errors.push(`Season type ${i}: missing suitableColors`);
        result.valid = false;
      }
      if (!t.unsuitableColors || !Array.isArray(t.unsuitableColors)) {
        result.errors.push(`Season type ${i}: missing unsuitableColors`);
        result.valid = false;
      }
    }
  }

  const cs = data.classic_schemes as Record<string, unknown>;
  if (!cs) {
    result.errors.push("classic_schemes is missing");
    result.valid = false;
  } else {
    const schemes = ["complementary", "analogous", "triadic", "split_complementary"];
    for (const s of schemes) {
      if (!cs[s]) {
        result.warnings.push(`classic_schemes.${s} is missing`);
      }
    }
    result.stats["colorSchemes"] = schemes.filter((s) => cs[s]).length;
  }

  const taboos = data.color_taboos as Record<string, unknown>;
  if (!taboos || !Array.isArray(taboos.rules)) {
    result.errors.push("color_taboos.rules is missing or not an array");
    result.valid = false;
  } else {
    result.stats["tabooRules"] = taboos.rules.length;
  }

  return result;
}

function validateBodyTypeGuide(data: Record<string, unknown>): ValidationResult {
  const result: ValidationResult = { file: "body-type-guide.json", valid: true, errors: [], warnings: [], stats: {} };

  const types = data.body_types as Record<string, unknown>[];
  if (!Array.isArray(types)) {
    result.errors.push("body_types is missing or not an array");
    result.valid = false;
    return result;
  }

  result.stats["bodyTypes"] = types.length;
  const requiredFields = ["id", "name", "suitableItems", "avoidItems", "tips"];

  for (let i = 0; i < types.length; i++) {
    const t = types[i] as Record<string, unknown>;
    for (const field of requiredFields) {
      if (!(field in t)) {
        result.errors.push(`Body type ${i}: missing field "${field}"`);
        result.valid = false;
      }
    }
    if (t.suitableItems && Array.isArray(t.suitableItems)) {
      result.stats[`suitableItems_${t.id}`] = t.suitableItems.length;
    }
    if (t.avoidItems && Array.isArray(t.avoidItems)) {
      result.stats[`avoidItems_${t.id}`] = t.avoidItems.length;
    }
  }

  return result;
}

function validateOccasionGuide(data: Record<string, unknown>): ValidationResult {
  const result: ValidationResult = { file: "occasion-guide.json", valid: true, errors: [], warnings: [], stats: {} };

  const occasions = data.occasions as Record<string, unknown>[];
  if (!Array.isArray(occasions)) {
    result.errors.push("occasions is missing or not an array");
    result.valid = false;
    return result;
  }

  result.stats["occasions"] = occasions.length;
  const requiredFields = ["id", "name", "recommendedStyles", "recommendedItems", "avoidItems", "tips"];

  for (let i = 0; i < occasions.length; i++) {
    const o = occasions[i] as Record<string, unknown>;
    for (const field of requiredFields) {
      if (!(field in o)) {
        result.errors.push(`Occasion ${i}: missing field "${field}"`);
        result.valid = false;
      }
    }
  }

  return result;
}

function validateStyleTaxonomy(data: Record<string, unknown>): ValidationResult {
  const result: ValidationResult = { file: "style-taxonomy.json", valid: true, errors: [], warnings: [], stats: {} };

  const styles = data.styles as Record<string, unknown>[];
  if (!Array.isArray(styles)) {
    result.errors.push("styles is missing or not an array");
    result.valid = false;
    return result;
  }

  result.stats["styles"] = styles.length;
  const requiredFields = ["id", "name", "keyItems", "representativeBrands", "colorPreferences", "suitableFor"];

  for (let i = 0; i < styles.length; i++) {
    const s = styles[i] as Record<string, unknown>;
    for (const field of requiredFields) {
      if (!(field in s)) {
        result.errors.push(`Style ${i}: missing field "${field}"`);
        result.valid = false;
      }
    }
  }

  return result;
}

function validatePrismaSchema(): ValidationResult {
  const result: ValidationResult = { file: "schema.prisma", valid: true, errors: [], warnings: [], stats: {} };
  const schemaPath = path.join(PRISMA_DIR, "schema.prisma");

  if (!fs.existsSync(schemaPath)) {
    result.errors.push("schema.prisma not found");
    result.valid = false;
    return result;
  }

  const content = fs.readFileSync(schemaPath, "utf-8");
  const modelMatches = content.match(/^model\s+\w+/gm);
  result.stats["models"] = modelMatches ? modelMatches.length : 0;

  const requiredModels = [
    "User", "Brand", "Category", "ClothingItem", "Outfit", "OutfitItem",
    "StyleRule", "AvatarTemplate", "ProductTemplate", "CustomDesign",
  ];
  for (const model of requiredModels) {
    if (!content.includes(`model ${model}`)) {
      result.errors.push(`Missing model: ${model}`);
      result.valid = false;
    }
  }

  return result;
}

function validateSeedFile(): ValidationResult {
  const result: ValidationResult = { file: "seed.ts", valid: true, errors: [], warnings: [], stats: {} };
  const seedPath = path.join(PRISMA_DIR, "seed.ts");

  if (!fs.existsSync(seedPath)) {
    result.errors.push("seed.ts not found");
    result.valid = false;
    return result;
  }

  const content = fs.readFileSync(seedPath, "utf-8");

  const requiredArrays = [
    { name: "BRANDS", minCount: 10 },
    { name: "CATEGORIES", minCount: 8 },
    { name: "CLOTHING_DATA", minCount: 200 },
    { name: "STYLE_RULES", minCount: 50 },
    { name: "OUTFITS", minCount: 10 },
    { name: "AVATAR_TEMPLATES", minCount: 5 },
    { name: "PRODUCT_TEMPLATES", minCount: 10 },
  ];

  for (const arr of requiredArrays) {
    const regex = new RegExp(`${arr.name}\\s*[:=]`);
    if (!regex.test(content)) {
      result.errors.push(`Missing array: ${arr.name}`);
      result.valid = false;
    } else {
      result.stats[arr.name] = arr.minCount;
    }
  }

  if (!content.includes("async function main")) {
    result.errors.push("Missing main function");
    result.valid = false;
  }

  if (!content.includes("prisma.brand.create")) {
    result.warnings.push("No brand seeding found");
  }
  if (!content.includes("prisma.clothingItem.create")) {
    result.warnings.push("No clothing item seeding found");
  }

  return result;
}

function main(): void {
  console.log("🔍 AiNeed V3 数据验证报告\n");
  console.log("=".repeat(60));

  const allResults: ValidationResult[] = [];

  for (const fileSpec of REQUIRED_KG_FILES) {
    const filePath = path.join(KG_DIR, fileSpec.name);
    console.log(`\n📄 验证: ${fileSpec.name}`);

    if (!fs.existsSync(filePath)) {
      const r: ValidationResult = { file: fileSpec.name, valid: false, errors: ["File not found"], warnings: [], stats: {} };
      allResults.push(r);
      console.log(`  ❌ 文件不存在`);
      continue;
    }

    const { data, parseError } = validateJsonFile(filePath);
    if (parseError) {
      const r: ValidationResult = { file: fileSpec.name, valid: false, errors: [parseError], warnings: [], stats: {} };
      allResults.push(r);
      console.log(`  ❌ JSON解析失败: ${parseError}`);
      continue;
    }

    let result: ValidationResult;
    switch (fileSpec.name) {
      case "fashion-rules.json":
        result = validateFashionRules(data as unknown[]);
        break;
      case "color-theory.json":
        result = validateColorTheory(data as Record<string, unknown>);
        break;
      case "body-type-guide.json":
        result = validateBodyTypeGuide(data as Record<string, unknown>);
        break;
      case "occasion-guide.json":
        result = validateOccasionGuide(data as Record<string, unknown>);
        break;
      case "style-taxonomy.json":
        result = validateStyleTaxonomy(data as Record<string, unknown>);
        break;
      default:
        result = { file: fileSpec.name, valid: true, errors: [], warnings: [], stats: {} };
    }

    allResults.push(result);
    const icon = result.valid ? "✅" : "❌";
    console.log(`  ${icon} ${result.valid ? "通过" : "失败"}`);
    for (const [k, v] of Object.entries(result.stats)) {
      console.log(`  📊 ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
    }
    for (const err of result.errors) {
      console.log(`  ❌ ${err}`);
    }
    for (const w of result.warnings) {
      console.log(`  ⚠️  ${w}`);
    }
  }

  console.log(`\n📄 验证: schema.prisma`);
  const schemaResult = validatePrismaSchema();
  allResults.push(schemaResult);
  const schemaIcon = schemaResult.valid ? "✅" : "❌";
  console.log(`  ${schemaIcon} ${schemaResult.valid ? "通过" : "失败"}`);
  for (const [k, v] of Object.entries(schemaResult.stats)) {
    console.log(`  📊 ${k}: ${v}`);
  }
  for (const err of schemaResult.errors) {
    console.log(`  ❌ ${err}`);
  }

  console.log(`\n📄 验证: seed.ts`);
  const seedResult = validateSeedFile();
  allResults.push(seedResult);
  const seedIcon = seedResult.valid ? "✅" : "❌";
  console.log(`  ${seedIcon} ${seedResult.valid ? "通过" : "失败"}`);
  for (const [k, v] of Object.entries(seedResult.stats)) {
    console.log(`  📊 ${k}: ${v}`);
  }
  for (const err of seedResult.errors) {
    console.log(`  ❌ ${err}`);
  }

  console.log("\n" + "=".repeat(60));
  const totalErrors = allResults.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = allResults.reduce((sum, r) => sum + r.warnings.length, 0);
  const allValid = allResults.every((r) => r.valid);

  console.log(`\n📋 总结`);
  console.log(`  验证文件数: ${allResults.length}`);
  console.log(`  错误数: ${totalErrors}`);
  console.log(`  警告数: ${totalWarnings}`);
  console.log(`  最终结果: ${allValid ? "✅ 全部通过" : "❌ 存在错误"}`);

  if (!allValid) {
    process.exit(1);
  }
}

main();
