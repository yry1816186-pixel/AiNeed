// @ts-nocheck
import { PrismaClient, StyleQuiz, QuizQuestion, QuizQuestionType } from '@prisma/client';

const QUIZ_DATA = {
  title: '寻裳个人风格测试',
  description: '发现你的专属穿搭风格',
  coverImage: 'https://picsum.photos/seed/quiz-cover/800/400',
};

const QUESTIONS_DATA = [
  // ===== occasion 维度 (5题) =====
  {
    dimension: 'occasion',
    sortOrder: 1,
    content: '周末你最想做什么？',
    imageUrls: [
      'https://picsum.photos/seed/occ1-cafe/400/500',
      'https://picsum.photos/seed/occ1-hike/400/500',
      'https://picsum.photos/seed/occ1-shopping/400/500',
      'https://picsum.photos/seed/occ1-home/400/500',
      'https://picsum.photos/seed/occ1-party/400/500',
    ],
    descriptions: [
      '在咖啡厅安静阅读，享受独处时光',
      '户外徒步探索，亲近大自然',
      '商场逛街购物，发现新品好物',
      '居家休息放松，享受慢生活',
      '朋友聚会社交，热闹又开心',
    ],
  },
  {
    dimension: 'occasion',
    sortOrder: 2,
    content: '如果参加一个重要活动，你会选择什么场合？',
    imageUrls: [
      'https://picsum.photos/seed/occ2-gala/400/500',
      'https://picsum.photos/seed/occ2-wedding/400/500',
      'https://picsum.photos/seed/occ2-concert/400/500',
      'https://picsum.photos/seed/occ2-exhibition/400/500',
      'https://picsum.photos/seed/occ2-dinner/400/500',
    ],
    descriptions: [
      '高端晚宴，正式华丽的场合',
      '朋友婚礼，温馨浪漫的仪式',
      '音乐节现场，热情奔放的氛围',
      '艺术展览，文艺优雅的空间',
      '精致晚餐，私密优雅的约会',
    ],
  },
  {
    dimension: 'occasion',
    sortOrder: 3,
    content: '你理想中的旅行方式是？',
    imageUrls: [
      'https://picsum.photos/seed/occ3-resort/400/500',
      'https://picsum.photos/seed/occ3-backpack/400/500',
      'https://picsum.photos/seed/occ3-city/400/500',
      'https://picsum.photos/seed/occ3-beach/400/500',
      'https://picsum.photos/seed/occ3-culture/400/500',
    ],
    descriptions: [
      '度假村休闲，享受奢华服务',
      '背包客旅行，自由探索未知',
      '城市观光，打卡地标建筑',
      '海岛度假，阳光沙滩比基尼',
      '文化之旅，探访历史古迹',
    ],
  },
  {
    dimension: 'occasion',
    sortOrder: 4,
    content: '工作日的午餐时间你通常怎么过？',
    imageUrls: [
      'https://picsum.photos/seed/occ4-business/400/500',
      'https://picsum.photos/seed/occ4-quick/400/500',
      'https://picsum.photos/seed/occ4-cafe/400/500',
      'https://picsum.photos/seed/occ4-desk/400/500',
      'https://picsum.photos/seed/occ4-park/400/500',
    ],
    descriptions: [
      '商务午餐，和客户或同事社交',
      '快速解决，效率优先赶回工作',
      '精品咖啡厅，享受品质时光',
      '工位简单吃，边吃边继续工作',
      '公园散步简餐，放松身心',
    ],
  },
  {
    dimension: 'occasion',
    sortOrder: 5,
    content: '下班后你最想做什么？',
    imageUrls: [
      'https://picsum.photos/seed/occ5-gym/400/500',
      'https://picsum.photos/seed/occ5-cocktail/400/500',
      'https://picsum.photos/seed/occ5-cooking/400/500',
      'https://picsum.photos/seed/occ5-movie/400/500',
      'https://picsum.photos/seed/occ5-class/400/500',
    ],
    descriptions: [
      '去健身房运动，释放压力',
      '酒吧小酌一杯，享受夜生活',
      '回家做饭，享受烹饪乐趣',
      '窝在沙发看电影，安静放松',
      '参加兴趣课程，提升自我',
    ],
  },

  // ===== color 维度 (5题) =====
  {
    dimension: 'color',
    sortOrder: 6,
    content: '哪个色彩组合最吸引你？',
    imageUrls: [
      'https://picsum.photos/seed/col1-bw/400/500',
      'https://picsum.photos/seed/col1-earth/400/500',
      'https://picsum.photos/seed/col1-morandi/400/500',
      'https://picsum.photos/seed/col1-vivid/400/500',
      'https://picsum.photos/seed/col1-pastel/400/500',
    ],
    descriptions: [
      '黑白极简，经典永不过时',
      '大地色系，温暖自然质朴',
      '莫兰迪色，低饱和高级感',
      '鲜艳撞色，大胆个性表达',
      '柔和粉系，温柔浪漫甜美',
    ],
  },
  {
    dimension: 'color',
    sortOrder: 7,
    content: '选择一件你最喜欢的单品颜色？',
    imageUrls: [
      'https://picsum.photos/seed/col2-navy/400/500',
      'https://picsum.photos/seed/col2-red/400/500',
      'https://picsum.photos/seed/col2-beige/400/500',
      'https://picsum.photos/seed/col2-green/400/500',
      'https://picsum.photos/seed/col2-purple/400/500',
    ],
    descriptions: [
      '深邃藏蓝，沉稳内敛有质感',
      '正红色，热情自信有气场',
      '米白色，温柔百搭显气质',
      '墨绿色，复古文艺有韵味',
      '薰衣草紫，浪漫神秘有格调',
    ],
  },
  {
    dimension: 'color',
    sortOrder: 8,
    content: '你的衣橱里最多的是什么颜色？',
    imageUrls: [
      'https://picsum.photos/seed/col3-neutral/400/500',
      'https://picsum.photos/seed/col3-warm/400/500',
      'https://picsum.photos/seed/col3-cool/400/500',
      'https://picsum.photos/seed/col3-bright/400/500',
      'https://picsum.photos/seed/col3-dark/400/500',
    ],
    descriptions: [
      '中性色系，黑白灰驼为主',
      '暖色系，棕橙黄红为主',
      '冷色系，蓝紫灰绿为主',
      '亮色系，多彩缤纷活力',
      '深色系，深蓝黑深灰为主',
    ],
  },
  {
    dimension: 'color',
    sortOrder: 9,
    content: '选一个让你心情最好的颜色？',
    imageUrls: [
      'https://picsum.photos/seed/col4-sunshine/400/500',
      'https://picsum.photos/seed/col4-ocean/400/500',
      'https://picsum.photos/seed/col4-rose/400/500',
      'https://picsum.photos/seed/col4-forest/400/500',
      'https://picsum.photos/seed/col4-lavender/400/500',
    ],
    descriptions: [
      '阳光黄，明亮温暖充满活力',
      '海洋蓝，宁静深邃让人放松',
      '玫瑰粉，温柔浪漫心生欢喜',
      '森林绿，清新自然回归本真',
      '薰衣草紫，优雅梦幻治愈心灵',
    ],
  },
  {
    dimension: 'color',
    sortOrder: 10,
    content: '如果要买一条围巾，你会选什么颜色？',
    imageUrls: [
      'https://picsum.photos/seed/col5-camel/400/500',
      'https://picsum.photos/seed/col5-burgundy/400/500',
      'https://picsum.photos/seed/col5-grey/400/500',
      'https://picsum.photos/seed/col5-teal/400/500',
      'https://picsum.photos/seed/col5-coral/400/500',
    ],
    descriptions: [
      '经典驼色，百搭又有质感',
      '酒红色，复古又有品味',
      '高级灰，低调又有格调',
      '孔雀蓝，独特又有气质',
      '珊瑚橘，温暖又有活力',
    ],
  },

  // ===== style 维度 (5题) =====
  {
    dimension: 'style',
    sortOrder: 11,
    content: '选择最符合你审美的风格',
    imageUrls: [
      'https://picsum.photos/seed/sty1-minimal/400/500',
      'https://picsum.photos/seed/sty1-french/400/500',
      'https://picsum.photos/seed/sty1-street/400/500',
      'https://picsum.photos/seed/sty1-sporty/400/500',
      'https://picsum.photos/seed/sty1-retro/400/500',
    ],
    descriptions: [
      '极简通勤，干净利落线条感',
      '法式浪漫，慵懒优雅女人味',
      '街头潮流，个性张扬酷态度',
      '运动休闲，舒适活力自在感',
      '复古文艺，怀旧韵味有故事',
    ],
  },
  {
    dimension: 'style',
    sortOrder: 12,
    content: '你最欣赏哪种穿搭理念？',
    imageUrls: [
      'https://picsum.photos/seed/sty2-quality/400/500',
      'https://picsum.photos/seed/sty2-trend/400/500',
      'https://picsum.photos/seed/sty2-comfort/400/500',
      'https://picsum.photos/seed/sty2-unique/400/500',
      'https://picsum.photos/seed/sty2-classic/400/500',
    ],
    descriptions: [
      '少而精，重质不重量',
      '追逐潮流，永远走在时尚前沿',
      '舒适至上，穿得自在最重要',
      '与众不同，拒绝撞衫做自己',
      '经典永恒，永不过时的优雅',
    ],
  },
  {
    dimension: 'style',
    sortOrder: 13,
    content: '你的鞋柜里最多的是哪种鞋？',
    imageUrls: [
      'https://picsum.photos/seed/sty3-heel/400/500',
      'https://picsum.photos/seed/sty3-sneaker/400/500',
      'https://picsum.photos/seed/sty3-boot/400/500',
      'https://picsum.photos/seed/sty3-flat/400/500',
      'https://picsum.photos/seed/sty3-loafer/400/500',
    ],
    descriptions: [
      '高跟鞋，优雅精致提升气场',
      '运动鞋，活力潮流百搭舒适',
      '靴子，帅气有型个性十足',
      '平底鞋，舒适随性轻松自在',
      '乐福鞋，知性干练品味之选',
    ],
  },
  {
    dimension: 'style',
    sortOrder: 14,
    content: '如果要选一件外套，你会选？',
    imageUrls: [
      'https://picsum.photos/seed/sty4-blazer/400/500',
      'https://picsum.photos/seed/sty4-leather/400/500',
      'https://picsum.photos/seed/sty4-trench/400/500',
      'https://picsum.photos/seed/sty4-puffer/400/500',
      'https://picsum.photos/seed/sty4-cardigan/400/500',
    ],
    descriptions: [
      '西装外套，利落干练职场必备',
      '皮夹克，酷帅有型个性标志',
      '风衣，经典优雅气质之选',
      '羽绒服，保暖实用舒适至上',
      '针织开衫，温柔慵懒居家感',
    ],
  },
  {
    dimension: 'style',
    sortOrder: 15,
    content: '你最喜欢的配饰风格是？',
    imageUrls: [
      'https://picsum.photos/seed/sty5-fine/400/500',
      'https://picsum.photos/seed/sty5-statement/400/500',
      'https://picsum.photos/seed/sty5-minimal/400/500',
      'https://picsum.photos/seed/sty5-vintage/400/500',
      'https://picsum.photos/seed/sty5-sporty/400/500',
    ],
    descriptions: [
      '精致珠宝，低调奢华有内涵',
      '夸张配饰，大胆吸睛做焦点',
      '极简饰品，少即是多显品味',
      '复古首饰，岁月沉淀有故事',
      '运动腕表，功能实用活力感',
    ],
  },

  // ===== price 维度 (5题) =====
  {
    dimension: 'price',
    sortOrder: 16,
    content: '你通常在哪些店铺购物？',
    imageUrls: [
      'https://picsum.photos/seed/pri1-fast/400/500',
      'https://picsum.photos/seed/pri1-designer/400/500',
      'https://picsum.photos/seed/pri1-department/400/500',
      'https://picsum.photos/seed/pri1-online/400/500',
      'https://picsum.photos/seed/pri1-vintage/400/500',
    ],
    descriptions: [
      '快时尚门店，款式多价格亲民',
      '设计师买手店，独特设计有品味',
      '高端百货，品质保证服务好',
      '线上品牌，性价比高选择多',
      '二手古着，淘到宝贝有惊喜',
    ],
  },
  {
    dimension: 'price',
    sortOrder: 17,
    content: '买一件大衣你愿意花多少钱？',
    imageUrls: [
      'https://picsum.photos/seed/pri2-300/400/500',
      'https://picsum.photos/seed/pri2-800/400/500',
      'https://picsum.photos/seed/pri2-2000/400/500',
      'https://picsum.photos/seed/pri2-5000/400/500',
      'https://picsum.photos/seed/pri2-10000/400/500',
    ],
    descriptions: [
      '300元以内，实用就好不追求品牌',
      '300-800元，性价比优先偶尔犒赏',
      '800-2000元，注重品质值得投资',
      '2000-5000元，追求品牌和设计感',
      '5000元以上，品质至上只买最好的',
    ],
  },
  {
    dimension: 'price',
    sortOrder: 18,
    content: '你的购物习惯是？',
    imageUrls: [
      'https://picsum.photos/seed/pri3-sale/400/500',
      'https://picsum.photos/seed/pri3-impulse/400/500',
      'https://picsum.photos/seed/pri3-plan/400/500',
      'https://picsum.photos/seed/pri3-invest/400/500',
      'https://picsum.photos/seed/pri3-mix/400/500',
    ],
    descriptions: [
      '等打折再买，精打细算最划算',
      '看到喜欢的就买，冲动消费也快乐',
      '列好清单再买，理性消费不浪费',
      '投资经典款，贵但值得长久穿',
      '混搭高低价，基础款贵单品便宜搭',
    ],
  },
  {
    dimension: 'price',
    sortOrder: 19,
    content: '你觉得衣服最重要的是什么？',
    imageUrls: [
      'https://picsum.photos/seed/pri4-trendy/400/500',
      'https://picsum.photos/seed/pri4-quality/400/500',
      'https://picsum.photos/seed/pri4-value/400/500',
      'https://picsum.photos/seed/pri4-brand/400/500',
      'https://picsum.photos/seed/pri4-fit/400/500',
    ],
    descriptions: [
      '款式时尚，紧跟潮流最重要',
      '面料做工，品质决定一切',
      '性价比高，花最少的钱穿最好',
      '品牌价值，穿出身份和地位',
      '版型合身，穿得舒服才是王道',
    ],
  },
  {
    dimension: 'price',
    sortOrder: 20,
    content: '你多久买一次新衣服？',
    imageUrls: [
      'https://picsum.photos/seed/pri5-weekly/400/500',
      'https://picsum.photos/seed/pri5-monthly/400/500',
      'https://picsum.photos/seed/pri5-season/400/500',
      'https://picsum.photos/seed/pri5-need/400/500',
      'https://picsum.photos/seed/pri5-yearly/400/500',
    ],
    descriptions: [
      '每周都买，购物是最大爱好',
      '每月一次，定期更新衣橱',
      '每季换新，跟着季节走',
      '需要才买，绝不盲目消费',
      '一年几次，精挑细选每件都爱',
    ],
  },
];

export async function seedQuizQuestions(prisma: PrismaClient): Promise<{ quiz: StyleQuiz, questions: QuizQuestion[] }> {
  const quiz = await prisma.styleQuiz.upsert({
    where: { id: 'style-quiz-default' },
    update: {
      title: QUIZ_DATA.title,
      description: QUIZ_DATA.description,
      coverImage: QUIZ_DATA.coverImage,
      isActive: true,
    },
    create: {
      id: 'style-quiz-default',
      title: QUIZ_DATA.title,
      description: QUIZ_DATA.description,
      coverImage: QUIZ_DATA.coverImage,
      isActive: true,
    },
  });

  const questions: QuizQuestion[] = [];

  for (const q of QUESTIONS_DATA) {
    const existing = await prisma.quizQuestion.findFirst({
      where: { quizId: quiz.id, sortOrder: q.sortOrder },
    });

    if (existing) {
      questions.push(existing);
    } else {
      const question = await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          content: q.content,
          imageUrls: q.imageUrls,
          questionType: 'visual_choice' as QuizQuestionType,
          dimension: q.dimension,
          sortOrder: q.sortOrder,
          isActive: true,
        },
      });
      questions.push(question);
    }
  }

  return { quiz, questions };
}
