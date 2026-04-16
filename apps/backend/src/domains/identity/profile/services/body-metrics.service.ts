/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { Gender } from "../../../../../types/prisma-enums";

import { PrismaService } from "../../../../common/prisma/prisma.service";

export interface AdvancedBodyMetrics {
  basicMetrics: {
    name: string;
    value: number | null;
    unit: string;
    status: string;
    statusColor: "success" | "warning" | "danger" | "info";
    description: string;
  }[];
  bodyComposition: {
    bodyFatPercentage: number | null;
    bodyFatCategory: string;
    leanBodyMass: number | null;
    muscleMass: number | null;
    waterPercentage: number | null;
  };
  metabolicMetrics: {
    bmr: number | null;
    tdee: {
      sedentary: number;
      light: number;
      moderate: number;
      active: number;
      veryActive: number;
    };
  };
  healthIndices: {
    bodyRoundnessIndex: number | null;
    waistToHeightRatio: number | null;
    conicityIndex: number | null;
    bodyAdiposityIndex: number | null;
  };
  bodyProportions: {
    shoulderToHipRatio: number | null;
    legToBodyRatio: number | null;
    upperToLowerRatio: number | null;
    bodyTypeIndication: string;
  };
  sizeRecommendations: {
    tops: string;
    bottoms: string;
    dresses: string;
    shoes: string;
  };
}

@Injectable()
export class BodyMetricsService {
  private readonly logger = new Logger(BodyMetricsService.name);

  constructor(private prisma: PrismaService) {}

