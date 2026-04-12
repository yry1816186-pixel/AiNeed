import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CustomizeService } from './customize.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { DesignQueryDto } from './dto/design-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Customize')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('customize')
export class CustomizeController {
  constructor(private readonly customizeService: CustomizeService) {}

  @Post('designs')
  @ApiOperation({ summary: '创建设计', description: '创建新的服装定制设计，指定产品类型和设计数据' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDesignDto,
  ) {
    return this.customizeService.create(userId, dto);
  }

  @Get('designs')
  @ApiOperation({ summary: '我的设计列表', description: '获取当前用户的定制设计列表，支持按状态和产品类型筛选' })
  @ApiResponse({ status: 200, description: '返回设计列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: DesignQueryDto,
  ) {
    return this.customizeService.findAll(userId, query);
  }

  @Get('designs/:id')
  @ApiOperation({ summary: '设计详情', description: '获取指定设计的详细信息，含设计数据和预览图' })
  @ApiParam({ name: 'id', description: '设计ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回设计详情' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.customizeService.findOne(userId, id);
  }

  @Patch('designs/:id')
  @ApiOperation({ summary: '更新设计', description: '更新设计数据、图案、布局等信息' })
  @ApiParam({ name: 'id', description: '设计ID (UUID)' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDesignDto,
  ) {
    return this.customizeService.update(userId, id, dto);
  }

  @Delete('designs/:id')
  @ApiOperation({ summary: '删除设计', description: '删除指定的定制设计（仅草稿状态可删除）' })
  @ApiParam({ name: 'id', description: '设计ID (UUID)' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.customizeService.remove(userId, id);
  }

  @Post('designs/:id/preview')
  @ApiOperation({ summary: '生成预览图', description: '根据设计数据生成产品预览渲染图' })
  @ApiParam({ name: 'id', description: '设计ID (UUID)' })
  @ApiResponse({ status: 200, description: '预览图生成成功' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  generatePreview(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.customizeService.generatePreview(userId, id);
  }

  @Post('designs/:id/publish')
  @ApiOperation({ summary: '发布到市集', description: '将设计发布到设计市集（免费分享），需通过AI预审' })
  @ApiParam({ name: 'id', description: '设计ID (UUID)' })
  @ApiResponse({ status: 200, description: '发布成功' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiResponse({ status: 400, description: '设计状态不允许发布' })
  @ApiResponse({ status: 401, description: '未认证' })
  publish(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.customizeService.publish(userId, id);
  }

  @Get('product-templates')
  @ApiOperation({ summary: '获取产品模板列表', description: '获取可定制的产品模板列表（T恤/卫衣/帽子/包包/鞋子/手机壳）' })
  @ApiQuery({ name: 'productType', required: false, description: '按产品类型筛选' })
  @ApiResponse({ status: 200, description: '返回产品模板列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  getProductTemplates(
    @Query('productType') productType?: string,
  ) {
    return this.customizeService.getProductTemplates(productType);
  }
}
