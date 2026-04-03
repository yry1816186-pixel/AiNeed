import { Injectable, Logger } from "@nestjs/common";

/**
 * 面部特征分析器
 * 基于脸型、五官特征提供形象建议
 */
@Injectable()
export class FaceShapeAnalyzer {
  private readonly logger = new Logger(FaceShapeAnalyzer.name);

  /**
   * 脸型定义
   */
  readonly faceShapes = {
    oval: {
      name: "鹅蛋脸/椭圆脸",
      description: "额头与颧骨宽度相近，下巴略窄，脸长约是宽的1.5倍",
      characteristics: ["均衡的脸部比例", "下巴柔和收窄", "颧骨略微突出"],
      hairstyles: ["中分长发", "波浪卷发", "低马尾", "侧分短发"],
      glasses: ["大多数镜框都适合", "飞行员款", "猫眼款"],
      makeupTips: ["强调颧骨", "自然眉形", "可尝试各种妆容风格"],
    },
    round: {
      name: "圆脸",
      description: "脸部长度与宽度相近，脸颊饱满，下巴圆润",
      characteristics: ["圆润的脸颊", "额头与下颌宽度相近", "下巴短圆"],
      hairstyles: ["侧分长发", "高丸子头", "层次感短发", "斜刘海"],
      glasses: ["方形镜框", "猫眼款", "角形设计"],
      makeupTips: ["修容打造立体感", "眉毛稍挑", "强调眼部"],
    },
    square: {
      name: "方脸",
      description: "额头、颧骨、下颌宽度相近，下颌角明显",
      characteristics: ["宽阔的额头", "明显的下颌角", "脸部轮廓分明"],
      hairstyles: ["波浪长发", "侧分短发", "有层次的发型", "空气刘海"],
      glasses: ["圆形镜框", "椭圆形镜框", "猫眼款"],
      makeupTips: ["柔和下颌线条", "圆润眉形", "强调眼部"],
    },
    heart: {
      name: "心形脸/瓜子脸",
      description: "额头较宽，下巴尖锐，形似心形",
      characteristics: ["宽阔的额头", "尖下巴", "颧骨突出"],
      hairstyles: ["下巴长度的波波头", "侧分长发", "齐刘海", "低马尾"],
      glasses: ["底部较宽的镜框", "飞行员款", "无框眼镜"],
      makeupTips: ["平衡额头与下巴", "强调唇部", "柔和颧骨"],
    },
    diamond: {
      name: "菱形脸",
      description: "颧骨最宽，额头和下颌较窄",
      characteristics: ["高颧骨", "窄额头", "尖下巴"],
      hairstyles: ["侧分长发", "刘海遮盖额头", "下巴长度的波波头", "波浪卷发"],
      glasses: ["椭圆形镜框", "猫眼款", "无框或细框"],
      makeupTips: ["柔和颧骨线条", "增加额头和下巴的宽度感", "强调眼部或唇部"],
    },
    oblong: {
      name: "长脸/长方脸",
      description: "脸部长度明显大于宽度，轮廓较直",
      characteristics: ["较长的脸型", "额头、颧骨、下颌宽度相近", "高额头"],
      hairstyles: ["有刘海的发型", "波浪卷发", "齐肩发", "蓬松短发"],
      glasses: ["大框眼镜", "飞行员款", "oversize款式"],
      makeupTips: ["横向腮红", "丰满的眉毛", "缩短脸部长度感"],
    },
  } as const;

  /**
   * 获取脸型详情
   */
  getFaceShapeDetails(faceShape: string) {
    return (
      this.faceShapes[faceShape as keyof typeof this.faceShapes] ||
      this.faceShapes.oval
    );
  }

  /**
   * 获取发型建议
   */
  getHairstyleRecommendations(faceShape: string): string[] {
    const details = this.getFaceShapeDetails(faceShape);
    return [...details.hairstyles];
  }

  /**
   * 获取眼镜建议
   */
  getGlassesRecommendations(faceShape: string): string[] {
    const details = this.getFaceShapeDetails(faceShape);
    return [...details.glasses];
  }

  /**
   * 获取妆容建议
   */
  getMakeupTips(faceShape: string): string[] {
    const details = this.getFaceShapeDetails(faceShape);
    return [...details.makeupTips];
  }

