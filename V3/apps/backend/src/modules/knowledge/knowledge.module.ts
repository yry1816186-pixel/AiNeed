import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { Neo4jService } from './neo4j.service';
import { KnowledgeSeedService } from './seed/knowledge.seed';

@Module({
  controllers: [KnowledgeController],
  providers: [Neo4jService, KnowledgeService, KnowledgeSeedService],
  exports: [KnowledgeService, Neo4jService],
})
export class KnowledgeModule {}
