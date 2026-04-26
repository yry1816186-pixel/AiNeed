/**
 * Last-write-wins 冲突解决策略
 *
 * 比较 synced_at/updated_at 时间戳，返回较新的记录。
 * 对于 wardrobe_items，合并 local is_dirty 标记。
 */

interface ConflictRecord {
  syncedAt?: number;
  updatedAt?: number;
  isDirty?: boolean;
  [key: string]: unknown;
}

/**
 * 解决本地/远程记录冲突
 * @param tableName - WatermelonDB 表名
 * @param localRecord - 本地记录
 * @param remoteRecord - 远程记录
 * @returns 冲突解决后的记录
 */
export function resolveConflict(
  tableName: string,
  localRecord: ConflictRecord,
  remoteRecord: ConflictRecord
): ConflictRecord {
  const localTime = localRecord.syncedAt ?? localRecord.updatedAt ?? 0;
  const remoteTime = remoteRecord.syncedAt ?? remoteRecord.updatedAt ?? 0;

  // Last-write-wins: pick the newer record
  const winner = localTime >= remoteTime ? localRecord : remoteRecord;

  // For wardrobe_items, preserve local is_dirty flag
  if (tableName === "wardrobe_items" && localRecord.isDirty) {
    return { ...winner, isDirty: true };
  }

  return winner;
}
