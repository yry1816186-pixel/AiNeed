import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { CartService } from "./cart.service";
import { AddToCartDto, UpdateCartItemDto, SelectAllCartDto, BatchDeleteCartDto, MoveToFavoritesDto, UpdateCartSkuDto } from "./dto/cart.dto";

@ApiTags("cart")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("cart")
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "获取购物车列表" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getCart(@Request() req: { user: { id: string } }) {
    return this.cartService.getCart(req.user.id);
  }

  @Get("summary")
  @ApiOperation({ summary: "获取购物车统计" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "couponCode", required: false, description: "优惠券代码", type: String })
  async getCartSummary(
    @Request() req: { user: { id: string } },
    @Query("couponCode") couponCode?: string,
  ) {
    return this.cartService.getCartSummaryWithCoupon(req.user.id, couponCode);
  }

  @Post()
  @ApiOperation({ summary: "添加商品到购物车" })
  @ApiResponse({ status: 201, description: "添加成功" })
  @ApiResponse({ status: 400, description: "商品不存在或已下架" })
  @ApiResponse({ status: 401, description: "未授权" })
  async addItem(
    @Request() req: { user: { id: string } },
    @Body() body: AddToCartDto,
  ) {
    return this.cartService.addItem(
      req.user.id,
      body.itemId,
      body.color!,
      body.size!,
      body.quantity || 1,
    );
  }

  @Put(":id")
  @ApiOperation({ summary: "更新购物车商品" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "购物车商品不存在" })
  @ApiParam({ name: "id", description: "购物车项 ID" })
  async updateItem(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() body: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req.user.id, id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "移除购物车商品" })
  @ApiResponse({ status: 200, description: "移除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "购物车商品不存在" })
  @ApiParam({ name: "id", description: "购物车项 ID" })
  async removeItem(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    await this.cartService.removeItem(req.user.id, id);
    return { success: true };
  }

  @Delete()
  @ApiOperation({ summary: "清空购物车" })
  @ApiResponse({ status: 200, description: "清空成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async clearCart(@Request() req: { user: { id: string } }) {
    await this.cartService.clearCart(req.user.id);
    return { success: true };
  }

  @Put("select-all")
  @ApiOperation({ summary: "全选/取消全选" })
  @ApiResponse({ status: 200, description: "操作成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async selectAll(
    @Request() req: { user: { id: string } },
    @Body() body: SelectAllCartDto,
  ) {
    await this.cartService.selectAll(req.user.id, body.selected);
    return { success: true };
  }

  // Phase 5: Enhanced cart endpoints

  @Get("invalid")
  @ApiOperation({ summary: "获取失效商品" })
  async getInvalidItems(@Request() req: { user: { id: string } }) {
    return this.cartService.getInvalidItems(req.user.id);
  }

  @Delete("batch")
  @ApiOperation({ summary: "批量删除购物车商品" })
  async batchDelete(
    @Request() req: { user: { id: string } },
    @Body() body: BatchDeleteCartDto,
  ) {
    return this.cartService.batchDelete(req.user.id, body.cartItemIds);
  }

  @Post("move-to-favorites")
  @ApiOperation({ summary: "移入收藏" })
  async moveToFavorites(
    @Request() req: { user: { id: string } },
    @Body() body: MoveToFavoritesDto,
  ) {
    return this.cartService.moveToFavorites(req.user.id, body.cartItemIds);
  }

  @Patch(":id/sku")
  @ApiOperation({ summary: "修改商品规格（颜色/尺码）" })
  async updateItemSku(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() body: UpdateCartSkuDto,
  ) {
    return this.cartService.updateItemSku(req.user.id, id, body.color, body.size);
  }
}
