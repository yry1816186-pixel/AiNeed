import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { DesignMarketService } from './design-market.service';
import { ListDesignsQueryDto } from './dto/list-designs-query.dto';
import { ReportDesignDto } from './dto/report-design.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('DesignMarket')
@Controller('market/designs')
export class DesignMarketController {
  constructor(private readonly marketService: DesignMarketService) {}

  @Get()
  @ApiOperation({ summary: '市集首页', description: '获取设计市集的设计列表，支持按最新/热门排序，按产品类型和标签筛选' })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'popular'], description: '排序方式' })
  @ApiQuery({ name: 'product_type', required: false, description: '按产品类型筛选' })
  @ApiQuery({ name: 'tag', required: false, description: '按标签筛选' })
  @ApiQuery({ name: 'keyword', required: false, description: '关键词搜索' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回设计列表' })
  listDesigns(
    @Query() query: ListDesignsQueryDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.marketService.listDesigns(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取设计详情', description: '获取市集中指定设计的详细信息' })
  @ApiParam({ name: 'id', description: '设计ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回设计详情' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  getDesignDetail(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.marketService.getDesignDetail(id, userId);
  }

  @Post(':id/like')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '点赞/取消点赞', description: '对市集设计进行点赞或取消点赞(toggle)' })
  @ApiParam({ name: 'id', description: '设计ID (UUID)' })
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  toggleLike(@CurrentUser('id') userId: string, @Param('id') designId: string) {
    return this.marketService.toggleLike(designId, userId);
  }

  @Post(':id/report')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '举报设计', description: '举报侵权设计，触发AI预审(pHash+FashionCLIP+IP库比对+GLM-5校验)' })
  @ApiParam({ name: 'id', description: '设计ID (UUID)' })
  @ApiResponse({ status: 200, description: '举报已提交' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  reportDesign(
    @CurrentUser('id') userId: string,
    @Param('id') designId: string,
    @Body() dto: ReportDesignDto,
  ) {
    return this.marketService.reportDesign(designId, userId, dto);
  }

  @Get(':id/download')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '下载设计', description: '下载市集设计的图案文件' })
  @ApiParam({ name: 'id', description: '设计ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回下载链接' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  downloadDesign(
    @CurrentUser('id') userId: string,
    @Param('id') designId: string,
  ) {
    return this.marketService.downloadDesign(designId, userId);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '发布设计到市集', description: '将设计发布到市集，需通过AI预审(pHash去重+语义相似度+IP库比对)' })
  @ApiParam({ name: 'id', description: '设计ID (UUID)' })
  @ApiResponse({ status: 200, description: '发布成功' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiResponse({ status: 400, description: '设计状态不允许发布或AI预审未通过' })
  @ApiResponse({ status: 401, description: '未认证' })
  publishDesign(
    @CurrentUser('id') userId: string,
    @Param('id') designId: string,
  ) {
    return this.marketService.publishDesign(designId, userId);
  }
}
