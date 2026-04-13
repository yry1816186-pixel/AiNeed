// @ts-nocheck
import { PrismaClient, User, Gender, BodyType, SkinTone, FaceShape, ColorSeason, OnboardingStep } from '@prisma/client';
import { hash } from '../../src/common/security/bcrypt';

function calculateMeasurements(height: number, weight: number, bodyType: BodyType, gender: Gender) {
  const h = height / 100;
  const bmi = weight / (h * h);
  const factor = bmi > 24 ? 1.05 : bmi < 18.5 ? 0.92 : 1;

  const ratios: Record<string, { shoulder: number; bust: number; waist: number; hip: number }> = {
    hourglass:              { shoulder: 0.250, bust: 0.250, waist: 0.190, hip: 0.260 },
    rectangle:              { shoulder: 0.240, bust: 0.235, waist: 0.215, hip: 0.245 },
    triangle:               { shoulder: 0.225, bust: 0.235, waist: 0.200, hip: 0.270 },
    inverted_triangle:      { shoulder: 0.270, bust: 0.255, waist: 0.200, hip: 0.230 },
    oval:                   { shoulder: 0.255, bust: 0.260, waist: 0.245, hip: 0.255 },
  };

  if (gender === 'male') {
    const maleOverrides: Record<string, { shoulder: number; bust: number; waist: number; hip: number }> = {
      rectangle:              { shoulder: 0.275, bust: 0.265, waist: 0.235, hip: 0.235 },
      inverted_triangle:      { shoulder: 0.295, bust: 0.275, waist: 0.225, hip: 0.225 },
      oval:                   { shoulder: 0.275, bust: 0.285, waist: 0.270, hip: 0.250 },
    };
    const r = maleOverrides[bodyType] || ratios[bodyType] || ratios.rectangle;
    return {
      shoulder: Math.round(height * r.shoulder * factor * 10) / 10,
      bust: Math.round(height * r.bust * factor * 10) / 10,
      waist: Math.round(height * r.waist * factor * 10) / 10,
      hip: Math.round(height * r.hip * factor * 10) / 10,
    };
  }

  const r = ratios[bodyType] || ratios.rectangle;
  return {
    shoulder: Math.round(height * r.shoulder * factor * 10) / 10,
    bust: Math.round(height * r.bust * factor * 10) / 10,
    waist: Math.round(height * r.waist * factor * 10) / 10,
    hip: Math.round(height * r.hip * factor * 10) / 10,
  };
}

