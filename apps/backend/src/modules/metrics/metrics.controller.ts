import { Controller, Get, Req, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { register } from "prom-client";

const ALLOWED_IPS = [
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
];

const ALLOWED_PREFIXES = [
  "172.",
  "10.",
  "192.168.",
  "::ffff:172.",
  "::ffff:10.",
  "::ffff:192.168.",
];

function isInternalIp(ip: string): boolean {
  if (ALLOWED_IPS.includes(ip)) {return true;}
  return ALLOWED_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

@ApiTags("metrics")
@Controller("metrics")
export class MetricsController {
  @Get()
  @ApiOperation({ summary: "Prometheus metrics endpoint" })
  @ApiResponse({
    status: 200,
    description: "Returns Prometheus metrics in text format",
  })
  async getMetrics(@Req() req: Request): Promise<string> {
    const clientIp = req.ip || req.socket?.remoteAddress || "";
    if (!isInternalIp(clientIp)) {
      throw new ForbiddenException("Metrics endpoint is only accessible from internal network");
    }
    return await register.metrics();
  }
}
