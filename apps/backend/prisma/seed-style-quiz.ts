// @ts-nocheck
import { PrismaClient, QuizQuestionType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Style quiz question bank with scoring metadata.
 *
 * Each question has 4-6 image options. Each option carries:
 * - imageUrl: placeholder image URL (replace with real assets in production)
 * - label: Chinese display label for the style shown
 * - styleScores: maps style keyword to weight contribution
 * - colorTags: array of color hex/category/weight for implicit color derivation
 *
 * Questions cover 6 dimensions:
 * 1. Daily outfit preference (occasion)
 * 2. Color combination (color)
 * 3. Pattern/texture style (style)
 * 4. Silhouette preference (body)
 * 5. Accessory style (style)
 * 6. Lifestyle scene (occasion)
 */

interface QuizOption {
  imageUrl: string;
  label: string;
  styleScores: Record<string, number>;
  colorTags: Array<{ hex: string; category: string; weight: number }>;
}

interface QuizQuestionData {
  dimension: string;
  sortOrder: number;
  content: string;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestionData[] = [
  // Question 1: Daily outfit preference (occasion)
  {
    dimension: 'occasion',
    sortOrder: 1,
    content: '你平时最常穿的穿搭风格是什么？',
    options: [
      {
        imageUrl: 'https://placeholder.com/quiz/q1a1.jpg',
        label: '简约通勤',
        styleScores: { MINIMALIST: 3, CASUAL: 1 },
        colorTags: [
          { hex: '#2D2D2D', category: 'NEUTRAL', weight: 2 },
          { hex: '#F5F5F5', category: 'NEUTRAL', weight: 2 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q1a2.jpg',
        label: '休闲运动',
        styleScores: { SPORTY: 3, CASUAL: 2 },
        colorTags: [
          { hex: '#FFFFFF', category: 'NEUTRAL', weight: 2 },
          { hex: '#3B82F6', category: 'COOL', weight: 2 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q1a3.jpg',
        label: '法式浪漫',
        styleScores: { FEMININE: 3, ELEGANT: 1 },
        colorTags: [
          { hex: '#F5E6D3', category: 'WARM', weight: 2 },
          { hex: '#D4756B', category: 'WARM', weight: 2 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q1a4.jpg',
        label: '街头潮流',
        styleScores: { STREET: 3, EDGY: 1 },
        colorTags: [
          { hex: '#1A1A1A', category: 'NEUTRAL', weight: 2 },
          { hex: '#FF4444', category: 'WARM', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q1a5.jpg',
        label: '文艺复古',
        styleScores: { RETRO: 3, ARTISTIC: 1 },
        colorTags: [
          { hex: '#8B7355', category: 'WARM', weight: 2 },
          { hex: '#556B2F', category: 'COOL', weight: 1 },
        ],
      },
    ],
  },

  // Question 2: Color combination preference (color)
  {
    dimension: 'color',
    sortOrder: 2,
    content: '哪个色彩组合最吸引你？',
    options: [
      {
        imageUrl: 'https://placeholder.com/quiz/q2a1.jpg',
        label: '黑白极简',
        styleScores: { MINIMALIST: 3 },
        colorTags: [
          { hex: '#000000', category: 'NEUTRAL', weight: 3 },
          { hex: '#FFFFFF', category: 'NEUTRAL', weight: 3 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q2a2.jpg',
        label: '大地暖色',
        styleScores: { CASUAL: 1, RETRO: 1 },
        colorTags: [
          { hex: '#C4A882', category: 'WARM', weight: 3 },
          { hex: '#8B6914', category: 'WARM', weight: 2 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q2a3.jpg',
        label: '莫兰迪色',
        styleScores: { ELEGANT: 2, FEMININE: 1 },
        colorTags: [
          { hex: '#B8A9C9', category: 'COOL', weight: 2 },
          { hex: '#D4B8A0', category: 'WARM', weight: 2 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q2a4.jpg',
        label: '鲜艳撞色',
        styleScores: { STREET: 2, EDGY: 1 },
        colorTags: [
          { hex: '#FF6B6B', category: 'WARM', weight: 2 },
          { hex: '#4ECDC4', category: 'COOL', weight: 2 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q2a5.jpg',
        label: '柔和粉系',
        styleScores: { FEMININE: 2, ROMANTIC: 2 },
        colorTags: [
          { hex: '#FFB6C1', category: 'WARM', weight: 3 },
          { hex: '#FFC0CB', category: 'WARM', weight: 2 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q2a6.jpg',
        label: '深蓝冷调',
        styleScores: { ELEGANT: 2, MINIMALIST: 1 },
        colorTags: [
          { hex: '#1B3A4B', category: 'COOL', weight: 3 },
          { hex: '#4A6FA5', category: 'COOL', weight: 2 },
        ],
      },
    ],
  },

  // Question 3: Pattern and texture style (style)
  {
    dimension: 'style',
    sortOrder: 3,
    content: '你更喜欢哪种图案和面料质感？',
    options: [
      {
        imageUrl: 'https://placeholder.com/quiz/q3a1.jpg',
        label: '纯色简约',
        styleScores: { MINIMALIST: 3, ELEGANT: 1 },
        colorTags: [
          { hex: '#FAFAFA', category: 'NEUTRAL', weight: 3 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q3a2.jpg',
        label: '条纹格子',
        styleScores: { CASUAL: 2, RETRO: 1 },
        colorTags: [
          { hex: '#2D2D2D', category: 'NEUTRAL', weight: 1 },
          { hex: '#FFFFFF', category: 'NEUTRAL', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q3a3.jpg',
        label: '花卉印花',
        styleScores: { FEMININE: 3, ROMANTIC: 1 },
        colorTags: [
          { hex: '#E8B4B8', category: 'WARM', weight: 2 },
          { hex: '#7DB9B6', category: 'COOL', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q3a4.jpg',
        label: '皮革金属',
        styleScores: { EDGY: 3, STREET: 1 },
        colorTags: [
          { hex: '#1A1A1A', category: 'NEUTRAL', weight: 2 },
          { hex: '#C0C0C0', category: 'NEUTRAL', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q3a5.jpg',
        label: '针织柔软',
        styleScores: { CASUAL: 2, FEMININE: 1 },
        colorTags: [
          { hex: '#E8D5C4', category: 'WARM', weight: 2 },
          { hex: '#F5F0EB', category: 'NEUTRAL', weight: 1 },
        ],
      },
    ],
  },

  // Question 4: Silhouette preference (body)
  {
    dimension: 'body',
    sortOrder: 4,
    content: '你偏好哪种服装版型？',
    options: [
      {
        imageUrl: 'https://placeholder.com/quiz/q4a1.jpg',
        label: '修身合体',
        styleScores: { ELEGANT: 2, FEMININE: 2 },
        colorTags: [
          { hex: '#2D2D2D', category: 'NEUTRAL', weight: 2 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q4a2.jpg',
        label: '宽松舒适',
        styleScores: { CASUAL: 3, SPORTY: 1 },
        colorTags: [
          { hex: '#F5F5F5', category: 'NEUTRAL', weight: 2 },
          { hex: '#E0E0E0', category: 'NEUTRAL', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q4a3.jpg',
        label: 'A字飘逸',
        styleScores: { FEMININE: 3, ROMANTIC: 1 },
        colorTags: [
          { hex: '#D4756B', category: 'WARM', weight: 2 },
          { hex: '#FAEBD7', category: 'WARM', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q4a4.jpg',
        label: 'Oversize廓形',
        styleScores: { STREET: 3, EDGY: 1 },
        colorTags: [
          { hex: '#1A1A1A', category: 'NEUTRAL', weight: 2 },
          { hex: '#808080', category: 'NEUTRAL', weight: 1 },
        ],
      },
    ],
  },

  // Question 5: Accessory style (style)
  {
    dimension: 'style',
    sortOrder: 5,
    content: '你最喜欢哪种配饰风格？',
    options: [
      {
        imageUrl: 'https://placeholder.com/quiz/q5a1.jpg',
        label: '精致珠宝',
        styleScores: { ELEGANT: 3, FEMININE: 1 },
        colorTags: [
          { hex: '#C0C0C0', category: 'NEUTRAL', weight: 2 },
          { hex: '#FFD700', category: 'WARM', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q5a2.jpg',
        label: '极简金属',
        styleScores: { MINIMALIST: 3 },
        colorTags: [
          { hex: '#C0C0C0', category: 'NEUTRAL', weight: 3 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q5a3.jpg',
        label: '复古手工',
        styleScores: { RETRO: 3, ARTISTIC: 1 },
        colorTags: [
          { hex: '#8B7355', category: 'WARM', weight: 2 },
          { hex: '#B8860B', category: 'WARM', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q5a4.jpg',
        label: '夸张潮流',
        styleScores: { STREET: 2, EDGY: 2 },
        colorTags: [
          { hex: '#FF4444', category: 'WARM', weight: 2 },
          { hex: '#000000', category: 'NEUTRAL', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q5a5.jpg',
        label: '运动功能',
        styleScores: { SPORTY: 3, CASUAL: 1 },
        colorTags: [
          { hex: '#333333', category: 'NEUTRAL', weight: 2 },
          { hex: '#3B82F6', category: 'COOL', weight: 1 },
        ],
      },
    ],
  },

  // Question 6: Lifestyle scene (occasion)
  {
    dimension: 'occasion',
    sortOrder: 6,
    content: '你理想中的周末是怎样的？',
    options: [
      {
        imageUrl: 'https://placeholder.com/quiz/q6a1.jpg',
        label: '咖啡厅阅读',
        styleScores: { MINIMALIST: 2, ELEGANT: 1 },
        colorTags: [
          { hex: '#6F4E37', category: 'WARM', weight: 2 },
          { hex: '#FAEBD7', category: 'WARM', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q6a2.jpg',
        label: '户外徒步',
        styleScores: { SPORTY: 3, CASUAL: 1 },
        colorTags: [
          { hex: '#556B2F', category: 'COOL', weight: 2 },
          { hex: '#8FBC8F', category: 'COOL', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q6a3.jpg',
        label: '商场购物',
        styleScores: { CASUAL: 2, FEMININE: 1 },
        colorTags: [
          { hex: '#FFB6C1', category: 'WARM', weight: 2 },
          { hex: '#FFFFFF', category: 'NEUTRAL', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q6a4.jpg',
        label: '朋友聚会',
        styleScores: { STREET: 1, CASUAL: 2 },
        colorTags: [
          { hex: '#FF6B6B', category: 'WARM', weight: 1 },
          { hex: '#4ECDC4', category: 'COOL', weight: 1 },
        ],
      },
      {
        imageUrl: 'https://placeholder.com/quiz/q6a5.jpg',
        label: '艺术展览',
        styleScores: { ARTISTIC: 2, ELEGANT: 1 },
        colorTags: [
          { hex: '#2D2D2D', category: 'NEUTRAL', weight: 2 },
          { hex: '#FFFFFF', category: 'NEUTRAL', weight: 1 },
        ],
      },
    ],
  },
];

/**
 * Export the question metadata for use by scoring services.
 * This constant is the source of truth for styleScores and colorTags
 * mapping to each quiz question's image options.
 */
export const QUIZ_OPTION_METADATA = QUESTIONS.map((q) => ({
  dimension: q.dimension,
  sortOrder: q.sortOrder,
  content: q.content,
  options: q.options.map((opt) => ({
    imageUrl: opt.imageUrl,
    label: opt.label,
    styleScores: opt.styleScores,
    colorTags: opt.colorTags,
  })),
}));

async function main() {
  console.log('Seeding style quiz question bank...');
  console.log('='.repeat(60));

  // Step 1: Clear existing quiz data idempotently
  console.log('\nStep 1: Clearing existing quiz data...');

  await prisma.quizAnswer.deleteMany({});
  console.log('  Deleted QuizAnswer records');

  await prisma.styleQuizResult.deleteMany({});
  console.log('  Deleted StyleQuizResult records');

  await prisma.quizQuestion.deleteMany({});
  console.log('  Deleted QuizQuestion records');

  await prisma.styleQuiz.deleteMany({});
  console.log('  Deleted StyleQuiz records');

  // Step 2: Create the quiz
  console.log('\nStep 2: Creating style quiz...');
  const quiz = await prisma.styleQuiz.create({
    data: {
      id: 'style-quiz-v2',
      title: '发现你的专属穿搭风格',
      description: '通过6道图片选择题，AI将分析你的风格偏好和色彩倾向，为你量身定制穿搭推荐',
      coverImage: 'https://placeholder.com/quiz/cover.jpg',
      isActive: true,
    },
  });
  console.log(`  Created quiz: ${quiz.title} (${quiz.id})`);

  // Step 3: Create questions with image options
  console.log('\nStep 3: Creating quiz questions...');
  const createdQuestions = [];

  for (const q of QUESTIONS) {
    const imageUrls = q.options.map((opt) => opt.imageUrl);

    const question = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        content: q.content,
        imageUrls,
        questionType: 'visual_choice' as QuizQuestionType,
        dimension: q.dimension,
        sortOrder: q.sortOrder,
        isActive: true,
      },
    });

    createdQuestions.push(question);
    console.log(
      `  Q${q.sortOrder}: ${q.content} (${q.options.length} options, dimension: ${q.dimension})`,
    );
  }

  // Summary
  const totalOptions = QUESTIONS.reduce((sum, q) => sum + q.options.length, 0);
  console.log('\n' + '='.repeat(60));
  console.log('Style quiz seeding complete!');
  console.log('='.repeat(60));
  console.log(`  Quiz: ${quiz.title}`);
  console.log(`  Questions: ${createdQuestions.length}`);
  console.log(`  Total options: ${totalOptions}`);
  console.log('\nNote: styleScores and colorTags metadata is exported from');
  console.log('QUIZ_OPTION_METADATA constant for use by scoring services.');
}

main()
  .catch((e) => {
    console.error('Failed to seed style quiz:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
