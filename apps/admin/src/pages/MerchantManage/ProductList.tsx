import { useState, useCallback } from 'react';
import { Table, Input, Space, Tag, Button, Card, Image, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';

interface Product {
  id: string;
  name: string;
  brandName: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
  mainImage: string | null;
  createdAt: string;
}

export default function ProductList() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);

  const fetchData = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      setData([]);
      setPagination({ current: page, pageSize, total: 0 });
    } catch {
      message.error('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, category]);

  const handleSearch = () => fetchData(1, pagination.pageSize);
  const handleReset = () => { setKeyword(''); setCategory(undefined); fetchData(1, pagination.pageSize); };
  const handleTableChange = (pag: TablePaginationConfig) => fetchData(pag.current, pag.pageSize);

  const columns: ColumnsType<Product> = [
    { title: '图片', dataIndex: 'mainImage', width: 64, render: (img: string | null) => img ? <Image src={img} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '-' },
    { title: '商品名称', dataIndex: 'name', width: 160 },
    { title: '品牌', dataIndex: 'brandName', width: 120 },
    { title: '分类', dataIndex: 'category', width: 100 },
    { title: '价格', dataIndex: 'price', width: 80, render: (v: number) => `¥${v}` },
    { title: '库存', dataIndex: 'stock', width: 80 },
    { title: '状态', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? <Tag color="green">上架</Tag> : <Tag color="default">下架</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', width: 170, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
  ];

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input placeholder="搜索商品名称" prefix={<SearchOutlined />} value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} style={{ width: 240 }} allowClear />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
        </Space>
      </Card>
      <Card>
        <Table<Product> rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={{ current: pagination.current, pageSize: pagination.pageSize, total: pagination.total, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }} onChange={handleTableChange} />
      </Card>
    </>
  );
}
