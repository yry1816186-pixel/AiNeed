/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

import { RequestWithUser } from "../../../../common/types/common.types";
import { AuthGuard } from "../../../../domains/identity/auth/guards/auth.guard";

import {
  CreateWardrobeCollectionDto,
  UpdateWardrobeCollectionDto,
  WardrobeCollectionQueryDto,
  CreateCollectionItemDto,
  BatchCreateCollectionItemsDto,
  UpdateCollectionItemDto,
  CollectionItemQueryDto,
  ReorderCollectionItemsDto,
} from "./dto/wardrobe-collection.dto";
import { WardrobeCollectionService } from "./wardrobe-collection.service";

@ApiTags("wardrobe/collections")
@ApiBearerAuth()
@Controller("wardrobe/collections")
export class WardrobeCollectionController {
  constructor(
    private readonly wardrobeCollectionService: WardrobeCollectionService,
  ) {}

  // ==================== 分类 CRUD ====================

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "创建灵感衣橱分类", description: "创建新的灵感衣橱分类" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createCollection(
    @Request() req: RequestWithUser,
    @Body() dto: CreateWardrobeCollectionDto,
  ) {
    return this.wardrobeCollectionService.createCollection(req.user.id, dto);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "获取分类列表", description: "分页获取当前用户的灵感衣橱分类列表" })
  @ApiResponse({ status: 200, description: "成功返回分类列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getCollections(
    @Request() req: RequestWithUser,
    @Query() query: WardrobeCollectionQueryDto,
  ) {
    return this.wardrobeCollectionService.getCollections(req.user.id, query);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "获取分类详情", description: "获取指定灵感衣橱分类的详细信息" })
  @ApiResponse({ status: 200, description: "成功返回分类详情" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "分类不存在" })
  @ApiParam({ name: "id", description: "分类ID" })
  async getCollectionById(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
  ) {
    return this.wardrobeCollectionService.getCollectionById(req.user.id, id);
  }

  @Put(":id")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "更新分类", description: "更新灵感衣橱分类信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "分类不存在" })
  @ApiParam({ name: "id", description: "分类ID" })
  async updateCollection(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdateWardrobeCollectionDto,
  ) {
    return this.wardrobeCollectionService.updateCollection(req.user.id, id, dto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "删除分类", description: "删除指定的灵感衣橱分类" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "分类不存在" })
  @ApiParam({ name: "id", description: "分类ID" })
  async deleteCollection(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
  ) {
    return this.wardrobeCollectionService.deleteCollection(req.user.id, id);
  }

  // ==================== 分类项 CRUD ====================

  @Post(":id/items")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "添加分类项", description: "向灵感衣橱分类中添加一个项目" })
  @ApiResponse({ status: 201, description: "添加成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "id", description: "分类ID" })
  async addCollectionItem(
    @Request() req: RequestWithUser,
    @Param("id") collectionId: string,
    @Body() dto: CreateCollectionItemDto,
  ) {
    return this.wardrobeCollectionService.addCollectionItem(
      req.user.id,
      collectionId,
      dto,
    );
  }

  @Post(":id/items/batch")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "批量添加分类项", description: "向灵感衣橱分类中批量添加项目" })
  @ApiResponse({ status: 201, description: "批量添加成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "id", description: "分类ID" })
  async batchAddCollectionItems(
    @Request() req: RequestWithUser,
    @Param("id") collectionId: string,
    @Body() dto: BatchCreateCollectionItemsDto,
  ) {
    return this.wardrobeCollectionService.batchAddCollectionItems(
      req.user.id,
      collectionId,
      dto,
    );
  }

  @Get(":id/items")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "获取分类项列表", description: "分页获取灵感衣橱分类中的项目列表" })
  @ApiResponse({ status: 200, description: "成功返回分类项列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "id", description: "分类ID" })
  async getCollectionItems(
    @Request() req: RequestWithUser,
    @Param("id") collectionId: string,
    @Query() query: CollectionItemQueryDto,
  ) {
    return this.wardrobeCollectionService.getCollectionItems(
      req.user.id,
      collectionId,
      query,
    );
  }

  @Put(":id/items/:itemId")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "更新分类项", description: "更新灵感衣橱分类中的指定项目" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "分类项不存在" })
  @ApiParam({ name: "id", description: "分类ID" })
  @ApiParam({ name: "itemId", description: "分类项ID" })
  async updateCollectionItem(
    @Request() req: RequestWithUser,
    @Param("id") collectionId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateCollectionItemDto,
  ) {
    return this.wardrobeCollectionService.updateCollectionItem(
      req.user.id,
      collectionId,
      itemId,
      dto,
    );
  }

  @Delete(":id/items/:itemId")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "移除分类项", description: "从灵感衣橱分类中移除指定项目" })
  @ApiResponse({ status: 200, description: "移除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "分类项不存在" })
  @ApiParam({ name: "id", description: "分类ID" })
  @ApiParam({ name: "itemId", description: "分类项ID" })
  async removeCollectionItem(
    @Request() req: RequestWithUser,
    @Param("id") collectionId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.wardrobeCollectionService.removeCollectionItem(
      req.user.id,
      collectionId,
      itemId,
    );
  }

  @Put(":id/items/reorder")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "重排分类项", description: "重新排列灵感衣橱分类中的项目顺序" })
  @ApiResponse({ status: 200, description: "重排成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "id", description: "分类ID" })
  async reorderCollectionItems(
    @Request() req: RequestWithUser,
    @Param("id") collectionId: string,
    @Body() dto: ReorderCollectionItemsDto,
  ) {
    return this.wardrobeCollectionService.reorderCollectionItems(
      req.user.id,
      collectionId,
      dto,
    );
  }
}
