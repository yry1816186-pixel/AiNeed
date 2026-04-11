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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RecommendationService } from './recommendation.service';
import {
  RecommendationQueryDto,
  TrendingQueryDto,
  TrackInteractionDto,
} from './dto/recommendation-query.dto';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取个性化推荐' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '返回数量(默认10)' })
  @ApiQuery({ name: 'occasion', required: false, type: String, description: '场合' })
  @ApiQuery({ name: 'style', required: false, type: String, description: '风格' })
  @ApiQuery({ name: 'budget_range', required: false, type: String, description: '预算范围' })
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
  @ApiOperation({ summary: '热门推荐(无需登录)' })
  @ApiQuery({ name: 'category', required: false, type: String, description: '分类' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '返回数量(默认10)' })
  @ApiQuery({ name: 'time_range', required: false, enum: ['day', 'week', 'month'], description: '时间范围' })
  async getTrendingRecommendations(@Query() query: TrendingQueryDto) {
    return this.recommendationService.getTrendingRecommendations(query);
  }

  @Get('similar/:clothingId')
  @ApiOperation({ summary: '相似推荐' })
  async getSimilarRecommendations(@Param('clothingId') clothingId: string) {
    return this.recommendationService.getSimilarRecommendations(clothingId);
  }

  @Post('track')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '记录用户行为' })
  async trackInteraction(
    @Req() req: { user: { id: string } },
    @Body() dto: TrackInteractionDto,
  ) {
    return this.recommendationService.trackInteraction(req.user.id, dto);
  }
}
