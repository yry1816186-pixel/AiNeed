import { useState, useCallback } from 'react';
import { Table, Select, Space, Switch, Button, Popconfirm, message, Card, Image } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { styleQuizApi } from '@/services/styleQuiz';
import type { QuizQuestion } from '@/services/styleQuiz';
import QuestionFormModal from './QuestionFormModal';

const categoryOptions = [
  { label: '风格偏好', value: 'style' },
  { label: '色彩倾向', value: 'color' },
  { label: '场景适配', value: 'scene' },
  { label: '体型认知', value: 'body' },
  { label: '预算偏好', value: 'budget' },
];

const categoryMap = Object.fromEntries(categoryOptions.map((c) => [c.value, c.label]));

export default function QuestionList() {
  const [data, setData] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  const fetchData = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await styleQuizApi.getQuestions({
        page,
        pageSize,
        category,
        isActive,
      });
      setData(res.items);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.total });
    } catch {
      message.error('获取题目列表失败');
    } finally {
      setLoading(false);
    }
  }, [category, isActive]);

  const handleTableChange = (pag: TablePaginationConfig) => {
    fetchData(pag.current, pag.pageSize);
  };

  const handleStatusChange = async (record: QuizQuestion, checked: boolean) => {
    try {
      await styleQuizApi.updateQuestion(record.id, { isActive: checked });
      message.success(checked ? '已启用' : '已禁用');
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await styleQuizApi.deleteQuestion(id);
      message.success('删除成功');
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      message.error('删除失败');
    }
  };

  const handleEdit = (record: QuizQuestion) => {
    setEditingQuestion(record);
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setModalVisible(true);
  };

  const handleModalClose = (refresh?: boolean) => {
    setModalVisible(false);
    setEditingQuestion(null);
    if (refresh) {
      fetchData(pagination.current, pagination.pageSize);
    }
  };

  const columns: ColumnsType<QuizQuestion> = [
    {
      title: '序号',
      dataIndex: 'order',
      width: 80,
      sorter: (a, b) => a.order - b.order,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (val: string) => categoryMap[val] || val,
    },
    {
      title: '题目文本',
      dataIndex: 'questionText',
      width: 240,
      ellipsis: true,
    },
    {
      title: '图片',
      dataIndex: 'imageUrl',
      width: 80,
      render: (url: string | null) =>
        url ? <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '-',
    },
    {
      title: '答案数',
      dataIndex: 'answers',
      width: 80,
      render: (answers: QuizQuestion['answers']) => answers?.length ?? 0,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 80,
      render: (val: boolean, record: QuizQuestion) => (
        <Switch checked={val} size="small" onChange={(checked) => handleStatusChange(record, checked)} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: QuizQuestion) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该题目？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="分类筛选"
            value={category}
            onChange={(val) => setCategory(val)}
            style={{ width: 160 }}
            allowClear
            options={categoryOptions}
          />
          <Select
            placeholder="状态筛选"
            value={isActive}
            onChange={(val) => setIsActive(val)}
            style={{ width: 140 }}
            allowClear
            options={[
              { label: '启用', value: true },
              { label: '禁用', value: false },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchData(1, pagination.pageSize)}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增题目
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<QuizQuestion>
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

      <QuestionFormModal
        visible={modalVisible}
        editingQuestion={editingQuestion}
        onClose={handleModalClose}
      />
    </>
  );
}
