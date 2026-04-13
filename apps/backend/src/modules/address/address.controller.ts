import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import {
  AddressService,
  CreateAddressDto,
  UpdateAddressDto,
} from "./address.service";

@ApiTags("addresses")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("addresses")
export class AddressController {
  constructor(private addressService: AddressService) {}

  @Get()
  @ApiOperation({ summary: "获取地址列表" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async findAll(@Request() req: { user: { id: string } }) {
    return this.addressService.findAll(req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取地址详情" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "地址不存在" })
  @ApiParam({ name: "id", description: "地址 ID" })
  async findOne(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.addressService.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: "创建地址" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.create(req.user.id, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新地址" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "地址不存在" })
  @ApiParam({ name: "id", description: "地址 ID" })
  async update(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.update(req.user.id, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除地址" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "地址不存在" })
  @ApiParam({ name: "id", description: "地址 ID" })
  async remove(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    await this.addressService.remove(req.user.id, id);
    return { success: true };
  }

  @Put(":id/default")
  @ApiOperation({ summary: "设为默认地址" })
  @ApiResponse({ status: 200, description: "设置成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "地址不存在" })
  @ApiParam({ name: "id", description: "地址 ID" })
  async setDefault(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    await this.addressService.setDefault(req.user.id, id);
    return { success: true };
  }
}
