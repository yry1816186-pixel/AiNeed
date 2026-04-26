/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * WatermelonDB Schema + Models + Database Initialization Tests
 */

import { Database } from "@nozbe/watermelondb";

// Mock the SQLiteAdapter for test environment
jest.mock("@nozbe/watermelondb/adapters/sqlite", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(({ schema: mockSchema }: { schema: unknown }) => ({
      schema: mockSchema,
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
  };
});

import { schema } from "../schema";
import { CachedRecommendation } from "../models/CachedRecommendation";
import { WardrobeItem } from "../models/WardrobeItem";
import { CalendarPlan } from "../models/CalendarPlan";
import { UserProfile } from "../models/UserProfile";
import { modelClasses } from "../models";

describe("WatermelonDB Schema", () => {
  it("should export valid appSchema with version 1", () => {
    expect(schema).toBeDefined();
    expect(schema.version).toBe(1);
  });

  it("should define 4 tables", () => {
    expect(schema.tables).toBeDefined();
    const tableNames = Object.keys(schema.tables);
    expect(tableNames).toHaveLength(4);
    expect(tableNames).toContain("cached_recommendations");
    expect(tableNames).toContain("wardrobe_items");
    expect(tableNames).toContain("calendar_plans");
    expect(tableNames).toContain("user_profiles");
  });

  it("should define cached_recommendations with correct columns", () => {
    const table = schema.tables.cached_recommendations;
    expect(table).toBeDefined();
    // WatermelonDB stores columns as object (ColumnMap)
    const columnNames = Object.keys(table.columns);
    expect(columnNames).toContain("recommendation_id");
    expect(columnNames).toContain("items_json");
    expect(columnNames).toContain("outfit_json");
    expect(columnNames).toContain("explanation_json");
    expect(columnNames).toContain("scenario");
    expect(columnNames).toContain("cached_at");
    expect(columnNames).toContain("expires_at");

    // Check indexed columns
    expect(table.columns.recommendation_id.isIndexed).toBe(true);
    expect(table.columns.scenario.isIndexed).toBe(true);
  });

  it("should define wardrobe_items with correct columns", () => {
    const table = schema.tables.wardrobe_items;
    expect(table).toBeDefined();

    const columnNames = Object.keys(table.columns);
    expect(columnNames).toContain("server_id");
    expect(columnNames).toContain("section");
    expect(columnNames).toContain("item_json");
    expect(columnNames).toContain("synced_at");
    expect(columnNames).toContain("is_dirty");

    expect(table.columns.server_id.isIndexed).toBe(true);
    expect(table.columns.section.isIndexed).toBe(true);
    expect(table.columns.is_dirty.type).toBe("boolean");
  });

  it("should define calendar_plans with correct columns", () => {
    const table = schema.tables.calendar_plans;
    expect(table).toBeDefined();

    const columnNames = Object.keys(table.columns);
    expect(columnNames).toContain("date");
    expect(columnNames).toContain("outfit_json");
    expect(columnNames).toContain("weather_json");
    expect(columnNames).toContain("scenario");
    expect(columnNames).toContain("synced_at");

    expect(table.columns.date.isIndexed).toBe(true);
  });

  it("should define user_profiles with correct columns", () => {
    const table = schema.tables.user_profiles;
    expect(table).toBeDefined();

    const columnNames = Object.keys(table.columns);
    expect(columnNames).toContain("profile_json");
    expect(columnNames).toContain("preferences_json");
    expect(columnNames).toContain("updated_at");
  });
});

describe("Model Classes", () => {
  it("CachedRecommendation should have correct table association", () => {
    expect(CachedRecommendation.table).toBe("cached_recommendations");
  });

  it("CachedRecommendation extends Model", () => {
    const proto = Object.getPrototypeOf(CachedRecommendation.prototype);
    expect(proto.constructor.name).toBe("Model");
  });

  it("WardrobeItem should have correct table association", () => {
    expect(WardrobeItem.table).toBe("wardrobe_items");
  });

  it("CalendarPlan should have correct table association", () => {
    expect(CalendarPlan.table).toBe("calendar_plans");
  });

  it("UserProfile should have correct table association", () => {
    expect(UserProfile.table).toBe("user_profiles");
  });
});

describe("Model Classes Export", () => {
  it("should export all 4 model classes", () => {
    expect(modelClasses).toBeDefined();
    expect(modelClasses).toHaveLength(4);
    expect(modelClasses).toContain(CachedRecommendation);
    expect(modelClasses).toContain(WardrobeItem);
    expect(modelClasses).toContain(CalendarPlan);
    expect(modelClasses).toContain(UserProfile);
  });
});

describe("Database Initialization", () => {
  it("should initialize Database with all model classes without error", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLiteAdapter = require("@nozbe/watermelondb/adapters/sqlite").default;

    const adapter = new SQLiteAdapter({
      schema,
      dbName: "xuno_offline_test",
      jsi: false,
    });

    const database = new Database({
      adapter,
      modelClasses: [CachedRecommendation, WardrobeItem, CalendarPlan, UserProfile],
    });

    expect(database).toBeDefined();
    expect(() => database.get("cached_recommendations")).not.toThrow();
    expect(() => database.get("wardrobe_items")).not.toThrow();
    expect(() => database.get("calendar_plans")).not.toThrow();
    expect(() => database.get("user_profiles")).not.toThrow();
  });
});
