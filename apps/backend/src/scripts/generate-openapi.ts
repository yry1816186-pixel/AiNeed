import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";

import { AppModule } from "../app.module";
import { createSwaggerConfig } from "../config/swagger.config";

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn"],
  });

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: require("@nestjs/common").VersioningType.URI,
    defaultVersion: "1",
  });

  const config = createSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config);

  const outputPath = path.resolve(__dirname, "../../docs/api/openapi.json");
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf8");

  console.log(`OpenAPI spec generated: ${outputPath}`);
  console.log(`Endpoints: ${Object.keys(document.paths || {}).length} paths`);
  console.log(`Schemas: ${Object.keys(document.components?.schemas || {}).length} schemas`);
  console.log(`Tags: ${(document.tags || []).length} tags`);

  await app.close();
}

generateOpenApiSpec().catch((err) => {
  console.error("Failed to generate OpenAPI spec:", err);
  process.exit(1);
});
