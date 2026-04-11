import { api } from './api';
import type { ApiResponse } from '../types';

export type SkinTone = 'porcelain' | 'natural' | 'wheat' | 'honey' | 'deepBrown' | 'dark';

export type Gender = 'male' | 'female' | 'neutral';

export type EyeType = 'roundBig' | 'almond' | 'cat' | 'downturned';

export type HairStyle =
  | 'bob' | 'pixie' | 'shortStraight' | 'texturedShort'
  | 'straight' | 'wavy' | 'bigCurls' | 'layered'
  | 'woolCurls' | 'waterWave' | 'spiralCurl' | 'afroCurl'
  | 'ponytail' | 'twinTails' | 'bun' | 'twinBuns'
  | 'braid' | 'twinBraids' | 'fishtail'
  | 'buzz' | 'mohawk' | 'fadeShort' | 'bangs';

export type HairColor = 'black' | 'darkBrown' | 'lightBrown' | 'blonde' | 'redBrown' | 'grayWhite';

export type AccessoryType = 'glasses' | 'earrings' | 'hat';

export interface ClothingMapSlot {
  color: string;
  type: string;
}

export interface ClothingMap {
  top?: ClothingMapSlot;
  bottom?: ClothingMapSlot;
  outerwear?: ClothingMapSlot;
  shoes?: ClothingMapSlot;
  accessory?: ClothingMapSlot;
}

export interface AvatarParams {
  templateId: string;
  gender: Gender;
  skinTone: SkinTone;
  faceShape: number;
  eyeType: EyeType;
  hairStyle: HairStyle;
  hairColor: HairColor;
  accessories: AccessoryType[];
}

export interface AvatarTemplate {
  id: string;
  name: string;
  thumbnailUrl: string;
  skiaConfig: Record<string, unknown>;
}

export interface UserAvatar {
  id: string;
  userId: string;
  params: AvatarParams;
  clothingMap: ClothingMap;
  thumbnailUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvatarPayload {
  templateId: string;
  gender: Gender;
  skinTone: SkinTone;
  faceShape: number;
  eyeType: EyeType;
  hairStyle: HairStyle;
  hairColor: HairColor;
  accessories: AccessoryType[];
}

export interface UpdateAvatarPayload {
  skinTone?: SkinTone;
  faceShape?: number;
  eyeType?: EyeType;
  hairStyle?: HairStyle;
  hairColor?: HairColor;
  accessories?: AccessoryType[];
}

export interface DressAvatarPayload {
  clothingMap: ClothingMap;
}

export const SKIN_TONE_COLORS: Record<SkinTone, string> = {
  porcelain: '#FFE4D6',
  natural: '#F5D0B0',
  wheat: '#E8B88A',
  honey: '#D4956A',
  deepBrown: '#A06840',
  dark: '#6B4423',
};

export const SKIN_TONE_LABELS: Record<SkinTone, string> = {
  porcelain: '瓷白',
  natural: '自然',
  wheat: '小麦',
  honey: '蜜糖',
  deepBrown: '深棕',
  dark: '黑',
};

export const EYE_TYPE_LABELS: Record<EyeType, string> = {
  roundBig: '大圆眼',
  almond: '杏眼',
  cat: '猫眼',
  downturned: '下垂眼',
};

export const HAIR_STYLE_LABELS: Record<HairStyle, string> = {
  bob: '波波头',
  pixie: 'Pixie',
  shortStraight: '齐耳短发',
  texturedShort: '纹理短发',
  straight: '直发',
  wavy: '微卷',
  bigCurls: '大波浪',
  layered: '层次长发',
  woolCurls: '羊毛卷',
  waterWave: '水波纹',
  spiralCurl: '螺旋卷',
  afroCurl: '非洲卷',
  ponytail: '马尾',
  twinTails: '双马尾',
  bun: '丸子头',
  twinBuns: '双丸子头',
  braid: '麻花辫',
  twinBraids: '双麻花辫',
  fishtail: '鱼骨辫',
  buzz: '寸头',
  mohawk: '莫西干',
  fadeShort: '渐变短发',
  bangs: '刘海造型',
};

export const HAIR_COLOR_VALUES: Record<HairColor, string> = {
  black: '#1A1A1A',
  darkBrown: '#4A3228',
  lightBrown: '#8B6F4E',
  blonde: '#D4A843',
  redBrown: '#8B4513',
  grayWhite: '#C0C0C0',
};

export const HAIR_COLOR_LABELS: Record<HairColor, string> = {
  black: '黑',
  darkBrown: '深棕',
  lightBrown: '浅棕',
  blonde: '金',
  redBrown: '红棕',
  grayWhite: '灰白',
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: '男',
  female: '女',
  neutral: '中性',
};

export const ACCESSORY_LABELS: Record<AccessoryType, string> = {
  glasses: '眼镜',
  earrings: '耳环',
  hat: '帽子',
};

export const avatarService = {
  getTemplates(): Promise<AvatarTemplate[]> {
    return api
      .get<ApiResponse<AvatarTemplate[]>>('/avatar/templates')
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取模板失败');
        }
        return data.data;
      });
  },

  createAvatar(payload: CreateAvatarPayload): Promise<UserAvatar> {
    return api
      .post<ApiResponse<UserAvatar>>('/avatar/create', payload)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '创建形象失败');
        }
        return data.data;
      });
  },

  getMyAvatar(): Promise<UserAvatar> {
    return api
      .get<ApiResponse<UserAvatar>>('/avatar/me')
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取形象失败');
        }
        return data.data;
      });
  },

  updateAvatar(payload: UpdateAvatarPayload): Promise<UserAvatar> {
    return api
      .patch<ApiResponse<UserAvatar>>('/avatar/me', payload)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '更新形象失败');
        }
        return data.data;
      });
  },

  dressAvatar(clothingMap: ClothingMap): Promise<UserAvatar> {
    return api
      .post<ApiResponse<UserAvatar>>('/avatar/me/dress', { clothingMap })
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '换装失败');
        }
        return data.data;
      });
  },
};
