/**
 * AdminSearchBar — Admin 后台通用搜索栏
 *
 * 提供 keyword 输入 + status 选择 + 搜索/重置按钮
 * 所有 Admin 列表页共享此组件，消除重复代码
 *
 * @example
 * // 用户管理页
 * <AdminSearchBar
 *   keyword={keyword}
 *   onKeywordChange={setKeyword}
 *   status={status}
 *   onStatusChange={setStatus}
 *   statusOptions={[
 *     { value: 'active', label: '正常' },
 *     { value: 'banned', label: '封禁' },
 *     { value: 'deactivated', label: '停用' },
 *   ]}
 *   onSearch={handleSearch}
 *   onReset={handleReset}
 * />
 */
import React from "react";
import { Input, Select, Button, Space } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";

const { Option } = Select;

export interface StatusOption {
  value: string;
  label: string;
}

export interface AdminSearchBarProps {
  /** 当前 keyword */
  keyword: string;
  /** keyword 变化回调 */
  onKeywordChange: (val: string) => void;
  /** 当前 status filter */
  status?: string;
  /** status 变化回调 */
  onStatusChange?: (val: string | undefined) => void;
  /** status 下拉选项，默认包含'全部'选项 */
  statusOptions?: StatusOption[];
  /** 搜索按钮回调 */
  onSearch: () => void;
  /** 重置按钮回调 */
  onReset: () => void;
  /** placeholder，默认中文 */
  placeholder?: string;
  /** keyword 输入框宽度，默认 240 */
  keywordWidth?: number;
}

/**
 * 默认 status 选项（适用于用户管理）
 */
export const DEFAULT_USER_STATUS_OPTIONS: StatusOption[] = [
  { value: "active", label: "正常" },
  { value: "banned", label: "封禁" },
  { value: "deactivated", label: "停用" },
];

export const AdminSearchBar: React.FC<AdminSearchBarProps> = ({
  keyword,
  onKeywordChange,
  status,
  onStatusChange,
  statusOptions,
  onSearch,
  onReset,
  placeholder = "搜索关键词...",
  keywordWidth = 240,
}) => {
  return (
    <Space style={{ marginBottom: 16 }} wrap>
      <Input
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: keywordWidth }}
        prefix={<SearchOutlined style={{ color: "#73736D" }} />}
        allowClear
        onPressEnter={onSearch}
      />

      {statusOptions && onStatusChange && (
        <Select
          value={status}
          onChange={onStatusChange}
          style={{ width: 120 }}
          allowClear
          placeholder="状态筛选"
        >
          <Option value={undefined}>全部</Option>
          {statusOptions.map((opt) => (
            <Option key={opt.value} value={opt.value}>
              {opt.label}
            </Option>
          ))}
        </Select>
      )}

      <Button type="primary" onClick={onSearch} icon={<SearchOutlined />}>
        搜索
      </Button>

      <Button onClick={onReset} icon={<ReloadOutlined />}>
        重置
      </Button>
    </Space>
  );
};
