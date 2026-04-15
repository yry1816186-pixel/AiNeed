import AsyncStorage from "@react-native-async-storage/async-storage";
import { offlineStorage, OFFLINE_QUEUE_KEY, OFFLINE_DATA_PREFIX } from "../secureStorage";

// Mock dependencies - must be before any imports that use them
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

jest.mock("react-native-encrypted-storage", () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("offlineStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("queueRequest", () => {
    it("should add a request to the queue", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("[]");
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const id = await offlineStorage.queueRequest({
        method: "POST",
        url: "/api/v1/test",
        data: { name: "test" },
      });

      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(OFFLINE_QUEUE_KEY, expect.any(String));

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].method).toBe("POST");
      expect(savedData[0].url).toBe("/api/v1/test");
      expect(savedData[0].data).toEqual({ name: "test" });
      expect(savedData[0].retries).toBe(0);
      expect(savedData[0].timestamp).toBeGreaterThan(0);
    });

    it("should append to existing queue", async () => {
      const existingQueue = [
        {
          id: "existing_1",
          method: "PUT" as const,
          url: "/api/v1/existing",
          timestamp: 1000,
          retries: 1,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingQueue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await offlineStorage.queueRequest({
        method: "POST",
        url: "/api/v1/new",
      });

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
    });
  });

  describe("getQueue", () => {
    it("should return parsed queue from storage", async () => {
      const queue = [
        {
          id: "req_1",
          method: "POST",
          url: "/api/v1/test",
          timestamp: 1000,
          retries: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));

      const result = await offlineStorage.getQueue();
      expect(result).toEqual(queue);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(OFFLINE_QUEUE_KEY);
    });

    it("should return empty array when storage is empty", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await offlineStorage.getQueue();
      expect(result).toEqual([]);
    });

    it("should return empty array on parse error", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("invalid json");

      const result = await offlineStorage.getQueue();
      expect(result).toEqual([]);
    });
  });

  describe("removeRequest", () => {
    it("should remove a request by id", async () => {
      const queue = [
        { id: "req_1", method: "POST", url: "/a", timestamp: 1, retries: 0 },
        { id: "req_2", method: "PUT", url: "/b", timestamp: 2, retries: 0 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await offlineStorage.removeRequest("req_1");

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe("req_2");
    });
  });

  describe("incrementRetries", () => {
    it("should increment retries for a request and return new count", async () => {
      const queue = [{ id: "req_1", method: "POST", url: "/a", timestamp: 1, retries: 2 }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const newRetries = await offlineStorage.incrementRetries("req_1");

      expect(newRetries).toBe(3);
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData[0].retries).toBe(3);
    });

    it("should return 0 if request not found", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("[]");

      const newRetries = await offlineStorage.incrementRetries("nonexistent");

      expect(newRetries).toBe(0);
    });
  });

  describe("clearQueue", () => {
    it("should remove the queue key from storage", async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await offlineStorage.clearQueue();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(OFFLINE_QUEUE_KEY);
    });
  });

  describe("cacheData", () => {
    it("should store data with timestamp and TTL", async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await offlineStorage.cacheData("user_profile", { name: "John" }, 3600000);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `${OFFLINE_DATA_PREFIX}user_profile`,
        expect.any(String)
      );

      const savedEntry = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedEntry.data).toEqual({ name: "John" });
      expect(savedEntry.ttl).toBe(3600000);
      expect(savedEntry.timestamp).toBeGreaterThan(0);
    });

    it("should use default TTL of 24 hours", async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await offlineStorage.cacheData("key", "value");

      const savedEntry = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedEntry.ttl).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe("getCachedData", () => {
    it("should return cached data when valid", async () => {
      const cacheEntry = {
        data: { name: "John" },
        timestamp: Date.now() - 1000, // 1 second ago
        ttl: 3600000, // 1 hour
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await offlineStorage.getCachedData("user_profile");
      expect(result).toEqual({ name: "John" });
    });

    it("should return null when cache is expired", async () => {
      const cacheEntry = {
        data: { name: "Old" },
        timestamp: Date.now() - 7200000, // 2 hours ago
        ttl: 3600000, // 1 hour TTL
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await offlineStorage.getCachedData("user_profile");
      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(`${OFFLINE_DATA_PREFIX}user_profile`);
    });

    it("should return null when key does not exist", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await offlineStorage.getCachedData("nonexistent");
      expect(result).toBeNull();
    });

    it("should return null on parse error", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("invalid json");

      const result = await offlineStorage.getCachedData("broken");
      expect(result).toBeNull();
    });
  });

  describe("clearCachedData", () => {
    it("should remove cached data by key", async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await offlineStorage.clearCachedData("user_profile");

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(`${OFFLINE_DATA_PREFIX}user_profile`);
    });
  });
});
