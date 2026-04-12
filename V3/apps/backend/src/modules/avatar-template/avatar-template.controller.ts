import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AvatarTemplateService } from './avatar-template.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateQueryDto } from './dto/template-response.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Avatar')
@ApiBearerAuth()
@Controller('avatar/templates')
@UseGuards(AuthGuard('jwt'))
export class AvatarTemplateController {
  constructor(private readonly templateService: AvatarTemplateService) {}

  @Get()
  @ApiOperation({ summary: '获取模板列表', description: '获取可用的Q版形象模板列表，支持按性别和状态筛选' })
  @ApiQuery({ name: 'gender', required: false, description: '性别筛选: male/female/neutral' })
  @ApiQuery({ name: 'isActive', required: false, description: '是否仅返回活跃模板' })
  @ApiResponse({ status: 200, description: '返回模板列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async findAll(@Query() query: TemplateQueryDto) {
    return this.templateService.findAll(query.gender, query.isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取模板详情', description: '获取模板完整信息，含Skia绘制配置和可调参数定义' })
  @ApiParam({ name: 'id', description: '模板ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回模板详情' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '创建模板（管理员）', description: '管理员创建新的Q版形象模板' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async create(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '更新模板', description: '管理员更新模板信息' })
  @ApiParam({ name: 'id', description: '模板ID (UUID)' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 401, description: '未认证' })
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '软删除模板', description: '管理员软删除模板（设置is_active=false）' })
  @ApiParam({ name: 'id', description: '模板ID (UUID)' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 401, description: '未认证' })
  async remove(@Param('id') id: string) {
    return this.templateService.remove(id);
  }
}
