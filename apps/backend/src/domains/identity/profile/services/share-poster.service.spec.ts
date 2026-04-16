/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { StorageService } from "../../../../common/storage/storage.service";

import { SharePosterService, UserProfileSummary } from "./share-poster.service";

jest.mock("canvas", () => ({
  createCanvas: jest.fn().mockReturnValue({
    toBuffer: jest.fn().mockReturnValue(Buffer.from("png-data")),
    getContext: jest.fn().mockReturnValue({
      fillRect: jest.fn(),
      fillText: jest.fn(),
      fillStyle: "",
      font: "",
      strokeStyle: "",
      lineWidth: 0,
      textAlign: "",
      textBaseline: "",
      beginPath: jest.fn(),
      arc: jest.fn(),
      rect: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      strokeRect: jest.fn(),
      clip: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      drawImage: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 100 }),
    }),
  }),
  Image: jest.fn().mockImplementation(() => ({
    src: "",
  })),
}));

describe("SharePosterService", () => {
  let service: SharePosterService;
  let prismaService: { shareTemplate: { findFirst: jest.Mock } };
  let storageService: { uploadBuffer: jest.Mock; getFileUrl: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      shareTemplate: {
        findFirst: jest.fn().mockResolvedValue({
          id: "template-1",
          name: "Default Template",
          backgroundImageUrl: "https://example.com/bg.png",
          layoutConfig: {
            backgroundColor: "#FFFFFF",
          },
          isActive: true,
        }),
      },
    };

    storageService = {
      uploadBuffer: jest.fn().mockResolvedValue(undefined),
      getFileUrl: jest.fn().mockResolvedValue("https://storage.example.com/share-posters/user-1/test.png"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharePosterService,
        { provide: PrismaService, useValue: prismaService },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get<SharePosterService>(SharePosterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generatePoster", () => {
    const profileData: UserProfileSummary = {
      nickname: "TestUser",
      avatar: "https://example.com/avatar.jpg",
      styleTypeName: "简约优雅",
      matchPercentage: 85,
      colorPalette: ["#FF0000", "#0000FF", "#00FF00"],
    };

    it("should generate poster and return MinIO URL", async () => {
      const result = await service.generatePoster("user-1", profileData);

      expect(result).toBe("https://storage.example.com/share-posters/user-1/test.png");
      expect(storageService.uploadBuffer).toHaveBeenCalledWith(
        expect.stringMatching(/^share-posters\/user-1\/.+\.png$/),
        expect.any(Buffer),
        "image/png",
      );
      expect(storageService.getFileUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^share-posters\/user-1\/.+\.png$/),
      );
    });

    it("should throw NotFoundException when no active template exists", async () => {
      prismaService.shareTemplate.findFirst.mockResolvedValue(null);

      await expect(service.generatePoster("user-1", profileData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should work without optional profile fields", async () => {
      const minimalProfile: UserProfileSummary = {
        nickname: "SimpleUser",
      };

      const result = await service.generatePoster("user-1", minimalProfile);

      expect(result).toBeTruthy();
      expect(storageService.uploadBuffer).toHaveBeenCalled();
    });
  });
});