  /**
   * 分析面部比例
   */
  analyzeFaceProportions(faceData: {
    faceLength?: number;
    faceWidth?: number;
    foreheadHeight?: number;
    noseLength?: number;
    chinLength?: number;
  }): {
    ratio: number;
    balance: string;
    recommendations: string[];
  } {
    const { faceLength, faceWidth, foreheadHeight, noseLength, chinLength } =
      faceData;

    const recommendations: string[] = [];

    // 计算脸部长宽比
    let ratio = 1.5;
    if (faceLength && faceWidth) {
      ratio = faceLength / faceWidth;
    }

    // 判断脸型平衡度
    let balance = "balanced";
    if (ratio < 1.2) {
      balance = "wide";
      recommendations.push("可以使用修容增加脸部长度感");
      recommendations.push("选择纵向延伸的眼镜款式");
    } else if (ratio > 1.8) {
      balance = "long";
      recommendations.push("可以使用横向腮红缩短脸部长度感");
      recommendations.push("选择宽大的眼镜款式");
    }

    // 分析三庭比例
    if (foreheadHeight && noseLength && chinLength) {
      const total = foreheadHeight + noseLength + chinLength;
      const foreheadRatio = foreheadHeight / total;
      const noseRatio = noseLength / total;
      const chinRatio = chinLength / total;

      if (foreheadRatio > 0.4) {
        recommendations.push("可以使用刘海遮盖高额头");
      }
      if (chinRatio > 0.25) {
        recommendations.push("可以强调眉眼区域转移注意力");
      }
    }

    return {
      ratio: Math.round(ratio * 100) / 100,
      balance,
      recommendations,
    };
  }

  /**
   * 根据脸型和五官特征生成综合形象建议
   */
  generateImageConsultation(params: {
    faceShape: string;
    eyeShape?: string;
    lipShape?: string;
    noseShape?: string;
    style?: string;
  }): {
    summary: string;
    hairstyleAdvice: string[];
    makeupAdvice: string[];
    accessoryAdvice: string[];
  } {
    const { faceShape, eyeShape, lipShape, noseShape, style } = params;
    const faceDetails = this.getFaceShapeDetails(faceShape);

    const summary = `您的脸型是${faceDetails.name}。${faceDetails.description}`;

    // 发型建议
    const hairstyleAdvice = [
      ...faceDetails.hairstyles,
      style === "professional" ? "干练短发" : "浪漫长发",
    ];

    // 妆容建议
    const makeupAdvice: string[] = [...faceDetails.makeupTips];
    if (eyeShape) {
      makeupAdvice.push(this.getEyeMakeupTip(eyeShape));
    }
    if (lipShape) {
      makeupAdvice.push(this.getLipMakeupTip(lipShape));
    }

    // 配饰建议
    const accessoryAdvice: string[] = [...faceDetails.glasses];
    accessoryAdvice.push("选择与脸型形成对比的耳环");
    if (faceShape === "oval") {
      accessoryAdvice.push("鹅蛋脸适合大多数耳环款式");
    }

    return {
      summary,
      hairstyleAdvice,
      makeupAdvice,
      accessoryAdvice,
    };
  }

  /**
   * 获取眼妆建议
   */
  private getEyeMakeupTip(eyeShape: string): string {
    const tips: Record<string, string> = {
      almond: "杏仁眼适合各种眼妆风格，可以尝试猫眼眼线",
      round: "圆眼可以拉长眼线来增加眼睛的长度感",
      hooded: "内双眼皮适合明亮的眼影和细致的眼线",
      upturned: "上扬眼适合平直的眼线来平衡眼型",
      downturned: "下垂眼可以上扬眼线尾来提升眼睛神采",
    };
    return tips[eyeShape] || "根据眼型选择适合的眼妆风格";
  }

  /**
   * 获取唇妆建议
   */
  private getLipMakeupTip(lipShape: string): string {
    const tips: Record<string, string> = {
      full: "丰满唇形适合哑光唇釉，可以突出唇部曲线",
      thin: "薄唇适合亮面唇彩，可以用唇线笔略超出唇线",
      heart: "心形唇可以强调唇峰，打造精致唇妆",
      wide: "宽唇可以使用深色系唇膏收敛视觉效果",
      bow: "弓形唇适合自然光泽的唇妆，突出唇形特点",
    };
    return tips[lipShape] || "根据唇形选择适合的唇妆风格";
  }
}
