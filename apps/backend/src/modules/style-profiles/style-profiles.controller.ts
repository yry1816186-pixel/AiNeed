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
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RequestWithUser } from "../../common/types/common.types";

import {
  StyleProfilesService,
  CreateStyleProfileDto,
  UpdateStyleProfileDto,
} from "./style-profiles.service";

@ApiTags("style-profiles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("style-profiles")
export class StyleProfilesController {
  constructor(private readonly service: StyleProfilesService) {}

  @Get()
  @ApiOperation({ summary: "获取用户所有风格档案" })
  async findAll(@Request() req: RequestWithUser) {
    return this.service.findAll(req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取单个风格档案" })
  async findOne(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.service.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: "创建风格档案" })
  async create(@Request() req: RequestWithUser, @Body() dto: CreateStyleProfileDto) {
    return this.service.create(req.user.id, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新风格档案" })
  async update(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdateStyleProfileDto,
  ) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除风格档案" })
  async remove(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.service.remove(req.user.id, id);
  }

  @Put(":id/default")
  @ApiOperation({ summary: "设为默认风格档案" })
  async setDefault(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.service.setDefault(req.user.id, id);
  }

  @Put(":id/toggle-active")
  @ApiOperation({ summary: "切换激活状态" })
  async toggleActive(@Request() req: RequestWithUser, @Param("id") id: string) {
    return this.service.toggleActive(req.user.id, id);
  }
}
