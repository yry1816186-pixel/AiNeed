import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface QuizImageMeta {
  index: number;
  dominantColors: HSLColor[];
  styleTags: string[];
  occasion: string;
  priceRange: string;
  applicableGenders: string[];
}

export interface QuizQuestionWithMeta {
  id: string;
  quizId: string;
  content: string;
  imageUrls: string[];
  questionType: string;
  dimension: string;
  sortOrder: number;
  isActive: boolean;
  imageMeta?: QuizImageMeta[];
}

export interface SelectedImageWithMeta {
  questionId: string;
  selectedImageIndex: number;
  duration: number;
  imageMeta: QuizImageMeta;
}

export const QUESTION_IMAGE_META_MAP: Record<string, QuizImageMeta[]> = {
  "q-occasion-01": [
    { index: 0, dominantColors: [{ h: 220, s: 60, l: 45 }], styleTags: ["business", "formal"], occasion: "workplace", priceRange: "mid_range", applicableGenders: ["male", "female"] },
    { index: 1, dominantColors: [{ h: 340, s: 55, l: 50 }], styleTags: ["elegant", "evening"], occasion: "date", priceRange: "premium", applicableGenders: ["female"] },
    { index: 2, dominantColors: [{ h: 120, s: 40, l: 55 }], styleTags: ["casual", "outdoor"], occasion: "weekend", priceRange: "budget", applicableGenders: ["male", "female"] },
    { index: 3, dominantColors: [{ h: 30, s: 70, l: 60 }], styleTags: ["sporty", "active"], occasion: "exercise", priceRange: "mid_range", applicableGenders: ["male", "female"] },
    { index: 4, dominantColors: [{ h: 270, s: 45, l: 40 }], styleTags: ["creative", "arty"], occasion: "social", priceRange: "mid_range", applicableGenders: ["female"] },
  ],
  "q-occasion-02": [
    { index: 0, dominantColors: [{ h: 0, s: 0, l: 10 }], styleTags: ["minimalist", "formal"], occasion: "workplace", priceRange: "luxury", applicableGenders: ["male"] },
    { index: 1, dominantColors: [{ h: 200, s: 50, l: 70 }], styleTags: ["preppy", "clean"], occasion: "date", priceRange: "mid_range", applicableGenders: ["male"] },
    { index: 2, dominantColors: [{ h: 45, s: 80, l: 55 }], styleTags: ["bohemian", "free"], occasion: "vacation", priceRange: "budget", applicableGenders: ["female"] },
    { index: 3, dominantColors: [{ h: 180, s: 30, l: 50 }], styleTags: ["smart-casual", "versatile"], occasion: "social", priceRange: "mid_range", applicableGenders: ["male", "female"] },
    { index: 4, dominantColors: [{ h: 350, s: 65, l: 45 }], styleTags: ["glamorous", "evening"], occasion: "party", priceRange: "premium", applicableGenders: ["female"] },
    { index: 5, dominantColors: [{ h: 150, s: 35, l: 60 }], styleTags: ["relaxed", "cozy"], occasion: "home", priceRange: "budget", applicableGenders: ["male", "female"] },
  ],
  "q-color-01": [
    { index: 0, dominantColors: [{ h: 0, s: 85, l: 50 }], styleTags: ["bold", "energetic"], occasion: "social", priceRange: "mid_range", applicableGenders: ["female"] },
    { index: 1, dominantColors: [{ h: 210, s: 70, l: 55 }], styleTags: ["calm", "professional"], occasion: "workplace", priceRange: "premium", applicableGenders: ["male", "female"] },
    { index: 2, dominantColors: [{ h: 50, s: 75, l: 60 }], styleTags: ["cheerful", "warm"], occasion: "weekend", priceRange: "budget", applicableGenders: ["female"] },
    { index: 3, dominantColors: [{ h: 150, s: 50, l: 45 }], styleTags: ["natural", "fresh"], occasion: "outdoor", priceRange: "mid_range", applicableGenders: ["male", "female"] },
    { index: 4, dominantColors: [{ h: 280, s: 60, l: 50 }], styleTags: ["mysterious", "elegant"], occasion: "date", priceRange: "premium", applicableGenders: ["female"] },
  ],
  "q-color-02": [
    { index: 0, dominantColors: [{ h: 0, s: 0, l: 0 }], styleTags: ["classic", "timeless"], occasion: "workplace", priceRange: "luxury", applicableGenders: ["male", "female"] },
    { index: 1, dominantColors: [{ h: 0, s: 0, l: 100 }], styleTags: ["pure", "minimal"], occasion: "date", priceRange: "premium", applicableGenders: ["female"] },
    { index: 2, dominantColors: [{ h: 15, s: 80, l: 55 }], styleTags: ["earthy", "autumn"], occasion: "weekend", priceRange: "mid_range", applicableGenders: ["male", "female"] },
    { index: 3, dominantColors: [{ h: 190, s: 65, l: 50 }], styleTags: ["cool", "modern"], occasion: "social", priceRange: "mid_range", applicableGenders: ["male"] },
    { index: 4, dominantColors: [{ h: 330, s: 70, l: 65 }], styleTags: ["romantic", "soft"], occasion: "date", priceRange: "mid_range", applicableGenders: ["female"] },
  ],
  "q-style-01": [
    { index: 0, dominantColors: [{ h: 0, s: 0, l: 30 }], styleTags: ["minimalist", "clean"], occasion: "workplace", priceRange: "premium", applicableGenders: ["male", "female"] },
    { index: 1, dominantColors: [{ h: 35, s: 65, l: 50 }], styleTags: ["vintage", "retro"], occasion: "social", priceRange: "mid_range", applicableGenders: ["female"] },
    { index: 2, dominantColors: [{ h: 200, s: 40, l: 60 }], styleTags: ["preppy", "classic"], occasion: "date", priceRange: "mid_range", applicableGenders: ["male"] },
    { index: 3, dominantColors: [{ h: 300, s: 55, l: 45 }], styleTags: ["streetwear", "urban"], occasion: "weekend", priceRange: "budget", applicableGenders: ["male", "female"] },
    { index: 4, dominantColors: [{ h: 160, s: 45, l: 55 }], styleTags: ["bohemian", "free-spirited"], occasion: "vacation", priceRange: "budget", applicableGenders: ["female"] },
    { index: 5, dominantColors: [{ h: 240, s: 50, l: 35 }], styleTags: ["avant-garde", "experimental"], occasion: "party", priceRange: "luxury", applicableGenders: ["male", "female"] },
  ],
  "q-style-02": [
    { index: 0, dominantColors: [{ h: 10, s: 75, l: 50 }], styleTags: ["sporty", "athletic"], occasion: "exercise", priceRange: "mid_range", applicableGenders: ["male", "female"] },
    { index: 1, dominantColors: [{ h: 45, s: 55, l: 65 }], styleTags: ["casual", "comfortable"], occasion: "weekend", priceRange: "budget", applicableGenders: ["male", "female"] },
    { index: 2, dominantColors: [{ h: 0, s: 0, l: 15 }], styleTags: ["gothic", "dark"], occasion: "party", priceRange: "mid_range", applicableGenders: ["female"] },
    { index: 3, dominantColors: [{ h: 175, s: 40, l: 70 }], styleTags: ["scandinavian", "simple"], occasion: "home", priceRange: "premium", applicableGenders: ["male", "female"] },
    { index: 4, dominantColors: [{ h: 55, s: 70, l: 55 }], styleTags: ["country", "rustic"], occasion: "outdoor", priceRange: "budget", applicableGenders: ["female"] },
  ],
  "q-price-01": [
    { index: 0, dominantColors: [{ h: 45, s: 80, l: 55 }], styleTags: ["affordable", "trendy"], occasion: "weekend", priceRange: "budget", applicableGenders: ["male", "female"] },
    { index: 1, dominantColors: [{ h: 210, s: 55, l: 50 }], styleTags: ["quality", "versatile"], occasion: "workplace", priceRange: "mid_range", applicableGenders: ["male", "female"] },
    { index: 2, dominantColors: [{ h: 270, s: 45, l: 40 }], styleTags: ["premium", "refined"], occasion: "date", priceRange: "premium", applicableGenders: ["male", "female"] },
    { index: 3, dominantColors: [{ h: 40, s: 90, l: 50 }], styleTags: ["luxury", "exclusive"], occasion: "party", priceRange: "luxury", applicableGenders: ["female"] },
    { index: 4, dominantColors: [{ h: 0, s: 0, l: 20 }], styleTags: ["investment", "timeless"], occasion: "workplace", priceRange: "luxury", applicableGenders: ["male"] },
  ],
  "q-price-02": [
    { index: 0, dominantColors: [{ h: 120, s: 50, l: 60 }], styleTags: ["value", "practical"], occasion: "home", priceRange: "budget", applicableGenders: ["male", "female"] },
    { index: 1, dominantColors: [{ h: 240, s: 35, l: 55 }], styleTags: ["balanced", "smart"], occasion: "workplace", priceRange: "mid_range", applicableGenders: ["male"] },
    { index: 2, dominantColors: [{ h: 330, s: 60, l: 55 }], styleTags: ["aspirational", "elegant"], occasion: "date", priceRange: "premium", applicableGenders: ["female"] },
    { index: 3, dominantColors: [{ h: 50, s: 85, l: 45 }], styleTags: ["statement", "bold"], occasion: "social", priceRange: "premium", applicableGenders: ["male", "female"] },
    { index: 4, dominantColors: [{ h: 0, s: 0, l: 5 }], styleTags: ["bespoke", "haute-couture"], occasion: "party", priceRange: "luxury", applicableGenders: ["female"] },
    { index: 5, dominantColors: [{ h: 180, s: 25, l: 65 }], styleTags: ["sustainable", "conscious"], occasion: "weekend", priceRange: "mid_range", applicableGenders: ["male", "female"] },
  ],
};

