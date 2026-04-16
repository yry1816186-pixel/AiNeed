/**
 * AI 分析服务提供商接口
 * 支持多个 AI 模型的统一接口
 */

export interface BodyAnalysisResult {
  /** 体型类型 */
  bodyType?: string;
  /** 肩宽比例 */
  shoulderWidth?: number;
  /** 腰围 */
  waistWidth?: number;
  /** 臀宽 */
  hipWidth?: number;
  /** 上身比例 */
  upperBodyRatio?: number;
  /** 下身比例 */
  lowerBodyRatio?: number;
  /** 身高估算 (cm) */
  estimatedHeight?: number;
  /** BMI 范围 */
  bmiRange?: string;
  /** 原始数据 */
  raw?: Record<string, unknown>;
}

export interface FaceAnalysisResult {
  /** 脸型 */
  faceShape?: string;
  /** 肤色 */
  skinTone?: string;
  /** 年龄估算 */
  estimatedAge?: number;
  /** 性别 */
  gender?: string;
  /** 眼睛形状 */
  eyeShape?: string;
  /** 鼻型 */
  noseShape?: string;
  /** 唇型 */
  lipShape?: string;
  /** 眉型 */
  eyebrowShape?: string;
  /** 置信度 */
  confidence?: number;
  /** 原始数据 */
  raw?: Record<string, unknown>;
}

export interface ColorAnalysisResult {
  /** 色彩季节 */
  colorSeason?: string;
  /** 最佳色彩 */
  bestColors?: string[];
  /** 避免色彩 */
  avoidColors?: string[];
  /** 金属色偏好 */
  metalPreference?: "gold" | "silver" | "both";
  /** 置信度 */
  confidence?: number;
}

export interface FullAnalysisResult {
  body?: BodyAnalysisResult;
  face?: FaceAnalysisResult;
  color?: ColorAnalysisResult;
  overallConfidence: number;
  provider: string;
  timestamp: Date;
}

export interface AiAnalysisProvider {
  /** 提供商名称 */
  readonly name: string;

  /** 提供商优先级（数字越小优先级越高） */
  readonly priority: number;

  /** 检查提供商是否可用 */
  isAvailable(): Promise<boolean>;

  /** 分析体型 */
  analyzeBody(imageBase64: string): Promise<BodyAnalysisResult>;

  /** 分析面部 */
  analyzeFace(imageBase64: string): Promise<FaceAnalysisResult>;

  /** 分析色彩季节 */
  analyzeColor(imageBase64: string): Promise<ColorAnalysisResult>;

  /** 完整分析 */
  analyzeFull(imageBase64: string): Promise<FullAnalysisResult>;
}
