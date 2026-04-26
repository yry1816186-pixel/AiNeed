/**
 * AdminListTable — Admin 后台通用数据表格
 *
 * 封装 Card > Table 的标准布局，包含分页、loading 状态、空状态
 * 所有 Admin 列表页共享此组件
 *
 * @example
 * <AdminListTable<User>
 *   rowKey="id"
 *   columns={columns}
 *   data={data}
 *   loading={loading}
 *   pagination={pagination}
 *   onChange={handleTableChange}
 * />
 */
import React from "react";
import { Table, Card } from "antd";
import type { TablePaginationConfig } from "antd/es/table";
import type { ColumnsType } from "antd";

export interface AdminTablePagination {
  current: number;
  pageSize: number;
  total: number;
}

export interface AdminListTableProps<T extends object> {
  /** 表格行 key 字段 */
  rowKey: keyof T | string;
  /** 列定义 */
  columns: ColumnsType<T>;
  /** 数据源 */
  data: T[];
  /** 加载状态 */
  loading?: boolean;
  /** 分页配置 */
  pagination: AdminTablePagination;
  /** 分页变化回调 */
  onChange: (pag: TablePaginationConfig) => void;
  /** 卡片额外样式 */
  cardStyle?: React.CSSProperties;
}

export function AdminListTable<T extends object>({
  rowKey,
  columns,
  data,
  loading = false,
  pagination,
  onChange,
  cardStyle,
}: AdminListTableProps<T>) {
  return (
    <Card>
      <Table<T>
        rowKey={rowKey as string}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={onChange}
        scroll={{ x: "max-content" }}
      />
    </Card>
  );
}
