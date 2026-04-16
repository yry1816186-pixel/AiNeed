/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EncryptionService } from "../../../common/encryption/encryption.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AddressData } from "../../../common/types/common.types";

export interface CreateAddressDto {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  name?: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  isDefault?: boolean;
}

export interface AddressResponse {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface ShippingAddressResponse {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
}

@Injectable()
export class AddressService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async findAll(userId: string): Promise<AddressResponse[]> {
    const addresses = await this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return addresses.map((addr: AddressData) => this.mapToResponse(addr));
  }

  /**
   * Find address by ID (internal use, returns encrypted data)
   * Used by OrderService to copy address data
   */
  async findRawAddress(userId: string, id: string) {
    const address = await this.prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException("地址不存在");
    }

    return address;
  }

  async findOne(userId: string, id: string): Promise<AddressResponse> {
    const address = await this.prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException("地址不存在");
    }

    return this.mapToResponse(address);
  }

  async create(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressResponse> {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(dto.phone)) {
      throw new BadRequestException("手机号格式不正确");
    }

    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const existingCount = await this.prisma.userAddress.count({
      where: { userId },
    });

    if (existingCount >= 10) {
      throw new BadRequestException("最多只能添加 10 个地址");
    }

    // Encrypt PII fields before storage
    const address = await this.prisma.userAddress.create({
      data: {
        userId,
        name: dto.name,
        phone: this.encryptionService.encrypt(dto.phone),
        province: dto.province,
        city: dto.city,
        district: dto.district,
        address: this.encryptionService.encrypt(dto.address),
        isDefault: dto.isDefault ?? existingCount === 0,
      },
    });

    return this.mapToResponse(address);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponse> {
    const existing = await this.prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException("地址不存在");
    }

    if (dto.phone) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(dto.phone)) {
        throw new BadRequestException("手机号格式不正确");
      }
    }

    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Prepare update data with encrypted PII fields
    const updateData: Record<string, unknown> = { ...dto };
    if (dto.phone !== undefined) {
      updateData.phone = dto.phone ? this.encryptionService.encrypt(dto.phone) : undefined;
    }
    if (dto.address !== undefined) {
      updateData.address = dto.address ? this.encryptionService.encrypt(dto.address) : undefined;
    }

    const address = await this.prisma.userAddress.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponse(address);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException("地址不存在");
    }

    await this.prisma.userAddress.delete({
      where: { id },
    });

    if (existing.isDefault) {
      const nextDefault = await this.prisma.userAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      if (nextDefault) {
        await this.prisma.userAddress.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }
  }

  async setDefault(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException("地址不存在");
    }

    await this.prisma.userAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    await this.prisma.userAddress.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  // ==================== Helper Methods ====================

  /**
   * Map address entity to response with decrypted PII fields
   */
  private mapToResponse(addr: AddressData): AddressResponse {
    return {
      id: addr.id,
      name: addr.name,
      // Decrypt PII fields for response
      phone: this.encryptionService.decrypt(addr.phone),
      province: addr.province,
      city: addr.city,
      district: addr.district,
      address: this.encryptionService.decrypt(addr.address),
      isDefault: addr.isDefault,
      createdAt: addr.createdAt,
    };
  }

  /**
   * Encrypt PII fields for order address storage
   * Used when copying user address to order address
   */
  encryptOrderAddressData(data: {
    name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    address: string;
  }): {
    name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    address: string;
  } {
    return {
      name: data.name,
      phone: this.encryptionService.encrypt(data.phone),
      province: data.province,
      city: data.city,
      district: data.district,
      address: this.encryptionService.encrypt(data.address),
    };
  }

  /**
   * Decrypt PII fields from order address
   */
  decryptOrderAddressData(addr: AddressData): ShippingAddressResponse {
    return {
      name: addr.name,
      phone: this.encryptionService.decrypt(addr.phone),
      province: addr.province,
      city: addr.city,
      district: addr.district,
      address: this.encryptionService.decrypt(addr.address),
    };
  }
}
