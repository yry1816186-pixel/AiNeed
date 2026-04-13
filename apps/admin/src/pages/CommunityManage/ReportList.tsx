import { useState, useCallback } from 'react';
import { Table, Space, Select, Button, Tag, Popconfirm, message } from 'antd';
import { EyeInvisibleOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { reportApi } from '@/services/community';
import type { Report } from '@/services/community';
import type { ColumnsType } from 'antd/es/table';

const statusMap: Record<Report['status'], { color: string; label: string }> = {
  pending: { color: 'orange', label: '待处理' },
  resolved: { color: 'green', label: '已处理' },
  dismissed: { color: 'default', label: '已驳回' },
};

const ReportList: React.FC = () => {
  const [data, setData] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const fetchData = useCallback(async (p: number, ps: number, s?: string) => {
    setLoading(true);
    try {
      const res = await reportApi.getList({ page: p, pageSize: ps, status: s });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error('获取举报列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchData(1, pageSize, status);
  };

  const handleReset = () => {
    setStatus(undefined);
    setPage(1);
    fetchData(1, pageSize, undefined);
  };

  const handlePageChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
    fetchData(p, ps, status);
  };

  const handleResolve = async (id: string, action: 'hide' | 'dismiss') => {
    try {
      await reportApi.resolve(id, action);
      message.success(action === 'hide' ? '帖子已隐藏' : '举报已驳回');
      fetchData(page, pageSize, status);
    } catch {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<Report> = [
    {
      title: '帖子内容',
      dataIndex: 'postId',
      key: 'postId',
      width: 200,
      ellipsis: { showTitle: false },
      render: (_: string, record: Report) => (
        <span style={{ color: '#999' }}>帖子 #{record.postId.slice(0, 8)}</span>
      ),
    },
    {
      title: '举报人',
      dataIndex: 'reporterNickname',
      key: 'reporter',
      width: 120,
    },
    {
      title: '举报原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 140,
    },
    {
      title: '举报描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: { showTitle: false },
      render: (text: string | null) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: Report['status']) => {
        const cfg = statusMap[s];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '举报时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Report) =>
        record.status === 'pending' ? (
          <Space>
            <Popconfirm title="确定隐藏该帖子？" onConfirm={() => handleResolve(record.id, 'hide')}>
              <Button type="link" size="small" danger icon={<EyeInvisibleOutlined />}>
                隐藏帖子
              </Button>
            </Popconfirm>
            <Popconfirm title="确定驳回该举报？" onConfirm={() => handleResolve(record.id, 'dismiss')}>
              <Button type="link" size="small" icon={<StopOutlined />}>
                驳回举报
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="状态筛选"
          value={status}
          onChange={(v) => setStatus(v)}
          style={{ width: 140 }}
          allowClear
          options={[
            { label: '待处理', value: 'pending' },
            { label: '已处理', value: 'resolved' },
            { label: '已驳回', value: 'dismissed' },
          ]}
        />
        <Button type="primary" onClick={handleSearch}>
          搜索
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>

      <Table<Report>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: handlePageChange,
        }}
        scroll={{ x: 1000 }}
      />
    </>
  );
};

export default ReportList;