const USERS = [
  {
    email: 'test@example.com', password: 'Test123456!', nickname: '测试用户',
    gender: 'female' as Gender, birthDate: new Date('1995-06-15'),
    bodyType: 'hourglass' as BodyType, skinTone: 'medium' as SkinTone,
    faceShape: 'oval' as FaceShape, colorSeason: 'autumn' as ColorSeason,
    height: 165, weight: 55, phone: '13800138000',
    stylePreferences: { styles: ['优雅通勤', '法式浪漫', '轻奢简约'], avoid: ['街头嘻哈', '朋克'] },
    colorPreferences: { loved: ['驼色', '酒红', '墨绿', '米白'], avoided: ['荧光绿', '亮橙'] },
  },
  {
    email: 'demo@xuno.app', password: 'Demo123456!', nickname: 'Demo演示账号',
    gender: 'female' as Gender, birthDate: new Date('1998-03-20'),
    bodyType: 'rectangle' as BodyType, skinTone: 'fair' as SkinTone,
    faceShape: 'heart' as FaceShape, colorSeason: 'spring' as ColorSeason,
    height: 168, weight: 52, phone: '13800138001',
    stylePreferences: { styles: ['韩系甜美', '少女感', '清新自然'], avoid: ['硬朗工装'] },
    colorPreferences: { loved: ['樱花粉', '天空蓝', '奶油白', '薰衣草紫'], avoided: ['深棕', '暗红'] },
  },
  {
    email: 'judge@competition.ai', password: 'Judge123456!', nickname: '评委体验账号',
    gender: 'male' as Gender, birthDate: new Date('1990-11-10'),
    bodyType: 'inverted_triangle' as BodyType, skinTone: 'light' as SkinTone,
    faceShape: 'square' as FaceShape, colorSeason: 'winter' as ColorSeason,
    height: 178, weight: 72, phone: '13800138002',
    stylePreferences: { styles: ['商务正装', '意式绅士', '都市精英'], avoid: ['可爱风', '街头'] },
    colorPreferences: { loved: ['藏青', '炭灰', '纯白', '深酒红'], avoided: ['粉红', '亮黄'] },
  },
  {
    email: 'admin@xuno.app', password: 'Admin123456!', nickname: '管理员',
    gender: 'female' as Gender, birthDate: new Date('1992-08-25'),
    bodyType: 'hourglass' as BodyType, skinTone: 'olive' as SkinTone,
    faceShape: 'diamond' as FaceShape, colorSeason: 'summer' as ColorSeason,
    height: 163, weight: 50, phone: '13800138003',
    stylePreferences: { styles: ['极简主义', '职场干练', '知性优雅'], avoid: ['甜美少女', '嘻哈'] },
    colorPreferences: { loved: ['雾霾蓝', '灰粉', '燕麦色', '黑色'], avoided: ['荧光色', '大红'] },
  },
  {
    email: 'user5@test.com', password: 'Test123456!', nickname: '时尚达人小美',
    gender: 'female' as Gender, birthDate: new Date('2000-05-08'),
    bodyType: 'triangle' as BodyType, skinTone: 'fair' as SkinTone,
    faceShape: 'oval' as FaceShape, colorSeason: 'spring' as ColorSeason,
    height: 160, weight: 48, phone: '13800138004',
    stylePreferences: { styles: ['韩系穿搭', '日系文艺', '甜美风'], avoid: ['硬朗风', '暗黑'] },
    colorPreferences: { loved: ['奶白', '浅蓝', '蜜桃粉', '薄荷绿'], avoided: ['深紫', '土黄'] },
  },
  {
    email: 'user6@test.com', password: 'Test123456!', nickname: '运动型男阿杰',
    gender: 'male' as Gender, birthDate: new Date('1993-07-22'),
    bodyType: 'rectangle' as BodyType, skinTone: 'tan' as SkinTone,
    faceShape: 'oblong' as FaceShape, colorSeason: 'autumn' as ColorSeason,
    height: 175, weight: 68, phone: '13800138005',
    stylePreferences: { styles: ['运动休闲', '美式街头', '户外机能'], avoid: ['正装', '甜美'] },
    colorPreferences: { loved: ['军绿', '深蓝', '卡其', '黑色'], avoided: ['粉红', '浅紫'] },
  },
  {
    email: 'user7@test.com', password: 'Test123456!', nickname: '优雅女士Linda',
    gender: 'female' as Gender, birthDate: new Date('1988-12-03'),
    bodyType: 'hourglass' as BodyType, skinTone: 'medium' as SkinTone,
    faceShape: 'heart' as FaceShape, colorSeason: 'winter' as ColorSeason,
    height: 170, weight: 60, phone: '13800138006',
    stylePreferences: { styles: ['法式优雅', '轻奢名媛', '经典复古'], avoid: ['街头', '运动'] },
    colorPreferences: { loved: ['正红', '藏蓝', '珍珠白', '墨黑'], avoided: ['荧光绿', '橙色'] },
  },
  {
    email: 'user8@test.com', password: 'Test123456!', nickname: '街头潮人小K',
    gender: 'male' as Gender, birthDate: new Date('1999-01-15'),
    bodyType: 'inverted_triangle' as BodyType, skinTone: 'olive' as SkinTone,
    faceShape: 'diamond' as FaceShape, colorSeason: 'summer' as ColorSeason,
    height: 180, weight: 75, phone: '13800138007',
    stylePreferences: { styles: ['街头潮流', '日系CityBoy', '高街时尚'], avoid: ['正装', '田园'] },
    colorPreferences: { loved: ['黑色', '白色', '克莱因蓝', '电光紫'], avoided: ['卡其', '棕色'] },
  },
  {
    email: 'user9@test.com', password: 'Test123456!', nickname: '极简主义者',
    gender: 'female' as Gender, birthDate: new Date('1995-09-18'),
    bodyType: 'rectangle' as BodyType, skinTone: 'light' as SkinTone,
    faceShape: 'oval' as FaceShape, colorSeason: 'summer' as ColorSeason,
    height: 166, weight: 53, phone: '13800138008',
    stylePreferences: { styles: ['极简主义', '北欧风', '性冷淡风'], avoid: ['繁复', '甜美'] },
    colorPreferences: { loved: ['白色', '灰色', '黑色', '驼色'], avoided: ['大红', '亮黄'] },
  },
  {
    email: 'user10@test.com', password: 'Test123456!', nickname: '商务精英David',
    gender: 'male' as Gender, birthDate: new Date('1987-04-30'),
    bodyType: 'oval' as BodyType, skinTone: 'medium' as SkinTone,
    faceShape: 'square' as FaceShape, colorSeason: 'autumn' as ColorSeason,
    height: 176, weight: 80, phone: '13800138009',
    stylePreferences: { styles: ['商务正装', '商务休闲', '英伦经典'], avoid: ['街头', '运动'] },
    colorPreferences: { loved: ['深蓝', '灰色', '棕色', '白色'], avoided: ['荧光色', '粉红'] },
  },
];

export async function seedUsers(prisma: PrismaClient): Promise<{ users: User[], userMap: Map<string, User> }> {
  const users: User[] = [];
  const userMap = new Map<string, User>();

  for (const u of USERS) {
    const passwordHash = await hash(u.password);
    const m = calculateMeasurements(u.height, u.weight, u.bodyType, u.gender);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        phone: u.phone,
        password: passwordHash,
        nickname: u.nickname,
        gender: u.gender,
        birthDate: u.birthDate,
        isActive: true,
        profile: {
          create: {
            bodyType: u.bodyType,
            skinTone: u.skinTone,
            faceShape: u.faceShape,
            colorSeason: u.colorSeason,
            height: u.height,
            weight: u.weight,
            shoulder: m.shoulder,
            bust: m.bust,
            waist: m.waist,
            hip: m.hip,
            inseam: Math.round(u.height * 0.45 * 10) / 10,
            stylePreferences: u.stylePreferences,
            colorPreferences: u.colorPreferences,
            priceRangeMin: u.gender === 'male' ? 200 : 150,
            priceRangeMax: u.gender === 'male' ? 3000 : 2000,
            onboardingStep: 'COMPLETED' as OnboardingStep,
            onboardingCompletedAt: new Date(),
          },
        },
      },
    });

    users.push(user);
    userMap.set(u.email, user);
  }

  return { users, userMap };
}
