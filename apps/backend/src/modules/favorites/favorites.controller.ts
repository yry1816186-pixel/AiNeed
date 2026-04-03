import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { FavoritesService } from "./favorites.service";

@ApiTags("favorites")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("favorites")
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: "获取收藏列表" })
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
  async addFavorite(
    @CurrentUser("id") userId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.favoritesService.addFavorite(userId, itemId);
  }

  @Delete(":itemId")
  @ApiOperation({ summary: "取消收藏" })
  async removeFavorite(
    @CurrentUser("id") userId: string,
    @Param("itemId") itemId: string,
  ) {
    await this.favoritesService.removeFavorite(userId, itemId);
    return { success: true };
  }

  @Get("check/:itemId")
  @ApiOperation({ summary: "检查是否已收藏" })
  async checkFavorite(
    @CurrentUser("id") userId: string,
    @Param("itemId") itemId: string,
  ) {
    const isFavorite = await this.favoritesService.isFavorite(userId, itemId);
    return { isFavorite };
  }
}
