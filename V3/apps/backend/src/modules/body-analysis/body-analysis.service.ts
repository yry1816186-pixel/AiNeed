import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyzeBodyDto } from './dto/analyze-body.dto';
import { ColorSeasonDto } from './dto/color-season.dto';
import { analyzeBodyType } from './engine/body-type.engine';
import { analyzeColorSeason } from './engine/color-season.engine';

interface BodyProfileDelegate {
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  upsert(args: Record<string, unknown>): Promise<unknown>;
}

interface UserDelegate {
  update(args: Record<string, unknown>): Promise<unknown>;
}

interface PrismaDelegates {
  bodyProfile: BodyProfileDelegate;
  user: UserDelegate;
}

@Injectable()
export class BodyAnalysisService {
  private readonly logger = new Logger(BodyAnalysisService.name);
  private readonly db: PrismaDelegates;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as PrismaDelegates;
  }

  async analyze(userId: string, dto: AnalyzeBodyDto) {
    const result = analyzeBodyType({
      height: dto.height,
      weight: dto.weight,
      shoulderWidth: dto.shoulder_width,
      waist: dto.waist,
      hip: dto.hip,
      gender: dto.gender,
    });

    const measurements: Record<string, number> = {
      height: dto.height,
      weight: dto.weight,
    };
    if (dto.shoulder_width) measurements.shoulderWidth = dto.shoulder_width;
    if (dto.waist) measurements.waist = dto.waist;
    if (dto.hip) measurements.hip = dto.hip;

    const analysisResult = {
      bodyType: result.type,
      label: result.label,
      description: result.description,
      suitableStyles: result.suitableStyles,
      avoidStyles: result.avoidStyles,
      colorSeason: result.colorSeason,
    };

    await this.db.bodyProfile.upsert({
      where: { userId },
      update: {
        bodyType: result.type,
        colorSeason: result.colorSeason,
        measurements,
        analysisResult,
        updatedAt: new Date(),
      },
      create: {
        userId,
        bodyType: result.type,
        colorSeason: result.colorSeason,
        measurements,
        analysisResult,
      },
    });

    await this.db.user.update({
      where: { id: userId },
      data: {
        bodyType: result.type,
        colorSeason: result.colorSeason,
      },
    });

    this.logger.log(`User ${userId} body analysis: ${result.type}`);

    return {
      bodyType: result.label,
      description: result.description,
      suitableStyles: result.suitableStyles,
      avoidStyles: result.avoidStyles,
      colorSeason: result.colorSeason,
    };
  }

  async getMyProfile(userId: string) {
    const profile = await this.db.bodyProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return null;
    }

    return profile;
  }

  async analyzeColorSeason(userId: string, dto: ColorSeasonDto) {
    const result = analyzeColorSeason({
      skinTone: dto.skinTone,
      hairColor: dto.hairColor,
      eyeColor: dto.eyeColor,
    });

    await this.db.bodyProfile.upsert({
      where: { userId },
      update: {
        colorSeason: result.season,
        analysisResult: {
          colorSeason: result.season,
          colorSeasonLabel: result.label,
          suitableColors: result.suitableColors,
          avoidColors: result.avoidColors,
          colorSeasonDescription: result.description,
        },
        updatedAt: new Date(),
      },
      create: {
        userId,
        colorSeason: result.season,
        analysisResult: {
          colorSeason: result.season,
          colorSeasonLabel: result.label,
          suitableColors: result.suitableColors,
          avoidColors: result.avoidColors,
          colorSeasonDescription: result.description,
        },
      },
    });

    await this.db.user.update({
      where: { id: userId },
      data: { colorSeason: result.season },
    });

    this.logger.log(`User ${userId} color season: ${result.season}`);

    return {
      season: result.label,
      suitableColors: result.suitableColors,
      avoidColors: result.avoidColors,
      description: result.description,
    };
  }
}
