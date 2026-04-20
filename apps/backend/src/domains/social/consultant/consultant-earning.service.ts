import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import Decimal from "decimal.js";
import { EarningStatus, WithdrawalStatus } from "../../../types/prisma-enums";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class ConsultantEarningService {
  private readonly logger = new Logger(ConsultantEarningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getEarnings(consultantId: string, userId: string) {
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });
    if (!consultant) {
      throw new NotFoundException("顾问不存在");
    }
    if (consultant.userId !== userId) {
      throw new ForbiddenException("无权查看此顾问收入");
    }

    const [earnings, totalEarned, pendingAmount, settledAmount] = await Promise.all([
      this.prisma.consultantEarning.findMany({
        where: { consultantId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.consultantEarning.aggregate({
        where: { consultantId },
        _sum: { netAmount: true },
      }),
      this.prisma.consultantEarning.aggregate({
        where: { consultantId, status: EarningStatus.pending },
        _sum: { netAmount: true },
      }),
      this.prisma.consultantEarning.aggregate({
        where: { consultantId, status: EarningStatus.settled },
        _sum: { netAmount: true },
      }),
    ]);

    return {
      earnings,
      summary: {
        totalEarned: totalEarned._sum.netAmount || 0,
        pendingAmount: pendingAmount._sum.netAmount || 0,
        settledAmount: settledAmount._sum.netAmount || 0,
      },
    };
  }

  async requestWithdrawal(
    consultantId: string,
    userId: string,
    amount: number,
    bankInfo: {
      bankName: string;
      bankAccount: string;
      accountHolder: string;
    }
  ) {
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });
    if (!consultant) {
      throw new NotFoundException("顾问不存在");
    }
    if (consultant.userId !== userId) {
      throw new ForbiddenException("无权操作");
    }

    const pendingAmount = await this.prisma.consultantEarning.aggregate({
      where: { consultantId, status: EarningStatus.pending },
      _sum: { netAmount: true },
    });

    const available = Number(pendingAmount._sum.netAmount || 0);
    if (amount > available) {
      throw new BadRequestException(`可提现金额不足，当前可提现: ${available}`);
    }

    if (amount <= 0) {
      throw new BadRequestException("提现金额必须大于0");
    }

    const withdrawal = await this.prisma.consultantWithdrawal.create({
      data: {
        consultantId,
        userId,
        amount: new Decimal(amount),
        status: WithdrawalStatus.pending,
        bankName: bankInfo.bankName,
        bankAccount: bankInfo.bankAccount,
        accountHolder: bankInfo.accountHolder,
      },
    });

    this.logger.log(`顾问 ${consultantId} 申请提现 ${amount}，提现ID: ${withdrawal.id}`);

    return withdrawal;
  }
}
