import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService, RedisKeyBuilder } from '../../common/redis/redis.service';

import { CreateFeatureFlagDto } from './dto/create-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-flag.dto';
import { PercentageStrategy, UserSegmentStrategy, ABTestStrategy } from './strategies';
import type { ABTestResult } from './strategies';

export interface EvaluateResult {
  enabled: boolean;
  variant?: string;
  reason: string;
}

const FEATURE_FLAG_QUEUE = 'feature_flag_evaluations';

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly LOCAL_TTL = 5000;
  private readonly REDIS_TTL = 30;

  private localCache = new Map<string, { value: any; expiresAt: number }>();
  private percentageStrategy = new PercentageStrategy();
  private userSegmentStrategy = new UserSegmentStrategy();
  private abTestStrategy = new ABTestStrategy();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectQueue(FEATURE_FLAG_QUEUE) private readonly evaluationQueue: Queue,
  ) {}

  async findAll(query?: { skip?: number; take?: number; type?: string; enabled?: boolean }) {
    const where: Prisma.FeatureFlagWhereInput = {};
    if (query?.type) where.type = query.type;
    if (query?.enabled !== undefined) where.enabled = query.enabled;

    const [items, total] = await Promise.all([
      this.prisma.featureFlag.findMany({
        where,
        skip: query?.skip,
        take: query?.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.featureFlag.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException(`Feature flag ${id} not found`);
    return flag;
  }

  async findByKey(key: string) {
    return this.prisma.featureFlag.findUnique({ where: { key } });
  }

  async create(data: CreateFeatureFlagDto) {
    const flag = await this.prisma.featureFlag.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        type: data.type,
        value: data.value ?? {},
        enabled: data.enabled ?? true,
        rules: data.rules ?? {},
      },
    });
    await this.refreshCache(data.key);
    return flag;
  }

  async update(id: string, data: UpdateFeatureFlagDto) {
    const existing = await this.findOne(id);
    const updateData: Prisma.FeatureFlagUpdateInput = {};
    if (data.key !== undefined) updateData.key = data.key;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.value !== undefined) updateData.value = data.value as Prisma.InputJsonObject;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.rules !== undefined) updateData.rules = data.rules as Prisma.InputJsonObject;

    const flag = await this.prisma.featureFlag.update({
      where: { id },
      data: updateData,
    });
    await this.refreshCache(existing.key);
    if (data.key && data.key !== existing.key) {
      await this.refreshCache(data.key);
    }
    return flag;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.featureFlag.delete({ where: { id } });
    await this.refreshCache(existing.key);
    return { deleted: true };
  }

  async evaluate(key: string, userId?: string, attributes?: Record<string, any>): Promise<EvaluateResult> {
    const flag = await this.getFlagWithCache(key);
    if (!flag) {
      return { enabled: false, reason: 'flag_not_found' };
    }

    if (!flag.enabled) {
      await this.logEvaluation(flag.id, userId, false, null, attributes);
      return { enabled: false, reason: 'flag_disabled' };
    }

    let result: EvaluateResult;

    switch (flag.type) {
      case 'boolean': {
        const enabled = (flag.value as Record<string, any>).enabled ?? false;
        result = { enabled, reason: 'boolean_toggle' };
        break;
      }
      case 'percentage': {
        if (!userId) {
          result = { enabled: false, reason: 'no_user_id' };
          break;
        }
        const enabled = this.percentageStrategy.evaluate(flag, userId);
        result = { enabled, reason: enabled ? 'within_percentage' : 'outside_percentage' };
        break;
      }
      case 'segment': {
        if (!userId) {
          result = { enabled: false, reason: 'no_user_id' };
          break;
        }
        const enabled = this.userSegmentStrategy.evaluate(flag, userId, attributes);
        result = { enabled, reason: enabled ? 'in_segment' : 'not_in_segment' };
        break;
      }
      case 'variant': {
        if (!userId) {
          result = { enabled: false, variant: 'control', reason: 'no_user_id' };
          break;
        }
        const abResult: ABTestResult = this.abTestStrategy.evaluate(flag, userId);
        result = { enabled: abResult.enabled, variant: abResult.variant, reason: 'variant_assigned' };
        break;
      }
      default:
        result = { enabled: false, reason: 'unknown_type' };
    }

    await this.logEvaluation(flag.id, userId, result.enabled, result.variant ?? null, attributes);
    return result;
  }

  async refreshCache(key?: string) {
    if (key) {
      const redisKey = RedisKeyBuilder.cache('feature-flag', key);
      await this.redisService.del(redisKey);
      this.localCache.delete(key);
    } else {
      this.localCache.clear();
    }
  }

  async getAllFlagsForClient() {
    const flags = await this.prisma.featureFlag.findMany({
      where: { enabled: true },
      select: { key: true, type: true, value: true },
    });
    return flags.map((f) => ({
      key: f.key,
      type: f.type,
      value: f.type === 'boolean' ? (f.value as Record<string, any>).enabled ?? false : f.value,
    }));
  }

  private async getFlagWithCache(key: string) {
    const now = Date.now();
    const cached = this.localCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const redisKey = RedisKeyBuilder.cache('feature-flag', key);
    const redisValue = await this.redisService.get(redisKey);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      this.localCache.set(key, { value: parsed, expiresAt: now + this.LOCAL_TTL });
      return parsed;
    }

    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (flag) {
      await this.redisService.setex(redisKey, this.REDIS_TTL, JSON.stringify(flag));
      this.localCache.set(key, { value: flag, expiresAt: now + this.LOCAL_TTL });
    }
    return flag;
  }

  private async logEvaluation(
    flagId: string,
    userId: string | undefined,
    result: boolean,
    variant: string | null,
    attributes: Record<string, any> | undefined,
  ) {
    try {
      await this.evaluationQueue.add('log-evaluation', {
        flagId,
        userId: userId ?? null,
        result,
        variant,
        attributes: attributes ?? null,
        evaluatedAt: new Date().toISOString(),
      }, {
        attempts: 2,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 100 },
      });
    } catch (error) {
      this.logger.warn(`Failed to queue evaluation log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
