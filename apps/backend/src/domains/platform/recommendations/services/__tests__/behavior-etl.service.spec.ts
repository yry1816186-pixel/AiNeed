import { Test, TestingModule } from "@nestjs/testing";

import { BehaviorEtlService } from "../behavior-etl.service";
import { PrismaService } from "../../../../../common/prisma/prisma.service";

describe("BehaviorEtlService", () => {
  let service: BehaviorEtlService;
  let prismaMock: {
    userBehaviorEvent: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      userBehaviorEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BehaviorEtlService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<BehaviorEtlService>(BehaviorEtlService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("computeImplicitScore", () => {
    it("should return correct score for purchase events", () => {
      expect(service.computeImplicitScore("purchase")).toBe(1.0);
    });

    it("should return correct score for favorite events", () => {
      expect(service.computeImplicitScore("favorite")).toBe(1.0);
    });

    it("should return correct score for outfit_save events", () => {
      expect(service.computeImplicitScore("outfit_save")).toBe(1.0);
    });

    it("should return correct score for add_to_cart events", () => {
      expect(service.computeImplicitScore("add_to_cart")).toBe(0.8);
    });

    it("should return correct score for try_on_complete events", () => {
      expect(service.computeImplicitScore("try_on_complete")).toBe(0.6);
    });

    it("should return correct score for recommendation_click events", () => {
      expect(service.computeImplicitScore("recommendation_click")).toBe(0.4);
    });

    it("should return correct score for click events", () => {
      expect(service.computeImplicitScore("click")).toBe(0.3);
    });

    it("should return correct score for item_view events", () => {
      expect(service.computeImplicitScore("item_view")).toBe(0.1);
    });

    it("should return negative score for skip events", () => {
      expect(service.computeImplicitScore("skip")).toBe(-0.3);
    });

    it("should return negative score for unfavorite events", () => {
      expect(service.computeImplicitScore("unfavorite")).toBe(-0.5);
    });

    it("should return negative score for remove_from_cart events", () => {
      expect(service.computeImplicitScore("remove_from_cart")).toBe(-0.5);
    });

    it("should return 0 for unknown event types", () => {
      expect(service.computeImplicitScore("unknown_type")).toBe(0);
    });
  });

  describe("getImplicitScoreMap", () => {
    it("should return the full score map", () => {
      const map = service.getImplicitScoreMap();
      expect(map).toHaveProperty("purchase", 1.0);
      expect(map).toHaveProperty("skip", -0.3);
      expect(Object.keys(map).length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("getMaxSeqLength", () => {
    it("should return 50", () => {
      expect(service.getMaxSeqLength()).toBe(50);
    });
  });

  describe("extractTrainingSequences", () => {
    it("should return empty array when no events exist", async () => {
      prismaMock.userBehaviorEvent.findMany.mockResolvedValueOnce([]);

      const result = await service.extractTrainingSequences();
      expect(result).toEqual([]);
    });

    it("should group events by userId and sort chronologically", async () => {
      const now = new Date();
      const events = [
        {
          userId: "user-1",
          targetId: "item-1",
          eventType: "purchase",
          createdAt: new Date(now.getTime() - 2000),
        },
        {
          userId: "user-1",
          targetId: "item-2",
          eventType: "click",
          createdAt: new Date(now.getTime() - 1000),
        },
        {
          userId: "user-2",
          targetId: "item-3",
          eventType: "favorite",
          createdAt: new Date(now.getTime() - 500),
        },
      ];

      prismaMock.userBehaviorEvent.findMany.mockResolvedValueOnce(events);

      const result = await service.extractTrainingSequences();

      expect(result).toHaveLength(2);

      const user1Seq = result.find((s) => s.userId === "user-1");
      expect(user1Seq).toBeDefined();
      if (!user1Seq) {throw new Error("user1Seq is undefined");}
      expect(user1Seq.events).toHaveLength(2);
      expect(user1Seq.events[0]!.itemId).toBe("item-1");
      expect(user1Seq.events[0]!.implicitScore).toBe(1.0);
      expect(user1Seq.events[1]!.itemId).toBe("item-2");
      expect(user1Seq.events[1]!.implicitScore).toBe(0.3);

      const user2Seq = result.find((s) => s.userId === "user-2");
      expect(user2Seq).toBeDefined();
      if (!user2Seq) {throw new Error("user2Seq is undefined");}
      expect(user2Seq.events).toHaveLength(1);
      expect(user2Seq.events[0]!.implicitScore).toBe(1.0);
    });

    it("should truncate sequences exceeding MAX_SEQ_LENGTH", async () => {
      const events = Array.from({ length: 60 }, (_, i) => ({
        userId: "user-1",
        targetId: `item-${i}`,
        eventType: "click",
        createdAt: new Date(Date.now() - (60 - i) * 1000),
      }));

      prismaMock.userBehaviorEvent.findMany.mockResolvedValueOnce(events);

      const result = await service.extractTrainingSequences();

      expect(result).toHaveLength(1);
      const seq = result[0];
      expect(seq).toBeDefined();
      if (!seq) {throw new Error("seq is undefined");}
      expect(seq.events).toHaveLength(50);
      // Should keep the most recent events (items 10 through 59)
      expect(seq.events[0]!.itemId).toBe("item-10");
      expect(seq.events[49]!.itemId).toBe("item-59");
    });

    it("should skip events with null userId or targetId", async () => {
      const events = [
        {
          userId: null,
          targetId: "item-1",
          eventType: "click",
          createdAt: new Date(),
        },
        {
          userId: "user-1",
          targetId: null,
          eventType: "click",
          createdAt: new Date(),
        },
        {
          userId: "user-1",
          targetId: "item-2",
          eventType: "purchase",
          createdAt: new Date(),
        },
      ];

      prismaMock.userBehaviorEvent.findMany.mockResolvedValueOnce(events);

      const result = await service.extractTrainingSequences();

      expect(result).toHaveLength(1);
      expect(result[0]!.events).toHaveLength(1);
      expect(result[0]!.events[0]!.itemId).toBe("item-2");
    });
  });

  describe("countActionableEventsSince", () => {
    it("should delegate to prisma count", async () => {
      prismaMock.userBehaviorEvent.count.mockResolvedValueOnce(42);

      const since = new Date("2025-01-01");
      const count = await service.countActionableEventsSince(since);

      expect(count).toBe(42);
      expect(prismaMock.userBehaviorEvent.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: since },
          }),
        })
      );
    });
  });

  describe("extractSequencesSince", () => {
    it("should only include events after the given date", async () => {
      const since = new Date("2025-06-01");

      prismaMock.userBehaviorEvent.findMany.mockResolvedValueOnce([
        {
          userId: "user-1",
          targetId: "item-1",
          eventType: "purchase",
          createdAt: new Date("2025-06-15"),
        },
      ]);

      const result = await service.extractSequencesSince(since);

      expect(result).toHaveLength(1);
      expect(prismaMock.userBehaviorEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: since },
          }),
        })
      );
    });
  });

  describe("exportFineTuneData", () => {
    it("should create positive pairs from same-user positive events", async () => {
      const since = new Date("2025-01-01");

      // Mock positive events query
      prismaMock.userBehaviorEvent.findMany
        .mockResolvedValueOnce([
          {
            targetId: "item-1",
            eventType: "purchase",
            userId: "user-1",
          },
          {
            targetId: "item-2",
            eventType: "favorite",
            userId: "user-1",
          },
        ])
        // Mock negative events query
        .mockResolvedValueOnce([]);

      const result = await service.exportFineTuneData(since);

      // Should have one positive pair: item-1 <-> item-2
      expect(result).toHaveLength(1);
      expect(result[0]!.label).toBe(1);
      expect(result[0]!.itemIdA).toBe("item-1");
      expect(result[0]!.itemIdB).toBe("item-2");
    });

    it("should create negative pairs when user has positive and negative events", async () => {
      const since = new Date("2025-01-01");

      prismaMock.userBehaviorEvent.findMany
        .mockResolvedValueOnce([
          {
            targetId: "item-1",
            eventType: "purchase",
            userId: "user-1",
          },
        ])
        .mockResolvedValueOnce([
          {
            targetId: "item-3",
            eventType: "skip",
            userId: "user-1",
          },
        ]);

      const result = await service.exportFineTuneData(since);

      expect(result).toHaveLength(1);
      expect(result[0]!.label).toBe(0);
      expect(result[0]!.itemIdA).toBe("item-1");
      expect(result[0]!.itemIdB).toBe("item-3");
    });

    it("should return empty array when no events exist", async () => {
      prismaMock.userBehaviorEvent.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.exportFineTuneData(new Date());
      expect(result).toEqual([]);
    });
  });
});
