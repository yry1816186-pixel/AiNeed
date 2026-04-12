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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { OutfitService } from './outfit.service';
import { CreateOutfitDto } from './dto/create-outfit.dto';
import { UpdateOutfitDto } from './dto/update-outfit.dto';
import { AddOutfitItemDto } from './dto/add-outfit-item.dto';
import { OutfitResponseDto } from './dto/outfit-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Outfit')
@ApiBearerAuth()
@Controller('outfits')
@UseGuards(AuthGuard('jwt'))
export class OutfitController {
  constructor(private readonly outfitService: OutfitService) {}

  @Post()
  @ApiOperation({ summary: '创建搭配', description: '创建新的搭配方案，可指定名称、场合、季节、风格标签等' })
  @ApiCreatedResponse({ type: OutfitResponseDto })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOutfitDto,
  ) {
    return this.outfitService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '搭配列表', description: '获取当前用户的搭配方案列表，支持分页' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回搭配列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.outfitService.findAll(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '搭配详情', description: '获取搭配方案详情，含所有搭配服装项' })
  @ApiParam({ name: 'id', description: '搭配ID (UUID)' })
  @ApiOkResponse({ type: OutfitResponseDto })
  @ApiResponse({ status: 404, description: '搭配不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.outfitService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新搭配', description: '更新搭配方案的名称、描述、场合等信息' })
  @ApiParam({ name: 'id', description: '搭配ID (UUID)' })
  @ApiOkResponse({ type: OutfitResponseDto })
  @ApiResponse({ status: 404, description: '搭配不存在' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOutfitDto,
  ) {
    return this.outfitService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除搭配', description: '删除搭配方案及其所有搭配项' })
  @ApiParam({ name: 'id', description: '搭配ID (UUID)' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '搭配不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.outfitService.remove(userId, id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: '添加服装到搭配', description: '向搭配方案中添加一件服装，指定slot(上装/下装/外套/鞋子/配饰/连衣裙)和排序' })
  @ApiParam({ name: 'id', description: '搭配ID (UUID)' })
  @ApiResponse({ status: 201, description: '添加成功' })
  @ApiResponse({ status: 404, description: '搭配或服装不存在' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.CREATED)
  addItem(
    @CurrentUser('id') userId: string,
    @Param('id') outfitId: string,
    @Body() dto: AddOutfitItemDto,
  ) {
    return this.outfitService.addItem(userId, outfitId, dto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: '从搭配中移除服装', description: '从搭配方案中移除指定服装项' })
  @ApiParam({ name: 'id', description: '搭配ID (UUID)' })
  @ApiParam({ name: 'itemId', description: '搭配项ID (UUID)' })
  @ApiResponse({ status: 200, description: '移除成功' })
  @ApiResponse({ status: 404, description: '搭配或搭配项不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.OK)
  removeItem(
    @CurrentUser('id') userId: string,
    @Param('id') outfitId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.outfitService.removeItem(userId, outfitId, itemId);
  }
}
