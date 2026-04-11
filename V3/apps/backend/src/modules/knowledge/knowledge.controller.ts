import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import {
  QueryColorHarmonyDto,
  QueryColorConflictDto,
  QueryBodyTypeDto,
  QueryOccasionDto,
  QueryStyleCompatibilityDto,
  KnowledgeQueryDto,
} from './dto/query-rules.dto';
import { KnowledgeSeedService } from './seed/knowledge.seed';

@ApiTags('knowledge')
@Controller('knowledge')
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name);

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly seedService: KnowledgeSeedService,
  ) {}

  @Get('colors/harmony')
  @ApiOperation({ summary: '查询色彩搭配建议' })
  async getColorHarmony(@Query() dto: QueryColorHarmonyDto) {
    const data = await this.knowledgeService.findColorHarmony(dto.color);
    return { color: dto.color, harmonies: data };
  }

  @Get('colors/conflict')
  @ApiOperation({ summary: '查询色彩冲突警告' })
  async getColorConflict(@Query() dto: QueryColorConflictDto) {
    const data = await this.knowledgeService.findColorConflicts(dto.color);
    return { color: dto.color, conflicts: data };
  }

  @Get('body-type/:type/recommendations')
  @ApiOperation({ summary: '体型穿搭推荐' })
  @ApiParam({ name: 'type', description: '体型类型' })
  async getBodyTypeRecommendations(@Param('type') type: string) {
    const data = await this.knowledgeService.findBodyTypeRules(type);
    return { bodyType: type, recommendations: data };
  }

  @Get('occasion/:occasion/styles')
  @ApiOperation({ summary: '场合风格推荐' })
  @ApiParam({ name: 'occasion', description: '场合名称' })
  async getOccasionStyles(@Param('occasion') occasion: string) {
    const data = await this.knowledgeService.findOccasionRules(occasion);
    return data;
  }

  @Get('style/compatibility')
  @ApiOperation({ summary: '风格兼容性查询' })
  async getStyleCompatibility(@Query() dto: QueryStyleCompatibilityDto) {
    const data = await this.knowledgeService.findStyleCompatibility(dto.styleA, dto.styleB);
    return data;
  }

  @Post('query')
  @ApiOperation({ summary: '通用知识查询' })
  async queryKnowledge(@Body() dto: KnowledgeQueryDto) {
    const data = await this.knowledgeService.queryKnowledge(dto);
    return { rules: data, total: data.length };
  }

  @Post('seed')
  @ApiOperation({ summary: '导入种子数据(管理员)' })
  async seedKnowledge() {
    const data = await this.seedService.run();
    return data;
  }

  @Get('health')
  @ApiOperation({ summary: 'Neo4j健康检查' })
  async healthCheck() {
    const healthy = await this.seedService.healthCheck();
    return { status: healthy ? 'ok' : 'unhealthy', service: 'neo4j' };
  }
}
