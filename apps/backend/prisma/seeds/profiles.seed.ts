// @ts-nocheck
import { PrismaClient, User, PhotoType, AnalysisStatus } from '@prisma/client';

const STYLE_PROFILES = [
  {
    email: 'test@example.com',
    profiles: [
      { name: '日常通勤', occasion: 'work', description: '优雅得体的职场穿搭，展现专业与自信', keywords: ['通勤', '优雅', '简约', '知性'], palette: ['驼色', '藏蓝', '米白', '灰色'], confidence: 85, isDefault: true, isActive: true },
      { name: '约会社交', occasion: 'date', description: '浪漫精致的约会造型，展现女性魅力', keywords: ['浪漫', '精致', '女人味', '温柔'], palette: ['酒红', '裸粉', '香槟金', '黑色'], confidence: 78, isDefault: false, isActive: true },
      { name: '周末休闲', occasion: 'casual', description: '舒适自在的周末穿搭，轻松又有型', keywords: ['休闲', '舒适', '自然', '随性'], palette: ['牛仔蓝', '白色', '卡其', '墨绿'], confidence: 72, isDefault: false, isActive: true },
    ],
  },
  {
    email: 'demo@xuno.app',
    profiles: [
      { name: '校园日常', occasion: 'casual', description: '青春活力的校园风格，清新自然', keywords: ['清新', '甜美', '少女', '活力'], palette: ['樱花粉', '天空蓝', '奶油白', '薄荷绿'], confidence: 88, isDefault: true, isActive: true },
      { name: '聚会派对', occasion: 'party', description: '闪耀吸睛的派对穿搭，成为焦点', keywords: ['闪耀', '时尚', '个性', '吸睛'], palette: ['亮银', '电光蓝', '玫红', '黑色'], confidence: 75, isDefault: false, isActive: true },
    ],
  },
  {
    email: 'judge@competition.ai',
    profiles: [
      { name: '商务正装', occasion: 'formal', description: '正式场合的精英穿搭，彰显品味与权威', keywords: ['正装', '精英', '权威', '品味'], palette: ['藏青', '炭灰', '纯白', '深酒红'], confidence: 92, isDefault: true, isActive: true },
      { name: '商务休闲', occasion: 'business_casual', description: '商务休闲的得体穿搭，专业又不失亲和', keywords: ['商务休闲', '得体', '亲和', '稳重'], palette: ['深蓝', '浅灰', '白色', '棕色'], confidence: 80, isDefault: false, isActive: true },
      { name: '周末高尔夫', occasion: 'sports', description: '运动社交的高尔夫穿搭，优雅运动风', keywords: ['运动', '优雅', '户外', '社交'], palette: ['白色', '海军蓝', '草绿', '米色'], confidence: 70, isDefault: false, isActive: true },
    ],
  },
  {
    email: 'admin@xuno.app',
    profiles: [
      { name: '职场干练', occasion: 'work', description: '极简利落的职场风格，干练不拖沓', keywords: ['极简', '干练', '利落', '专业'], palette: ['雾霾蓝', '灰粉', '燕麦色', '黑色'], confidence: 90, isDefault: true, isActive: true },
      { name: '知性社交', occasion: 'social', description: '知性优雅的社交穿搭，从容自信', keywords: ['知性', '优雅', '从容', '高级'], palette: ['深灰', '酒红', '藏蓝', '米白'], confidence: 82, isDefault: false, isActive: true },
    ],
  },
  {
    email: 'user5@test.com',
    profiles: [
      { name: '甜美日常', occasion: 'casual', description: '韩系甜美日常穿搭，可盐可甜', keywords: ['甜美', '韩系', '少女', '清新'], palette: ['奶白', '浅蓝', '蜜桃粉', '薄荷绿'], confidence: 86, isDefault: true, isActive: true },
      { name: '约会心动', occasion: 'date', description: '约会时的甜美造型，让人心动', keywords: ['心动', '浪漫', '可爱', '温柔'], palette: ['粉色', '白色', '浅紫', '香槟'], confidence: 79, isDefault: false, isActive: true },
      { name: '校园穿搭', occasion: 'school', description: '青春活力的校园风格', keywords: ['青春', '活力', '学院', '减龄'], palette: ['藏蓝', '白色', '红色', '卡其'], confidence: 74, isDefault: false, isActive: true },
    ],
  },
  {
    email: 'user6@test.com',
    profiles: [
      { name: '运动休闲', occasion: 'sports', description: '活力运动风，舒适又有型', keywords: ['运动', '休闲', '活力', '机能'], palette: ['军绿', '深蓝', '卡其', '黑色'], confidence: 88, isDefault: true, isActive: true },
      { name: '美式街头', occasion: 'casual', description: '美式街头潮流穿搭，酷感十足', keywords: ['街头', '潮流', '酷', '个性'], palette: ['黑色', '白色', '红色', '灰色'], confidence: 76, isDefault: false, isActive: true },
    ],
  },
  {
    email: 'user7@test.com',
    profiles: [
      { name: '法式优雅', occasion: 'social', description: '经典法式优雅穿搭，永不过时', keywords: ['法式', '优雅', '经典', '浪漫'], palette: ['正红', '藏蓝', '珍珠白', '墨黑'], confidence: 91, isDefault: true, isActive: true },
      { name: '轻奢名媛', occasion: 'party', description: '轻奢名媛风格，高贵典雅', keywords: ['轻奢', '名媛', '高贵', '典雅'], palette: ['金色', '黑色', '酒红', '象牙白'], confidence: 83, isDefault: false, isActive: true },
      { name: '经典复古', occasion: 'casual', description: '复古经典风格，韵味十足', keywords: ['复古', '经典', '韵味', '怀旧'], palette: ['焦糖', '墨绿', '酒红', '米色'], confidence: 77, isDefault: false, isActive: true },
    ],
  },
  {
    email: 'user8@test.com',
    profiles: [
      { name: '街头潮流', occasion: 'casual', description: '前卫街头潮流穿搭，引领风尚', keywords: ['街头', '潮流', '前卫', '酷'], palette: ['黑色', '白色', '克莱因蓝', '电光紫'], confidence: 89, isDefault: true, isActive: true },
      { name: '日系CityBoy', occasion: 'casual', description: '日系CityBoy风格，随性有型', keywords: ['日系', 'CityBoy', '随性', '层次'], palette: ['卡其', '白色', '藏蓝', '军绿'], confidence: 81, isDefault: false, isActive: true },
      { name: '高街时尚', occasion: 'party', description: '高街时尚风格，大胆出位', keywords: ['高街', '时尚', '大胆', '先锋'], palette: ['黑色', '银色', '荧光绿', '白色'], confidence: 73, isDefault: false, isActive: true },
    ],
  },
  {
    email: 'user9@test.com',
    profiles: [
      { name: '极简日常', occasion: 'casual', description: '极简主义日常穿搭，少即是多', keywords: ['极简', '纯粹', '质感', '留白'], palette: ['白色', '灰色', '黑色', '驼色'], confidence: 93, isDefault: true, isActive: true },
      { name: '北欧职场', occasion: 'work', description: '北欧极简职场风，干净利落', keywords: ['北欧', '极简', '干净', '利落'], palette: ['灰白', '浅蓝', '黑色', '米色'], confidence: 85, isDefault: false, isActive: true },
    ],
  },
  {
    email: 'user10@test.com',
    profiles: [
      { name: '商务正装', occasion: 'formal', description: '经典商务正装，稳重可靠', keywords: ['正装', '商务', '稳重', '经典'], palette: ['深蓝', '灰色', '棕色', '白色'], confidence: 90, isDefault: true, isActive: true },
      { name: '商务休闲', occasion: 'business_casual', description: '商务休闲风格，专业又舒适', keywords: ['商务休闲', '舒适', '专业', '得体'], palette: ['藏蓝', '卡其', '白色', '灰色'], confidence: 82, isDefault: false, isActive: true },
      { name: '周末休闲', occasion: 'casual', description: '周末休闲穿搭，轻松有品味', keywords: ['休闲', '品味', '轻松', '质感'], palette: ['深蓝', '白色', '橄榄绿', '棕色'], confidence: 71, isDefault: false, isActive: true },
    ],
  },
];

