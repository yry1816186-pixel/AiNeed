/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Collaborative Filtering Submodule
 * Handles user behavior-based recommendations:
 * - Collaborative filtering (user-based, item-based)
 * - Preference learning
 * - Cold start handling
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../../../../common/prisma/prisma.module";
import { ColdStartService } from "../../services/cold-start.service";
import { CollaborativeFilteringService } from "../../services/collaborative-filtering.service";
import { PreferenceLearningService } from "../../services/preference-learning.service";

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    CollaborativeFilteringService,
    ColdStartService,
    PreferenceLearningService,
  ],
  exports: [
    CollaborativeFilteringService,
    ColdStartService,
    PreferenceLearningService,
  ],
})
export class CollaborativeSubmodule {}
