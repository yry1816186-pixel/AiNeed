import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ServiceUnavailableException } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

// Mock axios at module level -- jest.mock is hoisted, so use jest.fn() inside factory
jest.mock("axios", () => {
  const actual = jest.requireActual("axios");
  return {
    ...actual,
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
    },
    get: jest.fn(),
    post: jest.fn(),
  };
});

// Import after mock setup
import axios from "axios";
import { StyleDnaService } from "./style-dna.service";

const mockAxiosGet = axios.get as jest.Mock;
const mockAxiosPost = (axios as unknown as { post: jest.Mock }).post;

describe("StyleDnaService", () => {
  let service: StyleDnaService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    mockAxiosGet.mockReset();
    mockAxiosPost.mockReset();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StyleDnaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("http://localhost:8001"),
          },
        },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<StyleDnaService>(StyleDnaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getMatches", () => {
    it("should enrich ML results with nickname and avatar only (non-PII)", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          matches: [
            { user_id: "user-002", score: 0.92 },
            { user_id: "user-003", score: 0.85 },
          ],
        },
      });

      prismaService.user.findUnique
        .mockResolvedValueOnce({ nickname: "Alice", avatar: "https://example.com/avatar1.jpg" })
        .mockResolvedValueOnce({ nickname: "Bob", avatar: null });

      const result = await service.getMatches("user-001", 10);

      expect(result.matches).toHaveLength(2);
      expect(result.matches[0]).toEqual({
        userId: "user-002",
        nickname: "Alice",
        avatar: "https://example.com/avatar1.jpg",
        similarityScore: 0.92,
      });
      expect(result.matches[1]).toEqual({
        userId: "user-003",
        nickname: "Bob",
        avatar: null,
        similarityScore: 0.85,
      });

      // Verify Prisma only selects nickname and avatar (non-PII)
      expect(prismaService.user.findUnique).toHaveBeenCalledTimes(2);
      for (const call of prismaService.user.findUnique.mock.calls) {
        const selectArgs = call[0]?.select;
        expect(Object.keys(selectArgs).sort()).toEqual(["avatar", "nickname"]);
      }
    });

    it("should handle unknown users gracefully with Anonymous nickname", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          matches: [{ user_id: "unknown-user", score: 0.5 }],
        },
      });

      prismaService.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.getMatches("user-001", 10);

      expect(result.matches[0]?.nickname).toBe("Anonymous");
      expect(result.matches[0]?.avatar).toBeNull();
    });

    it("should throw ServiceUnavailableException when ML API fails", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Connection refused"));

      await expect(service.getMatches("user-001", 10)).rejects.toThrow(ServiceUnavailableException);
    });

    it("should return empty matches when ML API returns empty array", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { matches: [] },
      });

      const result = await service.getMatches("cold-start-user", 10);

      expect(result.matches).toHaveLength(0);
    });
  });

  describe("computeStyleDna", () => {
    it("should POST to ML API with correct payload", async () => {
      mockAxiosPost.mockResolvedValue({ data: { success: true } });

      await service.computeStyleDna("user-001", ["item-1", "item-2"], ["purchase", "view"]);

      expect(mockAxiosPost).toHaveBeenCalledWith(
        "http://localhost:8001/api/social/style-dna/compute",
        {
          user_id: "user-001",
          item_ids: ["item-1", "item-2"],
          interaction_types: ["purchase", "view"],
        }
      );
    });

    it("should throw ServiceUnavailableException when ML API fails", async () => {
      mockAxiosPost.mockRejectedValue(new Error("Connection refused"));

      await expect(service.computeStyleDna("user-001", ["item-1"], ["view"])).rejects.toThrow(
        ServiceUnavailableException
      );
    });
  });
});