const REQUIRED_DIMENSIONS = ["occasion", "color", "style", "price"] as const;
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 8;

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

@Injectable()
export class QuestionSelectorService {
  constructor(private readonly prisma: PrismaService) {}

  async selectQuestions(userId: string, quizId: string): Promise<QuizQuestionWithMeta[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const allQuestions = await this.prisma.quizQuestion.findMany({
      where: { quizId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    if (allQuestions.length === 0) {
      throw new NotFoundException("该问卷暂无可用题目");
    }

    const questionsWithMeta: QuizQuestionWithMeta[] = allQuestions.map((q: { id: string; quizId: string; content: string; imageUrls: string[]; questionType: string; dimension: string; sortOrder: number; isActive: boolean }) => ({
      id: q.id,
      quizId: q.quizId,
      content: q.content,
      imageUrls: q.imageUrls,
      questionType: q.questionType,
      dimension: q.dimension,
      sortOrder: q.sortOrder,
      isActive: q.isActive,
      imageMeta: QUESTION_IMAGE_META_MAP[q.id] ?? undefined,
    }));

    const gender = user.gender;

    const dimensionGroups = new Map<string, QuizQuestionWithMeta[]>();
    for (const q of questionsWithMeta) {
      const dim = q.dimension;
      if (!dimensionGroups.has(dim)) {
        dimensionGroups.set(dim, []);
      }
      dimensionGroups.get(dim)!.push(q);
    }

    const selected: QuizQuestionWithMeta[] = [];

    for (const dim of REQUIRED_DIMENSIONS) {
      const pool = dimensionGroups.get(dim) ?? [];
      if (pool.length === 0) continue;

      const genderFiltered = gender
        ? pool.filter((q) => {
            const meta = q.imageMeta;
            if (!meta || meta.length === 0) return true;
            const hasGenderRestriction = meta.some((m) => m.applicableGenders.length > 0);
            if (!hasGenderRestriction) return true;
            return meta.some((m) => m.applicableGenders.includes(gender));
          })
        : pool;

      const candidatePool = genderFiltered.length > 0 ? genderFiltered : pool;
      const shuffled = shuffleArray(candidatePool);
      if (shuffled[0]) {
        selected.push(shuffled[0]);
      }
    }

    const selectedIds = new Set(selected.map((q) => q.id));
    const remaining: QuizQuestionWithMeta[] = [];

    for (const dim of REQUIRED_DIMENSIONS) {
      const pool = dimensionGroups.get(dim) ?? [];
      for (const q of pool) {
        if (!selectedIds.has(q.id)) {
          remaining.push(q);
        }
      }
    }

    const genderFilteredRemaining = gender
      ? remaining.filter((q) => {
          const meta = q.imageMeta;
          if (!meta || meta.length === 0) return true;
          const hasGenderRestriction = meta.some((m) => m.applicableGenders.length > 0);
          if (!hasGenderRestriction) return true;
          return meta.some((m) => m.applicableGenders.includes(gender));
        })
      : remaining;

    const candidateRemaining = genderFilteredRemaining.length > 0 ? genderFilteredRemaining : remaining;
    const shuffledRemaining = shuffleArray(candidateRemaining);

    const targetCount = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, allQuestions.length));
    const extraNeeded = targetCount - selected.length;

    for (let i = 0; i < extraNeeded && i < shuffledRemaining.length; i++) {
      const item = shuffledRemaining[i];
      if (item) {
        selected.push(item);
      }
    }

    return this.interleaveByDimension(selected);
  }

  private interleaveByDimension(questions: QuizQuestionWithMeta[]): QuizQuestionWithMeta[] {
    const byDimension = new Map<string, QuizQuestionWithMeta[]>();
    for (const q of questions) {
      if (!byDimension.has(q.dimension)) {
        byDimension.set(q.dimension, []);
      }
      byDimension.get(q.dimension)!.push(q);
    }

    for (const [, qs] of byDimension) {
      const shuffled = shuffleArray(qs);
      qs.length = 0;
      qs.push(...shuffled);
    }

    const dimensionOrder = shuffleArray([...byDimension.keys()]);
    const result: QuizQuestionWithMeta[] = [];
    const iterators = new Map<string, number>();
    for (const dim of dimensionOrder) {
      iterators.set(dim, 0);
    }

    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const dim of dimensionOrder) {
        const idx = iterators.get(dim)!;
        const pool = byDimension.get(dim)!;
        if (idx < pool.length) {
          result.push(pool[idx]!);
          iterators.set(dim, idx + 1);
          hasMore = true;
        }
      }
    }

    return result;
  }
}
