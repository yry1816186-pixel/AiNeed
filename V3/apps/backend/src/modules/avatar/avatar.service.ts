import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAvatarDto } from './dto/create-avatar.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { DressAvatarDto } from './dto/dress-avatar.dto';

interface TemplateParameterDefs {
  faceShape?: { min: number; max: number; default: number; label: string };
  eyeShape?: { options: string[]; default: string; label: string };
  skinTone?: { options: string[]; default: string; label: string };
  hairStyle?: {
    options: Array<{ id: string; name: string; thumbnailUrl: string }>;
    default: string;
  };
  hairColor?: { options: string[]; default: string };
}

interface AvatarTemplateRecord {
  id: string;
  name: string;
  gender: string;
  thumbnailUrl: string | null;
  drawingConfig: unknown;
  parameters: unknown;
  defaultClothingMap: unknown;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

interface UserAvatarRecord {
  id: string;
  userId: string;
  templateId: string;
  avatarParams: unknown;
  clothingMap: unknown;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type AvatarDelegate = {
  findFirst: (args: Record<string, unknown>) => Promise<UserAvatarRecord | null>;
  create: (args: Record<string, unknown>) => Promise<UserAvatarRecord>;
  update: (args: Record<string, unknown>) => Promise<UserAvatarRecord>;
};

type TemplateDelegate = {
  findUnique: (args: Record<string, unknown>) => Promise<AvatarTemplateRecord | null>;
};

@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);
  private readonly avatarDelegate: AvatarDelegate;
  private readonly templateDelegate: TemplateDelegate;

  constructor(private readonly prisma: PrismaService) {
    this.avatarDelegate = (this.prisma as Record<string, unknown>)['userAvatar'] as AvatarDelegate;
    this.templateDelegate = (this.prisma as Record<string, unknown>)['avatarTemplate'] as TemplateDelegate;
  }

  async create(userId: string, dto: CreateAvatarDto) {
    const existing = await this.avatarDelegate.findFirst({
      where: { userId, isActive: true },
    });
    if (existing) {
      throw new ConflictException('用户已存在活跃形象，每个用户只能有一个活跃形象');
    }

    const template = await this.templateDelegate.findUnique({
      where: { id: dto.template_id },
    });
    if (!template) {
      throw new NotFoundException('形象模板不存在');
    }
    if (!template.isActive) {
      throw new BadRequestException('该形象模板已下架');
    }

    const parameters = template.parameters as TemplateParameterDefs;
    this.validateAvatarParams(dto.avatar_params, parameters);

    const avatarParams: Record<string, unknown> = {
      face_shape: dto.avatar_params.face_shape ?? parameters.faceShape?.default ?? 50,
      eye_type: dto.avatar_params.eye_type ?? parameters.eyeShape?.default ?? 'round',
      skin_tone: dto.avatar_params.skin_tone ?? parameters.skinTone?.default ?? '#FFDBB4',
      hair_id: dto.avatar_params.hair_id ?? parameters.hairStyle?.default ?? 'short',
      accessories: dto.avatar_params.accessories ?? [],
    };

    const clothingMap = template.defaultClothingMap as Record<string, unknown> | null;

    const avatar = await this.avatarDelegate.create({
      data: {
        userId,
        templateId: dto.template_id,
        avatarParams: avatarParams,
        clothingMap: clothingMap ?? {},
      },
    });

    this.logger.log(`用户 ${userId} 创建了Q版形象`);
    return this.toResponse(avatar);
  }

  async getMyAvatar(userId: string) {
    const avatar = await this.avatarDelegate.findFirst({
      where: { userId, isActive: true },
    });
    if (!avatar) {
      throw new NotFoundException('用户尚未创建Q版形象');
    }
    return this.toResponse(avatar);
  }

