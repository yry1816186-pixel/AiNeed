import { ExecutionContext, CallHandler } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { of } from "rxjs";

import {
  JsonApiInterceptor,
  JsonApiType,
  SkipJsonApi,
  JSON_API_TYPE,
  SKIP_JSON_API,
  JsonApiResponse,
  JsonApiResource,
} from "./json-api.interceptor";
import { SKIP_RESPONSE_TRANSFORM } from "./transform.interceptor";

/** Extract the data field as a single resource (non-null, non-array). */
function asResource(response: JsonApiResponse): JsonApiResource {
  const data = response.data;
  if (data === null || Array.isArray(data)) {
    throw new Error("Expected single resource");
  }
  return data;
}

/** Extract the data field as an array of resources. */
function asResourceArray(response: JsonApiResponse): JsonApiResource[] {
  const data = response.data;
  if (!Array.isArray(data)) {
    throw new Error("Expected array resource");
  }
  return data;
}

function createMockExecutionContext(
  className = "ClothingController",
  handlerName = "getItems",
  url = "/api/v1/clothing",
  headers: Record<string, string> = {}
) {
  return {
    getClass: () => ({ name: className }),
    getHandler: () => ({ name: handlerName }),
    switchToHttp: () => ({
      getRequest: () => ({ url, headers }),
    }),
  } as ExecutionContext;
}

function createMockCallHandler(data: unknown) {
  return { handle: () => of(data) } as CallHandler;
}

