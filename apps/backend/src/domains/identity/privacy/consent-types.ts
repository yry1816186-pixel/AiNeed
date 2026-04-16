/* eslint-disable @typescript-eslint/no-explicit-any */
export const CONSENT_TYPES = {
  DATA_PROCESSING: "data_processing",
  PHOTO_UPLOAD: "photo_upload",
  BODY_ANALYSIS: "body_analysis",
  AI_STYLIST: "ai_stylist",
  VIRTUAL_TRY_ON: "virtual_try_on",
  BEHAVIOR_TRACKING: "behavior_tracking",
  MARKETING: "marketing",
} as const;

export type ConsentType = (typeof CONSENT_TYPES)[keyof typeof CONSENT_TYPES];

export const REQUIRED_CONSENTS: ConsentType[] = [CONSENT_TYPES.DATA_PROCESSING];

export const OPTIONAL_CONSENTS: ConsentType[] = [
  CONSENT_TYPES.PHOTO_UPLOAD,
  CONSENT_TYPES.BODY_ANALYSIS,
  CONSENT_TYPES.AI_STYLIST,
  CONSENT_TYPES.VIRTUAL_TRY_ON,
  CONSENT_TYPES.BEHAVIOR_TRACKING,
  CONSENT_TYPES.MARKETING,
];

export const CONSENT_LABELS: Record<ConsentType, string> = {
  [CONSENT_TYPES.DATA_PROCESSING]: "数据处理",
  [CONSENT_TYPES.PHOTO_UPLOAD]: "照片上传与存储",
  [CONSENT_TYPES.BODY_ANALYSIS]: "体型分析",
  [CONSENT_TYPES.AI_STYLIST]: "AI 造型师对话",
  [CONSENT_TYPES.VIRTUAL_TRY_ON]: "虚拟试衣",
  [CONSENT_TYPES.BEHAVIOR_TRACKING]: "行为分析",
  [CONSENT_TYPES.MARKETING]: "营销推送",
};

export const CONSENT_DESCRIPTIONS: Record<ConsentType, string> = {
  [CONSENT_TYPES.DATA_PROCESSING]: "处理您的个人数据以提供基本服务",
  [CONSENT_TYPES.PHOTO_UPLOAD]: "上传和存储您的照片用于试衣和风格分析",
  [CONSENT_TYPES.BODY_ANALYSIS]: "分析您的体型数据以提供精准推荐",
  [CONSENT_TYPES.AI_STYLIST]: "与 AI 造型师进行时尚对话",
  [CONSENT_TYPES.VIRTUAL_TRY_ON]: "使用虚拟试衣功能预览穿搭效果",
  [CONSENT_TYPES.BEHAVIOR_TRACKING]: "分析您的使用行为以改善推荐精度",
  [CONSENT_TYPES.MARKETING]: "接收个性化的时尚推荐和优惠信息",
};
