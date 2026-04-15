import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

/**
 * 预设引导问题服务 — AIS-12
 * 新用户首次进入 AI 造型师时展示预设问题，降低使用门槛
 */

export interface PresetQuestion {
  id: string;
  text: string;
  icon: string;
  category: "daily" | "style" | "occasion" | "weather";
}

const PRESET_QUESTIONS: PresetQuestion[] = [
  { id: "daily-1", text: "今天穿什么", icon: "☀️", category: "daily" },
  { id: "style-1", text: "我适合什么风格", icon: "🎨", category: "style" },
  { id: "occasion-1", text: "帮我搭一套通勤装", icon: "💼", category: "occasion" },
  { id: "occasion-2", text: "约会怎么穿", icon: "💕", category: "occasion" },
  { id: "occasion-3", text: "运动穿搭推荐", icon: "🏃", category: "occasion" },
];

@Injectable()
export class PresetQuestionsService {
  private readonly logger = new Logger(PresetQuestionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取预设问题列表
   */
  getPresetQuestions(): PresetQuestion[] {
    return PRESET_QUESTIONS;
  }

  /**
   * 判断用户是否为新用户（会话数 = 0）
   */
  async isNewUser(userId: string): Promise<boolean> {
    const sessionCount = await this.prisma.aiStylistSession.count({
      where: { userId },
    });
    return sessionCount === 0;
  }
}
