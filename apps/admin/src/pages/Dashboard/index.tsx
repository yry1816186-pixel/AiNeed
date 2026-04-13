import React, { useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Statistic, Spin } from 'antd';
import { UserOutlined, ShoppingOutlined, TeamOutlined, RiseOutlined } from '@ant-design/icons';
import { get } from '@/services/request';

const { Title, Paragraph } = Typography;

interface DashboardStats {
  userCount: number;
  clothingCount: number;
  postCount: number;
  activeToday: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    userCount: 0,
    clothingCount: 0,
    postCount: 0,
    activeToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<DashboardStats>('/admin/dashboard/stats')
      .then((data) => setStats(data))
      .catch(() => {
        // Keep default zeros on error
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Title level={4}>仪表盘</Title>
      <Paragraph type="secondary">欢迎来到 xuno 管理后台</Paragraph>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="用户总数" value={stats.userCount} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="服装数量" value={stats.clothingCount} prefix={<ShoppingOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="社区帖子" value={stats.postCount} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="今日活跃" value={stats.activeToday} prefix={<RiseOutlined />} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Dashboard;