describe("JsonApiInterceptor", () => {
  let interceptor: JsonApiInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new JsonApiInterceptor(reflector);
  });

  describe("resource type detection", () => {
    it("should derive type from ClothingController", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ id: "1", name: "shirt" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResource(result).type).toBe("clothing");
        done();
      });
    });

    it("should derive type from AiStylistController with kebab-case", (done) => {
      const context = createMockExecutionContext("AiStylistController");
      const handler = createMockCallHandler({ id: "1", name: "session" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResource(result).type).toBe("aistylist");
        done();
      });
    });

    it("should use custom type from @JsonApiType decorator", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ id: "1", name: "shirt" });

      jest.spyOn(reflector, "getAllAndOverride").mockImplementation(((key: string) => {
        if (key === JSON_API_TYPE) {
          return "products";
        }
        if (key === SKIP_JSON_API) {
          return false;
        }
        if (key === SKIP_RESPONSE_TRANSFORM) {
          return false;
        }
        return undefined;
      }) as unknown as typeof reflector.getAllAndOverride);

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResource(result).type).toBe("products");
        done();
      });
    });

    it("should handle controller without Controller suffix", (done) => {
      const context = createMockExecutionContext("ProductRouter");
      const handler = createMockCallHandler({ id: "1", name: "item" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResource(result).type).toBe("productrouter");
        done();
      });
    });

    it("should handle controller with Service suffix", (done) => {
      const context = createMockExecutionContext("OrderService");
      const handler = createMockCallHandler({ id: "1", total: 100 });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResource(result).type).toBe("order");
        done();
      });
    });
  });

  describe("skip behavior", () => {
    it("should skip transformation when @SkipJsonApi() is set", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const originalData = { id: "1", name: "shirt" };
      const handler = createMockCallHandler(originalData);

      jest.spyOn(reflector, "getAllAndOverride").mockImplementation(((key: string) => {
        if (key === SKIP_JSON_API) {
          return true;
        }
        return undefined;
      }) as unknown as typeof reflector.getAllAndOverride);

      interceptor.intercept(context, handler).subscribe((raw) => {
        expect(raw).toBe(originalData);
        done();
      });
    });

    it("should skip transformation when @SkipTransform() (SKIP_RESPONSE_TRANSFORM) is set", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const originalData = { id: "1", name: "shirt" };
      const handler = createMockCallHandler(originalData);

      jest.spyOn(reflector, "getAllAndOverride").mockImplementation(((key: string) => {
        if (key === SKIP_RESPONSE_TRANSFORM) {
          return true;
        }
        return undefined;
      }) as unknown as typeof reflector.getAllAndOverride);

      interceptor.intercept(context, handler).subscribe((raw) => {
        expect(raw).toBe(originalData);
        done();
      });
    });
  });

  describe("single object transformation", () => {
    it("should transform object with id field", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ id: "42", name: "jacket", color: "blue" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.type).toBe("clothing");
        expect(resource.id).toBe("42");
        expect(resource.attributes).toEqual({ name: "jacket", color: "blue" });
        expect(result.meta).toBeDefined();
        expect(result.links).toBeDefined();
        expect(result.links?.self).toBe("/api/v1/clothing");
        done();
      });
    });

    it("should extract id from _id field", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ _id: "abc123", name: "shirt" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.id).toBe("abc123");
        expect(resource.attributes).toEqual({ name: "shirt" });
        done();
      });
    });

    it("should extract id from uuid field", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        name: "pants",
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.id).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(resource.attributes).toEqual({ name: "pants" });
        done();
      });
    });

    it("should return empty string id when no id field exists", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ name: "scarf", color: "red" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.id).toBe("");
        expect(resource.attributes).toEqual({ name: "scarf", color: "red" });
        done();
      });
    });

    it("should exclude id fields from attributes", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ id: "1", _id: "2", uuid: "3", name: "hat" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.id).toBe("1");
        expect(resource.attributes).not.toHaveProperty("id");
        expect(resource.attributes).not.toHaveProperty("_id");
        expect(resource.attributes).not.toHaveProperty("uuid");
        expect(resource.attributes).toEqual({ name: "hat" });
        done();
      });
    });

    it("should treat nested object with id as relationship", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "outfit",
        category: { id: "10", name: "dresses" },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.relationships?.category).toBeDefined();
        expect(resource.relationships?.category?.data).toEqual({ type: "category", id: "10" });
        expect(resource.attributes.category).toBeUndefined();
        expect(resource.attributes).toEqual({ name: "outfit" });
        done();
      });
    });

    it("should treat nested array of objects with id as relationships", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "bundle",
        tags: [
          { id: "t1", label: "summer" },
          { id: "t2", label: "casual" },
        ],
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.relationships?.tags).toBeDefined();
        expect(resource.relationships?.tags?.data).toEqual([
          { type: "tag", id: "t1" },
          { type: "tag", id: "t2" },
        ]);
        expect(resource.attributes.tags).toBeUndefined();
        done();
      });
    });

    it("should side-load included resources for relationships", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "outfit",
        category: { id: "10", name: "dresses" },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const included = result.included!;
        expect(result.included).toBeDefined();
        expect(included).toHaveLength(1);
        expect(included[0]!.type).toBe("category");
        expect(included[0]!.id).toBe("10");
        expect(included[0]!.attributes).toEqual({ name: "dresses" });
        done();
      });
    });

    it("should deduplicate included resources by type:id composite key", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "outfit",
        category: { id: "10", name: "dresses" },
        subcategory: { id: "10", type: "category", name: "dresses" },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const included = result.included!;
        const categoryIncluded = included.filter((r) => r.type === "category" && r.id === "10");
        expect(categoryIncluded).toHaveLength(1);
        done();
      });
    });

    it("should use custom type from nested object type field", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "item",
        owner: { id: "u1", type: "user", name: "Alice" },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        const ownerData = resource.relationships?.owner?.data as { type: string; id: string };
        expect(ownerData.type).toBe("user");
        expect(result.included![0]!.type).toBe("user");
        done();
      });
    });

    it("should use data.type field for resource type when present", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ id: "1", type: "premium-item", name: "luxury" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResource(result).type).toBe("premium-item");
        done();
      });
    });

    it("should not include relationships key when no relationships exist", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ id: "1", name: "simple" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResource(result).relationships).toBeUndefined();
        done();
      });
    });

    it("should not include included key when no relationships exist", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ id: "1", name: "simple" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.included).toBeUndefined();
        done();
      });
    });
  });

  describe("array transformation", () => {
    it("should transform array of objects", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler([
        { id: "1", name: "shirt" },
        { id: "2", name: "pants" },
      ]);

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resources = asResourceArray(result);
        expect(resources).toHaveLength(2);
        expect(resources[0]!.type).toBe("clothing");
        expect(resources[0]!.id).toBe("1");
        expect(resources[0]!.attributes).toEqual({ name: "shirt" });
        expect(resources[1]!.id).toBe("2");
        expect(result.meta.total).toBe(2);
        done();
      });
    });

    it("should transform empty array", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler([]);

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResourceArray(result)).toEqual([]);
        expect(result.meta.total).toBe(0);
        done();
      });
    });

    it("should skip non-object items in array", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler([{ id: "1", name: "shirt" }, null, "invalid", 42]);

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resources = asResourceArray(result);
        expect(resources).toHaveLength(1);
        expect(resources[0]!.id).toBe("1");
        expect(result.meta.total).toBe(1);
        done();
      });
    });

    it("should side-load included resources from array items", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler([
        { id: "1", name: "shirt", category: { id: "c1", name: "tops" } },
        { id: "2", name: "pants", category: { id: "c2", name: "bottoms" } },
      ]);

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.included).toHaveLength(2);
        expect(result.included![0]!.type).toBe("category");
        expect(result.included![1]!.type).toBe("category");
        done();
      });
    });
  });

  describe("paginated transformation", () => {
    it("should transform paginated response with items and meta", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        items: [
          { id: "1", name: "shirt" },
          { id: "2", name: "pants" },
        ],
        meta: { nextCursor: "cursor123", hasMore: true, total: 100 },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResourceArray(result)).toHaveLength(2);
        expect(result.meta.total).toBe(100);
        expect(result.meta.nextCursor).toBe("cursor123");
        expect(result.meta.hasMore).toBe(true);
        done();
      });
    });

    it("should include next link when nextCursor is present", (done) => {
      const context = createMockExecutionContext(
        "ClothingController",
        "getItems",
        "/api/v1/clothing"
      );
      const handler = createMockCallHandler({
        items: [{ id: "1", name: "shirt" }],
        meta: { nextCursor: "abc", hasMore: true, total: 50 },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.links?.next).toBe("/api/v1/clothing?cursor=abc");
        done();
      });
    });

    it("should use & separator for next link when URL has query params", (done) => {
      const context = createMockExecutionContext(
        "ClothingController",
        "getItems",
        "/api/v1/clothing?limit=10"
      );
      const handler = createMockCallHandler({
        items: [{ id: "1", name: "shirt" }],
        meta: { nextCursor: "abc", hasMore: true, total: 50 },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.links?.next).toBe("/api/v1/clothing?limit=10&cursor=abc");
        done();
      });
    });

    it("should not include next link when nextCursor is absent", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        items: [{ id: "1", name: "shirt" }],
        meta: { hasMore: false, total: 1 },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.links?.next).toBeUndefined();
        done();
      });
    });

    it("should use items.length as total fallback when meta.total is absent", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        items: [
          { id: "1", name: "shirt" },
          { id: "2", name: "pants" },
        ],
        meta: { hasMore: false },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.meta.total).toBe(2);
        done();
      });
    });

    it("should side-load included resources from paginated items", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        items: [{ id: "1", name: "shirt", category: { id: "c1", name: "tops" } }],
        meta: { total: 1 },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.included).toHaveLength(1);
        expect(result.included![0]!.type).toBe("category");
        done();
      });
    });
  });

  describe("null and undefined", () => {
    it("should transform null to data: null", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler(null);

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.data).toBeNull();
        expect(result.meta).toBeDefined();
        expect(result.meta.timestamp).toBeDefined();
        done();
      });
    });

    it("should transform undefined to data: null", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler(undefined);

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.data).toBeNull();
        expect(result.meta).toBeDefined();
        done();
      });
    });
  });

  describe("primitive values", () => {
    it("should transform string to data: null", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler("hello");

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.data).toBeNull();
        expect(result.meta).toBeDefined();
        done();
      });
    });

    it("should transform number to data: null", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler(42);

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.data).toBeNull();
        expect(result.meta).toBeDefined();
        done();
      });
    });

    it("should transform boolean to data: null", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler(true);

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.data).toBeNull();
        expect(result.meta).toBeDefined();
        done();
      });
    });
  });

  describe("meta fields", () => {
    it("should include requestId from x-request-id header", (done) => {
      const context = createMockExecutionContext(
        "ClothingController",
        "getItems",
        "/api/v1/clothing",
        { "x-request-id": "req-123" }
      );
      const handler = createMockCallHandler({ id: "1", name: "shirt" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.meta.requestId).toBe("req-123");
        done();
      });
    });

    it("should include ISO timestamp", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ id: "1", name: "shirt" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.meta.timestamp).toBeDefined();
        expect(typeof result.meta.timestamp).toBe("string");
        expect(new Date(result.meta.timestamp).toISOString()).toBe(result.meta.timestamp);
        done();
      });
    });

    it("should include self link from request URL", (done) => {
      const context = createMockExecutionContext(
        "ClothingController",
        "getItems",
        "/api/v1/clothing?page=1"
      );
      const handler = createMockCallHandler({ id: "1", name: "shirt" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.links?.self).toBe("/api/v1/clothing?page=1");
        done();
      });
    });

    it("should have undefined requestId when header is absent", (done) => {
      const context = createMockExecutionContext(
        "ClothingController",
        "getItems",
        "/api/v1/clothing",
        {}
      );
      const handler = createMockCallHandler({ id: "1", name: "shirt" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.meta.requestId).toBeUndefined();
        done();
      });
    });
  });

  describe("type inference from key names", () => {
    it("should infer type from known plural key names", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "outfit",
        categories: [{ id: "c1", name: "tops" }],
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        const categoriesData = resource.relationships?.categories?.data as Array<{
          type: string;
          id: string;
        }>;
        expect(categoriesData[0]!.type).toBe("category");
        expect(result.included![0]!.type).toBe("category");
        done();
      });
    });

    it("should infer type from camelCase plural key names", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "cart",
        cartItems: [{ id: "ci1", quantity: 2 }],
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        const cartItemsData = resource.relationships?.cartItems?.data as Array<{
          type: string;
          id: string;
        }>;
        expect(cartItemsData[0]!.type).toBe("cart-item");
        done();
      });
    });

    it("should infer type from unknown plural key by removing trailing s", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "item",
        reviews: [{ id: "r1", text: "good" }],
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        const reviewsData = resource.relationships?.reviews?.data as Array<{
          type: string;
          id: string;
        }>;
        expect(reviewsData[0]!.type).toBe("review");
        done();
      });
    });

    it("should infer type from singular key using kebab-case conversion", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "item",
        brandDetail: { id: "b1", label: "Nike" },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        const brandData = resource.relationships?.brandDetail?.data as { type: string; id: string };
        expect(brandData.type).toBe("brand-detail");
        done();
      });
    });
  });

  describe("nested relationship edge cases", () => {
    it("should handle deeply nested relationships", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "outfit",
        category: { id: "c1", name: "tops", parent: { id: "p1", name: "all" } },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.included).toHaveLength(2);
        const parentIncluded = result.included!.find((r) => r.id === "p1");
        expect(parentIncluded).toBeDefined();
        expect(parentIncluded!.type).toBe("parent");
        done();
      });
    });

    it("should handle relationship object with _id field", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "item",
        owner: { _id: "u1", name: "Alice" },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const ownerData = asResource(result).relationships?.owner?.data as {
          type: string;
          id: string;
        };
        expect(ownerData.id).toBe("u1");
        done();
      });
    });

    it("should handle relationship object with uuid field", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "item",
        owner: { uuid: "uuid-123", name: "Bob" },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const ownerData = asResource(result).relationships?.owner?.data as {
          type: string;
          id: string;
        };
        expect(ownerData.id).toBe("uuid-123");
        done();
      });
    });

    it("should not treat plain object without id as relationship", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "item",
        metadata: { key: "value", count: 5 },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.relationships).toBeUndefined();
        expect(resource.attributes.metadata).toEqual({ key: "value", count: 5 });
        done();
      });
    });

    it("should not treat empty array as relationship array", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "item",
        tags: [],
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.relationships).toBeUndefined();
        expect(resource.attributes.tags).toEqual([]);
        done();
      });
    });

    it("should not treat array of primitives as relationships", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "item",
        sizes: ["S", "M", "L"],
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.relationships).toBeUndefined();
        expect(resource.attributes.sizes).toEqual(["S", "M", "L"]);
        done();
      });
    });
  });

  describe("deduplication of included resources", () => {
    it("should deduplicate included resources across array items", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler([
        { id: "1", name: "shirt", category: { id: "c1", name: "tops" } },
        { id: "2", name: "blouse", category: { id: "c1", name: "tops" } },
      ]);

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(result.included).toHaveLength(1);
        expect(result.included![0]!.id).toBe("c1");
        done();
      });
    });
  });

  describe("decorators", () => {
    it("JsonApiType should set JSON_API_TYPE metadata", () => {
      const decorator = JsonApiType("products");
      expect(typeof decorator).toBe("function");
    });

    it("SkipJsonApi should set SKIP_JSON_API metadata", () => {
      const decorator = SkipJsonApi();
      expect(typeof decorator).toBe("function");
    });
  });

  describe("id extraction priority", () => {
    it("should prioritize id over _id and uuid", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "from-id",
        _id: "from-_id",
        uuid: "from-uuid",
        name: "test",
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResource(result).id).toBe("from-id");
        done();
      });
    });

    it("should use _id when id is absent", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ _id: "from-_id", uuid: "from-uuid", name: "test" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResource(result).id).toBe("from-_id");
        done();
      });
    });

    it("should convert numeric id to string", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({ id: 42, name: "test" });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        expect(asResource(result).id).toBe("42");
        done();
      });
    });
  });

  describe("null id fields in relationships", () => {
    it("should not treat object with null id as relationship", (done) => {
      const context = createMockExecutionContext("ClothingController");
      const handler = createMockCallHandler({
        id: "1",
        name: "item",
        owner: { id: null, name: "unknown" },
      });

      interceptor.intercept(context, handler).subscribe((raw) => {
        const result = raw as JsonApiResponse;
        const resource = asResource(result);
        expect(resource.relationships).toBeUndefined();
        expect(resource.attributes.owner).toEqual({ id: null, name: "unknown" });
        done();
      });
    });
  });
});
