import { useState, useCallback } from 'react';
import { Table, Input, Select, Space, Tag, Avatar, Button, Popconfirm, message, Card } from 'antd';
import { UserOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { userApi } from '@/services/user';
import type { User } from '@/services/user';
import UserDetailDrawer from './UserDetailDrawer';

const statusMap: Record<User['status'], { color: string; label: string }> = {
  active: { color: 'green', label: '正常' },
  banned: { color: 'red', label: '封禁' },
  deactivated: { color: 'default', label: '停用' },
};

const genderMap: Record<string, string> = {
  male: '男',
  female: '女',
  other: '其他',
};

export default function UserList() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchData = useCallback(async (page = 1, pageSize = 10) => {
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
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, status]);

  const handleSearch = () => {
    fetchData(1, pagination.pageSize);
  };

  const handleReset = () => {
    setKeyword('');
    setStatus(undefined);
    fetchData(1, pagination.pageSize);
  };

  const handleTableChange = (pag: TablePaginationConfig) => {
    fetchData(pag.current, pag.pageSize);
  };

  const handleBan = async (record: User) => {
    try {
      await userApi.ban(record.id);
      message.success('封禁成功');
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      message.error('操作失败');
    }
  };

  const handleUnban = async (record: User) => {
    try {
      await userApi.unban(record.id);
      message.success('解封成功');
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      message.error('操作失败');
    }
  };

  const openDetail = (record: User) => {
    setSelectedUserId(record.id);
    setDrawerVisible(true);
  };

  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 120,
      ellipsis: true,
    },
    {
      title: '头像',
      dataIndex: 'avatar',
      width: 64,
      render: (avatar: string | null) => (
        <Avatar src={avatar} icon={<UserOutlined />} size={36} />
      ),
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      width: 120,
      render: (text: string | null) => text || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 200,
      ellipsis: true,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 80,
      render: (val: string | null) => (val ? genderMap[val] || val : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (val: User['status']) => {
        const cfg = statusMap[val];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            详情
          </Button>
          {record.status === 'active' && (
            <Popconfirm title="确定封禁该用户？" onConfirm={() => handleBan(record)}>
              <Button type="link" size="small" danger>
                封禁
              </Button>
            </Popconfirm>
          )}
          {record.status === 'banned' && (
            <Popconfirm title="确定解封该用户？" onConfirm={() => handleUnban(record)}>
              <Button type="link" size="small">
                解封
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索邮箱/昵称"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            value={status}
            onChange={(val) => setStatus(val)}
            style={{ width: 140 }}
            allowClear
            options={[
              { label: '正常', value: 'active' },
              { label: '封禁', value: 'banned' },
              { label: '停用', value: 'deactivated' },
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<User>
          rowKey="id"
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
          onChange={handleTableChange}
        />
      </Card>

      <UserDetailDrawer
        visible={drawerVisible}
        userId={selectedUserId}
        onClose={() => setDrawerVisible(false)}
      />
    </>
  );
}
