import { useState, useCallback } from "react";
import { Tag, Avatar, Button, Popconfirm, message } from "antd";
import { UserOutlined } from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import dayjs from "dayjs";
import { userApi } from "@/services/user";
import type { User } from "@/services/user";
import { AdminSearchBar, DEFAULT_USER_STATUS_OPTIONS } from "@/components/AdminSearchBar";
import { AdminListTable } from "@/components/AdminListTable";
import { AdminDetailDrawer } from "@/components/AdminDetailDrawer";
import UserDetailDrawerContent from "./UserDetailDrawer";

const genderMap: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

export default function UserList() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchData = useCallback(
    async (page = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const res = await userApi.getList({
          page,
          pageSize,
          keyword: keyword || undefined,
          status,
        });
        setData(res.items);
        setPagination({ current: res.page, pageSize: res.pageSize, total: res.total });
      } catch {
        message.error("获取用户列表失败");
      } finally {
        setLoading(false);
      }
    },
    [keyword, status]
  );

  const handleSearch = () => fetchData(1, pagination.pageSize);
  const handleReset = () => {
    setKeyword("");
    setStatus(undefined);
    fetchData(1, 10);
  };
  const handleTableChange = (pag: TablePaginationConfig) => fetchData(pag.current, pag.pageSize);

  const handleBan = async (record: User) => {
    try {
      await userApi.ban(record.id);
      message.success("封禁成功");
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      message.error("操作失败");
    }
  };

  const handleUnban = async (record: User) => {
    try {
      await userApi.unban(record.id);
      message.success("解封成功");
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      message.error("操作失败");
    }
  };

  const openDetail = (record: User) => {
    setSelectedUserId(record.id);
    setDrawerVisible(true);
  };

  const columns: ColumnsType<User> = [
    { title: "ID", dataIndex: "id", width: 120, ellipsis: true },
    {
      title: "头像",
      dataIndex: "avatar",
      width: 64,
      render: (avatar: string | null) => <Avatar src={avatar} icon={<UserOutlined />} size={36} />,
    },
    { title: "昵称", dataIndex: "nickname", width: 120, render: (t: string | null) => t || "-" },
    { title: "邮箱", dataIndex: "email", width: 200, ellipsis: true },
    {
      title: "性别",
      dataIndex: "gender",
      width: 80,
      render: (v: string | null) => genderMap[v ?? ""] ?? v ?? "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      render: (val: User["status"]) => {
        const map: Record<User["status"], { color: string; label: string }> = {
          active: { color: "green", label: "正常" },
          banned: { color: "red", label: "封禁" },
          deactivated: { color: "default", label: "停用" },
        };
        const cfg = map[val];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: "注册时间",
      dataIndex: "createdAt",
      width: 180,
      render: (val: string) => dayjs(val).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: unknown, record: User) => (
        <>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            详情
          </Button>
          {record.status === "active" && (
            <Popconfirm title="确定封禁该用户？" onConfirm={() => handleBan(record)}>
              <Button type="link" size="small" danger>
                封禁
              </Button>
            </Popconfirm>
          )}
          {record.status === "banned" && (
            <Popconfirm title="确定解封该用户？" onConfirm={() => handleUnban(record)}>
              <Button type="link" size="small">
                解封
              </Button>
            </Popconfirm>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <AdminSearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        status={status}
        onStatusChange={setStatus}
        statusOptions={DEFAULT_USER_STATUS_OPTIONS}
        onSearch={handleSearch}
        onReset={handleReset}
        placeholder="搜索邮箱/昵称..."
        keywordWidth={240}
      />
      <AdminListTable
        rowKey="id"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
      />
      <AdminDetailDrawer
        open={drawerVisible}
        title="用户详情"
        onClose={() => setDrawerVisible(false)}
      >
        {selectedUserId && <UserDetailDrawerContent userId={selectedUserId} />}
      </AdminDetailDrawer>
    </>
  );
}
