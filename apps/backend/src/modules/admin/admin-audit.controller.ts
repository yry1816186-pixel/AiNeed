import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { AuthGuard } from "../auth/guards/auth.guard";
import { AdminGuard } from "../../common/guards/admin.guard";
import { AdminAuditService } from "./services/admin-audit.service";

import { AuditLogQueryDto } from "./dto/admin-audit.dto";

@ApiTags("admin/audit")
@Controller("admin/audit")
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  @ApiOperation({ summary: "Query audit logs" })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditService.query({
      page: query.page,
      pageSize: query.pageSize,
      userId: query.userId,
      action: query.action,
      resource: query.resource,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }
}
