import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { ShareTemplateService } from "./share-template.service";

const mockPrismaService = {
  shareTemplate: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe("ShareTemplateService", () => {
  let service: ShareTemplateService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareTemplateService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ShareTemplateService>(ShareTemplateService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createTemplate", () => {
    it("should create a template with default isActive=true", async () => {
      const dto = {
        name: "简约风格海报",
        description: "适合日常穿搭分享",
        backgroundImageUrl: "https://example.com/bg.jpg",
        layoutConfig: { width: 750, height: 1334, elements: [] },
      };

      const mockCreated = {
        id: "tpl-1",
        ...dto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.shareTemplate.create.mockResolvedValue(mockCreated);

      const result = await service.createTemplate(dto);

      expect(result).toEqual(mockCreated);
      expect(mockPrismaService.shareTemplate.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          backgroundImageUrl: dto.backgroundImageUrl,
          layoutConfig: dto.layoutConfig,
          isActive: true,
        },
      });
    });

    it("should create a template with isActive=false when specified", async () => {
      const dto = {
        name: "测试模板",
        description: "测试描述",
        backgroundImageUrl: "https://example.com/bg2.jpg",
        layoutConfig: { width: 800, height: 1200 },
        isActive: false,
      };

      const mockCreated = {
        id: "tpl-2",
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.shareTemplate.create.mockResolvedValue(mockCreated);

      const result = await service.createTemplate(dto);

      expect(result).toEqual(mockCreated);
      expect(mockPrismaService.shareTemplate.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          backgroundImageUrl: dto.backgroundImageUrl,
          layoutConfig: dto.layoutConfig,
          isActive: false,
        },
      });
    });
  });

  describe("getTemplates", () => {
    it("should return paginated templates without isActive filter", async () => {
      const query = { page: 1, pageSize: 20 };
      const mockTemplates = [
        { id: "tpl-1", name: "模板1", isActive: true },
        { id: "tpl-2", name: "模板2", isActive: false },
      ];

      mockPrismaService.shareTemplate.findMany.mockResolvedValue(mockTemplates);
      mockPrismaService.shareTemplate.count.mockResolvedValue(2);

      const result = await service.getTemplates(query);

      expect(result.items).toEqual(mockTemplates);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaService.shareTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      });
    });

    it("should filter by isActive when provided", async () => {
      const query = { page: 1, pageSize: 10, isActive: true };
      const mockTemplates = [
        { id: "tpl-1", name: "模板1", isActive: true },
      ];

      mockPrismaService.shareTemplate.findMany.mockResolvedValue(mockTemplates);
      mockPrismaService.shareTemplate.count.mockResolvedValue(1);

      const result = await service.getTemplates(query);

      expect(result.items).toEqual(mockTemplates);
      expect(mockPrismaService.shareTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it("should calculate pagination correctly for page 2", async () => {
      const query = { page: 2, pageSize: 10 };
      const mockTemplates = [{ id: "tpl-11", name: "模板11" }];

      mockPrismaService.shareTemplate.findMany.mockResolvedValue(mockTemplates);
      mockPrismaService.shareTemplate.count.mockResolvedValue(15);

      const result = await service.getTemplates(query);

      expect(result.page).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.totalPages).toBe(2);
      expect(mockPrismaService.shareTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe("getTemplateById", () => {
    const templateId = "tpl-1";

    it("should return template when found", async () => {
      const mockTemplate = {
        id: templateId,
        name: "简约风格海报",
        description: "适合日常穿搭分享",
        backgroundImageUrl: "https://example.com/bg.jpg",
        layoutConfig: { width: 750, height: 1334 },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.shareTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.getTemplateById(templateId);

      expect(result).toEqual(mockTemplate);
      expect(mockPrismaService.shareTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: templateId },
      });
    });

    it("should throw NotFoundException when template not found", async () => {
      mockPrismaService.shareTemplate.findUnique.mockResolvedValue(null);

      await expect(service.getTemplateById(templateId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getTemplateById(templateId)).rejects.toThrow(
        "分享模板不存在",
      );
    });
  });

  describe("updateTemplate", () => {
    const templateId = "tpl-1";

    it("should update template when found", async () => {
      const dto = { name: "更新后的名称", description: "更新后的描述" };
      const existingTemplate = {
        id: templateId,
        name: "旧名称",
        description: "旧描述",
        backgroundImageUrl: "https://example.com/bg.jpg",
        layoutConfig: { width: 750 },
        isActive: true,
      };
      const updatedTemplate = {
        ...existingTemplate,
        name: dto.name,
        description: dto.description,
      };

      mockPrismaService.shareTemplate.findUnique.mockResolvedValue(existingTemplate);
      mockPrismaService.shareTemplate.update.mockResolvedValue(updatedTemplate);

      const result = await service.updateTemplate(templateId, dto);

      expect(result).toEqual(updatedTemplate);
      expect(mockPrismaService.shareTemplate.update).toHaveBeenCalledWith({
        where: { id: templateId },
        data: {
          name: dto.name,
          description: dto.description,
          backgroundImageUrl: undefined,
          layoutConfig: undefined,
          isActive: undefined,
        },
      });
    });

    it("should throw NotFoundException when template not found", async () => {
      const dto = { name: "更新后的名称" };

      mockPrismaService.shareTemplate.findUnique.mockResolvedValue(null);

      await expect(service.updateTemplate(templateId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateTemplate(templateId, dto)).rejects.toThrow(
        "分享模板不存在",
      );
      expect(mockPrismaService.shareTemplate.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteTemplate", () => {
    const templateId = "tpl-1";

    it("should delete template when found", async () => {
      const existingTemplate = {
        id: templateId,
        name: "待删除模板",
        description: "描述",
        backgroundImageUrl: "https://example.com/bg.jpg",
        layoutConfig: {},
        isActive: true,
      };

      mockPrismaService.shareTemplate.findUnique.mockResolvedValue(existingTemplate);
      mockPrismaService.shareTemplate.delete.mockResolvedValue(existingTemplate);

      const result = await service.deleteTemplate(templateId);

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.shareTemplate.delete).toHaveBeenCalledWith({
        where: { id: templateId },
      });
    });

    it("should throw NotFoundException when template not found", async () => {
      mockPrismaService.shareTemplate.findUnique.mockResolvedValue(null);

      await expect(service.deleteTemplate(templateId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteTemplate(templateId)).rejects.toThrow(
        "分享模板不存在",
      );
      expect(mockPrismaService.shareTemplate.delete).not.toHaveBeenCalled();
    });
  });
});
