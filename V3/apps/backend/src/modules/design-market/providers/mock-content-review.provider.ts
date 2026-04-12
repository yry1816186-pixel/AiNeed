import { Injectable, Logger } from '@nestjs/common';
import type {
  IContentReviewProvider,
  ReviewInput,
  ReviewResult,
} from './content-review.interface';

const SENSITIVE_KEYWORDS = [
  '暴力',
  '色情',
  '政治',
  '赌博',
  '毒品',
  'violence',
  'porn',
  'gambling',
  'drug',
  '纳粹',
  'nazi',
  '歧视',
  'hate',
];

const BRAND_KEYWORDS = [
  'nike',
  'adidas',
  'supreme',
  'gucci',
  'louis vuitton',
  'chanel',
  'prada',
  'dior',
  'balenciaga',
  '耐克',
  '阿迪达斯',
  '古驰',
  '香奈儿',
  '普拉达',
];

@Injectable()
export class MockContentReviewProvider implements IContentReviewProvider {
  private readonly logger = new Logger(MockContentReviewProvider.name);

  async review(input: ReviewInput): Promise<ReviewResult> {
    this.logger.log(`Reviewing design ${input.designId}: "${input.name}"`);

    const textToAnalyze = [
      input.name,
      ...input.tags,
      ...Object.values(input.designData).map(String),
    ]
      .join(' ')
      .toLowerCase();

    const reasons: string[] = [];
    const categories: string[] = [];

    for (const keyword of SENSITIVE_KEYWORDS) {
      if (textToAnalyze.includes(keyword.toLowerCase())) {
        reasons.push(`检测到敏感关键词: ${keyword}`);
        categories.push('sensitive_content');
      }
    }

    for (const keyword of BRAND_KEYWORDS) {
      if (textToAnalyze.includes(keyword.toLowerCase())) {
        reasons.push(`检测到品牌关键词，可能存在侵权: ${keyword}`);
        categories.push('copyright');
      }
    }

    if (categories.includes('sensitive_content')) {
      this.logger.warn(`Design ${input.designId} rejected: sensitive content`);
      return {
        verdict: 'rejected',
        confidence: 0.92,
        reasons,
        categories,
      };
    }

    if (categories.includes('copyright')) {
      this.logger.warn(
        `Design ${input.designId} suspicious: potential copyright`,
      );
      return {
        verdict: 'suspicious',
        confidence: 0.78,
        reasons,
        categories,
      };
    }

    this.logger.log(`Design ${input.designId} approved`);
    return {
      verdict: 'approved',
      confidence: 0.95,
      reasons: [],
      categories: [],
    };
  }
}
