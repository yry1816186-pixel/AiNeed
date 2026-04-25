/**
 * QR Code Mini-Program Path Encoder
 *
 * Encodes share card parameters into a WeChat mini-program path string.
 * Path format: pages/share/index?r={shortId}&t={type}[&c={cardId}]
 * - shortId: first 8 characters of referrerId
 * - type: "o" (outfit), "t" (tryon), "r" (report)
 * - cardId: first 8 characters of cardId (optional)
 * Total path length is guaranteed under 128 characters.
 */

export interface ShareQRParams {
  referrerId: string;
  cardType: "outfit" | "tryon" | "report";
  cardId?: string;
}

const TYPE_MAP = { outfit: "o", tryon: "t", report: "r" } as const;

export function encodeMiniProgramPath(params: ShareQRParams): string {
  const shortId = params.referrerId.slice(0, 8);
  let path = `pages/share/index?r=${shortId}&t=${TYPE_MAP[params.cardType]}`;
  if (params.cardId) {
    path += `&c=${params.cardId.slice(0, 8)}`;
  }
  return path;
}
