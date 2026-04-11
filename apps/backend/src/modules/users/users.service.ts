import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { User, Gender } from "@prisma/client";

import { EncryptionService } from "../../common/encryption";
import { PrismaService } from "../../common/prisma/prisma.service";
import * as bcrypt from "../../common/security/bcrypt";
import { CacheKeyBuilder, CACHE_TTL } from "../cache/cache.constants";
import { CacheService } from "../cache/cache.service";


const PII_FIELDS = ["phone", "address", "realName"] as const;
type PiiField = (typeof PII_FIELDS)[number];

export interface UpdateUserDto {
  nickname?: string;
  avatar?: string;
  gender?: "male" | "female" | "other";
  birthDate?: Date;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface UserResponse {
  id: string;
  email: string;
  phone: string | null;
  nickname: string | null;
  avatar: string | null;
  gender: string | null;
  birthDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type UserWithDecrypted = Omit<User, 'phone'> & {
  phone: string | null;
  nickname: string | null;
  avatar: string | null;
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private encryptionService: EncryptionService,
  ) {}

  private encryptPii(data: Record<string, any>): Record<string, any> {
    const encrypted = { ...data };
    for (const field of PII_FIELDS) {
      if (encrypted[field] && !this.encryptionService.isEncrypted(encrypted[field])) {
        encrypted[field] = this.encryptionService.encrypt(encrypted[field]);
      }
    }
    return encrypted;
  }

  private decryptPii(data: Record<string, any>): UserWithDecrypted {
    const decrypted = { ...data };
    for (const field of PII_FIELDS) {
      if (decrypted[field] && this.encryptionService.isEncrypted(decrypted[field])) {
        try {
          decrypted[field] = this.encryptionService.decrypt(decrypted[field]);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to decrypt PII field '${field}': ${errorMessage}. Field value may be corrupted or encrypted with different key.`,
          );
        }
      }
    }
    return decrypted as UserWithDecrypted;
  }

  async findById(id: string): Promise<UserResponse | null> {
    const cacheKey = CacheKeyBuilder.user(id);

    return this.cacheService.getOrSet<UserResponse | null>(
      cacheKey,
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { id },
        });

        if (!user) {
          return null;
        }

        const decryptedUser = this.decryptPii(user);

        return {
          id: decryptedUser.id,
          email: decryptedUser.email,
          phone: decryptedUser.phone,
          nickname: decryptedUser.nickname,
          avatar: decryptedUser.avatar,
          gender: decryptedUser.gender,
          birthDate: decryptedUser.birthDate,
          isActive: decryptedUser.isActive,
          createdAt: decryptedUser.createdAt,
          updatedAt: decryptedUser.updatedAt,
        };
      },
      CACHE_TTL.USER,
    );
  }

  async findByEmail(email: string): Promise<UserResponse | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return this.toUserResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const encryptedDto = this.encryptPii(dto);

    const updated = await this.prisma.user.update({
      where: { id },
      data: encryptedDto,
    });

    await this.cacheService.del(CacheKeyBuilder.user(id));
    await this.cacheService.del(CacheKeyBuilder.userProfile(id));

    this.logger.log(`User updated: ${id}`);

    return this.toUserResponse(this.decryptPii(updated));
  }

  async changePassword(
    id: string,
    dto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.oldPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException("原密码错误");
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException("新密码不能与原密码相同");
    }

    const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,32}$/;
    if (!PASSWORD_REGEX.test(dto.newPassword)) {
      throw new BadRequestException("密码必须为8-32位，包含大小写字母和数字");
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Invalidate user cache
    await this.cacheService.del(CacheKeyBuilder.user(id));

    this.logger.log(`Password changed for user: ${id}`);

    return { success: true };
  }

  async updateAvatar(id: string, avatarUrl: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
    });

    // Invalidate user cache
    await this.cacheService.del(CacheKeyBuilder.user(id));

    return this.toUserResponse(updated);
  }

  async deactivate(id: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate user cache
    await this.cacheService.del(CacheKeyBuilder.user(id));

    this.logger.log(`User deactivated: ${id}`);

    return { success: true };
  }

  async getStats(id: string): Promise<{
    photosCount: number;
    tryOnsCount: number;
    favoritesCount: number;
    ordersCount: number;
  }> {
    const cacheKey = CacheKeyBuilder.userStats(id);

    const stats = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [photosCount, tryOnsCount, favoritesCount, ordersCount] =
          await Promise.all([
            this.prisma.userPhoto.count({ where: { userId: id } }),
            this.prisma.virtualTryOn.count({ where: { userId: id } }),
            this.prisma.favorite.count({ where: { userId: id } }),
            this.prisma.order.count({ where: { userId: id } }),
          ]);

        return {
          photosCount,
          tryOnsCount,
          favoritesCount,
          ordersCount,
        };
      },
      CACHE_TTL.MEDIUM, // 5 minutes cache for stats
    );

    return (
      stats ?? {
        photosCount: 0,
        tryOnsCount: 0,
        favoritesCount: 0,
        ordersCount: 0,
      }
    );
  }

  private toUserResponse(user: UserWithDecrypted): UserResponse {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      birthDate: user.birthDate,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
