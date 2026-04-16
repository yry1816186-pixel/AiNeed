import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

import {
  BatchCreateAvailabilityDto,
  AvailableSlotsQueryDto,
} from "./dto";

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookingId?: string;
}

@Injectable()
export class ConsultantAvailabilityService {
  private readonly logger = new Logger(ConsultantAvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 设置顾问排期模板（覆盖式：先删除旧模板，再创建新模板）
   */
  async setAvailability(
    consultantId: string,
    userId: string,
    dto: BatchCreateAvailabilityDto,
  ) {
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });
    if (!consultant) {throw new NotFoundException("顾问不存在");}
    if (consultant.userId !== userId)
      {throw new BadRequestException("无权修改此顾问排期");}

    // 删除旧时段模板
    await this.prisma.consultantAvailability.deleteMany({
      where: { consultantId },
    });

    // 批量创建新时段模板
    const data = dto.items.map((item) => ({
      consultantId,
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      slotDuration: item.slotDuration ?? 60,
      isAvailable: item.isAvailable ?? true,
    }));

    return this.prisma.consultantAvailability.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * 获取顾问排期模板列表
   */
  async getAvailability(consultantId: string) {
    return this.prisma.consultantAvailability.findMany({
      where: { consultantId },
      orderBy: { dayOfWeek: "asc" },
    });
  }

  /**
   * 获取指定日期的可用时段列表（排除已预约时段）
   */
  async getAvailableSlots(query: AvailableSlotsQueryDto): Promise<TimeSlot[]> {
    const { consultantId, date } = query;

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new BadRequestException("无效的日期格式，请使用 YYYY-MM-DD");
    }

    const dayOfWeek = dateObj.getDay();

    // 获取该顾问当天的时段模板
    const templates = await this.prisma.consultantAvailability.findMany({
      where: { consultantId, dayOfWeek, isAvailable: true },
    });

    if (templates.length === 0) {return [];}

    // 生成所有时段
    const allSlots: TimeSlot[] = [];
    for (const template of templates) {
      const slots = this.generateSlots(
        template.startTime,
        template.endTime,
        template.slotDuration,
      );
      allSlots.push(...slots);
    }

    // 查询该日期的已有预约
    const dayStart = new Date(dateObj);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateObj);
    dayEnd.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.serviceBooking.findMany({
      where: {
        consultantId,
        scheduledAt: { gte: dayStart, lte: dayEnd },
        status: { in: ["pending", "confirmed", "in_progress"] },
      },
      select: { id: true, scheduledAt: true, durationMinutes: true },
    });

    // 标记已预约时段
    for (const slot of allSlots) {
      const slotStart = this.parseTimeToMinutes(slot.startTime);
      const slotEnd = this.parseTimeToMinutes(slot.endTime);

      for (const booking of bookings) {
        const bookingStart =
          booking.scheduledAt.getHours() * 60 +
          booking.scheduledAt.getMinutes();
        const bookingEnd = bookingStart + booking.durationMinutes;

        if (slotStart < bookingEnd && slotEnd > bookingStart) {
          slot.isAvailable = false;
          slot.bookingId = booking.id;
          break;
        }
      }
    }

    return allSlots;
  }

  /**
   * 检查时段是否冲突（用于创建预约前的二次校验）
   */
  async checkSlotConflict(
    consultantId: string,
    scheduledAt: Date,
    durationMinutes: number,
  ): Promise<boolean> {
    const endTime = new Date(scheduledAt.getTime() + durationMinutes * 60000);

    // 查找与目标时段重叠的已有预约
    const conflict = await this.prisma.serviceBooking.findFirst({
      where: {
        consultantId,
        status: { in: ["pending", "confirmed", "in_progress"] },
        scheduledAt: { lt: endTime },
      },
    });

    if (!conflict) {return false;}

    // 精确检查：已有预约的结束时间是否与目标时段重叠
    const conflictEnd = new Date(
      conflict.scheduledAt.getTime() + conflict.durationMinutes * 60000,
    );
    return conflictEnd > scheduledAt;
  }

  // ==================== 私有方法 ====================

  private generateSlots(
    startTime: string,
    endTime: string,
    duration: number,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let current = this.parseTimeToMinutes(startTime);
    const end = this.parseTimeToMinutes(endTime);

    while (current + duration <= end) {
      slots.push({
        startTime: this.formatMinutesToTime(current),
        endTime: this.formatMinutesToTime(current + duration),
        isAvailable: true,
      });
      current += duration;
    }

    return slots;
  }

  private parseTimeToMinutes(time: string): number {
    const parts = time.split(":").map(Number);
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    return hours * 60 + minutes;
  }

  private formatMinutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  }
}
