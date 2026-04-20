import { Injectable } from "@nestjs/common";

export type StyleDimension =
  | "classic"
  | "romantic"
  | "natural"
  | "dramatic"
  | "creative"
  | "elegant";

export interface QuizAnswer {
  questionId: string;
  selectedOptionIndex: number;
}

export interface StyleDimensionScores {
  classic: number;
  romantic: number;
  natural: number;
  dramatic: number;
  creative: number;
  elegant: number;
}

export interface StyleScoringResult {
  primaryStyle: StyleDimension;
  secondaryStyle: StyleDimension;
  scores: StyleDimensionScores;
  description: string;
}

interface QuestionOptionMapping {
  classic: number;
  romantic: number;
  natural: number;
  dramatic: number;
  creative: number;
  elegant: number;
}

interface QuestionDefinition {
  id: string;
  options: QuestionOptionMapping[];
}

const STYLE_DESCRIPTIONS: Record<StyleDimension, string> = {
  classic: "经典优雅型 - 你偏爱经典不过时的单品，注重品质与剪裁",
  romantic: "浪漫柔美型 - 你喜欢柔美浪漫的风格，注重细节与女性魅力",
  natural: "自然随性型 - 你追求舒适自然，偏好简约实用的穿搭",
  dramatic: "戏剧前卫型 - 你敢于尝试大胆前卫的造型，追求视觉冲击",
  creative: "创意个性型 - 你喜欢混搭与创新，穿搭是你表达个性的方式",
  elegant: "优雅知性型 - 你注重内在气质的表达，偏好精致内敛的风格",
};

const COMBINED_DESCRIPTIONS: Record<string, string> = {
  "classic+elegant": "你兼具经典与知性，偏好高品质基础款与精致细节的平衡，穿搭沉稳而不失品味",
  "classic+romantic": "你在经典框架中融入浪漫元素，偏好优雅剪裁与柔美细节的结合",
  "classic+natural": "你追求经典中的舒适感，偏好简约但品质上乘的日常穿搭",
  "classic+dramatic": "你在经典中注入力量感，偏好利落剪裁与存在感强的单品",
  "classic+creative": "你在经典基础上加入创意巧思，偏好有设计感但不失稳重的搭配",
  "romantic+elegant": "你兼具浪漫与知性，偏好柔美中带有内涵的精致穿搭",
  "romantic+natural": "你追求浪漫中的自在感，偏好轻盈飘逸又舒适的日常风格",
  "romantic+dramatic": "你在浪漫中展现大胆，偏好引人注目的华丽造型",
  "romantic+creative": "你将浪漫与创意融合，偏好独特而富有艺术感的柔美风格",
  "natural+elegant": "你追求舒适中的精致，偏好简约但不失品味的知性穿搭",
  "natural+creative": "你在随性中展现个性，偏好有想法的舒适搭配",
  "natural+dramatic": "你在自然风格中注入力量感，偏好简约但气场强大的穿搭",
  "dramatic+creative": "你兼具前卫与创意，偏好大胆出位且极具个人风格的造型",
  "dramatic+elegant": "你在前卫中保持精致，偏好有气场但不失内涵的穿搭",
  "creative+elegant": "你将创意与知性融合，偏好有设计感又不过于张扬的搭配",
};

