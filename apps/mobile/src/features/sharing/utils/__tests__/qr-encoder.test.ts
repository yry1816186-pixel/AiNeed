import { encodeMiniProgramPath } from "../qr-encoder";

describe("encodeMiniProgramPath", () => {
  it('encodes outfit card type with shortId and type "o"', () => {
    const result = encodeMiniProgramPath({
      referrerId: "user-1234567890abcdef",
      cardType: "outfit",
    });
    expect(result).toBe("pages/share/index?r=user-123&t=o");
  });

  it('encodes tryon card type with "t=t"', () => {
    const result = encodeMiniProgramPath({
      referrerId: "user-1234567890abcdef",
      cardType: "tryon",
    });
    expect(result).toContain("t=t");
  });

  it('encodes report card type with "t=r"', () => {
    const result = encodeMiniProgramPath({
      referrerId: "user-1234567890abcdef",
      cardType: "report",
    });
    expect(result).toContain("t=r");
  });

  it("includes cardId when provided (first 8 chars)", () => {
    const result = encodeMiniProgramPath({
      referrerId: "user-1234567890abcdef",
      cardType: "outfit",
      cardId: "card-abcdefghij",
    });
    expect(result).toContain("&c=card-ab");
  });

  it("result length is always under 128 characters", () => {
    const result = encodeMiniProgramPath({
      referrerId: "a-very-long-referrer-id-that-exceeds-normal-length",
      cardType: "outfit",
      cardId: "a-very-long-card-id-that-should-be-truncated",
    });
    expect(result.length).toBeLessThan(128);
  });

  it("omits cardId param when not provided", () => {
    const result = encodeMiniProgramPath({
      referrerId: "user-1234567890abcdef",
      cardType: "report",
    });
    expect(result).not.toContain("&c=");
  });
});
