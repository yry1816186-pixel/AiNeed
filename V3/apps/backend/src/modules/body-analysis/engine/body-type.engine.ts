type BodyType = 'pear' | 'apple' | 'hourglass' | 'rectangle' | 'inverted_triangle';

interface BodyTypeRule {
  type: BodyType;
  label: string;
  description: string;
  suitableStyles: string[];
  avoidStyles: string[];
  colorSeason: string;
}

interface Measurements {
  height: number;
  weight: number;
  shoulderWidth?: number;
  waist?: number;
  hip?: number;
  gender: 'male' | 'female' | 'other';
}

const BODY_TYPE_DATA: Record<BodyType, Omit<BodyTypeRule, 'type'>> = {
  pear: {
    label: '梨形',
    description: '臀部和腿部较宽，肩部较窄，腰部明显。下半身比上半身丰满，呈现上窄下宽的轮廓。',
    suitableStyles: ['A字裙', '高腰裤', 'V领上衣', '荷叶边上衣', '泡泡袖', '阔腿裤'],
    avoidStyles: ['紧身牛仔裤', '低腰裤', '百褶裙', '臀部装饰过多'],
    colorSeason: 'autumn',
  },
  apple: {
    label: '苹果形',
    description: '腰腹部较丰满，肩部和臀部相对较窄。上半身比下半身丰满，腰部线条不明显。',
    suitableStyles: ['V领上衣', 'A字连衣裙', '高腰设计', '垂感面料', '深色上衣', '直筒裤'],
    avoidStyles: ['紧身腰带', '短款上衣', '腰部褶皱', '横条纹上衣'],
    colorSeason: 'winter',
  },
  hourglass: {
    label: '沙漏形',
    description: '肩部和臀部宽度相近，腰部明显收窄。上下半身比例均衡，曲线分明。',
    suitableStyles: ['收腰连衣裙', '高腰裤', '铅笔裙', 'V领', '系带上衣', '贴身剪裁'],
    avoidStyles: ['宽松直筒', '无腰线设计', '过于蓬松', '直筒连衣裙'],
    colorSeason: 'spring',
  },
  rectangle: {
    label: '矩形',
    description: '肩部、腰部和臀部宽度相近，腰部曲线不明显。整体轮廓较为直线型。',
    suitableStyles: ['腰带装饰', 'A字裙', '荷叶边', '层次穿搭', '高腰设计', '褶皱上衣'],
    avoidStyles: ['直筒连衣裙', '过于贴身', '无腰线设计', '直线剪裁'],
    colorSeason: 'summer',
  },
  inverted_triangle: {
    label: '倒三角',
    description: '肩部较宽，臀部较窄。上半身比下半身宽，呈现上宽下窄的轮廓。',
    suitableStyles: ['阔腿裤', 'A字裙', 'V领', '深色上衣', '浅色下装', '垂感面料'],
    avoidStyles: ['垫肩', '泡泡袖', '横条纹上衣', '紧身裤'],
    colorSeason: 'winter',
  },
};

function calculateBmi(height: number, weight: number): number {
  const heightM = height / 100;
  return weight / (heightM * heightM);
}

function determineByRatios(measurements: Measurements): BodyType {
  const { shoulderWidth, waist, hip, gender } = measurements;

  const hasAllMeasurements = shoulderWidth && waist && hip;

  if (!hasAllMeasurements) {
    return determineByBmiAndGender(measurements);
  }

  const shoulderHipRatio = shoulderWidth / hip;
  const waistHipRatio = waist / hip;
  const shoulderWaistRatio = shoulderWidth / waist;

  if (gender === 'female' || gender === 'other') {
    if (waistHipRatio < 0.75 && shoulderHipRatio < 0.9) {
      return 'hourglass';
    }
    if (waistHipRatio >= 0.85 && shoulderHipRatio < 0.95) {
      return 'apple';
    }
    if (shoulderHipRatio < 0.85 && waistHipRatio >= 0.75 && waistHipRatio < 0.85) {
      return 'pear';
    }
    if (shoulderHipRatio >= 1.0) {
      return 'inverted_triangle';
    }
    return 'rectangle';
  }

  if (shoulderWaistRatio >= 1.4 && shoulderHipRatio >= 1.05) {
    return 'inverted_triangle';
  }
  if (waistHipRatio >= 0.9) {
    return 'apple';
  }
  if (shoulderHipRatio < 0.9 && waistHipRatio < 0.85) {
    return 'pear';
  }
  if (shoulderWaistRatio >= 1.25 && waistHipRatio < 0.85) {
    return 'hourglass';
  }
  return 'rectangle';
}

function determineByBmiAndGender(measurements: Measurements): BodyType {
  const { height, weight, gender } = measurements;
  const bmi = calculateBmi(height, weight);

  if (gender === 'female' || gender === 'other') {
    if (bmi < 18.5) return 'rectangle';
    if (bmi >= 18.5 && bmi < 24) return 'hourglass';
    if (bmi >= 24 && bmi < 28) return 'apple';
    return 'apple';
  }

  if (bmi < 20) return 'rectangle';
  if (bmi >= 20 && bmi < 25) return 'inverted_triangle';
  if (bmi >= 25 && bmi < 30) return 'rectangle';
  return 'apple';
}

export function analyzeBodyType(measurements: Measurements): BodyTypeRule {
  const type = determineByRatios(measurements);
  const data = BODY_TYPE_DATA[type];
  return { type, ...data };
}

export { BODY_TYPE_DATA, type BodyType, type BodyTypeRule, type Measurements };
