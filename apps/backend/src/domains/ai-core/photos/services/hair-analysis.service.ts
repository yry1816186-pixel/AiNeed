/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { FaceShape, Gender } from "@prisma/client";

export interface HairRecommendation {
  name: string;
  description: string;
  suitability: number; // 0-100
}

@Injectable()
export class HairAnalysisService {
  /**
   * 发型推荐（基于脸型）
   */
  async recommendHairstyle(
    faceShape: FaceShape,
    gender: Gender,
  ): Promise<HairRecommendation[]> {
    const recommendations = this.getRecommendationsByFaceShape(
      faceShape,
      gender,
    );
    return recommendations;
  }

  private getRecommendationsByFaceShape(
    faceShape: FaceShape,
    gender: Gender,
  ): HairRecommendation[] {
    const maleRecommendations: Record<FaceShape, HairRecommendation[]> = {
      oval: [
        {
          name: "短碎发",
          description: "百搭发型，适合各种场合",
          suitability: 95,
        },
        { name: "背头", description: "成熟稳重，凸显气质", suitability: 90 },
        { name: "侧分", description: "经典造型，修饰脸型", suitability: 88 },
        {
          name: "刘海短发",
          description: "年轻时尚，减龄效果",
          suitability: 85,
        },
      ],
      round: [
        {
          name: "高顶",
          description: "增加头顶高度，拉长脸型",
          suitability: 92,
        },
        {
          name: "侧分长发",
          description: "遮挡脸部两侧，显瘦",
          suitability: 88,
        },
        {
          name: "蓬松短发",
          description: "增加顶部发量，平衡比例",
          suitability: 85,
        },
      ],
      square: [
        { name: "纹理烫", description: "柔和下颌线条", suitability: 90 },
        { name: "刘海", description: "软化额头和下颌", suitability: 88 },
        { name: "柔和短发", description: "减少棱角感", suitability: 85 },
      ],
      heart: [
        { name: "刘海", description: "平衡额头宽度", suitability: 92 },
        { name: "侧分", description: "修饰宽额头", suitability: 88 },
        { name: "自然短发", description: "简洁干练", suitability: 85 },
      ],
      oblong: [
        { name: "刘海", description: "缩短脸部长度", suitability: 95 },
        { name: "侧分", description: "增加横向视觉效果", suitability: 90 },
        { name: "蓬松顶部", description: "增加头顶宽度", suitability: 88 },
      ],
      diamond: [
        { name: "侧分", description: "柔和颧骨", suitability: 90 },
        { name: "纹理", description: "增加柔和感", suitability: 88 },
        { name: "短发", description: "简洁大方", suitability: 85 },
      ],
    };

    const femaleRecommendations: Record<FaceShape, HairRecommendation[]> = {
      oval: [
        { name: "长发", description: "百搭发型，展现优雅", suitability: 95 },
        { name: "中分", description: "气质优雅", suitability: 92 },
        { name: "波浪卷", description: "浪漫迷人", suitability: 90 },
        { name: "短发", description: "干练时尚", suitability: 88 },
      ],
      round: [
        { name: "长直发", description: "拉长脸型", suitability: 92 },
        { name: "侧分长发", description: "遮挡脸部两侧", suitability: 90 },
        { name: "高层次", description: "增加头顶高度", suitability: 88 },
      ],
      square: [
        { name: "波浪卷", description: "柔和下颌线条", suitability: 92 },
        { name: "侧分刘海", description: "软化棱角", suitability: 90 },
        { name: "柔和层次", description: "增加女性柔美感", suitability: 88 },
      ],
      heart: [
        {
          name: "下巴长度波波头",
          description: "平衡下巴宽度",
          suitability: 95,
        },
        { name: "侧分长发", description: "修饰宽额头", suitability: 90 },
        { name: "刘海长发", description: "平衡脸部比例", suitability: 88 },
      ],
      oblong: [
        { name: "刘海长发", description: "缩短脸部长度", suitability: 95 },
        { name: "波浪卷", description: "增加横向宽度", suitability: 90 },
        { name: "齐刘海", description: "可爱减龄", suitability: 88 },
      ],
      diamond: [
        { name: "侧分刘海", description: "柔和颧骨", suitability: 92 },
        { name: "下巴长度", description: "平衡脸部宽度", suitability: 90 },
        { name: "波浪", description: "增加柔和感", suitability: 88 },
      ],
    };

    return gender === "male"
      ? maleRecommendations[faceShape] || maleRecommendations.oval
      : femaleRecommendations[faceShape] || femaleRecommendations.oval;
  }
}