  async update(userId: string, dto: UpdateAvatarDto) {
    const avatar = await this.avatarDelegate.findFirst({
      where: { userId, isActive: true },
    });
    if (!avatar) {
      throw new NotFoundException('用户尚未创建Q版形象');
    }

    if (!dto.avatar_params) {
      return this.toResponse(avatar);
    }

    const template = await this.templateDelegate.findUnique({
      where: { id: avatar.templateId },
    });
    if (!template) {
      throw new NotFoundException('关联的形象模板不存在');
    }

    const currentParams = avatar.avatarParams as Record<string, unknown>;
    const mergedParams = { ...currentParams };

    if (dto.avatar_params.face_shape !== undefined) {
      mergedParams.face_shape = dto.avatar_params.face_shape;
    }
    if (dto.avatar_params.eye_type !== undefined) {
      mergedParams.eye_type = dto.avatar_params.eye_type;
    }
    if (dto.avatar_params.skin_tone !== undefined) {
      mergedParams.skin_tone = dto.avatar_params.skin_tone;
    }
    if (dto.avatar_params.hair_id !== undefined) {
      mergedParams.hair_id = dto.avatar_params.hair_id;
    }

    const parameters = template.parameters as TemplateParameterDefs;
    this.validateAvatarParams(
      {
        face_shape: mergedParams.face_shape as number | undefined,
        eye_type: mergedParams.eye_type as string | undefined,
        skin_tone: mergedParams.skin_tone as string | undefined,
        hair_id: mergedParams.hair_id as string | undefined,
      },
      parameters,
    );

    const updated = await this.avatarDelegate.update({
      where: { id: avatar.id },
      data: { avatarParams: mergedParams },
    });

    this.logger.log(`用户 ${userId} 更新了形象参数`);
    return this.toResponse(updated);
  }

  async dress(userId: string, dto: DressAvatarDto) {
    const avatar = await this.avatarDelegate.findFirst({
      where: { userId, isActive: true },
    });
    if (!avatar) {
      throw new NotFoundException('用户尚未创建Q版形象');
    }

    const currentMap = (avatar.clothingMap as Record<string, unknown>) ?? {};
    const mergedMap = { ...currentMap, ...dto.clothing_map };

    const updated = await this.avatarDelegate.update({
      where: { id: avatar.id },
      data: { clothingMap: mergedMap },
    });

    this.logger.log(`用户 ${userId} 更新了换装映射`);
    return this.toResponse(updated);
  }

  async updateThumbnail(userId: string, imageUrl: string) {
    const avatar = await this.avatarDelegate.findFirst({
      where: { userId, isActive: true },
    });
    if (!avatar) {
      throw new NotFoundException('用户尚未创建Q版形象');
    }

    const updated = await this.avatarDelegate.update({
      where: { id: avatar.id },
      data: { thumbnailUrl: imageUrl },
    });

    this.logger.log(`用户 ${userId} 更新了形象缩略图`);
    return this.toResponse(updated);
  }

  private validateAvatarParams(
    params: {
      face_shape?: number;
      eye_type?: string;
      skin_tone?: string;
      hair_id?: string;
    },
    templateParams: TemplateParameterDefs,
  ): void {
    const errors: string[] = [];

    if (params.face_shape !== undefined && templateParams.faceShape) {
      const { min, max } = templateParams.faceShape;
      if (params.face_shape < min || params.face_shape > max) {
        errors.push(`脸型值必须在 ${min}-${max} 之间`);
      }
    }

    if (params.eye_type !== undefined && templateParams.eyeShape) {
      if (!templateParams.eyeShape.options.includes(params.eye_type)) {
        errors.push(
          `眼型 "${params.eye_type}" 不在可选范围内: ${templateParams.eyeShape.options.join(', ')}`,
        );
      }
    }

    if (params.skin_tone !== undefined && templateParams.skinTone) {
      if (!templateParams.skinTone.options.includes(params.skin_tone)) {
        errors.push(
          `肤色 "${params.skin_tone}" 不在可选范围内: ${templateParams.skinTone.options.join(', ')}`,
        );
      }
    }

    if (params.hair_id !== undefined && templateParams.hairStyle) {
      const validIds = templateParams.hairStyle.options.map((o) => o.id);
      if (!validIds.includes(params.hair_id)) {
        errors.push(
          `发型ID "${params.hair_id}" 不在可选范围内: ${validIds.join(', ')}`,
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`形象参数验证失败: ${errors.join('; ')}`);
    }
  }

  private toResponse(avatar: UserAvatarRecord) {
    return {
      id: avatar.id,
      templateId: avatar.templateId,
      avatarParams: avatar.avatarParams as Record<string, unknown>,
      clothingMap: avatar.clothingMap as Record<string, unknown> | null,
      thumbnailUrl: avatar.thumbnailUrl,
    };
  }
}
