import { useState, useCallback } from 'react';
import { Table, Input, Select, Space, Tag, Avatar, Button, Popconfirm, message, Card, Image } from 'antd';
import { ShopOutlined, SearchOutlined, ReloadOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { brandApi } from '@/services/merchant';
import type { Brand } from '@/services/merchant';

const priceRangeMap: Record<string, string> = {
  budget: '平价',
  mid_range: '中端',
  premium: '高端',
  luxury: '奢侈',
};

export default function MerchantList() {
  const [data, setData] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [verified, setVerified] = useState<boolean | undefined>(undefined);
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);

  const fetchData = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await brandApi.getList({
        page,
        pageSize,
        keyword: keyword || undefined,
        verified,
        isActive,
      });
      setData(res.items);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.total });
    } catch {
      message.error('获取商家列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, verified, isActive]);

  const handleSearch = () => {
    fetchData(1, pagination.pageSize);
  };

  const handleReset = () => {
    setKeyword('');
    setVerified(undefined);
    setIsActive(undefined);
    fetchData(1, pagination.pageSize);
  };

  const handleTableChange = (pag: TablePaginationConfig) => {
    fetchData(pag.current, pag.pageSize);
  };

  const handleVerify = async (record: Brand) => {
    try {
      await brandApi.verify(record.id);
      message.success('审核通过');
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      message.error('操作失败');
    }
  };

  const handleReject = async (record: Brand) => {
    try {
      await brandApi.reject(record.id);
      message.success('已驳回');
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      message.error('操作失败');
    }
  };

  const handleToggleActive = async (record: Brand) => {
    try {
      if (record.isActive) {
        await brandApi.deactivate(record.id);
        message.success('已停用');
      } else {
        await brandApi.activate(record.id);
        message.success('已启用');
      }
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<Brand> = [
    {
      title: 'Logo',
      dataIndex: 'logo',
      width: 64,
      render: (logo: string | null) => (
        logo ? <Image src={logo} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} /> :
        <Avatar icon={<ShopOutlined />} style={{ backgroundColor: '#1677ff' }} />
      ),
    },
    {
      title: '品牌名称',
      dataIndex: 'name',
      width: 160,
    },
    {
      title: '联系人邮箱',
      dataIndex: 'contactEmail',
      width: 200,
      ellipsis: true,
      render: (val: string | null) => val || '-',
    },
    {
      title: '价格区间',
      dataIndex: 'priceRange',
      width: 100,
      render: (val: string) => priceRangeMap[val] || val,
    },
    {
      title: '认证状态',
      dataIndex: 'verified',
      width: 100,
      render: (val: boolean) =>
        val ? <Tag color="green">已认证</Tag> : <Tag color="orange">待审核</Tag>,
    },
    {
      title: '启用状态',
      dataIndex: 'isActive',
      width: 100,
      render: (val: boolean) =>
        val ? <Tag color="green">启用</Tag> : <Tag color="default">停用</Tag>,
    },
    {
      title: '入驻时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: unknown, record: Brand) => (
        <Space size="small">
          {!record.verified && (
            <>
              <Popconfirm title="确定通过审核？" onConfirm={() => handleVerify(record)}>
                <Button type="link" size="small" icon={<CheckOutlined />} style={{ color: '#52c41a' }}>
                  通过
                </Button>
              </Popconfirm>
              <Popconfirm title="确定驳回申请？" onConfirm={() => handleReject(record)}>
                <Button type="link" size="small" danger icon={<CloseOutlined />}>
                  驳回
                </Button>
              </Popconfirm>
            </>
          )}
          <Popconfirm
            title={record.isActive ? '确定停用该商家？' : '确定启用该商家？'}
            onConfirm={() => handleToggleActive(record)}
          >
            <Button type="link" size="small">
              {record.isActive ? '停用' : '启用'}
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
          <Input
            placeholder="搜索品牌名称"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="认证状态"
            value={verified}
            onChange={(val) => setVerified(val)}
            style={{ width: 140 }}
            allowClear
            options={[
              { label: '已认证', value: true },
              { label: '待审核', value: false },
            ]}
          />
          <Select
            placeholder="启用状态"
            value={isActive}
            onChange={(val) => setIsActive(val)}
            style={{ width: 140 }}
            allowClear
            options={[
              { label: '启用', value: true },
              { label: '停用', value: false },
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
        <Table<Brand>
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
    </>
  );
}
