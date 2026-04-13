import { useState, useCallback } from 'react';
import { Table, Space, Input, Select, Button, Tag, Avatar, Popconfirm, message } from 'antd';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { postApi } from '@/services/community';
import type { Post } from '@/services/community';
import type { ColumnsType } from 'antd/es/table';
import PostDetailDrawer from './PostDetailDrawer';

const statusMap: Record<Post['status'], { color: string; label: string }> = {
  published: { color: 'green', label: '已发布' },
  hidden: { color: 'default', label: '已隐藏' },
  reported: { color: 'red', label: '被举报' },
};

const PostList: React.FC = () => {
  const [data, setData] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = useCallback(async (p: number, ps: number, kw?: string, s?: string) => {
    setLoading(true);
    try {
      const res = await postApi.getList({ page: p, pageSize: ps, keyword: kw, status: s });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error('获取帖子列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchData(1, pageSize, keyword, status);
  };

  const handleReset = () => {
    setKeyword('');
    setStatus(undefined);
    setPage(1);
    fetchData(1, pageSize, '', undefined);
  };

  const handlePageChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
    fetchData(p, ps, keyword, status);
  };

  const handleToggleVisibility = async (record: Post) => {
    try {
      if (record.status === 'hidden') {
        await postApi.show(record.id);
        message.success('帖子已显示');
      } else {
        await postApi.hide(record.id);
        message.success('帖子已隐藏');
      }
      fetchData(page, pageSize, keyword, status);
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await postApi.delete(id);
      message.success('帖子已删除');
      fetchData(page, pageSize, keyword, status);
    } catch {
      message.error('删除失败');
    }
  };

  const handleViewDetail = (record: Post) => {
    setDetailId(record.id);
    setDrawerOpen(true);
  };

  const columns: ColumnsType<Post> = [
    {
      title: '作者',
      dataIndex: 'authorNickname',
      key: 'author',
      width: 160,
      render: (_: string, record: Post) => (
        <Space>
          <Avatar src={record.authorAvatar} size="small">
            {record.authorNickname?.[0]}
          </Avatar>
          <span>{record.authorNickname}</span>
        </Space>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: { showTitle: false },
      width: 240,
      render: (text: string) => (
        <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {text}
        </div>
      ),
    },
    {
      title: '图片数',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      align: 'center',
      render: (images: string[]) => images?.length ?? 0,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 180,
      render: (tags: string[]) =>
        tags?.map((t) => <Tag key={t}>{t}</Tag>),
    },
    {
      title: '点赞',
      dataIndex: 'likeCount',
      key: 'likeCount',
      width: 80,
      align: 'center',
    },
    {
      title: '评论',
      dataIndex: 'commentCount',
      key: 'commentCount',
      width: 80,
      align: 'center',
    },
    {
      title: '举报数',
      dataIndex: 'reportCount',
      key: 'reportCount',
      width: 90,
      align: 'center',
      render: (count: number) =>
        count > 0 ? <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{count}</span> : count,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: Post['status']) => {
        const cfg = statusMap[s];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '发布时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Post) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => handleToggleVisibility(record)}>
            {record.status === 'hidden' ? '显示' : '隐藏'}
          </Button>
          <Popconfirm title="确定删除该帖子？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索内容/作者"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          placeholder="状态筛选"
          value={status}
          onChange={(v) => setStatus(v)}
          style={{ width: 140 }}
          allowClear
          options={[
            { label: '已发布', value: 'published' },
            { label: '已隐藏', value: 'hidden' },
            { label: '被举报', value: 'reported' },
          ]}
        />
        <Button type="primary" onClick={handleSearch}>
          搜索
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>

      <Table<Post>
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
        scroll={{ x: 1300 }}
      />

      <PostDetailDrawer
        open={drawerOpen}
        postId={detailId}
        onClose={() => {
          setDrawerOpen(false);
          setDetailId(null);
        }}
      />
    </>
  );
};

export default PostList;
