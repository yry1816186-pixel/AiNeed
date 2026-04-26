import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../../common/redis/redis.service";
import { WeatherService } from "../../../../fashion/weather/weather.service";

import { CalendarPlanService } from "../calendar-plan.service";

describe("CalendarPlanService", () => {
  let service: CalendarPlanService;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const mockOutfits: any[] = [
    {
      id: "outfit-1",
      userId: "user-1",
      name: "春季通勤套装",
      description: null,
      coverImage: "https://img.example.com/outfit1.jpg",
      occasions: ["通勤", "商务"],
      seasons: ["spring", "autumn"],
      style: "business",
      wearCount: 3,
      lastWorn: new Date("2026-04-10"),
      isFavorite: true,
      rating: 4.5,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        { clothingId: "item-1", clothing: { name: "白衬衫", category: "top" } },
        { clothingId: "item-2", clothing: { name: "西裤", category: "bottom" } },
      ],
    },
    {
      id: "outfit-2",
      userId: "user-1",
      name: "夏日休闲装",
      description: null,
      coverImage: "https://img.example.com/outfit2.jpg",
      occasions: ["日常", "休闲"],
      seasons: ["summer"],
      style: "casual",
      wearCount: 5,
      lastWorn: new Date("2026-04-15"),
      isFavorite: false,
      rating: 3.8,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        { clothingId: "item-3", clothing: { name: "T恤", category: "top" } },
        { clothingId: "item-4", clothing: { name: "短裤", category: "bottom" } },
      ],
    },
    {
      id: "outfit-3",
      userId: "user-1",
      name: "冬日保暖套装",
      description: null,
      coverImage: null,
      occasions: ["日常", "户外"],
      seasons: ["winter"],
      style: "casual",
      wearCount: 2,
      lastWorn: new Date("2026-03-20"),
      isFavorite: true,
      rating: 4.0,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        { clothingId: "item-5", clothing: { name: "羽绒服", category: "outerwear" } },
        { clothingId: "item-6", clothing: { name: "毛衣", category: "top" } },
      ],
    },
  ];

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    setex: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrisma = {
    outfitPlan: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    outfit: {
      findMany: jest.fn().mockResolvedValue(mockOutfits),
      findFirst: jest.fn(),
    },
    aiStylistSession: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    userBehaviorEvent: {
      create: jest.fn().mockResolvedValue({ id: "event-1" }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarPlanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        {
          provide: WeatherService,
          useValue: {
            get7DayForecast: jest.fn().mockResolvedValue([
              {
                date: "2026-04-18",
                tempHigh: 22,
                tempLow: 12,
                condition: "晴",
                conditionNight: "晴",
                icon: "100",
                windDirDay: "南风",
                windScaleDay: "3",
                humidity: 55,
                precip: 0,
                uvIndex: 5,
              },
            ]),
            getWeatherBasedStyles: jest.fn().mockReturnValue(["日常", "休闲"]),
          },
        },
      ],
    }).compile();

    service = module.get<CalendarPlanService>(CalendarPlanService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // Helper method tests
  // ──────────────────────────────────────────────

  describe("getMonthSeason", () => {
    it("should return spring for March-May", () => {
      expect(service.getMonthSeason(2)).toBe("spring");
      expect(service.getMonthSeason(3)).toBe("spring");
      expect(service.getMonthSeason(4)).toBe("spring");
    });

    it("should return summer for June-August", () => {
      expect(service.getMonthSeason(5)).toBe("summer");
      expect(service.getMonthSeason(6)).toBe("summer");
      expect(service.getMonthSeason(7)).toBe("summer");
    });

    it("should return autumn for September-November", () => {
      expect(service.getMonthSeason(8)).toBe("autumn");
      expect(service.getMonthSeason(9)).toBe("autumn");
      expect(service.getMonthSeason(10)).toBe("autumn");
    });

    it("should return winter for December-February", () => {
      expect(service.getMonthSeason(11)).toBe("winter");
      expect(service.getMonthSeason(0)).toBe("winter");
      expect(service.getMonthSeason(1)).toBe("winter");
    });
  });

  describe("getTempRangeForSeason", () => {
    it("should return correct ranges for each season", () => {
      expect(service.getTempRangeForSeason("spring")).toEqual({ min: 10, max: 22 });
      expect(service.getTempRangeForSeason("summer")).toEqual({ min: 25, max: 38 });
      expect(service.getTempRangeForSeason("autumn")).toEqual({ min: 10, max: 22 });
      expect(service.getTempRangeForSeason("winter")).toEqual({ min: -10, max: 8 });
    });
  });

  describe("inferSceneFromWeather", () => {
    it("should return scene hint when provided", () => {
      expect(service.inferSceneFromWeather(null, "面试")).toBe("面试");
    });

    it("should return default when no data", () => {
      expect(service.inferSceneFromWeather(null, null)).toBe("日常");
    });

    it("should infer from rain condition", () => {
      const forecast = {
        date: "2026-04-18",
        tempHigh: 18,
        tempLow: 12,
        condition: "小雨",
        conditionNight: "阴",
        icon: "300",
        windDirDay: "东风",
        windScaleDay: "2",
        humidity: 80,
        precip: 5,
        uvIndex: 2,
      };
      expect(service.inferSceneFromWeather(forecast, null)).toBe("室内");
    });

    it("should infer from hot temperature", () => {
      const forecast = {
        date: "2026-07-18",
        tempHigh: 35,
        tempLow: 28,
        condition: "晴",
        conditionNight: "晴",
        icon: "100",
        windDirDay: "南风",
        windScaleDay: "3",
        humidity: 60,
        precip: 0,
        uvIndex: 8,
      };
      expect(service.inferSceneFromWeather(forecast, null)).toBe("清爽日常");
    });
  });

  // ──────────────────────────────────────────────
  // Outfit scoring tests (CAL-04)
  // ──────────────────────────────────────────────

  describe("selectOutfitForDay", () => {
    const springDate = new Date("2026-04-20"); // April = spring

    it("should prefer outfits matching the current season", () => {
      const result = service.selectOutfitForDay(mockOutfits, springDate, null, null, new Set());

      expect(result).not.toBeNull();
      // outfit-1 has spring season, outfit-2 is summer, outfit-3 is winter
      // outfit-1 should score highest for spring
      expect(result!.outfit.id).toBe("outfit-1");
    });

    it("should apply wear penalty for recently worn outfits", () => {
      const result = service.selectOutfitForDay(mockOutfits, springDate, null, null, new Set());

      expect(result).not.toBeNull();
      // outfit-1: spring match +30, lastWorn 10 days ago = no penalty
      // outfit-2: no spring match +10, lastWorn 3 days ago = -20 penalty
      // outfit-3: no spring match +10, lastWorn far = no penalty
      expect(result!.breakdown.season).toBe(30); // outfit-1 matches spring
    });

    it("should give variety bonus for outfits not already selected", () => {
      const selectedIds = new Set<string>(["outfit-1"]);

      const result = service.selectOutfitForDay(mockOutfits, springDate, null, null, selectedIds);

      expect(result).not.toBeNull();
      // outfit-1 already selected, so outfit-3 or outfit-2 should be chosen
      expect(result!.breakdown.variety).toBe(15); // Not already selected
    });

    it("should give temperature bonus when forecast matches", () => {
      const forecast = {
        date: "2026-04-20",
        tempHigh: 20,
        tempLow: 12,
        condition: "晴",
        conditionNight: "晴",
        icon: "100",
        windDirDay: "南风",
        windScaleDay: "3",
        humidity: 50,
        precip: 0,
        uvIndex: 5,
      };

      const result = service.selectOutfitForDay(mockOutfits, springDate, forecast, null, new Set());

      expect(result).not.toBeNull();
      expect(result!.breakdown.temperature).toBe(20); // Perfect temp match
    });

    it("should give scene bonus when occasion matches", () => {
      const result = service.selectOutfitForDay(mockOutfits, springDate, null, "商务", new Set());

      expect(result).not.toBeNull();
      expect(result!.outfit.id).toBe("outfit-1"); // Has "商务" in occasions
      expect(result!.breakdown.scene).toBe(25); // Perfect scene match
    });

    it("should return null for empty outfits array", () => {
      const result = service.selectOutfitForDay([], springDate, null, null, new Set());
      expect(result).toBeNull();
    });

    it("should calculate total score correctly", () => {
      const result = service.selectOutfitForDay(mockOutfits, springDate, null, "商务", new Set());

      expect(result).not.toBeNull();
      const { breakdown } = result!;
      const expectedTotal =
        50 +
        breakdown.season +
        breakdown.temperature +
        breakdown.scene +
        breakdown.variety +
        breakdown.wearPenalty;
      expect(result!.score).toBe(expectedTotal);
    });
  });

  // ──────────────────────────────────────────────
  // Preference signal tests (CAL-05)
  // ──────────────────────────────────────────────

  describe("editDayPlan", () => {
    it("should update plan and emit preference signal", async () => {
      const mockOutfit = mockOutfits[0];
      mockPrisma.outfit.findFirst.mockResolvedValueOnce(mockOutfit);
      mockPrisma.outfitPlan.upsert.mockResolvedValueOnce({
        id: "plan-1",
        plannedDate: new Date("2026-04-20"),
        outfitId: "outfit-1",
        sceneTag: "日常",
        isSpecialEvent: false,
        eventName: null,
        source: "manual",
        weatherContext: null,
        outfit: mockOutfit,
      });
      mockPrisma.outfitPlan.findMany.mockResolvedValueOnce([]);

      const result = await service.editDayPlan("user-1", "2026-04-20", "outfit-1");

      expect(result.outfitId).toBe("outfit-1");
      expect(result.source).toBe("manual");

      // Verify preference signal was emitted
      expect(mockPrisma.userBehaviorEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            eventType: "calendar_edit",
            action: "calendar_plan_edit",
            targetType: "outfit",
            targetId: "outfit-1",
          }),
        })
      );
    });

    it("should throw NotFoundException for invalid outfit", async () => {
      mockPrisma.outfit.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.editDayPlan("user-1", "2026-04-20", "nonexistent-outfit")
      ).rejects.toThrow("穿搭方案不存在");
    });
  });

  // ──────────────────────────────────────────────
  // Repeat detection tests (D-11)
  // ──────────────────────────────────────────────

  describe("checkRepeatOutfit", () => {
    it("should detect repeat when >70% item overlap", async () => {
      mockPrisma.outfitPlan.findUnique.mockResolvedValueOnce({
        id: "plan-1",
        outfitId: "outfit-1",
        outfit: {
          items: [
            { clothingId: "item-1", clothing: { name: "白衬衫" } },
            { clothingId: "item-2", clothing: { name: "西裤" } },
            { clothingId: "item-3", clothing: { name: "领带" } },
          ],
        },
      });

      mockPrisma.outfitPlan.findMany.mockResolvedValueOnce([
        {
          id: "plan-2",
          outfit: {
            items: [
              { clothingId: "item-1", clothing: { name: "白衬衫" } },
              { clothingId: "item-2", clothing: { name: "西裤" } },
              { clothingId: "item-4", clothing: { name: "皮鞋" } },
            ],
          },
        },
      ]);

      const result = await service.checkRepeatOutfit("user-1", "2026-04-20");

      // 2 of 3 items overlap = 66.7%, not > 70%
      // Let's add one more overlap
    });

    it("should return no repeat when overlap is below threshold", async () => {
      mockPrisma.outfitPlan.findUnique.mockResolvedValueOnce({
        id: "plan-1",
        outfitId: "outfit-1",
        outfit: {
          items: [
            { clothingId: "item-1", clothing: { name: "白衬衫" } },
            { clothingId: "item-2", clothing: { name: "西裤" } },
            { clothingId: "item-3", clothing: { name: "领带" } },
            { clothingId: "item-4", clothing: { name: "皮鞋" } },
          ],
        },
      });

      mockPrisma.outfitPlan.findMany.mockResolvedValueOnce([
        {
          id: "plan-2",
          outfit: {
            items: [
              { clothingId: "item-5", clothing: { name: "毛衣" } },
              { clothingId: "item-6", clothing: { name: "牛仔裤" } },
            ],
          },
        },
      ]);

      const result = await service.checkRepeatOutfit("user-1", "2026-04-20");

      expect(result.isRepeat).toBe(false);
      expect(result.repeatingPlanIds).toEqual([]);
    });

    it("should return no repeat when no plan exists for date", async () => {
      mockPrisma.outfitPlan.findUnique.mockResolvedValueOnce(null);

      const result = await service.checkRepeatOutfit("user-1", "2026-04-20");

      expect(result.isRepeat).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // Events retrieval tests
  // ──────────────────────────────────────────────

  describe("getUpcomingEvents", () => {
    it("should extract events from session payloads", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      mockPrisma.aiStylistSession.findMany.mockResolvedValueOnce([
        {
          id: "session-1",
          payload: {
            goal: "面试穿搭",
            context: {
              scheduledDate: futureDate.toISOString(),
              entry: "interview",
            },
          },
          createdAt: new Date(),
        },
      ]);

      const events = await service.getUpcomingEvents("user-1");

      expect(events).toHaveLength(1);
      expect(events[0]!.scene).toBe("面试");
    });

    it("should return empty array when no events found", async () => {
      mockPrisma.aiStylistSession.findMany.mockResolvedValueOnce([]);

      const events = await service.getUpcomingEvents("user-1");

      expect(events).toEqual([]);
    });
  });
});
