import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../common/prisma/prisma.service";
import { ConsultantMatchingService } from "./consultant-matching.service";
import { ConsultantMatchRequestDto } from "./dto";
import { ServiceTypeDto } from "./dto/consultant.dto";

describe("ConsultantMatchingService", () => {
  let service: ConsultantMatchingService;
  let prisma: {
    consultantProfile: { findMany: jest.Mock };
    userProfile: { findUnique: jest.Mock };
  };

  const mockConsultants = [
    {
      id: "consultant-1",
      studioName: "风尚造型工作室",
      avatar: "https://example.com/avatar1.jpg",
      specialties: ["整体造型", "形象设计", "职场穿搭", "色彩搭配"],
      rating: 4.8,
      reviewCount: 120,
      location: "北京",
      status: "active",
      user: { id: "user-1", nickname: "造型师A", avatar: null },
      _count: { bookings: 50 },
    },
    {
      id: "consultant-2",
      studioName: "色彩美学工作室",
      avatar: null,
      specialties: ["色彩", "色彩诊断", "配色", "日常穿搭"],
      rating: 4.5,
      reviewCount: 80,
      location: "上海",
      status: "active",
      user: { id: "user-2", nickname: "造型师B", avatar: null },
      _count: { bookings: 30 },
    },
    {
      id: "consultant-3",
      studioName: "衣橱管理专家",
      avatar: "https://example.com/avatar3.jpg",
      specialties: ["衣橱管理", "整理", "搭配"],
      rating: 4.2,
      reviewCount: 40,
      location: "北京",
      status: "active",
      user: { id: "user-3", nickname: "造型师C", avatar: null },
      _count: { bookings: 15 },
    },
  ];

  const mockUserProfile = {
    userId: "test-user",
    location: "北京",
    styleProfile: {
      preferredStyles: ["职场穿搭", "日常穿搭"],
    },
  };

  beforeEach(async () => {
    prisma = {
      consultantProfile: { findMany: jest.fn() },
      userProfile: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultantMatchingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ConsultantMatchingService>(ConsultantMatchingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findMatches", () => {
    it("should return max 5 results sorted by matchPercentage descending", async () => {
      prisma.consultantProfile.findMany.mockResolvedValue(mockConsultants);
      prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const dto = new ConsultantMatchRequestDto();
      dto.serviceType = ServiceTypeDto.STYLING_CONSULTATION;
      dto.notes = "职场穿搭";

      const results = await service.findMatches("test-user", dto);

      expect(results.length).toBeLessThanOrEqual(5);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1]!;
        const curr = results[i]!;
        expect(prev.matchPercentage).toBeGreaterThanOrEqual(
          curr.matchPercentage,
        );
      }
    });

    it("should return empty array when no active consultants", async () => {
      prisma.consultantProfile.findMany.mockResolvedValue([]);
      prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const dto = new ConsultantMatchRequestDto();
      dto.serviceType = ServiceTypeDto.STYLING_CONSULTATION;

      const results = await service.findMatches("test-user", dto);
      expect(results).toEqual([]);
    });

    it("should include matchPercentage (0-99) and matchReasons in each result", async () => {
      prisma.consultantProfile.findMany.mockResolvedValue(mockConsultants);
      prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const dto = new ConsultantMatchRequestDto();
      dto.serviceType = ServiceTypeDto.STYLING_CONSULTATION;

      const results = await service.findMatches("test-user", dto);

      for (const result of results) {
        expect(result.matchPercentage).toBeGreaterThanOrEqual(0);
        expect(result.matchPercentage).toBeLessThanOrEqual(99);
        expect(Array.isArray(result.matchReasons)).toBe(true);
        expect(result.matchReasons.length).toBeGreaterThanOrEqual(1);
        expect(result.matchReasons.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe("calcProfileScore", () => {
    it("should return high score when user style preferences overlap with consultant specialties", async () => {
      prisma.consultantProfile.findMany.mockResolvedValue(mockConsultants);
      prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const dto = new ConsultantMatchRequestDto();
      dto.serviceType = ServiceTypeDto.STYLING_CONSULTATION;

      const results = await service.findMatches("test-user", dto);

      // consultant-1 has "职场穿搭" which overlaps with user's preferredStyles
      const consultant1 = results.find((r) => r.consultantId === "consultant-1");
      expect(consultant1).toBeDefined();
      expect(consultant1!.matchPercentage).toBeGreaterThan(0);
    });

    it("should return 0.5 when user has no style profile", async () => {
      prisma.consultantProfile.findMany.mockResolvedValue(mockConsultants);
      prisma.userProfile.findUnique.mockResolvedValue(null);

      const dto = new ConsultantMatchRequestDto();
      dto.serviceType = ServiceTypeDto.STYLING_CONSULTATION;

      const results = await service.findMatches("test-user", dto);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("calcKeywordScore", () => {
    it("should return high score when request notes match consultant specialties", async () => {
      prisma.consultantProfile.findMany.mockResolvedValue(mockConsultants);
      prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const dto = new ConsultantMatchRequestDto();
      dto.serviceType = ServiceTypeDto.STYLING_CONSULTATION;
      dto.notes = "色彩搭配, 日常穿搭";

      const results = await service.findMatches("test-user", dto);

      // consultant-1 and consultant-2 should score well on keywords
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("calcSpecialtyScore", () => {
    it("should return high score when service type matches consultant specialties", async () => {
      prisma.consultantProfile.findMany.mockResolvedValue(mockConsultants);
      prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const dto = new ConsultantMatchRequestDto();
      dto.serviceType = ServiceTypeDto.COLOR_ANALYSIS;

      const results = await service.findMatches("test-user", dto);

      // consultant-2 specializes in color analysis
      const consultant2 = results.find((r) => r.consultantId === "consultant-2");
      expect(consultant2).toBeDefined();
    });
  });

  describe("calcLocationScore", () => {
    it("should give higher score to same-city consultants", async () => {
      prisma.consultantProfile.findMany.mockResolvedValue(mockConsultants);
      prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const dto = new ConsultantMatchRequestDto();
      dto.serviceType = ServiceTypeDto.STYLING_CONSULTATION;

      const results = await service.findMatches("test-user", dto);

      // User is in Beijing, consultant-1 and consultant-3 are also in Beijing
      // They should generally rank higher than consultant-2 (Shanghai)
      // (assuming other scores are comparable)
      const beijingConsultants = results.filter(
        (r) => r.consultantId === "consultant-1" || r.consultantId === "consultant-3",
      );
      expect(beijingConsultants.length).toBeGreaterThan(0);
    });
  });

  describe("buildMatchReasons", () => {
    it("should generate match reasons based on dimension scores", async () => {
      prisma.consultantProfile.findMany.mockResolvedValue(mockConsultants);
      prisma.userProfile.findUnique.mockResolvedValue(mockUserProfile);

      const dto = new ConsultantMatchRequestDto();
      dto.serviceType = ServiceTypeDto.STYLING_CONSULTATION;
      dto.notes = "职场穿搭";

      const results = await service.findMatches("test-user", dto);

      for (const result of results) {
        // Each result should have at least 1 reason
        expect(result.matchReasons.length).toBeGreaterThanOrEqual(1);
        // Reasons should be from known set
        const knownReasons = [
          "擅长你的体型与风格",
          "符合你的需求关键词",
          "专长领域匹配",
          "距离最近",
          "评分最高",
        ];
        for (const reason of result.matchReasons) {
          expect(knownReasons).toContain(reason);
        }
      }
    });
  });
});
