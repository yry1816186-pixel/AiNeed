/**
 * Knowledge-Based Submodule
 * Handles knowledge-driven recommendations:
 * - Knowledge graph
 * - Matching theory
 * - GNN compatibility
 * - Learning to rank
 * - Qdrant vector database
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../../../common/prisma/prisma.module";
import { GNNCompatibilityService } from "../../services/gnn-compatibility.service";
import { KnowledgeGraphService } from "../../services/knowledge-graph.service";
import { LearningToRankService } from "../../services/learning-to-rank.service";
import { MatchingTheoryService } from "../../services/matching-theory.service";
import { QdrantService } from "../../services/qdrant.service";

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    KnowledgeGraphService,
    MatchingTheoryService,
    GNNCompatibilityService,
    LearningToRankService,
    QdrantService,
  ],
  exports: [
    KnowledgeGraphService,
    MatchingTheoryService,
    GNNCompatibilityService,
    LearningToRankService,
    QdrantService,
  ],
})
export class KnowledgeSubmodule {}
