import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

type PostSortOption = 'newest' | 'popular' | 'featured';

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('posts')
  @ApiOperation({ summary: '帖子列表', description: '获取社区帖子信息流，支持按最新/热门/精选排序，支持标签筛选' })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'popular', 'featured'], description: '排序方式' })
  @ApiQuery({ name: 'tag', required: false, description: '按标签筛选' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回帖子列表' })
  @ApiSecurity('bearer')
  @UseGuards(AuthGuard('jwt'))
  findPosts(
    @Request() req: { user?: { id: string } },
    @Query('sort') sort?: PostSortOption,
    @Query('tag') tag?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.communityService.findPosts({
      sort,
      tag,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      userId: req.user?.id,
    });
  }

  @Get('posts/:id')
  @ApiOperation({ summary: '帖子详情', description: '获取帖子详情，含作者信息、点赞数、评论数' })
  @ApiParam({ name: 'id', description: '帖子ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回帖子详情' })
  @ApiResponse({ status: 404, description: '帖子不存在' })
  @ApiSecurity('bearer')
  @UseGuards(AuthGuard('jwt'))
  findPostById(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.communityService.findPostById(id, req.user?.id);
  }

  @Post('posts')
  @ApiOperation({ summary: '发帖', description: '发布社区帖子，支持图片和标签' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({ status: 201, description: '发布成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  createPost(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.communityService.createPost(userId, dto);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: '删除帖子', description: '删除自己发布的帖子' })
  @ApiParam({ name: 'id', description: '帖子ID (UUID)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '无权删除他人帖子' })
  @ApiResponse({ status: 404, description: '帖子不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  deletePost(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.communityService.deletePost(userId, id);
  }

  @Post('posts/:id/like')
  @ApiOperation({ summary: '点赞/取消点赞', description: '对帖子进行点赞或取消点赞(toggle)' })
  @ApiParam({ name: 'id', description: '帖子ID (UUID)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 404, description: '帖子不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  togglePostLike(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.communityService.togglePostLike(userId, id);
  }

  @Post('posts/:id/comments')
  @ApiOperation({ summary: '发表评论', description: '对帖子发表评论，支持回复评论(传入parentId)' })
  @ApiParam({ name: 'id', description: '帖子ID (UUID)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({ status: 201, description: '评论成功' })
  @ApiResponse({ status: 404, description: '帖子不存在' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  createComment(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(userId, postId, dto);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '删除评论', description: '删除自己发表的评论' })
  @ApiParam({ name: 'id', description: '评论ID (UUID)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '无权删除他人评论' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  deleteComment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.communityService.deleteComment(userId, id);
  }

  @Post('comments/:id/like')
  @ApiOperation({ summary: '评论点赞', description: '对评论进行点赞或取消点赞(toggle)' })
  @ApiParam({ name: 'id', description: '评论ID (UUID)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  toggleCommentLike(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.communityService.toggleCommentLike(userId, id);
  }
}
