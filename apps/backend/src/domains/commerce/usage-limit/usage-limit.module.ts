import { Module } from "@nestjs/common";

import { UsageLimitGuard } from "./usage-limit.guard";
import { UsageLimitService } from "./usage-limit.service";

@Module({
  providers: [UsageLimitService, UsageLimitGuard],
  exports: [UsageLimitService, UsageLimitGuard],
})
export class UsageLimitModule {}
