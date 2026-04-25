import { get } from "./request";

export interface StyleMatch {
  userId: string;
  nickname: string;
  avatar: string | null;
  similarityScore: number;
}

export interface StyleMatchesResponse {
  matches: StyleMatch[];
}

/**
 * Get top-K style DNA matches for the current user.
 * Requires JWT authentication.
 */
export async function getStyleMatches(topK: number = 10): Promise<StyleMatchesResponse> {
  return await get<StyleMatchesResponse>("/social/style-dna/matches", {
    topK,
  });
}
