import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { StudiosService } from './studios.service';
import { StudioQueryDto, CreateStudioDto, UpdateStudioDto } from './dto/studio.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Bespoke')
@Controller('bespoke/studios')
export class StudiosController {
  constructor(private readonly studiosService: StudiosService) {}

  @Get()
  @ApiOperation({ summary: '工作室列表', description: '获取高端定制工作室列表，支持按城市、专长筛选和评分排序' })
  @ApiResponse({ status: 200, description: '返回分页工作室列表' })
  async findAll(@Query() query: StudioQueryDto) {
    return this.studiosService.findAll(query);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '我的工作室', description: '获取当前用户作为主理人的工作室信息' })
  @ApiResponse({ status: 200, description: '返回当前用户的工作室' })
  @ApiResponse({ status: 404, description: '未找到工作室' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getMyStudio(@CurrentUser('id') userId: string) {
    return this.studiosService.getMyStudio(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '工作室详情', description: '获取工作室详情，含作品集、服务项目、评价和主理人信息' })
  @ApiParam({ name: 'id', description: '工作室ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回工作室详情' })
  @ApiResponse({ status: 404, description: '工作室不存在' })
  async findOne(@Param('id') id: string) {
    return this.studiosService.findOne(id);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: '工作室评价列表', description: '获取工作室的客户评价列表，支持分页' })
  @ApiParam({ name: 'id', description: '工作室ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回评价列表' })
  async getReviews(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.studiosService.getReviews(id, pageNum, limitNum);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建工作室', description: '创建新的高端定制工作室，成为工作室主理人' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 409, description: 'slug已存在或已有活跃工作室' })
  @ApiResponse({ status: 401, description: '未认证' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStudioDto,
  ) {
    return this.studiosService.create(userId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新工作室信息', description: '更新工作室信息（仅主理人可操作）' })
  @ApiParam({ name: 'id', description: '工作室ID (UUID)' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '非主理人无权操作' })
  @ApiResponse({ status: 404, description: '工作室不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStudioDto,
  ) {
    return this.studiosService.update(userId, id, dto);
  }
}