const USER_PHOTOS = [
  {
    email: 'test@example.com',
    photos: [
      { type: 'full_body' as PhotoType, url: 'https://picsum.photos/seed/user1-full/600/900', thumbnailUrl: 'https://picsum.photos/seed/user1-full/200/300', originalName: 'full_body_1.jpg', mimeType: 'image/jpeg', size: 245000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-01T10:00:00Z'), analysisResult: { bodyType: 'hourglass', skinTone: 'medium', confidence: 0.92 } },
      { type: 'half_body' as PhotoType, url: 'https://picsum.photos/seed/user1-half/600/800', thumbnailUrl: 'https://picsum.photos/seed/user1-half/200/267', originalName: 'half_body_1.jpg', mimeType: 'image/jpeg', size: 198000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-01T10:01:00Z'), analysisResult: { faceShape: 'oval', skinTone: 'medium', confidence: 0.88 } },
    ],
  },
  {
    email: 'demo@aineed.ai',
    photos: [
      { type: 'full_body' as PhotoType, url: 'https://picsum.photos/seed/user2-full/600/900', thumbnailUrl: 'https://picsum.photos/seed/user2-full/200/300', originalName: 'full_body_demo.jpg', mimeType: 'image/jpeg', size: 230000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-02T14:00:00Z'), analysisResult: { bodyType: 'rectangle', skinTone: 'fair', confidence: 0.90 } },
    ],
  },
  {
    email: 'judge@competition.ai',
    photos: [
      { type: 'full_body' as PhotoType, url: 'https://picsum.photos/seed/user3-full/600/900', thumbnailUrl: 'https://picsum.photos/seed/user3-full/200/300', originalName: 'full_body_judge.jpg', mimeType: 'image/jpeg', size: 260000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-03T09:00:00Z'), analysisResult: { bodyType: 'inverted_triangle', skinTone: 'light', confidence: 0.87 } },
      { type: 'face' as PhotoType, url: 'https://picsum.photos/seed/user3-face/400/500', thumbnailUrl: 'https://picsum.photos/seed/user3-face/133/167', originalName: 'face_judge.jpg', mimeType: 'image/jpeg', size: 120000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-03T09:01:00Z'), analysisResult: { faceShape: 'square', confidence: 0.85 } },
    ],
  },
  {
    email: 'admin@aineed.ai',
    photos: [
      { type: 'half_body' as PhotoType, url: 'https://picsum.photos/seed/user4-half/600/800', thumbnailUrl: 'https://picsum.photos/seed/user4-half/200/267', originalName: 'half_body_admin.jpg', mimeType: 'image/jpeg', size: 210000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-04T11:00:00Z'), analysisResult: { bodyType: 'hourglass', skinTone: 'olive', confidence: 0.91 } },
    ],
  },
  {
    email: 'user5@test.com',
    photos: [
      { type: 'full_body' as PhotoType, url: 'https://picsum.photos/seed/user5-full/600/900', thumbnailUrl: 'https://picsum.photos/seed/user5-full/200/300', originalName: 'full_body_xiaomei.jpg', mimeType: 'image/jpeg', size: 235000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-05T16:00:00Z'), analysisResult: { bodyType: 'triangle', skinTone: 'fair', confidence: 0.89 } },
      { type: 'side' as PhotoType, url: 'https://picsum.photos/seed/user5-side/600/900', thumbnailUrl: 'https://picsum.photos/seed/user5-side/200/300', originalName: 'side_xiaomei.jpg', mimeType: 'image/jpeg', size: 220000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-05T16:01:00Z'), analysisResult: { bodyType: 'triangle', confidence: 0.84 } },
    ],
  },
  {
    email: 'user6@test.com',
    photos: [
      { type: 'full_body' as PhotoType, url: 'https://picsum.photos/seed/user6-full/600/900', thumbnailUrl: 'https://picsum.photos/seed/user6-full/200/300', originalName: 'full_body_ajie.jpg', mimeType: 'image/jpeg', size: 255000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-06T08:00:00Z'), analysisResult: { bodyType: 'rectangle', skinTone: 'tan', confidence: 0.86 } },
    ],
  },
  {
    email: 'user7@test.com',
    photos: [
      { type: 'full_body' as PhotoType, url: 'https://picsum.photos/seed/user7-full/600/900', thumbnailUrl: 'https://picsum.photos/seed/user7-full/200/300', originalName: 'full_body_linda.jpg', mimeType: 'image/jpeg', size: 248000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-07T13:00:00Z'), analysisResult: { bodyType: 'hourglass', skinTone: 'medium', confidence: 0.93 } },
      { type: 'face' as PhotoType, url: 'https://picsum.photos/seed/user7-face/400/500', thumbnailUrl: 'https://picsum.photos/seed/user7-face/133/167', originalName: 'face_linda.jpg', mimeType: 'image/jpeg', size: 115000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-07T13:01:00Z'), analysisResult: { faceShape: 'heart', confidence: 0.90 } },
    ],
  },
  {
    email: 'user8@test.com',
    photos: [
      { type: 'full_body' as PhotoType, url: 'https://picsum.photos/seed/user8-full/600/900', thumbnailUrl: 'https://picsum.photos/seed/user8-full/200/300', originalName: 'full_body_xiaok.jpg', mimeType: 'image/jpeg', size: 262000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-08T17:00:00Z'), analysisResult: { bodyType: 'inverted_triangle', skinTone: 'olive', confidence: 0.88 } },
    ],
  },
  {
    email: 'user9@test.com',
    photos: [
      { type: 'half_body' as PhotoType, url: 'https://picsum.photos/seed/user9-half/600/800', thumbnailUrl: 'https://picsum.photos/seed/user9-half/200/267', originalName: 'half_body_minimalist.jpg', mimeType: 'image/jpeg', size: 205000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-09T10:00:00Z'), analysisResult: { bodyType: 'rectangle', skinTone: 'light', confidence: 0.87 } },
      { type: 'face' as PhotoType, url: 'https://picsum.photos/seed/user9-face/400/500', thumbnailUrl: 'https://picsum.photos/seed/user9-face/133/167', originalName: 'face_minimalist.jpg', mimeType: 'image/jpeg', size: 110000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-09T10:01:00Z'), analysisResult: { faceShape: 'oval', confidence: 0.91 } },
    ],
  },
  {
    email: 'user10@test.com',
    photos: [
      { type: 'full_body' as PhotoType, url: 'https://picsum.photos/seed/user10-full/600/900', thumbnailUrl: 'https://picsum.photos/seed/user10-full/200/300', originalName: 'full_body_david.jpg', mimeType: 'image/jpeg', size: 270000, analysisStatus: 'completed' as AnalysisStatus, analyzedAt: new Date('2026-03-10T09:00:00Z'), analysisResult: { bodyType: 'oval', skinTone: 'medium', confidence: 0.85 } },
    ],
  },
];

const USER_BEHAVIORS = [
  {
    email: 'test@example.com',
    behaviors: [
      { type: 'page_view', itemId: null, daysAgo: 7 },
      { type: 'item_view', itemId: 'clothing-demo-001', daysAgo: 6 },
      { type: 'try_on_start', itemId: 'clothing-demo-002', daysAgo: 5 },
      { type: 'try_on_complete', itemId: 'clothing-demo-002', daysAgo: 5 },
      { type: 'favorite', itemId: 'clothing-demo-003', daysAgo: 4 },
      { type: 'search', itemId: null, daysAgo: 3 },
      { type: 'recommendation_view', itemId: null, daysAgo: 2 },
      { type: 'recommendation_click', itemId: 'clothing-demo-004', daysAgo: 2 },
      { type: 'add_to_cart', itemId: 'clothing-demo-004', daysAgo: 1 },
      { type: 'purchase', itemId: 'clothing-demo-004', daysAgo: 0 },
    ],
  },
  {
    email: 'demo@aineed.ai',
    behaviors: [
      { type: 'page_view', itemId: null, daysAgo: 5 },
      { type: 'item_view', itemId: 'clothing-demo-010', daysAgo: 4 },
      { type: 'favorite', itemId: 'clothing-demo-011', daysAgo: 3 },
      { type: 'search', itemId: null, daysAgo: 2 },
      { type: 'recommendation_view', itemId: null, daysAgo: 1 },
      { type: 'item_view', itemId: 'clothing-demo-012', daysAgo: 1 },
      { type: 'try_on_start', itemId: 'clothing-demo-012', daysAgo: 0 },
    ],
  },
  {
    email: 'judge@competition.ai',
    behaviors: [
      { type: 'page_view', itemId: null, daysAgo: 10 },
      { type: 'item_view', itemId: 'clothing-demo-020', daysAgo: 8 },
      { type: 'search', itemId: null, daysAgo: 7 },
      { type: 'item_view', itemId: 'clothing-demo-021', daysAgo: 6 },
      { type: 'favorite', itemId: 'clothing-demo-021', daysAgo: 5 },
      { type: 'add_to_cart', itemId: 'clothing-demo-021', daysAgo: 4 },
      { type: 'purchase', itemId: 'clothing-demo-021', daysAgo: 3 },
      { type: 'post_create', itemId: null, daysAgo: 2 },
    ],
  },
  {
    email: 'admin@aineed.ai',
    behaviors: [
      { type: 'page_view', itemId: null, daysAgo: 6 },
      { type: 'search', itemId: null, daysAgo: 5 },
      { type: 'item_view', itemId: 'clothing-demo-030', daysAgo: 4 },
      { type: 'recommendation_view', itemId: null, daysAgo: 3 },
      { type: 'recommendation_click', itemId: 'clothing-demo-031', daysAgo: 3 },
      { type: 'favorite', itemId: 'clothing-demo-031', daysAgo: 2 },
      { type: 'try_on_start', itemId: 'clothing-demo-031', daysAgo: 1 },
      { type: 'try_on_complete', itemId: 'clothing-demo-031', daysAgo: 1 },
      { type: 'add_to_cart', itemId: 'clothing-demo-031', daysAgo: 0 },
    ],
  },
  {
    email: 'user5@test.com',
    behaviors: [
      { type: 'page_view', itemId: null, daysAgo: 4 },
      { type: 'item_view', itemId: 'clothing-demo-040', daysAgo: 3 },
      { type: 'favorite', itemId: 'clothing-demo-040', daysAgo: 3 },
      { type: 'item_view', itemId: 'clothing-demo-041', daysAgo: 2 },
      { type: 'try_on_start', itemId: 'clothing-demo-041', daysAgo: 2 },
      { type: 'try_on_complete', itemId: 'clothing-demo-041', daysAgo: 1 },
      { type: 'share', itemId: 'clothing-demo-041', daysAgo: 1 },
      { type: 'purchase', itemId: 'clothing-demo-041', daysAgo: 0 },
    ],
  },
  {
    email: 'user6@test.com',
    behaviors: [
      { type: 'page_view', itemId: null, daysAgo: 5 },
      { type: 'search', itemId: null, daysAgo: 4 },
      { type: 'item_view', itemId: 'clothing-demo-050', daysAgo: 3 },
      { type: 'favorite', itemId: 'clothing-demo-050', daysAgo: 2 },
      { type: 'add_to_cart', itemId: 'clothing-demo-050', daysAgo: 1 },
      { type: 'purchase', itemId: 'clothing-demo-050', daysAgo: 0 },
    ],
  },
  {
    email: 'user7@test.com',
    behaviors: [
      { type: 'page_view', itemId: null, daysAgo: 8 },
      { type: 'item_view', itemId: 'clothing-demo-060', daysAgo: 7 },
      { type: 'item_view', itemId: 'clothing-demo-061', daysAgo: 6 },
      { type: 'try_on_start', itemId: 'clothing-demo-060', daysAgo: 5 },
      { type: 'try_on_complete', itemId: 'clothing-demo-060', daysAgo: 5 },
      { type: 'favorite', itemId: 'clothing-demo-060', daysAgo: 4 },
      { type: 'favorite', itemId: 'clothing-demo-061', daysAgo: 3 },
      { type: 'recommendation_view', itemId: null, daysAgo: 2 },
      { type: 'recommendation_click', itemId: 'clothing-demo-062', daysAgo: 2 },
      { type: 'add_to_cart', itemId: 'clothing-demo-062', daysAgo: 1 },
    ],
  },
  {
    email: 'user8@test.com',
    behaviors: [
      { type: 'page_view', itemId: null, daysAgo: 4 },
      { type: 'search', itemId: null, daysAgo: 3 },
      { type: 'item_view', itemId: 'clothing-demo-070', daysAgo: 3 },
      { type: 'item_view', itemId: 'clothing-demo-071', daysAgo: 2 },
      { type: 'favorite', itemId: 'clothing-demo-070', daysAgo: 2 },
      { type: 'try_on_start', itemId: 'clothing-demo-071', daysAgo: 1 },
      { type: 'try_on_complete', itemId: 'clothing-demo-071', daysAgo: 1 },
      { type: 'post_create', itemId: null, daysAgo: 0 },
      { type: 'post_like', itemId: 'clothing-demo-072', daysAgo: 0 },
    ],
  },
  {
    email: 'user9@test.com',
    behaviors: [
      { type: 'page_view', itemId: null, daysAgo: 6 },
      { type: 'item_view', itemId: 'clothing-demo-080', daysAgo: 5 },
      { type: 'favorite', itemId: 'clothing-demo-080', daysAgo: 4 },
      { type: 'recommendation_view', itemId: null, daysAgo: 3 },
      { type: 'recommendation_click', itemId: 'clothing-demo-081', daysAgo: 2 },
      { type: 'add_to_cart', itemId: 'clothing-demo-081', daysAgo: 1 },
      { type: 'purchase', itemId: 'clothing-demo-081', daysAgo: 0 },
    ],
  },
  {
    email: 'user10@test.com',
    behaviors: [
      { type: 'page_view', itemId: null, daysAgo: 7 },
      { type: 'search', itemId: null, daysAgo: 6 },
      { type: 'item_view', itemId: 'clothing-demo-090', daysAgo: 5 },
      { type: 'item_view', itemId: 'clothing-demo-091', daysAgo: 4 },
      { type: 'favorite', itemId: 'clothing-demo-090', daysAgo: 3 },
      { type: 'add_to_cart', itemId: 'clothing-demo-090', daysAgo: 2 },
      { type: 'purchase', itemId: 'clothing-demo-090', daysAgo: 1 },
      { type: 'post_create', itemId: null, daysAgo: 0 },
      { type: 'user_follow', itemId: null, daysAgo: 0 },
    ],
  },
];

export async function seedProfiles(prisma: PrismaClient, userMap: Map<string, User>): Promise<void> {
  for (const sp of STYLE_PROFILES) {
    const user = userMap.get(sp.email);
    if (!user) continue;

    for (const profile of sp.profiles) {
      const existing = await prisma.styleProfile.findFirst({
        where: { userId: user.id, name: profile.name, occasion: profile.occasion },
      });
      if (!existing) {
        await prisma.styleProfile.create({
          data: { userId: user.id, ...profile },
        });
      }
    }
  }

  for (const up of USER_PHOTOS) {
    const user = userMap.get(up.email);
    if (!user) continue;

    for (const photo of up.photos) {
      const existing = await prisma.userPhoto.findFirst({
        where: { userId: user.id, url: photo.url },
      });
      if (!existing) {
        await prisma.userPhoto.create({
          data: { userId: user.id, ...photo },
        });
      }
    }
  }

  for (const ub of USER_BEHAVIORS) {
    const user = userMap.get(ub.email);
    if (!user) continue;

    for (const behavior of ub.behaviors) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - behavior.daysAgo);
      createdAt.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);

      await prisma.userBehavior.create({
        data: {
          userId: user.id,
          type: behavior.type,
          itemId: behavior.itemId,
          createdAt,
        },
      });
    }
  }
}
