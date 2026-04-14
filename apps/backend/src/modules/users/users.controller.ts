import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  Request,
  Param,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiConsumes,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StorageService } from "../../common/storage/storage.service";

import {
  UsersService,
  UpdateUserDto as ServiceUpdateUserDto,
  ChangePasswordDto as ServiceChangePasswordDto,
} from "./users.service";
import {
  UpdateUserDto,
  ChangePasswordDto,
  UpdateAvatarDto,
  UserResponseDto,
  UserPublicResponseDto,
  UserStatsResponseDto,
} from "./dto";

/**
 * 成功响应 DTO
 */
class SuccessResponseDto {
  success!: boolean;
}

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(
    private usersService: UsersService,
    private storageService: StorageService,
  ) {}

  @Get("me")
  @ApiOperation({
    summary: "获取当前用户信息",
    description: "获取当前登录用户的完整信息，包括 ID、邮箱、昵称、头像等。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "用户不存在",
  })
  async getCurrentUser(@Request() req: { user: { id: string } }) {
    return this.usersService.findById(req.user.id);
  }

  @Put("me")
  @ApiOperation({
    summary: "更新当前用户信息",
    description: "更新当前登录用户的基本信息，如昵称、头像、性别、出生日期等。",
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async updateCurrentUser(
    @Request() req: { user: { id: string } },
    @Body() dto: ServiceUpdateUserDto,
  ) {
    return this.usersService.update(req.user.id, dto);
  }

  @Put("me/password")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: "修改密码",
    description: "修改当前登录用户的密码。需要提供当前密码和新密码。",
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: "密码修改成功",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "当前密码错误或新密码不符合要求",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async changePassword(
    @Request() req: { user: { id: string } },
    @Body() dto: ServiceChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.id, dto);
  }

  @Put("me/avatar")
  @ApiOperation({
    summary: "更新头像",
    description: "更新当前登录用户的头像。",
  })
  @ApiBody({ type: UpdateAvatarDto })
  @ApiResponse({
    status: 200,
    description: "头像更新成功",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async updateAvatar(
    @Request() req: { user: { id: string } },
    @Body() body: { avatarUrl: string },
  ) {
    return this.usersService.updateAvatar(req.user.id, body.avatarUrl);
  }

  @Post("me/avatar/upload")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "上传头像",
    description:
      "通过 multipart/form-data 上传头像文件。支持 JPEG、PNG、WebP 格式，最大 5MB。",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "头像文件（JPEG/PNG/WebP，最大 5MB）",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "头像上传成功",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "文件格式不支持或文件过大",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async uploadAvatar(
    @Request() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("请选择要上传的头像文件");
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "不支持的文件格式，仅支持 JPEG、PNG、WebP 格式",
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException("文件大小不能超过 5MB");
    }

    const { url } = await this.storageService.uploadImage(file, "avatars");
    return this.usersService.updateAvatar(req.user.id, url);
  }

  @Get("me/stats")
  @ApiOperation({
    summary: "获取用户统计数据",
    description: "获取当前登录用户的统计数据，包括试衣次数、收藏数量、AI 咨询次数等。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: UserStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getStats(@Request() req: { user: { id: string } }) {
    return this.usersService.getStats(req.user.id);
  }

  @Put("me/deactivate")
  @ApiOperation({
    summary: "停用账户",
    description: "停用当前登录用户的账户。停用后用户将无法登录。",
  })
  @ApiResponse({
    status: 200,
    description: "账户已停用",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async deactivateAccount(@Request() req: { user: { id: string } }) {
    return this.usersService.deactivate(req.user.id);
  }

  @Get(":id")
  @ApiOperation({
    summary: "获取用户公开信息",
    description: "根据用户 ID 获取用户的公开信息（昵称、头像），用于展示用户资料。",
  })
  @ApiParam({
    name: "id",
    description: "用户 ID",
    type: String,
    format: "uuid",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: UserPublicResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "无效的用户 ID 格式",
  })
  @ApiResponse({
    status: 404,
    description: "用户不存在",
  })
  async getUser(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
    };
  }
}
