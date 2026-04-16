import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";

import { CurrentUser } from "../../../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../../modules/auth/guards/jwt-auth.guard";

import { FavoritesService } from "./favorites.service";

@ApiTags("favorites")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("favorites")
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: "获取收藏列表" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "每页数量" })
  async getFavorites(
    @CurrentUser("id") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.favoritesService.getUserFavorites(
      userId,
      {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      },
    );
  }

  @Post(":itemId")
  @ApiOperation({ summary: "添加收藏" })
  @ApiResponse({ status: 201, description: "收藏成功" })
  @ApiResponse({ status: 400, description: "商品不存在或已下架" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "itemId", description: "商品 ID" })
  async addFavorite(
    @CurrentUser("id") userId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.favoritesService.addFavorite(userId, itemId);
  }

  @Delete(":itemId")
  @ApiOperation({ summary: "取消收藏" })
  @ApiResponse({ status: 200, description: "取消收藏成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "itemId", description: "商品 ID" })
  async removeFavorite(
    @CurrentUser("id") userId: string,
    @Param("itemId") itemId: string,
  ) {
    await this.favoritesService.removeFavorite(userId, itemId);
    return { success: true };
  }

  @Get("check/:itemId")
  @ApiOperation({ summary: "检查是否已收藏" })
  @ApiResponse({ status: 200, description: "查询成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "itemId", description: "商品 ID" })
  async checkFavorite(
    @CurrentUser("id") userId: string,
    @Param("itemId") itemId: string,
  ) {
    const isFavorite = await this.favoritesService.isFavorite(userId, itemId);
    return { isFavorite };
  }
}
