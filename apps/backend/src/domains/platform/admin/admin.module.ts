/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../../../common/prisma/prisma.module";
import { CommunityModule } from "../../../modules/community/community.module";

import { AdminAuditController } from "./admin-audit.controller";
import { AdminCommunityController } from "./admin-community.controller";
import { AdminConfigController } from "./admin-config.controller";
import { AdminContentReviewController } from "./admin-content-review.controller";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AdminAuditService } from "./services/admin-audit.service";
import { AdminConfigService } from "./services/admin-config.service";
import { AdminDashboardService } from "./services/admin-dashboard.service";
import { ContentReviewService } from "./services/content-review.service";

@Module({
  imports: [PrismaModule, forwardRef(() => CommunityModule)],
  controllers: [
    AdminCommunityController,
    AdminUsersController,
    AdminDashboardController,
    AdminConfigController,
    AdminAuditController,
    AdminContentReviewController,
  ],
  providers: [
    AdminAuditService,
    AdminDashboardService,
    AdminConfigService,
    ContentReviewService,
  ],
  exports: [AdminAuditService, AdminConfigService, ContentReviewService],
})
export class AdminModule {}
