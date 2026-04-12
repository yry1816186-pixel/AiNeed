import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SocialService } from './social.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Social')
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('follow/:userId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '关注/取消关注', description: '对指定用户进行关注或取消关注(toggle)' })
  @ApiParam({ name: 'userId', description: '目标用户ID (UUID)' })
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 404, description: '目标用户不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.OK)
  async toggleFollow(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.socialService.toggleFollow(currentUserId, targetUserId);
  }

  @Get('followers')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '我的粉丝列表', description: '获取当前用户的粉丝列表，支持分页' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回粉丝列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getMyFollowers(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getFollowers(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('following')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '我的关注列表', description: '获取当前用户的关注列表，支持分页' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回关注列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getMyFollowing(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getFollowing(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('followers/:userId')
  @ApiOperation({ summary: '某用户的粉丝列表', description: '获取指定用户的粉丝列表，无需登录' })
  @ApiParam({ name: 'userId', description: '用户ID (UUID)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回粉丝列表' })
  async getUserFollowers(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getFollowers(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('following/:userId')
  @ApiOperation({ summary: '某用户的关注列表', description: '获取指定用户的关注列表，无需登录' })
  @ApiParam({ name: 'userId', description: '用户ID (UUID)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回关注列表' })
  async getUserFollowing(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getFollowing(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('counts/:userId')
  @ApiOperation({ summary: '获取用户关注/粉丝数', description: '获取指定用户的关注数和粉丝数' })
  @ApiParam({ name: 'userId', description: '用户ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回关注数和粉丝数' })
  async getFollowCounts(@Param('userId') userId: string) {
    return this.socialService.getFollowCounts(userId);
  }

  @Get('status/:userId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '检查是否关注了某用户', description: '检查当前用户是否已关注指定用户' })
  @ApiParam({ name: 'userId', description: '目标用户ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回关注状态' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getFollowStatus(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.socialService.getFollowStatus(currentUserId, targetUserId);
  }
}
