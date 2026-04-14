import {
  getOptimizedImageUrl,
  getPlaceholder,
  getSrcSet,
} from "../imageOptimizer";

describe("getOptimizedImageUrl", () => {
  it("should return empty string for empty URL", () => {
    expect(getOptimizedImageUrl("")).toBe("");
  });

  it("should add w/h params for picsum.photos URLs", () => {
    const url = "https://picsum.photos/800/600";
    const result = getOptimizedImageUrl(url, { width: 400, height: 300 });

    expect(result).toContain("w=400");
    expect(result).toContain("h=300");
    expect(result).toContain("picsum.photos");
  });

  it("should add w/h params for fastly.picsum.photos URLs", () => {
    const url = "https://fastly.picsum.photos/800/600";
    const result = getOptimizedImageUrl(url, { width: 200, height: 150 });

    expect(result).toContain("w=200");
    expect(result).toContain("h=150");
  });

  it("should add width/height/quality/format params for regular URLs", () => {
    const url = "https://example.com/image.jpg";
    const result = getOptimizedImageUrl(url, {
      width: 800,
      height: 600,
      quality: 60,
      format: "webp",
    });

    expect(result).toContain("width=800");
    expect(result).toContain("height=600");
    expect(result).toContain("quality=60");
    expect(result).toContain("format=webp");
  });

  it("should not add quality param when quality is default (80)", () => {
    const url = "https://example.com/image.jpg";
    const result = getOptimizedImageUrl(url, { width: 800 });

    expect(result).toContain("width=800");
    expect(result).not.toContain("quality=");
  });

  it("should return original URL for invalid URLs", () => {
    const invalidUrl = "not-a-valid-url";
    const result = getOptimizedImageUrl(invalidUrl, { width: 800 });

    expect(result).toBe(invalidUrl);
  });

  it("should only add provided options", () => {
    const url = "https://example.com/image.jpg";
    const result = getOptimizedImageUrl(url, { width: 400 });

    expect(result).toContain("width=400");
    expect(result).not.toContain("height=");
    expect(result).not.toContain("quality=");
    expect(result).not.toContain("format=");
  });

  it("should preserve existing query params", () => {
    const url = "https://example.com/image.jpg?existing=param";
    const result = getOptimizedImageUrl(url, { width: 400 });

    expect(result).toContain("existing=param");
    expect(result).toContain("width=400");
  });
});

describe("getPlaceholder", () => {
  it("should return empty string for empty URL", () => {
    expect(getPlaceholder("")).toBe("");
  });

  it("should add w=10, h=10, blur=5 for picsum.photos URLs", () => {
    const url = "https://picsum.photos/800/600";
    const result = getPlaceholder(url);

    expect(result).toContain("w=10");
    expect(result).toContain("h=10");
    expect(result).toContain("blur=5");
  });

  it("should add w=10, h=10, blur=5 for fastly.picsum.photos URLs", () => {
    const url = "https://fastly.picsum.photos/800/600";
    const result = getPlaceholder(url);

    expect(result).toContain("w=10");
    expect(result).toContain("h=10");
    expect(result).toContain("blur=5");
  });

  it("should add width=10, quality=20 for regular URLs", () => {
    const url = "https://example.com/image.jpg";
    const result = getPlaceholder(url);

    expect(result).toContain("width=10");
    expect(result).toContain("quality=20");
  });

  it("should return original URL for invalid URLs", () => {
    const invalidUrl = "not-a-valid-url";
    const result = getPlaceholder(invalidUrl);

    expect(result).toBe(invalidUrl);
  });
});

describe("getSrcSet", () => {
  it("should return empty array for empty URL", () => {
    expect(getSrcSet("", [320, 640, 1024])).toEqual([]);
  });

  it("should return empty array for empty widths", () => {
    expect(getSrcSet("https://example.com/image.jpg", [])).toEqual([]);
  });

  it("should generate entries for each width", () => {
    const url = "https://example.com/image.jpg";
    const result = getSrcSet(url, [320, 640, 1024]);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      url: expect.stringContaining("width=320"),
      width: 320,
    });
    expect(result[1]).toEqual({
      url: expect.stringContaining("width=640"),
      width: 640,
    });
    expect(result[2]).toEqual({
      url: expect.stringContaining("width=1024"),
      width: 1024,
    });
  });

  it("should use picsum.photos format for picsum URLs", () => {
    const url = "https://picsum.photos/800/600";
    const result = getSrcSet(url, [320]);

    expect(result).toHaveLength(1);
    expect(result[0].url).toContain("w=320");
    expect(result[0].width).toBe(320);
  });
});
