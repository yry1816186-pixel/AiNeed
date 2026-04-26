import { createHash } from "crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
import * as bcrypt from "../../../common/security/bcrypt";
import { SecurityAuditService } from "../../../modules/security/audit/security-audit.service";

export interface ValidatedUserForAuth {
  id: string;
  email: string;
  password: string;
  nickname?: string | null;
  avatar?: string | null;
  createdAt: Date;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthHelpersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private securityAudit: SecurityAuditService
  ) {}

  async validateCredentials(
    email: string,
    password: string,
    ip?: string
  ): Promise<ValidatedUserForAuth> {
    const lockoutKey = `auth:lockout:${email.toLowerCase()}`;
    const isLocked = await this.redisService.exists(lockoutKey);
    if (isLocked) {
      this.securityAudit.log({
        type: "AUTH_ACCOUNT_LOCKOUT",
        ip,
        resource: "auth:login",
        details: { reason: "account_locked" },
      });
      throw new UnauthorizedException("账户已被锁定，请15分钟后再试");
    }

    const emailHash = createHash("sha256").update(email.toLowerCase().trim()).digest("hex");

    let user = await this.prisma.user.findUnique({
      where: { emailHash },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email },
      });
    }

    if (!user) {
      const remaining = await this.recordFailedAttempt(email);
      this.securityAudit.log({
        type: "AUTH_LOGIN_FAILURE",
        ip,
        resource: "auth:login",
        details: { reason: "user_not_found", attemptsRemaining: MAX_LOGIN_ATTEMPTS - remaining },
      });
      throw new UnauthorizedException(`邮箱或密码错误，剩余尝试次数: ${remaining}`);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const attempts = await this.recordFailedAttempt(email);
      const remaining = MAX_LOGIN_ATTEMPTS - attempts;
      this.securityAudit.log({
        type: "AUTH_LOGIN_FAILURE",
        userId: user.id,
        ip,
        resource: "auth:login",
        details: { reason: "wrong_password", attemptsRemaining: remaining },
      });
      if (remaining > 0) {
        throw new UnauthorizedException(`邮箱或密码错误，剩余尝试次数: ${remaining}`);
      } else {
        throw new UnauthorizedException("账户已被锁定，请15分钟后再试");
      }
    }

    await this.resetFailedAttempts(email);

    return user;
  }

  private async recordFailedAttempt(email: string): Promise<number> {
    const key = `auth:login_attempts:${email.toLowerCase()}`;
    const attempts = await this.redisService.incr(key);

    if (attempts === 1) {
      await this.redisService.expire(key, 3600);
    }

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockoutKey = `auth:lockout:${email.toLowerCase()}`;
      await this.redisService.setWithTtl(lockoutKey, "1", LOCKOUT_DURATION_MS);
    }

    return attempts;
  }

  private async resetFailedAttempts(email: string): Promise<void> {
    const key = `auth:login_attempts:${email.toLowerCase()}`;
    await this.redisService.del(key);
  }
}
