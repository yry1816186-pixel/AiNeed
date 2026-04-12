import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { RecommendationService } from './recommendation.service';
import {
  RecommendationQueryDto,
  TrendingQueryDto,
  TrackInteractionDto,
} from './dto/recommendation-query.dto';

@ApiTags('Recommendation')
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取个性化推荐', description: '基于用户画像、风格偏好、历史行为的个性化服装推荐' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '返回数量(默认10)' })
  @ApiQuery({ name: 'occasion', required: false, type: String, description: '场合筛选' })
  @ApiQuery({ name: 'style', required: false, type: String, description: '风格筛选' })
  @ApiQuery({ name: 'budget_range', required: false, type: String, description: '预算范围' })
  @ApiResponse({ status: 200, description: '返回个性化推荐列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getPersonalizedRecommendations(
    @Req() req: { user: { id: string } },
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getPersonalizedRecommendations(
      req.user.id,
      query,
    );
  }

  @Get('trending')
  @ApiOperation({ summary: '热门推荐', description: '获取热门服装推荐，无需登录，支持按分类和时间范围筛选' })
  @ApiQuery({ name: 'category', required: false, type: String, description: '分类筛选' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '返回数量(默认10)' })
  @ApiQuery({ name: 'time_range', required: false, enum: ['day', 'week', 'month'], description: '时间范围' })
  @ApiResponse({ status: 200, description: '返回热门推荐列表' })
  async getTrendingRecommendations(@Query() query: TrendingQueryDto) {
    return this.recommendationService.getTrendingRecommendations(query);
  }

  @Get('similar/:clothingId')
  @ApiOperation({ summary: '相似推荐', description: '基于指定服装的相似推荐，使用FashionCLIP语义向量' })
  @ApiParam({ name: 'clothingId', description: '服装ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回相似服装列表' })
  @ApiResponse({ status: 404, description: '服装不存在' })
  async getSimilarRecommendations(@Param('clothingId') clothingId: string) {
    return this.recommendationService.getSimilarRecommendations(clothingId);
  }

  @Post('track')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '记录用户行为', description: '记录用户浏览、收藏、购买等行为，用于优化推荐算法' })
  @ApiResponse({ status: 201, description: '记录成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  async trackInteraction(
    @Req() req: { user: { id: string } },
    @Body() dto: TrackInteractionDto,
  ) {
    return this.recommendationService.trackInteraction(req.user.id, dto);
  }
}
