import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of } from "rxjs";

import { ImageResponseInterceptor } from "./image-response.interceptor";

describe("ImageResponseInterceptor", () => {
  let interceptor: ImageResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ImageResponseInterceptor();
  });

  const createMockContext = (
    query: Record<string, string> = {},
    headers: Record<string, string> = {}
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ query, headers }),
      }),
    } as unknown as ExecutionContext;
  };

  const createMockHandler = (data: unknown): CallHandler => {
    return { handle: () => of(data) };
  };

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("should return specific size URL when size query param is provided", (done) => {
    const context = createMockContext({ size: "thumbnail" });
    const handler = createMockHandler({
      id: "photo-1",
      urls: {
        thumbnail: "http://minio/thumb.webp",
        small: "http://minio/small.webp",
        medium: "http://minio/medium.webp",
        large: "http://minio/large.webp",
        original: "http://minio/original.webp",
      },
    });

    interceptor.intercept(context, handler).subscribe((result) => {
      const r = result as Record<string, unknown>;
      expect(r.url).toBe("http://minio/thumb.webp");
      expect(r.requestedSize).toBe("thumbnail");
      done();
    });
  });

  it("should return all URLs when no size specified", (done) => {
    const context = createMockContext();
    const handler = createMockHandler({
      id: "photo-1",
      urls: {
        thumbnail: "http://minio/thumb.webp",
        small: "http://minio/small.webp",
        medium: "http://minio/medium.webp",
        large: "http://minio/large.webp",
        original: "http://minio/original.webp",
      },
    });

    interceptor.intercept(context, handler).subscribe((result) => {
      const r = result as Record<string, unknown>;
      expect(r.urls).toBeDefined();
      expect(r.recommendedSize).toBe("medium");
      done();
    });
  });

  it("should resolve size from Accept header", (done) => {
    const context = createMockContext({}, { accept: "image/thumbnail" });
    const handler = createMockHandler({
      id: "photo-1",
      urls: {
        thumbnail: "http://minio/thumb.webp",
        small: "http://minio/small.webp",
        medium: "http://minio/medium.webp",
        large: "http://minio/large.webp",
        original: "http://minio/original.webp",
      },
    });

    interceptor.intercept(context, handler).subscribe((result) => {
      const r = result as Record<string, unknown>;
      expect(r.url).toBe("http://minio/thumb.webp");
      expect(r.requestedSize).toBe("thumbnail");
      done();
    });
  });

  it("should recommend size based on viewport width", (done) => {
    const context = createMockContext({}, { "x-viewport-width": "400" });
    const handler = createMockHandler({
      id: "photo-1",
      urls: {
        thumbnail: "http://minio/thumb.webp",
        small: "http://minio/small.webp",
        medium: "http://minio/medium.webp",
        large: "http://minio/large.webp",
        original: "http://minio/original.webp",
      },
    });

    interceptor.intercept(context, handler).subscribe((result) => {
      const r = result as Record<string, unknown>;
      expect(r.recommendedSize).toBe("small");
      done();
    });
  });

  it("should pass through data without urls property", (done) => {
    const context = createMockContext();
    const handler = createMockHandler({ id: "photo-1", name: "test" });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({ id: "photo-1", name: "test" });
      done();
    });
  });

  it("should fall back to all URLs when requested size is not available", (done) => {
    const context = createMockContext({ size: "invalid" });
    const handler = createMockHandler({
      id: "photo-1",
      urls: {
        thumbnail: "http://minio/thumb.webp",
        medium: "http://minio/medium.webp",
      },
    });

    interceptor.intercept(context, handler).subscribe((result) => {
      const r = result as Record<string, unknown>;
      expect(r.urls).toBeDefined();
      done();
    });
  });
});
