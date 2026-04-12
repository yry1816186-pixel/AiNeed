import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AvatarService } from './avatar.service';
import { CreateAvatarDto } from './dto/create-avatar.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { DressAvatarDto } from './dto/dress-avatar.dto';
import { AvatarResponseDto, ThumbnailDto } from './dto/avatar-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Avatar')
@ApiBearerAuth()
@Controller('avatar')
@UseGuards(JwtAuthGuard)
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建用户Q版形象', description: '选择模板+参数创建Q版形象，每个用户仅可有一个活跃形象' })
  @ApiResponse({ status: 201, description: '创建成功', type: AvatarResponseDto })
  @ApiResponse({ status: 409, description: '用户已存在活跃形象' })
  @ApiResponse({ status: 404, description: '形象模板不存在' })
  @ApiResponse({ status: 400, description: '形象参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAvatarDto) {
    return this.avatarService.create(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前用户的形象参数', description: '返回当前用户的Q版形象参数，含Skia绘制配置和穿戴映射' })
  @ApiResponse({ status: 200, description: '获取成功', type: AvatarResponseDto })
  @ApiResponse({ status: 404, description: '用户尚未创建Q版形象' })
  @ApiResponse({ status: 401, description: '未认证' })
  getMyAvatar(@CurrentUser('id') userId: string) {
    return this.avatarService.getMyAvatar(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新形象参数', description: '部分更新形象参数(脸型/发型/肤色等)，客户端Skia实时绘制' })
  @ApiResponse({ status: 200, description: '更新成功', type: AvatarResponseDto })
  @ApiResponse({ status: 404, description: '用户尚未创建Q版形象' })
  @ApiResponse({ status: 400, description: '形象参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateAvatarDto) {
    return this.avatarService.update(userId, dto);
  }

  @Post('me/dress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '换装映射更新', description: '更新clothing_map颜色+类型映射，搭配方案同步映射到Q版形象' })
  @ApiResponse({ status: 200, description: '换装成功', type: AvatarResponseDto })
  @ApiResponse({ status: 404, description: '用户尚未创建Q版形象' })
  @ApiResponse({ status: 401, description: '未认证' })
  dress(@CurrentUser('id') userId: string, @Body() dto: DressAvatarDto) {
    return this.avatarService.dress(userId, dto);
  }

  @Post('me/thumbnail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '上传形象缩略图', description: '客户端截图上传缩略图，用于评论/通知等场景的小头像' })
  @ApiResponse({ status: 200, description: '上传成功', type: AvatarResponseDto })
  @ApiResponse({ status: 404, description: '用户尚未创建Q版形象' })
  @ApiResponse({ status: 401, description: '未认证' })
  updateThumbnail(
    @CurrentUser('id') userId: string,
    @Body() dto: ThumbnailDto,
  ) {
    return this.avatarService.updateThumbnail(userId, dto.image_url);
  }
}
