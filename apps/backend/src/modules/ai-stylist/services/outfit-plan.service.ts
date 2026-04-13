import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AiStylistSessionService } from "./session.service";
import type { StylistResolution, StylistOutfitPlan, StylistOutfitItem } from "../types";

/**
 * 方案页数据聚合 — AIS-01
 * 从 session.result (StylistResolution) 中提取方案页所需数据
 */
export interface OutfitPlanDetail {
  sessionId: string;
  lookSummary: string;
  whyItFits: string[];
  weatherInfo?: {
    temperature: number;
    condition: string;
    suggestion: string;
  };
  outfits: Array<{
    title: string;
    items: StylistOutfitItem[];
    styleExplanation: string[];
    estimatedTotalPrice?: number;
  }>;
  createdAt: string;
}

@Injectable()
export class OutfitPlanService {
  private readonly logger = new Logger(OutfitPlanService.name);

  constructor(private sessionService: AiStylistSessionService) {}

  /**
   * 获取指定会话的方案页数据
   */
  async getOutfitPlan(userId: string, sessionId: string): Promise<OutfitPlanDetail> {
    const session = await this.sessionService.getSessionOrThrow(userId, sessionId);

    if (!session.result) {
      throw new NotFoundException("该会话尚未生成穿搭方案");
    }

    const resolution: StylistResolution = session.result;

    return {
      sessionId: session.id,
      lookSummary: resolution.lookSummary,
      whyItFits: resolution.whyItFits,
      weatherInfo: session.state.slots.weather
        ? this.parseWeatherFromSlot(session.state.slots.weather)
        : undefined,
      outfits: resolution.outfits.map((plan: StylistOutfitPlan) => ({
        title: plan.title,
        items: plan.items,
        styleExplanation: plan.styleExplanation,
        estimatedTotalPrice: plan.estimatedTotalPrice,
      })),
      createdAt: session.createdAt,
    };
  }

  /**
   * 从 weather 槽位字符串解析天气信息
   * 格式示例: "北京 22°C 晴 湿度55% 风速3m/s"
   */
  private parseWeatherFromSlot(weatherSlot: string): {
    temperature: number;
    condition: string;
    suggestion: string;
  } | undefined {
    try {
      const tempMatch = weatherSlot.match(/(-?\d+)°C/);
      const conditionMatch = weatherSlot.match(/(?:\d+°C\s+)([\u4e00-\u9fa5]+)/);
      return {
        temperature: tempMatch ? parseInt(tempMatch[1], 10) : 20,
        condition: conditionMatch ? conditionMatch[1] : "晴",
        suggestion: "",
      };
    } catch {
      return undefined;
    }
  }
}
