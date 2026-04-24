import { Injectable } from "@nestjs/common";

const BODY_POSITIVE_FILTERS: Record<string, string> = {
  遮住粗腿: "A字裙的版型很衬你的比例",
  遮住肚子: "高腰设计的剪裁让整体线条更流畅",
  显瘦: "利落的剪裁让整体线条更流畅",
  遮肉: "宽松版型让穿着更舒适自在",
  胖: "丰满",
  粗: "有力量感",
};

@Injectable()
export class BodyPositiveFilter {
  filter(text: string): string {
    let result = text;
    for (const [negative, positive] of Object.entries(BODY_POSITIVE_FILTERS)) {
      result = result.replace(new RegExp(negative, "g"), positive);
    }
    return result;
  }
}
