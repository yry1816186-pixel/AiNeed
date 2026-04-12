import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import {
  QueryColorHarmonyDto,
  QueryColorConflictDto,
  QueryStyleCompatibilityDto,
  KnowledgeQueryDto,
} from './dto/query-rules.dto';
import { KnowledgeSeedService } from './seed/knowledge.seed';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Knowledge')
@ApiBearerAuth()
@Controller('knowledge')
@UseGuards(AuthGuard('jwt'))
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly seedService: KnowledgeSeedService,
  ) {}

  @Get('colors/harmony')
  @ApiOperation({ summary: '查询色彩搭配建议', description: '根据指定颜色查询和谐搭配色方案' })
  @ApiResponse({ status: 200, description: '返回色彩搭配建议' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getColorHarmony(@Query() dto: QueryColorHarmonyDto) {
    const data = await this.knowledgeService.findColorHarmony(dto.color);
    return { color: dto.color, harmonies: data };
  }

  @Get('colors/conflict')
  @ApiOperation({ summary: '查询色彩冲突警告', description: '根据指定颜色查询冲突色警告' })
  @ApiResponse({ status: 200, description: '返回色彩冲突警告' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getColorConflict(@Query() dto: QueryColorConflictDto) {
    const data = await this.knowledgeService.findColorConflicts(dto.color);
    return { color: dto.color, conflicts: data };
  }

  @Get('body-type/:type/recommendations')
  @ApiOperation({ summary: '体型穿搭推荐', description: '根据体型类型查询穿搭推荐规则' })
  @ApiParam({ name: 'type', description: '体型类型: hourglass/pear/apple/rectangle/inverted_triangle' })
  @ApiResponse({ status: 200, description: '返回体型穿搭推荐' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getBodyTypeRecommendations(@Param('type') type: string) {
    const data = await this.knowledgeService.findBodyTypeRules(type);
    return { bodyType: type, recommendations: data };
  }

  @Get('occasion/:occasion/styles')
  @ApiOperation({ summary: '场合风格推荐', description: '根据场合查询推荐风格' })
  @ApiParam({ name: 'occasion', description: '场合: interview/date/business_casual/party/formal/casual' })
  @ApiResponse({ status: 200, description: '返回场合风格推荐' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getOccasionStyles(@Param('occasion') occasion: string) {
    const data = await this.knowledgeService.findOccasionRules(occasion);
    return data;
  }

  @Get('style/compatibility')
  @ApiOperation({ summary: '风格兼容性查询', description: '查询两种风格的兼容性评分和建议' })
  @ApiResponse({ status: 200, description: '返回风格兼容性信息' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getStyleCompatibility(@Query() dto: QueryStyleCompatibilityDto) {
    const data = await this.knowledgeService.findStyleCompatibility(dto.styleA, dto.styleB);
    return data;
  }

  @Post('query')
  @ApiOperation({ summary: '通用知识查询', description: '通用知识图谱查询，支持多维度条件筛选' })
  @ApiResponse({ status: 200, description: '返回知识规则列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async queryKnowledge(@Body() dto: KnowledgeQueryDto) {
    const data = await this.knowledgeService.queryKnowledge(dto);
    return { rules: data, total: data.length };
  }

  @Post('seed')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '导入种子数据', description: '管理员导入知识图谱种子数据到Neo4j' })
  @ApiResponse({ status: 200, description: '导入成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 401, description: '未认证' })
  async seedKnowledge() {
    const data = await this.seedService.run();
    return data;
  }

  @Get('health')
  @ApiOperation({ summary: 'Neo4j健康检查', description: '检查Neo4j图数据库连接状态' })
  @ApiResponse({ status: 200, description: '返回健康状态' })
  async healthCheck() {
    const healthy = await this.seedService.healthCheck();
    return { status: healthy ? 'ok' : 'unhealthy', service: 'neo4j' };
  }
}
