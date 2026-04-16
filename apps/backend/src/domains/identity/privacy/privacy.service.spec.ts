import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { EmailService } from "../../../common/email/email.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { StorageService } from "../../../common/storage/storage.service";

import { PrivacyService } from "./privacy.service";

describe("PrivacyService", () => {
  let service: PrivacyService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prisma: PrismaService;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrisma: any = {};

  Object.assign(mockPrisma, {
    userConsent: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    dataExportRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    dataDeletionRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
    },
    userPhoto: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    userBehaviorEvent: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    userPreferenceWeight: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    userSession: {
      deleteMany: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    virtualTryOn: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    favorite: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    customizationRequest: {
      findMany: jest.fn(),
    },
    userSubscription: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (callbacks: any[] | ((tx: typeof mockPrisma) => unknown)) => {
      if (Array.isArray(callbacks)) {
        return Promise.all(callbacks);
      }
      return callbacks(mockPrisma);
      },
    ),
  });

  const mockStorage = {
    uploadTemporary: jest.fn(),
    delete: jest.fn(),
  };

  const mockEmail = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: EmailService, useValue: mockEmail },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<PrivacyService>(PrivacyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserConsents", () => {
    it("should return all consents for a user", async () => {
      const userId = "user-123";
      const mockConsents = [
        {
          id: "consent-1",
          userId,
          consentType: "privacy_policy",
          granted: true,
        },
        { id: "consent-2", userId, consentType: "marketing", granted: false },
      ];

      mockPrisma.userConsent.findMany.mockResolvedValue(mockConsents);

      const result = await service.getUserConsents(userId);

      expect(result).toEqual(mockConsents);
      expect(mockPrisma.userConsent.findMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe("recordConsent", () => {
    it("should create new consent record", async () => {
      const userId = "user-123";
      const consentType = "privacy_policy";
      const granted = true;
      const metadata = { ipAddress: "127.0.0.1", userAgent: "test-agent" };

      const mockConsent = {
        id: "consent-1",
        userId,
        consentType,
        granted,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      };

      mockPrisma.userConsent.upsert.mockResolvedValue(mockConsent);

      const result = await service.recordConsent(
        userId,
        consentType,
        granted,
        metadata,
      );

      expect(result).toEqual(mockConsent);
      expect(mockPrisma.userConsent.upsert).toHaveBeenCalled();
    });

    it("should update existing consent if already exists", async () => {
      const userId = "user-123";
      const consentType = "marketing";
      const granted = true;

      const existingConsent = {
        id: "consent-1",
        userId,
        consentType,
        granted: false,
      };

      mockPrisma.userConsent.upsert.mockResolvedValue({
        ...existingConsent,
        granted,
      });

      await service.recordConsent(userId, consentType, granted, {});

      expect(mockPrisma.userConsent.upsert).toHaveBeenCalled();
    });
  });

  describe("exportUserData", () => {
    it("should create export request and return request ID", async () => {
      const userId = "user-123";
      const format = "json";

      const mockExportRequest = {
        id: "export-1",
        userId,
        format,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockPrisma.dataExportRequest.create.mockResolvedValue(mockExportRequest);

      const result = await service.exportUserData(userId, format);

      expect(result).toHaveProperty("requestId");
      expect(mockPrisma.dataExportRequest.create).toHaveBeenCalled();
    });
  });

  describe("getExportRequest", () => {
    it("should return export request status", async () => {
      const requestId = "export-1";
      const userId = "user-123";

      const mockExportRequest = {
        id: requestId,
        userId,
        status: "completed",
        downloadUrl: "https://example.com/download",
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockPrisma.dataExportRequest.findFirst.mockResolvedValue(
        mockExportRequest,
      );

      const result = await service.getExportRequest(requestId, userId);

      expect(result).toEqual(mockExportRequest);
    });

    it("should return null if request not found", async () => {
      mockPrisma.dataExportRequest.findFirst.mockResolvedValue(null);

      const result = await service.getExportRequest("invalid-id", "user-123");

      expect(result).toBeNull();
    });
  });

  describe("deleteUserData", () => {
    it("should create deletion request", async () => {
      const userId = "user-123";
      const reason = "No longer using the service";

      const mockDeletionRequest = {
        id: "deletion-1",
        userId,
        status: "pending",
        reason,
      };

      mockPrisma.dataDeletionRequest.create.mockResolvedValue(
        mockDeletionRequest,
      );

      const result = await service.deleteUserData(userId, reason);

      expect(result).toHaveProperty("requestId");
    });
  });

  describe("cancelDeletionRequest", () => {
    it("should cancel pending deletion request", async () => {
      const requestId = "deletion-1";
      const userId = "user-123";

      mockPrisma.dataDeletionRequest.updateMany.mockResolvedValue({ count: 1 });

      await service.cancelDeletionRequest(requestId, userId);

      expect(mockPrisma.dataDeletionRequest.updateMany).toHaveBeenCalledWith({
        where: { id: requestId, userId, status: "pending" },
        data: { status: "cancelled" },
      });
    });
  });
});
