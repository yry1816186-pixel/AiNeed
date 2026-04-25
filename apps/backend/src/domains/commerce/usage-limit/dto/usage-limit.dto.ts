export enum UsageActionType {
  AI_CHAT = "ai_chat",
  TRY_ON = "try_on",
  WARDROBE_ITEM = "wardrobe_item",
}

export interface UsageLimitResult {
  count: number;
  ttl: number;
  limit: number;
  remaining: number;
}

export interface UsageLimitHeaders {
  limit: number;
  remaining: number;
  reset: number;
  unlimited: boolean;
}
