import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../common/prisma/prisma.service";

import { ConsultantAvailabilityService } from "./consultant-availability.service";

describe("ConsultantAvailabilityService", () => {
  let service: ConsultantAvailabilityService;
  let prisma: PrismaService;

  const mockPrismaService = {
    consultantProfile: {
      findUnique: jest.fn(),
    },
    consultantAvailability: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    serviceBooking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultantAvailabilityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ConsultantAvailabilityService>(ConsultantAvailabilityService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("setAvailability", () => {
    it("should throw when consultant not found", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.setAvailability("c-1", "user-1", { items: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw when user is not the consultant owner", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue({
        id: "c-1",
        userId: "user-2",
      });

      await expect(
        service.setAvailability("c-1", "user-1", { items: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should delete old templates and create new ones", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue({
        id: "c-1",
        userId: "user-1",
      });
      mockPrismaService.consultantAvailability.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.consultantAvailability.createMany.mockResolvedValue({ count: 3 });

      const result = await service.setAvailability("c-1", "user-1", {
        items: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "12:00", slotDuration: 60 },
          { dayOfWeek: 2, startTime: "10:00", endTime: "15:00", slotDuration: 30 },
          { dayOfWeek: 3, startTime: "14:00", endTime: "17:00" },
        ],
      });

      expect(mockPrismaService.consultantAvailability.deleteMany).toHaveBeenCalledWith({
        where: { consultantId: "c-1" },
      });
      expect(mockPrismaService.consultantAvailability.createMany).toHaveBeenCalled();
    });
  });

  describe("getAvailability", () => {
    it("should return availability templates ordered by dayOfWeek", async () => {
      const templates = [
        { id: "a-1", dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
        { id: "a-2", dayOfWeek: 3, startTime: "10:00", endTime: "15:00" },
      ];
      mockPrismaService.consultantAvailability.findMany.mockResolvedValue(templates);

      const result = await service.getAvailability("c-1");

      expect(result).toEqual(templates);
      expect(mockPrismaService.consultantAvailability.findMany).toHaveBeenCalledWith({
        where: { consultantId: "c-1" },
        orderBy: { dayOfWeek: "asc" },
      });
    });
  });

  describe("getAvailableSlots", () => {
    it("should throw for invalid date format", async () => {
      await expect(
        service.getAvailableSlots({ consultantId: "c-1", date: "not-a-date" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should return empty array when no templates exist", async () => {
      mockPrismaService.consultantAvailability.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots({
        consultantId: "c-1",
        date: "2026-04-13",
      });

      expect(result).toEqual([]);
    });

    it("should generate slots and exclude booked ones", async () => {
      // 2026-04-13 is a Monday (dayOfWeek=1)
      mockPrismaService.consultantAvailability.findMany.mockResolvedValue([
        { startTime: "09:00", endTime: "11:00", slotDuration: 60, isAvailable: true },
      ]);
      mockPrismaService.serviceBooking.findMany.mockResolvedValue([
        {
          id: "booking-1",
          scheduledAt: new Date("2026-04-13T10:00:00"),
          durationMinutes: 60,
        },
      ]);

      const result = await service.getAvailableSlots({
        consultantId: "c-1",
        date: "2026-04-13",
      });

      expect(result.length).toBe(2);
      expect(result[0]?.isAvailable).toBe(true);
      expect(result[1]?.isAvailable).toBe(false);
      expect(result[1]?.bookingId).toBe("booking-1");
    });
  });

  describe("checkSlotConflict", () => {
    it("should return false when no conflicting booking exists", async () => {
      mockPrismaService.serviceBooking.findFirst.mockResolvedValue(null);

      const result = await service.checkSlotConflict(
        "c-1",
        new Date("2026-04-13T10:00:00"),
        60,
      );

      expect(result).toBe(false);
    });

    it("should return true when a conflict overlaps", async () => {
      const scheduledAt = new Date("2026-04-13T10:00:00");
      mockPrismaService.serviceBooking.findFirst.mockResolvedValue({
        id: "b-1",
        scheduledAt,
        durationMinutes: 60,
      });

      const result = await service.checkSlotConflict(
        "c-1",
        new Date("2026-04-13T10:30:00"),
        60,
      );

      expect(result).toBe(true);
    });

    it("should return false when conflict does not overlap", async () => {
      const scheduledAt = new Date("2026-04-13T09:00:00");
      mockPrismaService.serviceBooking.findFirst.mockResolvedValue({
        id: "b-1",
        scheduledAt,
        durationMinutes: 60,
      });

      // Booking ends at 10:00, new slot starts at 10:00 - no overlap
      const result = await service.checkSlotConflict(
        "c-1",
        new Date("2026-04-13T10:00:00"),
        60,
      );

      expect(result).toBe(false);
    });
  });
});
