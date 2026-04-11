import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateBodyProfileDto } from './dto/update-body-profile.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        bodyProfile: true,
        stylePreferences: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (dto.nickname !== undefined) updateData.nickname = dto.nickname;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.birthYear !== undefined) updateData.birthYear = dto.birthYear;
    if (dto.height !== undefined) updateData.height = dto.height;
    if (dto.weight !== undefined) updateData.weight = dto.weight;
    if (dto.bodyType !== undefined) updateData.bodyType = dto.bodyType;
    if (dto.colorSeason !== undefined) updateData.colorSeason = dto.colorSeason;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        bodyProfile: true,
        stylePreferences: true,
      },
    });

    this.logger.log(`User profile updated: ${userId}`);
    return updated;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }

    const existingPreference = await this.prisma.userStylePreference.findFirst({
      where: { userId },
    });

    const updateData: Prisma.UserStylePreferenceUpdateInput = {};
    if (dto.styleTags !== undefined) updateData.styleTags = dto.styleTags;
    if (dto.occasionTags !== undefined) updateData.occasionTags = dto.occasionTags;
    if (dto.colorPreferences !== undefined) updateData.colorPreferences = dto.colorPreferences;
    if (dto.budgetRange !== undefined) updateData.budgetRange = dto.budgetRange;

    let preference;
    if (existingPreference) {
      preference = await this.prisma.userStylePreference.update({
        where: { id: existingPreference.id },
        data: updateData,
      });
    } else {
      preference = await this.prisma.userStylePreference.create({
        data: {
          userId,
          styleTags: dto.styleTags ?? [],
          occasionTags: dto.occasionTags ?? [],
          colorPreferences: dto.colorPreferences ?? [],
          budgetRange: dto.budgetRange,
        },
      });
    }

    this.logger.log(`User preferences updated: ${userId}`);
    return preference;
  }

  async updateBodyProfile(userId: string, dto: UpdateBodyProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }

    const updateData: Prisma.BodyProfileUpdateInput = {};
    if (dto.bodyType !== undefined) updateData.bodyType = dto.bodyType;
    if (dto.colorSeason !== undefined) updateData.colorSeason = dto.colorSeason;
    if (dto.measurements !== undefined) updateData.measurements = dto.measurements as Prisma.InputJsonValue;
    if (dto.analysisResult !== undefined) updateData.analysisResult = dto.analysisResult as Prisma.InputJsonValue;

    const bodyProfile = await this.prisma.bodyProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        bodyType: dto.bodyType,
        colorSeason: dto.colorSeason,
        measurements: dto.measurements as Prisma.InputJsonValue,
        analysisResult: dto.analysisResult as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`User body profile updated: ${userId}`);
    return bodyProfile;
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    this.logger.log(`User avatar updated: ${userId}`);
    return { avatarUrl: updated.avatarUrl };
  }
}
