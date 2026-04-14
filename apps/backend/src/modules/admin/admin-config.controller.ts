import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { AuthGuard } from "../auth/guards/auth.guard";
import { AdminGuard } from "../../common/guards/admin.guard";
import { RequestWithUser } from "../../common/types/common.types";
import { AdminConfigService } from "./services/admin-config.service";

import { SystemConfigDto, SystemConfigQueryDto } from "./dto/admin-config.dto";

@ApiTags("admin/config")
@Controller("admin/config")
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminConfigController {
  constructor(private readonly configService: AdminConfigService) {}

  @Get()
  @ApiOperation({ summary: "List all system configs" })
  async listConfigs(@Query() query: SystemConfigQueryDto) {
    return this.configService.getAllConfigs(query.page, query.pageSize);
  }

  @Get(":key")
  @ApiOperation({ summary: "Get config by key" })
  async getConfig(@Param("key") key: string) {
    return this.configService.getConfig(key);
  }

  @Put(":key")
  @ApiOperation({ summary: "Set config value" })
  async setConfig(
    @Request() req: RequestWithUser,
    @Param("key") key: string,
    @Body() dto: Omit<SystemConfigDto, "key">,
  ) {
    return this.configService.setConfig(
      key,
      dto.value,
      dto.description,
      req.user.id,
    );
  }

  @Delete(":key")
  @ApiOperation({ summary: "Delete config" })
  async deleteConfig(
    @Request() req: RequestWithUser,
    @Param("key") key: string,
  ) {
    return this.configService.deleteConfig(key, req.user.id);
  }
}
