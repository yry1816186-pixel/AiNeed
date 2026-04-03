import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * 体型分析器
 * 基于人体测量数据进行体型分类和建议
 */
@Injectable()
export class BodyShapeAnalyzer {
  private readonly logger = new Logger(BodyShapeAnalyzer.name);

  /**
   * 体型类型定义
   */
  readonly bodyTypes = {
    rectangle: {
      name: "矩形/H型",
      description: "肩、腰、臀宽度相近，身体线条平直",
      characteristics: ["肩宽与臀宽相近", "腰部曲线不明显", "腿部通常较长"],
      clothingTips: ["收腰设计", "层次搭配", "V领上衣", "A字裙"],
    },
    hourglass: {
      name: "沙漏型/X型",
      description: "肩臀相近，腰部明显纤细，曲线明显",
      characteristics: ["肩宽与臀宽相近", "腰部明显收紧", "胸部丰满"],
      clothingTips: ["收腰款式", "铅笔裙", "高腰裤", "裹身裙"],
    },
    triangle: {
      name: "梨形/A型",
      description: "臀部比肩宽，下半身较丰满",
      characteristics: ["肩部较窄", "臀部较宽", "大腿较粗"],
      clothingTips: ["垫肩设计", "亮色上衣", "深色下装", "A字裙"],
    },
    inverted_triangle: {
      name: "倒三角/Y型",
      description: "肩部比臀宽，上半身较丰满",
      characteristics: ["肩部较宽", "胸部较丰满", "臀部较窄"],
      clothingTips: ["V领设计", "深色上衣", "亮色下装", "阔腿裤"],
    },
    oval: {
      name: "椭圆形/O型",
      description: "腰部较粗，四肢相对纤细",
      characteristics: ["腰围较大", "腹部较圆润", "四肢较细"],
      clothingTips: ["直筒款式", "深色系", "垂感面料", "简约设计"],
    },
  } as const;

  /**
   * 根据测量数据确定体型
   */
  determineBodyType(measurements: {
    shoulderWidth: number;
    waistWidth: number;
    hipWidth: number;
    bustWidth?: number;
  }): string {
    const { shoulderWidth, waistWidth, hipWidth, bustWidth } = measurements;

    // 计算关键比例
    const shoulderToHip = shoulderWidth / hipWidth;
    const waistToHip = waistWidth / hipWidth;
    const waistToShoulder = waistWidth / shoulderWidth;

    // 沙漏型: 肩臀相近，腰明显细
    if (
      Math.abs(shoulderToHip - 1) < 0.1 &&
      waistToHip < 0.75 &&
      waistToShoulder < 0.75
    ) {
      return "hourglass";
    }

    // 梨形: 臀比肩宽
    if (shoulderToHip < 0.9 && waistToHip > 0.7) {
      return "triangle";
    }

    // 倒三角: 肩比臀宽
    if (shoulderToHip > 1.1 && waistToShoulder < 0.85) {
      return "inverted_triangle";
    }

    // 椭圆形: 腰围最大
    if (waistToShoulder > 0.9 && waistToHip > 0.9) {
      return "oval";
    }

    // 默认为矩形
    return "rectangle";
  }

  /**
   * 获取体型详情
   */
  getBodyTypeDetails(bodyType: string) {
    return (
      this.bodyTypes[bodyType as keyof typeof this.bodyTypes] ||
      this.bodyTypes.rectangle
    );
  }

  /**
   * 估算 BMI 范围
   */
  estimateBmiRange(
    height: number,
    weight?: number,
    bodyType?: string,
  ): { range: string; category: string } {
    if (weight) {
      const bmi = weight / Math.pow(height / 100, 2);
      if (bmi < 18.5) {return { range: "<18.5", category: "偏瘦" };}
      if (bmi < 24) {return { range: "18.5-24", category: "正常" };}
      if (bmi < 28) {return { range: "24-28", category: "偏胖" };}
      return { range: ">28", category: "肥胖" };
    }

    // 基于体型估算
    const categoryByBodyType: Record<string, string> = {
      rectangle: "正常",
      hourglass: "正常",
      triangle: "正常",
      inverted_triangle: "正常",
      oval: "偏胖",
    };

    return {
      range: "18.5-24",
      category: categoryByBodyType[bodyType || "rectangle"] || "正常",
    };
  }

  /**
   * 获取服装建议
   */
  getClothingRecommendations(
    bodyType: string,
    preferences?: string[],
  ): {
    tops: string[];
    bottoms: string[];
    dresses: string[];
    avoid: string[];
  } {
    const recommendations = {
      rectangle: {
        tops: ["收腰衬衫", "荷叶边上衣", "V领毛衣", "有肩章的上衣"],
        bottoms: ["A字裙", "高腰阔腿裤", "百褶裙", "哈伦裤"],
        dresses: ["裹身裙", "收腰连衣裙", "A字裙", "有腰带的裙子"],
        avoid: ["直筒裙", "无腰身设计", "过于宽松的款式"],
      },
      hourglass: {
        tops: ["收腰上衣", "V领衬衫", "紧身针织衫", "有腰带上衣"],
        bottoms: ["铅笔裙", "高腰裤", "紧身牛仔裤", "包臀裙"],
        dresses: ["裹身裙", "鱼尾裙", "收腰连衣裙", "铅笔裙"],
        avoid: ["宽松直筒款式", "无腰身设计", "超大号衣服"],
      },
      triangle: {
        tops: ["垫肩上衣", "荷叶边衬衫", "亮色上衣", "有图案的上衣"],
        bottoms: ["A字裙", "直筒裤", "深色裤子", "阔腿裤"],
        dresses: ["A字裙", "收腰裙", "泡泡袖连衣裙", "V领连衣裙"],
        avoid: ["紧身裤", "短裙", "浅色下装", "包臀裙"],
      },
      inverted_triangle: {
        tops: ["V领上衣", "深色上衣", "简单款式上衣", "无肩章设计"],
        bottoms: ["阔腿裤", "A字裙", "百褶裙", "亮色下装"],
        dresses: ["A字连衣裙", "V领连衣裙", "有裙摆的连衣裙", "深色上身连衣裙"],
        avoid: ["垫肩设计", "泡泡袖", "紧身裙", "亮色上衣"],
      },
      oval: {
        tops: ["V领上衣", "深色上衣", "垂感衬衫", "简约款式"],
        bottoms: ["直筒裤", "深色裤子", "A字裙", "阔腿裤"],
        dresses: ["直筒连衣裙", "深色连衣裙", "V领连衣裙", "有垂感的裙子"],
        avoid: ["紧身款式", "亮色大面积", "横条纹", "腰部有装饰的设计"],
      },
    };

    return (
      recommendations[bodyType as keyof typeof recommendations] ||
      recommendations.rectangle
    );
  }
}
