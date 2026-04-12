export interface ReviewInput {
  designId: string;
  name: string;
  designData: Record<string, unknown>;
  patternImageUrl: string | null;
  tags: string[];
}

export type ReviewVerdict = 'approved' | 'suspicious' | 'rejected';

export interface ReviewResult {
  verdict: ReviewVerdict;
  confidence: number;
  reasons: string[];
  categories: string[];
}

export interface IContentReviewProvider {
  review(input: ReviewInput): Promise<ReviewResult>;
}

export const CONTENT_REVIEW_PROVIDER = Symbol('CONTENT_REVIEW_PROVIDER');
