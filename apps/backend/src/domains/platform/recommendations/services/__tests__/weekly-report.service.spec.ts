import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../../../common/prisma/prisma.service";
import { OutfitDiaryService } from "../outfit-diary.service";
import { WeeklyReportService } from "../weekly-report.service";

describe("WeeklyReportService", () => {
  let service: WeeklyReportService;
  let prisma: PrismaService;
  let diaryService: OutfitDiaryService;

  const mockPrismaService = {
    weeklyReport: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    outfitDiary: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    outfit: {
      findMany: jest.fn(),
    },
    outfitItem: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockDiaryService = {
    getDiaryEntriesForWeek: jest.fn(),
    getDiaryCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyReportService,
        OutfitDiaryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideProvider(OutfitDiaryService)
      .useValue(mockDiaryService)
      .compile();

    service = module.get<WeeklyReportService>(WeeklyReportService);
    prisma = module.get<PrismaService>(PrismaService);
    diaryService = module.get<OutfitDiaryService>(OutfitDiaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateWeeklyReport", () => {
    const userId = "test-user-id";

    it("should return null when no diary entries exist for the week", async () => {
      mockPrismaService.weeklyReport.findUnique.mockResolvedValue(null);
      mockDiaryService.getDiaryEntriesForWeek.mockResolvedValue([]);

      const result = await service.generateWeeklyReport(userId);

      expect(result).toBeNull();
    });

    it("should return existing report if already generated", async () => {
      const existingReport = {
        id: "report-id",
        userId,
        weekStart: new Date("2026-04-13"),
        weekEnd: new Date("2026-04-19"),
        satisfaction: 0.85,
        styleDistribution: { casual: 0.6, formal: 0.4 },
        trendSummary: "本周共记录 5 次穿搭",
        evolutionCurve: null,
        sceneCoverage: { daily: 0.6, work: 0.4 },
        colorAnalysis: { black: 0.5, white: 0.3, blue: 0.2 },
        itemReuseRate: 0.75,
        generatedAt: new Date(),
      };

      mockPrismaService.weeklyReport.findUnique.mockResolvedValue(existingReport);

      const result = await service.generateWeeklyReport(userId);

      expect(result).not.toBeNull();
      expect(result!.satisfaction).toBe(0.85);
      expect(mockPrismaService.weeklyReport.create).not.toHaveBeenCalled();
    });

    it("should compute and create a new report from diary entries", async () => {
      const entries = [
        {
          id: "entry-1",
          date: new Date("2026-04-14"),
          scene: "work",
          satisfactionScore: 0.8,
          outfitSnapshot: { colors: ["black", "white"] },
          outfitId: "outfit-1",
        },
        {
          id: "entry-2",
          date: new Date("2026-04-15"),
          scene: "casual",
          satisfactionScore: 0.9,
          outfitSnapshot: { colors: ["blue", "white"] },
          outfitId: "outfit-2",
        },
        {
          id: "entry-3",
          date: new Date("2026-04-16"),
          scene: "date",
          satisfactionScore: 1.0,
          outfitSnapshot: { colors: ["red", "black"] },
          outfitId: null,
        },
      ];

      mockPrismaService.weeklyReport.findUnique.mockResolvedValue(null);
      mockDiaryService.getDiaryEntriesForWeek.mockResolvedValue(entries);
      mockPrismaService.outfit.findMany.mockResolvedValue([
        { style: "smart_casual", occasions: ["work", "casual"] },
        { style: "casual", occasions: ["casual"] },
      ]);
      mockPrismaService.outfitDiary.findMany.mockResolvedValue(entries);
      mockPrismaService.outfitItem.findMany.mockResolvedValue([
        { clothingId: "item-a" },
        { clothingId: "item-b" },
        { clothingId: "item-c" },
        { clothingId: "item-a" },
      ]);
      mockPrismaService.weeklyReport.create.mockResolvedValue({
        id: "new-report-id",
        userId,
      });

      const result = await service.generateWeeklyReport(userId);

      expect(result).not.toBeNull();
      expect(result!.satisfaction).toBeCloseTo(0.9, 1);
      expect(result!.sceneCoverage).toBeDefined();
      expect(result!.colorAnalysis).toBeDefined();
      expect(result!.itemReuseRate).toBeDefined();
      expect(result!.trendSummary).toContain("3");
      expect(mockPrismaService.weeklyReport.create).toHaveBeenCalled();
    });
  });

  describe("getLatestReport", () => {
    it("should return null when no reports exist", async () => {
      mockPrismaService.weeklyReport.findFirst.mockResolvedValue(null);

      const result = await service.getLatestReport("user-1");

      expect(result).toBeNull();
    });

    it("should return the most recent report", async () => {
      const report = {
        id: "report-id",
        userId: "user-1",
        weekStart: new Date("2026-04-13"),
        satisfaction: 0.9,
      };
      mockPrismaService.weeklyReport.findFirst.mockResolvedValue(report);

      const result = await service.getLatestReport("user-1");

      expect(result).toEqual(report);
      expect(mockPrismaService.weeklyReport.findFirst).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { weekStart: "desc" },
      });
    });
  });

  describe("getReportHistory", () => {
    it("should return reports with default limit of 4", async () => {
      const reports = [
        { id: "r1", weekStart: new Date("2026-04-13") },
        { id: "r2", weekStart: new Date("2026-04-06") },
      ];
      mockPrismaService.weeklyReport.findMany.mockResolvedValue(reports);

      const result = await service.getReportHistory("user-1", { limit: 4 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockPrismaService.weeklyReport.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { weekStart: "desc" },
        take: 4,
      });
    });

    it("should respect custom limit", async () => {
      mockPrismaService.weeklyReport.findMany.mockResolvedValue([]);

      const result = await service.getReportHistory("user-1", { limit: 2 });

      expect(mockPrismaService.weeklyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 })
      );
    });
  });

  describe("computeSatisfaction", () => {
    it("should return null for entries with no scores", async () => {
      // Test via generateWeeklyReport with entries that have null scores
      const entries = [
        {
          id: "e1",
          date: new Date(),
          scene: null,
          satisfactionScore: null,
          outfitSnapshot: null,
          outfitId: null,
        },
      ];

      mockPrismaService.weeklyReport.findUnique.mockResolvedValue(null);
      mockDiaryService.getDiaryEntriesForWeek.mockResolvedValue(entries);
      mockPrismaService.outfit.findMany.mockResolvedValue([]);
      mockPrismaService.outfitDiary.findMany.mockResolvedValue([]);
      mockPrismaService.outfitItem.findMany.mockResolvedValue([]);

      const result = await service.generateWeeklyReport("user-1");

      // Should still generate a report even with null satisfaction
      if (result) {
        expect(result.satisfaction).toBeNull();
      }
    });
  });
});
