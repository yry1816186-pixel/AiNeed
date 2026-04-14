import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Prisma, UserRole } from "@prisma/client";

import { AuthGuard } from "../auth/guards/auth.guard";
import { AdminGuard } from "../../common/guards/admin.guard";
import { RequestWithUser } from "../../common/types/common.types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AdminAuditService } from "./services/admin-audit.service";

import {
  AdminUserQueryDto,
  AdminUserBanDto,
  AdminUserUpdateDto,
  AdminUserExportDto,
} from "./dto/admin-users.dto";

@ApiTags("admin/users")
@Controller("admin/users")
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List users with search and filters" })
  async listUsers(@Query() query: AdminUserQueryDto) {
    const {
      page = 1,
      pageSize = 20,
      search,
      role,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const where: Prisma.UserWhereInput = { isDeleted: false };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { nickname: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    if (role) {
      where.role = role as UserRole;
    }

    if (status === "banned") {
      where.isActive = false;
    } else if (status === "active") {
      where.isActive = true;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          nickname: true,
          avatar: true,
          gender: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          followerCount: true,
          isVerified: true,
          _count: {
            select: { orders: true, behaviors: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Get("export")
  @ApiOperation({ summary: "Export user data" })
  async exportUsers(@Query() query: AdminUserExportDto) {
    const where: Prisma.UserWhereInput = { isDeleted: false };

    if (query.role) {
      where.role = query.role as UserRole;
    }
    if (query.startDate || query.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.startDate) createdAt.gte = new Date(query.startDate);
      if (query.endDate) createdAt.lte = new Date(query.endDate);
      where.createdAt = createdAt;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        nickname: true,
        gender: true,
        role: true,
        isActive: true,
        createdAt: true,
        followerCount: true,
        followingCount: true,
      },
      take: 10000,
      orderBy: { createdAt: "desc" },
    });

    return { data: users, count: users.length };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user detail" })
  async getUser(@Param("id") id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        _count: {
          select: {
            orders: true,
            favorites: true,
            behaviors: true,
            posts: true,
            cartItems: true,
          },
        },
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  @Put(":id/ban")
  @ApiOperation({ summary: "Ban a user" })
  async banUser(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: AdminUserBanDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user || user.isDeleted) {
      throw new NotFoundException("User not found");
    }

    if (user.role === "superadmin") {
      throw new ForbiddenException("Cannot ban superadmin");
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedReason: dto.reason },
    });

    await this.auditService.log({
      userId: req.user.id,
      action: "user.ban",
      resource: "user",
      resourceId: id,
      details: { reason: dto.reason, duration: dto.duration ?? "permanent" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return { success: true };
  }

  @Put(":id/unban")
  @ApiOperation({ summary: "Unban a user" })
  async unbanUser(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user || user.isDeleted) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: true, deletedReason: null },
    });

    await this.auditService.log({
      userId: req.user.id,
      action: "user.unban",
      resource: "user",
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return { success: true };
  }

  @Put(":id/role")
  @ApiOperation({ summary: "Update user role" })
  async updateRole(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: AdminUserUpdateDto,
  ) {
    if (!dto.role) {
      throw new ForbiddenException("Role is required");
    }

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user || user.isDeleted) {
      throw new NotFoundException("User not found");
    }

    if (user.role === "superadmin" && req.user.role !== "superadmin") {
      throw new ForbiddenException("Only superadmin can modify superadmin roles");
    }

    const previousRole = user.role;

    await this.prisma.user.update({
      where: { id },
      data: { role: dto.role as UserRole },
    });

    await this.auditService.log({
      userId: req.user.id,
      action: "user.update_role",
      resource: "user",
      resourceId: id,
      details: { previousRole, newRole: dto.role },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return { success: true };
  }
}
