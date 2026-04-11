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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AvatarTemplateService } from './avatar-template.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateQueryDto } from './dto/template-response.dto';

@ApiTags('Q版形象模板')
@ApiBearerAuth()
@Controller('avatar/templates')
@UseGuards(AuthGuard('jwt'))
export class AvatarTemplateController {
  constructor(private readonly templateService: AvatarTemplateService) {}

  @Get()
  @ApiOperation({ summary: '获取模板列表' })
  async findAll(@Query() query: TemplateQueryDto) {
    return this.templateService.findAll(query.gender, query.isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取模板详情' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建模板（管理员）' })
  async create(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新模板' })
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '软删除模板' })
  async remove(@Param('id') id: string) {
    return this.templateService.remove(id);
  }
}