  async calculateAdvancedMetrics(userId: string): Promise<AdvancedBodyMetrics> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      return this.getEmptyMetrics();
    }

    const age = user?.birthDate
      ? Math.floor(
          (Date.now() - user.birthDate.getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : 25;

    const gender = user?.gender || Gender.female;
    const height = profile.height || 165;
    const weight = profile.weight || 55;
    const waist = profile.waist;
    const hip = profile.hip;
    const bust = profile.bust;
    const shoulder = profile.shoulder;
    const inseam = profile.inseam;

    return {
      basicMetrics: this.calculateBasicMetrics(
        height,
        weight,
        waist,
        hip,
        bust,
      ),
      bodyComposition: this.calculateBodyComposition(
        height,
        weight,
        waist,
        hip,
        age,
        gender,
      ),
      metabolicMetrics: this.calculateMetabolicMetrics(
        height,
        weight,
        age,
        gender,
      ),
      healthIndices: this.calculateHealthIndices(height, weight, waist, hip),
      bodyProportions: this.calculateBodyProportions(
        shoulder,
        waist,
        hip,
        height,
        inseam,
        bust,
      ),
      sizeRecommendations: this.calculateSizeRecommendations(
        height,
        weight,
        bust,
        waist,
        hip,
        inseam,
      ),
    };
  }

  private calculateBasicMetrics(
    height: number,
    weight: number,
    waist?: number | null,
    hip?: number | null,
    bust?: number | null,
  ) {
    const metrics: AdvancedBodyMetrics["basicMetrics"] = [];

    const bmi = weight / (height / 100) ** 2;
    let bmiStatus = "正常";
    let bmiColor: "success" | "warning" | "danger" | "info" = "success";
    if (bmi < 18.5) {
      bmiStatus = "偏瘦";
      bmiColor = "info";
    } else if (bmi < 24) {
      bmiStatus = "正常";
      bmiColor = "success";
    } else if (bmi < 28) {
      bmiStatus = "超重";
      bmiColor = "warning";
    } else {
      bmiStatus = "肥胖";
      bmiColor = "danger";
    }

    metrics.push({
      name: "BMI指数",
      value: Math.round(bmi * 10) / 10,
      unit: "kg/m²",
      status: bmiStatus,
      statusColor: bmiColor,
      description: `您的BMI为${Math.round(bmi * 10) / 10}，属于${bmiStatus}范围`,
    });

    if (waist && hip) {
      const whr = waist / hip;
      let whrStatus = "理想";
      let whrColor: "success" | "warning" | "danger" | "info" = "success";

      if (whr < 0.8) {
        whrStatus = "梨形身材";
        whrColor = "success";
      } else if (whr < 0.85) {
        whrStatus = "理想";
        whrColor = "success";
      } else if (whr < 0.9) {
        whrStatus = "中等风险";
        whrColor = "warning";
      } else {
        whrStatus = "需关注";
        whrColor = "danger";
      }

      metrics.push({
        name: "腰臀比",
        value: Math.round(whr * 100) / 100,
        unit: "",
        status: whrStatus,
        statusColor: whrColor,
        description: `腰臀比${Math.round(whr * 100) / 100}，${whrStatus}`,
      });

      const whtr = waist / height;
      let whtrStatus = "健康";
      let whtrColor: "success" | "warning" | "danger" | "info" = "success";

      if (whtr < 0.5) {
        whtrStatus = "健康";
        whtrColor = "success";
      } else if (whtr < 0.6) {
        whtrStatus = "需注意";
        whtrColor = "warning";
      } else {
        whtrStatus = "风险较高";
        whtrColor = "danger";
      }

      metrics.push({
        name: "腰高比",
        value: Math.round(whtr * 100) / 100,
        unit: "",
        status: whtrStatus,
        statusColor: whtrColor,
        description: `腰高比应小于0.5，您为${Math.round(whtr * 100) / 100}`,
      });
    }

    if (bust && waist) {
      const bwr = bust / waist;
      let curveLevel = "匀称";
      if (bwr > 1.2) {curveLevel = "曲线明显";}
      else if (bwr > 1.1) {curveLevel = "曲线较好";}
      else if (bwr < 1.0) {curveLevel = "偏直筒";}

      metrics.push({
        name: "胸腰比",
        value: Math.round(bwr * 100) / 100,
        unit: "",
        status: curveLevel,
        statusColor: "info",
        description: `胸腰比${Math.round(bwr * 100) / 100}，${curveLevel}`,
      });
    }

    if (waist && hip) {
      const hipWaistDiff = hip - waist;
      metrics.push({
        name: "臀腰差",
        value: hipWaistDiff,
        unit: "cm",
        status: hipWaistDiff > 15 ? "曲线明显" : "曲线柔和",
        statusColor: "info",
        description: `臀腰差${hipWaistDiff}cm，影响体型曲线`,
      });
    }

    return metrics;
  }

  private calculateBodyComposition(
    height: number,
    weight: number,
    waist?: number | null,
    hip?: number | null,
    age: number = 25,
    gender: Gender = Gender.female,
  ): AdvancedBodyMetrics["bodyComposition"] {
    let bodyFatPercentage: number | null = null;
    let bodyFatCategory = "未知";

    if (waist && hip) {
      if (gender === Gender.female) {
        const waistCm = waist * 2.54;
        const hipCm = hip * 2.54;
        const neckCm = 30;
        const heightInches = height / 2.54;

        const bodyFatNavy =
          495 /
            (1.29579 -
              0.35004 * Math.log10(waistCm + hipCm - neckCm) +
              0.221 * Math.log10(heightInches)) -
          450;

        bodyFatPercentage = Math.max(10, Math.min(50, bodyFatNavy));
      } else {
        const waistCm = waist * 2.54;
        const neckCm = 35;
        const heightInches = height / 2.54;

        const bodyFatNavy =
          495 /
            (1.0324 -
              0.19077 * Math.log10(waistCm - neckCm) +
              0.15456 * Math.log10(heightInches)) -
          450;

        bodyFatPercentage = Math.max(5, Math.min(40, bodyFatNavy));
      }

      if (bodyFatPercentage !== null) {
        if (gender === Gender.female) {
          if (bodyFatPercentage < 18) {bodyFatCategory = "偏瘦";}
          else if (bodyFatPercentage < 25) {bodyFatCategory = "理想";}
          else if (bodyFatPercentage < 30) {bodyFatCategory = "正常";}
          else if (bodyFatPercentage < 35) {bodyFatCategory = "偏高";}
          else {bodyFatCategory = "需关注";}
        } else {
          if (bodyFatPercentage < 10) {bodyFatCategory = "偏瘦";}
          else if (bodyFatPercentage < 18) {bodyFatCategory = "理想";}
          else if (bodyFatPercentage < 25) {bodyFatCategory = "正常";}
          else if (bodyFatPercentage < 30) {bodyFatCategory = "偏高";}
          else {bodyFatCategory = "需关注";}
        }
      }
    }

    if (!bodyFatPercentage) {
      const bmi = weight / (height / 100) ** 2;
      if (gender === Gender.female) {
        bodyFatPercentage = 1.2 * bmi + 0.23 * age - 5.4;
      } else {
        bodyFatPercentage = 1.2 * bmi + 0.23 * age - 16.2;
      }
      bodyFatPercentage = Math.max(10, Math.min(50, bodyFatPercentage));

      if (gender === Gender.female) {
        if (bodyFatPercentage < 18) {bodyFatCategory = "偏瘦";}
        else if (bodyFatPercentage < 25) {bodyFatCategory = "理想";}
        else {bodyFatCategory = "正常";}
      } else {
        if (bodyFatPercentage < 12) {bodyFatCategory = "偏瘦";}
        else if (bodyFatPercentage < 20) {bodyFatCategory = "理想";}
        else {bodyFatCategory = "正常";}
      }
    }

    const leanBodyMass = bodyFatPercentage
      ? weight * (1 - bodyFatPercentage / 100)
      : null;

    const muscleMass = leanBodyMass ? leanBodyMass * 0.9 : null;

    const waterPercentage = bodyFatPercentage
      ? 100 - bodyFatPercentage - 15
      : null;

    return {
      bodyFatPercentage: bodyFatPercentage
        ? Math.round(bodyFatPercentage * 10) / 10
        : null,
      bodyFatCategory,
      leanBodyMass: leanBodyMass ? Math.round(leanBodyMass * 10) / 10 : null,
      muscleMass: muscleMass ? Math.round(muscleMass * 10) / 10 : null,
      waterPercentage: waterPercentage
        ? Math.round(waterPercentage * 10) / 10
        : null,
    };
  }

  private calculateMetabolicMetrics(
    height: number,
    weight: number,
    age: number,
    gender: Gender,
  ): AdvancedBodyMetrics["metabolicMetrics"] {
    let bmr: number;

    if (gender === Gender.female) {
      bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
    } else {
      bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
    }

    bmr = Math.round(bmr);

    return {
      bmr,
      tdee: {
        sedentary: Math.round(bmr * 1.2),
        light: Math.round(bmr * 1.375),
        moderate: Math.round(bmr * 1.55),
        active: Math.round(bmr * 1.725),
        veryActive: Math.round(bmr * 1.9),
      },
    };
  }

  private calculateHealthIndices(
    height: number,
    weight: number,
    waist?: number | null,
    hip?: number | null,
  ): AdvancedBodyMetrics["healthIndices"] {
    const bmi = weight / (height / 100) ** 2;

    let bri: number | null = null;
    if (waist && hip) {
      const wc = waist / 100;
      const hc = hip / 100;
      const h = height / 100;
      bri = 364.2 - 365.5 * Math.sqrt(1 - (wc / (Math.PI * h)) ** 2);
    }

    let whtr: number | null = null;
    if (waist) {
      whtr = waist / height;
    }

    let ci: number | null = null;
    if (waist) {
      const wc = waist / 100;
      const h = height / 100;
      ci = wc / (0.109 * Math.sqrt(weight / height));
    }

    let bai: number | null = null;
    if (hip) {
      const hc = hip / 100;
      const h = height / 100;
      bai = hc / Math.pow(h, 1.5) - 18;
    }

    return {
      bodyRoundnessIndex: bri ? Math.round(bri * 10) / 10 : null,
      waistToHeightRatio: whtr ? Math.round(whtr * 100) / 100 : null,
      conicityIndex: ci ? Math.round(ci * 100) / 100 : null,
      bodyAdiposityIndex: bai ? Math.round(bai * 10) / 10 : null,
    };
  }

  private calculateBodyProportions(
    shoulder?: number | null,
    waist?: number | null,
    hip?: number | null,
    height?: number | null,
    inseam?: number | null,
    _bust?: number | null,
  ): AdvancedBodyMetrics["bodyProportions"] {
    let shoulderToHipRatio: number | null = null;
    if (shoulder && hip) {
      shoulderToHipRatio = shoulder / hip;
    }

    let legToBodyRatio: number | null = null;
    if (inseam && height) {
      legToBodyRatio = inseam / height;
    }

    let upperToLowerRatio: number | null = null;
    if (height && inseam) {
      upperToLowerRatio = (height - inseam) / inseam;
    }

    let bodyTypeIndication = "未知";
    if (shoulder && waist && hip) {
      const s = shoulder;
      const w = waist;
      const h = hip;

      const shoulderToHip = s / h;
      const waistToHip = w / h;
      const waistToShoulder = w / s;

      if (
        Math.abs(shoulderToHip - 1) < 0.1 &&
        waistToHip < 0.75 &&
        waistToShoulder < 0.75
      ) {
        bodyTypeIndication = "X型（沙漏型）- 肩臀相近，腰细";
      } else if (shoulderToHip < 0.9 && waistToHip > 0.7) {
        bodyTypeIndication = "A型（梨形）- 臀部较宽";
      } else if (shoulderToHip > 1.1) {
        bodyTypeIndication = "Y型（倒三角）- 肩部较宽";
      } else if (waistToShoulder > 0.9 && waistToHip > 0.9) {
        bodyTypeIndication = "O型（椭圆型）- 腰围较大";
      } else {
        bodyTypeIndication = "H型（矩形）- 匀称直筒";
      }
    }

    return {
      shoulderToHipRatio: shoulderToHipRatio
        ? Math.round(shoulderToHipRatio * 100) / 100
        : null,
      legToBodyRatio: legToBodyRatio
        ? Math.round(legToBodyRatio * 100) / 100
        : null,
      upperToLowerRatio: upperToLowerRatio
        ? Math.round(upperToLowerRatio * 100) / 100
        : null,
      bodyTypeIndication,
    };
  }

  private calculateSizeRecommendations(
    height?: number | null,
    weight?: number | null,
    bust?: number | null,
    waist?: number | null,
    hip?: number | null,
    _inseam?: number | null,
  ): AdvancedBodyMetrics["sizeRecommendations"] {
    const sizeChart = {
      XS: { bust: [76, 80], waist: [60, 64], hip: [84, 88] },
      S: { bust: [80, 84], waist: [64, 68], hip: [88, 92] },
      M: { bust: [84, 88], waist: [68, 72], hip: [92, 96] },
      L: { bust: [88, 94], waist: [72, 80], hip: [96, 102] },
      XL: { bust: [94, 100], waist: [80, 88], hip: [102, 108] },
      XXL: { bust: [100, 108], waist: [88, 96], hip: [108, 116] },
    };

    const getSizeFromMeasurement = (
      measurement: number,
      type: "bust" | "waist" | "hip",
    ): string => {
      for (const [size, ranges] of Object.entries(sizeChart)) {
        const range = ranges[type];
        const min = range?.[0];
        const max = range?.[1];
        if (min !== undefined && max !== undefined && measurement >= min && measurement < max) {
          return size;
        }
      }
      return "XL";
    };

    let tops = "M";
    if (bust) {
      tops = getSizeFromMeasurement(bust, "bust");
    } else if (height && weight) {
      const bmi = weight / (height / 100) ** 2;
      if (bmi < 18.5) {tops = "S";}
      else if (bmi < 22) {tops = "M";}
      else if (bmi < 25) {tops = "L";}
      else {tops = "XL";}
    }

    let bottoms = "M";
    if (waist && hip) {
      const waistSize = getSizeFromMeasurement(waist, "waist");
      const hipSize = getSizeFromMeasurement(hip, "hip");
      const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL"];
      const waistIdx = sizeOrder.indexOf(waistSize);
      const hipIdx = sizeOrder.indexOf(hipSize);
      bottoms = sizeOrder[Math.max(waistIdx, hipIdx)] ?? "XL";
    } else if (height && weight) {
      const bmi = weight / (height / 100) ** 2;
      if (bmi < 18.5) {bottoms = "S";}
      else if (bmi < 22) {bottoms = "M";}
      else if (bmi < 25) {bottoms = "L";}
      else {bottoms = "XL";}
    }

    let dresses = "M";
    if (bust && waist && hip) {
      const bustSize = getSizeFromMeasurement(bust, "bust");
      const waistSize = getSizeFromMeasurement(waist, "waist");
      const hipSize = getSizeFromMeasurement(hip, "hip");
      const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL"];
      dresses =
        sizeOrder[
          Math.max(
            sizeOrder.indexOf(bustSize),
            sizeOrder.indexOf(waistSize),
            sizeOrder.indexOf(hipSize),
          )
        ] ?? "XL";
    } else {
      dresses = tops;
    }

    let shoes = "38";
    if (height) {
      if (height < 155) {shoes = "35-36";}
      else if (height < 160) {shoes = "36-37";}
      else if (height < 165) {shoes = "37-38";}
      else if (height < 170) {shoes = "38-39";}
      else if (height < 175) {shoes = "39-40";}
      else {shoes = "40-41";}
    }

    return {
      tops,
      bottoms,
      dresses,
      shoes,
    };
  }

  private getEmptyMetrics(): AdvancedBodyMetrics {
    return {
      basicMetrics: [],
      bodyComposition: {
        bodyFatPercentage: null,
        bodyFatCategory: "未知",
        leanBodyMass: null,
        muscleMass: null,
        waterPercentage: null,
      },
      metabolicMetrics: {
        bmr: null,
        tdee: {
          sedentary: 0,
          light: 0,
          moderate: 0,
          active: 0,
          veryActive: 0,
        },
      },
      healthIndices: {
        bodyRoundnessIndex: null,
        waistToHeightRatio: null,
        conicityIndex: null,
        bodyAdiposityIndex: null,
      },
      bodyProportions: {
        shoulderToHipRatio: null,
        legToBodyRatio: null,
        upperToLowerRatio: null,
        bodyTypeIndication: "请完善身体数据",
      },
      sizeRecommendations: {
        tops: "未知",
        bottoms: "未知",
        dresses: "未知",
        shoes: "未知",
      },
    };
  }
}
