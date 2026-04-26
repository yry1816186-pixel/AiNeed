/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * SyncEngine + ConflictResolver Tests
 */

// Mock WatermelonDB adapter and database
jest.mock("@nozbe/watermelondb/adapters/sqlite", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(({ schema: s }: { schema: unknown }) => ({
    schema: s,
    dbName: "test",
    _unsafeBatchPerformOperations: jest.fn(),
    find: jest.fn(),
    query: jest.fn(),
    count: jest.fn(),
    batch: jest.fn(),
    getDeletedRecords: jest.fn(),
    destroyDeletedRecords: jest.fn(),
    unsafeExecute: jest.fn(),
    unsafeResetDatabase: jest.fn(),
  })),
}));

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the database module so syncEngine uses our controlled mock
const mockQueryFetchAll = jest.fn().mockResolvedValue([]);
const mockBatch = jest.fn().mockResolvedValue(undefined);
const mockWrite = jest.fn((fn: () => Promise<unknown>) => fn());

jest.mock("../index", () => ({
  database: {
    get: jest.fn(() => ({
      query: jest.fn(() => ({
        fetchAll: mockQueryFetchAll,
        observe: jest.fn(() => ({ subscribe: jest.fn() })),
      })),
      prepareCreate: jest.fn((fn: (r: unknown) => void) => {
        const record = {};
        fn(record);
        return record;
      }),
    })),
    write: mockWrite,
    batch: mockBatch,
  },
}));

import { SyncEngine } from "../sync/syncEngine";
import { resolveConflict } from "../sync/conflictResolver";

describe("SyncEngine", () => {
  let syncEngine: SyncEngine;

  beforeEach(() => {
    syncEngine = new SyncEngine();
    mockFetch.mockReset();
    mockQueryFetchAll.mockResolvedValue([]);
  });

  describe("pullLatestRecommendations", () => {
    it("should call GET /api/v1/recommendations?limit=50", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "rec-1",
                items: [{ id: "item-1" }],
                outfit: { top: "shirt", bottom: "pants" },
                explanation: "Great for interviews",
                scenario: "interview",
              },
            ],
          }),
      });

      await syncEngine.pullLatestRecommendations();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/recommendations");
      expect(url).toContain("limit=50");
    });

    it("should handle fetch errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      await expect(syncEngine.pullLatestRecommendations()).resolves.toBeUndefined();
    });
  });

  describe("pushLocalChanges", () => {
    it("should not call API when no dirty items exist", async () => {
      mockQueryFetchAll.mockResolvedValueOnce([]);

      await syncEngine.pushLocalChanges();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("pullCalendarPlans", () => {
    it("should call GET /api/v1/calendar?days=7", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await syncEngine.pullCalendarPlans();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/calendar");
      expect(url).toContain("days=7");
    });
  });

  describe("fullSync", () => {
    it("should execute all pull operations (push skipped when no dirty items)", async () => {
      const callOrder: string[] = [];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("recommendations")) callOrder.push("pull-recs");
        if (url.includes("calendar")) callOrder.push("pull-calendar");
        if (url.includes("user/profile")) callOrder.push("pull-profile");
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      });

      await syncEngine.fullSync();

      // All pull operations should be called
      expect(callOrder).toContain("pull-recs");
      expect(callOrder).toContain("pull-calendar");
      expect(callOrder).toContain("pull-profile");
    });

    it("should not abort on single step failure", async () => {
      const callOrder: string[] = [];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("recommendations")) {
          callOrder.push("pull-recs");
          return Promise.reject(new Error("pull failed"));
        }
        if (url.includes("calendar")) callOrder.push("pull-calendar");
        if (url.includes("user/profile")) callOrder.push("pull-profile");
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      });

      await syncEngine.fullSync();

      expect(callOrder).toContain("pull-calendar");
      expect(callOrder).toContain("pull-profile");
    });
  });
});

describe("ConflictResolver", () => {
  it("should pick the record with newer synced_at timestamp", () => {
    const local = { syncedAt: 1000, data: "local" };
    const remote = { syncedAt: 2000, data: "remote" };
    expect(resolveConflict("wardrobe_items", local, remote)).toEqual(remote);
  });

  it("should pick local when local is newer", () => {
    const local = { updatedAt: 3000, data: "local" };
    const remote = { updatedAt: 2000, data: "remote" };
    expect(resolveConflict("wardrobe_items", local, remote)).toEqual(local);
  });

  it("should merge is_dirty flag from local for wardrobe items", () => {
    const local = { syncedAt: 1000, isDirty: true, data: "local" };
    const remote = { syncedAt: 2000, isDirty: false, data: "remote" };
    const result = resolveConflict("wardrobe_items", local, remote) as Record<string, unknown>;
    expect(result.isDirty).toBe(true);
  });

  it("should not merge is_dirty for non-wardrobe tables", () => {
    const local = { syncedAt: 1000, isDirty: true, data: "local" };
    const remote = { syncedAt: 2000, isDirty: false, data: "remote" };
    const result = resolveConflict("calendar_plans", local, remote) as Record<string, unknown>;
    expect(result.isDirty).toBe(false);
  });
});
