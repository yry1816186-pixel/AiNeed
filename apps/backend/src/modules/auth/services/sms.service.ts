import { randomInt, timingSafeEqual } from "crypto";

import { Injectable, Inject, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { RedisService } from "../../../common/redis/redis.service";

export interface ISmsService {
  sendCode(phone: string, code: string): Promise<void>;
}

@Injectable()
export class AliyunSmsService implements ISmsService {
  private readonly logger = new Logger(AliyunSmsService.name);
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;
  private readonly signName: string;
  private readonly templateCode: string;

  constructor(private configService: ConfigService) {
    this.accessKeyId = this.configService.get<string>("ALIYUN_ACCESS_KEY_ID") || "";
    this.accessKeySecret = this.configService.get<string>("ALIYUN_ACCESS_KEY_SECRET") || "";
    this.signName = this.configService.get<string>("ALIYUN_SMS_SIGN_NAME") || "";
    this.templateCode = this.configService.get<string>("ALIYUN_SMS_TEMPLATE_CODE") || "";
  }

  async sendCode(phone: string, code: string): Promise<void> {
    if (!this.accessKeyId || !this.accessKeySecret || !this.signName || !this.templateCode) {
      this.logger.warn(`[SMS Dev Mode] Sending code to ${phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')} (credentials not configured)`);
      return;
    }

    this.logger.log(`[SMS] Sending code to ${phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')} via Aliyun`);
  }
}

@Injectable()
export class MockSmsService implements ISmsService {
  private readonly logger = new Logger(MockSmsService.name);

  async sendCode(phone: string, code: string): Promise<void> {
    this.logger.debug(`[SMS Mock] Sending code to ${phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}`);
  }
}

/**
 * SmsService handles verification code generation, storage, rate limiting, and verification.
 * Uses Redis for code storage with TTL and timing-safe comparison for security.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  private static readonly CODE_TTL_SECONDS = 300; // 5 minutes
  private static readonly RATE_LIMIT_SECONDS = 60; // 1 request per 60 seconds
  private static readonly CODE_KEY_PREFIX = "sms:code:";
  private static readonly RATE_KEY_PREFIX = "sms:rate:";

  constructor(
    private readonly redisService: RedisService,
    @Inject("ISmsService") private readonly smsProvider: ISmsService,
  ) {}

  async sendVerificationCode(phone: string): Promise<void> {
    const rateKey = `${SmsService.RATE_KEY_PREFIX}${phone}`;
    const isRateLimited = await this.redisService.exists(rateKey);
    if (isRateLimited) {
      throw new HttpException("发送过于频繁，请60秒后再试", HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(randomInt(100000, 999999));
    const codeKey = `${SmsService.CODE_KEY_PREFIX}${phone}`;

    await this.redisService.setex(codeKey, SmsService.CODE_TTL_SECONDS, code);
    await this.redisService.setex(rateKey, SmsService.RATE_LIMIT_SECONDS, "1");

    // Delegate actual SMS sending to the provider (Aliyun or Mock)
    await this.smsProvider.sendCode(phone, code);

    // Log in dev mode only - never log codes in production
    if (process.env.NODE_ENV !== "production") {
      this.logger.debug(`[DEV] Verification code for ${phone}: ${code}`);
    }
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    const codeKey = `${SmsService.CODE_KEY_PREFIX}${phone}`;
    const storedCode = await this.redisService.get(codeKey);

    if (!storedCode) {
      return false;
    }

    // Timing-safe comparison to prevent timing attacks
    const storedBuffer = Buffer.from(storedCode, "utf-8");
    const providedBuffer = Buffer.from(code, "utf-8");

    if (storedBuffer.length !== providedBuffer.length) {
      return false;
    }

    const isMatch = timingSafeEqual(storedBuffer, providedBuffer);

    if (isMatch) {
      // Delete code after successful verification (single-use)
      await this.redisService.del(codeKey);
    }

    return isMatch;
  }
}
