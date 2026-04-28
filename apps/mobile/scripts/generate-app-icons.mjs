import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const brandDir = join(__dirname, "..", "assets", "brand");

const svgBuffer = readFileSync(join(brandDir, "logo-square.svg"));

await sharp(svgBuffer).resize(1024, 1024).png().toFile(join(brandDir, "app-icon-ios.png"));

console.log("Generated app-icon-ios.png (1024x1024)");
