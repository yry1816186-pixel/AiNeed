/**
 * WatermelonDB Database 单例初始化
 *
 * SQLiteAdapter + 4 Model Classes
 * dbName: xuno_offline
 */
import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";

import { schema } from "./schema";
import { modelClasses } from "./models";

const adapter = new SQLiteAdapter({
  schema,
  dbName: "xuno_offline",
  jsi: true,
  onSetUpError: (error: unknown) => {
    // Database failed to load - log for diagnostics
    // eslint-disable-next-line no-console
    console.error("[WatermelonDB] Setup failed:", error);
  },
});

export const database = new Database({
  adapter,
  modelClasses,
});
