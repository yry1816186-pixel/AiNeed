const BODY_POSITIVE_REPLACEMENTS: [RegExp, string][] = [
  [/较丰满/g, "曲线丰富"],
  [/丰满/g, "曲线丰富"],
  [/较粗/g, "圆润"],
  [/偏胖/g, "有分量感"],
  [/瘦弱/g, "纤细"],
  [/矮小/g, "精致"],
  [/腿粗/g, "腿部圆润"],
  [/胳膊粗/g, "手臂圆润"],
  [/腰粗/g, "腰部圆润"],
  [/背厚/g, "背部有型"],
];

const TRYON_FAILURE_BODY_PATTERNS: [RegExp, string][] = [
  [/你的体型不适合/g, "这件衣服的版型不太适合"],
  [/你的身材穿不上/g, "这件衣服的尺码不太合适"],
  [/身材不够/g, "这件衣服的剪裁不太匹配"],
  [/体型不合适/g, "这件衣服的版型不太适合"],
  [/身材不合适/g, "这件衣服的版型不太匹配"],
];

export function filterBodyDescription(text: string): string {
  let result = text;

  for (const [pattern, replacement] of BODY_POSITIVE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of TRYON_FAILURE_BODY_PATTERNS) {
    result = result.replace(pattern, replacement);
  }

  return result;
}
