import { useState, useCallback } from 'react';
import { Table, Space, Input, Select, Button, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { tagApi } from '@/services/community';
import type { Tag } from '@/services/community';
import type { ColumnsType } from 'antd/es/table';
import TagFormModal from './TagFormModal';

const categoryOptions = [
  { label: '风格', value: 'style' },
  { label: '场合', value: 'occasion' },
  { label: '体型', value: 'body_type' },
  { label: '颜色', value: 'color' },
  { label: '其他', value: 'other' },
];

const categoryLabelMap: Record<string, string> = {
  style: '风格',
  occasion: '场合',
  body_type: '体型',
  color: '颜色',
  other: '其他',
};

const TagList: React.FC = () => {
  const [data, setData] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const fetchData = useCallback(async (p: number, ps: number, kw?: string, c?: string) => {
    setLoading(true);
    try {
      const res = await tagApi.getList({ page: p, pageSize: ps, keyword: kw, category: c });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error('获取标签列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchData(1, pageSize, keyword, category);
  };

  const handleReset = () => {
    setKeyword('');
    setCategory(undefined);
    setPage(1);
    fetchData(1, pageSize, '', undefined);
  };

  const handlePageChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
    fetchData(p, ps, keyword, category);
  };

  const handleCreate = () => {
    setEditingTag(null);
    setModalOpen(true);
  };

  const handleEdit = (record: Tag) => {
    setEditingTag(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await tagApi.delete(id);
      message.success('标签已删除');
      fetchData(page, pageSize, keyword, category);
    } catch {
      message.error('删除失败');
    }
  };

  const handleModalOk = async (values: { name: string; category: string }) => {
    try {
      if (editingTag) {
        await tagApi.update(editingTag.id, values);
        message.success('标签已更新');
      } else {
        await tagApi.create(values);
        message.success('标签已创建');
      }
      setModalOpen(false);
      setEditingTag(null);
      fetchData(page, pageSize, keyword, category);
    } catch {
      message.error(editingTag ? '更新失败' : '创建失败');
    }
  };

  const columns: ColumnsType<Tag> = [
    {
      title: '标签名',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (v: string) => categoryLabelMap[v] || v,
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
      align: 'center',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: Tag) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该标签？" onConfirm={() => handleDelete(record.id)}>
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
          placeholder="搜索标签名"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          placeholder="分类筛选"
          value={category}
          onChange={(v) => setCategory(v)}
          style={{ width: 140 }}
          allowClear
          options={categoryOptions}
        />
        <Button type="primary" onClick={handleSearch}>
          搜索
        </Button>
        <Button onClick={handleReset}>重置</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增标签
        </Button>
      </Space>

      <Table<Tag>
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
      />

      <TagFormModal
        open={modalOpen}
        initialValues={editingTag ? { name: editingTag.name, category: editingTag.category } : undefined}
        onOk={handleModalOk}
        onCancel={() => {
          setModalOpen(false);
          setEditingTag(null);
        }}
      />
    </>
  );
};

export default TagList;
