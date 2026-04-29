import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";

@Injectable()
export class PartnerApiLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logCall(data: {
    keyId: string;
    endpoint: string;
    statusCode: number;
    responseTime: number;
    ip?: string;
  }): Promise<void> {
    await (this.prisma as any).partnerApiCallLog.create({ data });
  }
}
