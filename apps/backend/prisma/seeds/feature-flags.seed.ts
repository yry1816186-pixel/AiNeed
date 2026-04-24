// @ts-nocheck
import { PrismaClient } from "@prisma/client";

/**
 * Seed default feature flags for A/B testing the recommendation algorithm.
 * This allows switching between scoring variants without code deploys.
 */
export async function seedFeatureFlags(prisma: PrismaClient) {
  // recommendation_algorithm_v2: A/B test for scoring algorithm changes
  await prisma.featureFlag.upsert({
    where: { key: "recommendation_algorithm_v2" },
    update: {},
    create: {
      key: "recommendation_algorithm_v2",
      name: "Recommendation Algorithm V2",
      description:
        "A/B test for recommendation scoring algorithm. Control uses current weights, enhanced_scoring uses adjusted weights.",
      type: "variant",
      enabled: true,
      value: {
        variants: [
          { name: "control", weight: 50 },
          { name: "enhanced_scoring", weight: 50 },
        ],
      },
      rules: {},
    },
  });
}