const QUIZ_QUESTIONS: QuestionDefinition[] = [
  {
    id: "q-style-01",
    options: [
      { classic: 3, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 1 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 0, creative: 3, elegant: 0 },
      { classic: 0, romantic: 0, natural: 3, dramatic: 0, creative: 0, elegant: 1 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 3, creative: 1, elegant: 0 },
    ],
  },
  {
    id: "q-style-02",
    options: [
      { classic: 0, romantic: 3, natural: 0, dramatic: 0, creative: 0, elegant: 1 },
      { classic: 3, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 1 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 0, creative: 3, elegant: 0 },
      { classic: 0, romantic: 0, natural: 3, dramatic: 0, creative: 0, elegant: 0 },
    ],
  },
  {
    id: "q-style-03",
    options: [
      { classic: 0, romantic: 0, natural: 0, dramatic: 3, creative: 1, elegant: 0 },
      { classic: 3, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 1 },
      { classic: 0, romantic: 3, natural: 0, dramatic: 0, creative: 0, elegant: 0 },
      { classic: 0, romantic: 0, natural: 3, dramatic: 0, creative: 0, elegant: 0 },
    ],
  },
  {
    id: "q-style-04",
    options: [
      { classic: 0, romantic: 0, natural: 3, dramatic: 0, creative: 0, elegant: 0 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 0, creative: 3, elegant: 0 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 3, creative: 0, elegant: 1 },
      { classic: 3, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 1 },
    ],
  },
  {
    id: "q-style-05",
    options: [
      { classic: 0, romantic: 3, natural: 0, dramatic: 0, creative: 0, elegant: 1 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 3, creative: 1, elegant: 0 },
      { classic: 3, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 1 },
      { classic: 0, romantic: 0, natural: 3, dramatic: 0, creative: 0, elegant: 0 },
    ],
  },
  {
    id: "q-style-06",
    options: [
      { classic: 0, romantic: 0, natural: 0, dramatic: 0, creative: 3, elegant: 0 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 3 },
      { classic: 3, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 0 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 3, creative: 0, elegant: 0 },
    ],
  },
  {
    id: "q-style-07",
    options: [
      { classic: 0, romantic: 0, natural: 3, dramatic: 0, creative: 0, elegant: 0 },
      { classic: 0, romantic: 3, natural: 0, dramatic: 0, creative: 0, elegant: 0 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 0, creative: 3, elegant: 0 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 3, creative: 0, elegant: 1 },
    ],
  },
  {
    id: "q-style-08",
    options: [
      { classic: 3, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 1 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 3 },
      { classic: 0, romantic: 3, natural: 0, dramatic: 0, creative: 0, elegant: 0 },
      { classic: 0, romantic: 0, natural: 3, dramatic: 0, creative: 0, elegant: 0 },
    ],
  },
  {
    id: "q-style-09",
    options: [
      { classic: 0, romantic: 0, natural: 0, dramatic: 3, creative: 1, elegant: 0 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 0, creative: 3, elegant: 0 },
      { classic: 0, romantic: 0, natural: 3, dramatic: 0, creative: 0, elegant: 0 },
      { classic: 3, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 1 },
    ],
  },
  {
    id: "q-style-10",
    options: [
      { classic: 0, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 3 },
      { classic: 0, romantic: 3, natural: 0, dramatic: 0, creative: 0, elegant: 0 },
      { classic: 3, romantic: 0, natural: 0, dramatic: 0, creative: 0, elegant: 0 },
      { classic: 0, romantic: 0, natural: 0, dramatic: 0, creative: 3, elegant: 0 },
    ],
  },
];

const QUESTION_MAP = new Map(QUIZ_QUESTIONS.map((q) => [q.id, q]));

@Injectable()
export class StyleScoringService {
  calculateScores(answers: QuizAnswer[]): StyleScoringResult {
    const scores: StyleDimensionScores = {
      classic: 0,
      romantic: 0,
      natural: 0,
      dramatic: 0,
      creative: 0,
      elegant: 0,
    };

    for (const answer of answers) {
      const question = QUESTION_MAP.get(answer.questionId);
      if (!question) {
        continue;
      }

      const optionIndex = answer.selectedOptionIndex;
      if (optionIndex < 0 || optionIndex >= question.options.length) {
        continue;
      }

      const optionScores = question.options[optionIndex];
      if (!optionScores) {
        continue;
      }

      scores.classic += optionScores.classic;
      scores.romantic += optionScores.romantic;
      scores.natural += optionScores.natural;
      scores.dramatic += optionScores.dramatic;
      scores.creative += optionScores.creative;
      scores.elegant += optionScores.elegant;
    }

    const sortedDimensions = (Object.entries(scores) as [StyleDimension, number][]).sort(
      (a, b) => b[1] - a[1]
    );

    const primaryStyle = sortedDimensions[0]?.[0] ?? "classic";
    const secondaryStyle = sortedDimensions[1]?.[0] ?? "elegant";

    const description = this.buildDescription(primaryStyle, secondaryStyle);

    return {
      primaryStyle,
      secondaryStyle,
      scores,
      description,
    };
  }

  getStyleDescription(style: StyleDimension): string {
    return STYLE_DESCRIPTIONS[style];
  }

  private buildDescription(primary: StyleDimension, secondary: StyleDimension): string {
    const key1 = `${primary}+${secondary}`;
    const key2 = `${secondary}+${primary}`;
    const combined = COMBINED_DESCRIPTIONS[key1] ?? COMBINED_DESCRIPTIONS[key2];

    if (combined) {
      return combined;
    }

    if (primary === secondary) {
      return STYLE_DESCRIPTIONS[primary];
    }

    return `${STYLE_DESCRIPTIONS[primary]}，同时${STYLE_DESCRIPTIONS[secondary]}`;
  }
}
