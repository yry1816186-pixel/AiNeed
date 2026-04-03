import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { SoftDeleteService } from './soft-delete.service';

describe('SoftDeleteService', () => {
  let service: SoftDeleteService;
  let prisma: PrismaService;

  const mockPrisma = {
    clothingItem: {
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftDeleteService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SoftDeleteService>(SoftDeleteService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('softDelete', () => {
    it('should successfully soft delete a record', async () => {
      const mockItem = { id: '1', name: 'Test Item' };
      mockPrisma.clothingItem.update.mockResolvedValue(mockItem);

      const result = await service.softDelete(prisma, 'clothingItem', '1');

      expect(result).toBe(true);
      expect(mockPrisma.clothingItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.clothingItem.update.mockRejectedValue(new Error('Database error'));

      const result = await service.softDelete(prisma, 'clothingItem', '1');

      expect(result).toBe(false);
    });
  });

  describe('softDeleteMany', () => {
    it('should successfully soft delete multiple records', async () => {
      const mockResult = { count: 3 };
      mockPrisma.clothingItem.updateMany.mockResolvedValue(mockResult);

      const result = await service.softDeleteMany(
        prisma,
        'clothingItem',
        ['1', '2', '3'],
      );

      expect(result).toBe(3);
      expect(mockPrisma.clothingItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2', '3'] } },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
        },
      });
    });
  });

  describe('restore', () => {
    it('should successfully restore a deleted record', async () => {
      const mockItem = { id: '1', name: 'Test Item' };
      mockPrisma.clothingItem.update.mockResolvedValue(mockItem);

      const result = await service.restore(prisma, 'clothingItem', '1');

      expect(result).toBe(true);
      expect(mockPrisma.clothingItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.clothingItem.update.mockRejectedValue(new Error('Database error'));

      const result = await service.restore(prisma, 'clothingItem', '1');

      expect(result).toBe(false);
    });
  });

  describe('restoreMany', () => {
    it('should successfully restore multiple records', async () => {
      const mockResult = { count: 3 };
      mockPrisma.clothingItem.updateMany.mockResolvedValue(mockResult);

      const result = await service.restoreMany(
        prisma,
        'clothingItem',
        ['1', '2', '3'],
      );

      expect(result).toBe(3);
      expect(mockPrisma.clothingItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2', '3'] }, isDeleted: true },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });
    });
  });

  describe('permanentDeleteOld', () => {
    it('should permanently delete old soft-deleted records', async () => {
      const mockResult = { count: 5 };
      mockPrisma.clothingItem.deleteMany.mockResolvedValue(mockResult);

      const result = await service.permanentDeleteOld(prisma, 'clothingItem', 30);

      expect(result).toBe(5);
      expect(mockPrisma.clothingItem.deleteMany).toHaveBeenCalledWith({
        where: {
          isDeleted: true,
          deletedAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should calculate the correct cutoff date', async () => {
      const mockResult = { count: 2 };
      mockPrisma.clothingItem.deleteMany.mockResolvedValue(mockResult);

      await service.permanentDeleteOld(prisma, 'clothingItem', 30);

      const deleteCall = mockPrisma.clothingItem.deleteMany.mock.calls[0][0];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      expect(deleteCall.where.deletedAt.lt).toBeInstanceOf(Date);
      expect(deleteCall.where.deletedAt.lt.getTime()).toBeLessThanOrEqual(
        cutoffDate.getTime() + 1000, // Allow 1 second tolerance
      );
    });
  });
});
