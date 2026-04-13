import { useEffect, useState } from 'react';
import { Drawer, Descriptions, Avatar, Tag, Spin, Divider, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { userApi } from '@/services/user';
import type { User, UserProfile, UserStats } from '@/services/user';

interface UserDetailDrawerProps {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
}

const genderMap: Record<string, string> = {
  male: '男',
  female: '女',
  other: '其他',
};

const statusMap: Record<User['status'], { color: string; label: string }> = {
  active: { color: 'green', label: '正常' },
  banned: { color: 'red', label: '封禁' },
  deactivated: { color: 'default', label: '停用' },
};

export default function UserDetailDrawer({ visible, userId, onClose }: UserDetailDrawerProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    Promise.all([
      userApi.getDetail(userId),
      userApi.getProfile(userId),
      userApi.getStats(userId),
    ])
      .then(([userRes, profileRes, statsRes]) => {
        setUser(userRes);
        setProfile(profileRes);
        setStats(statsRes);
      })
      .catch(() => {
        message.error('获取用户详情失败');
        setUser(null);
        setProfile(null);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [visible, userId]);

  return (
    <Drawer
      title="用户详情"
      width={560}
      open={visible}
      onClose={onClose}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {user && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar
                src={user.avatar}
                icon={<UserOutlined />}
                size={80}
              />
              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 500 }}>
                {user.nickname || '未设置昵称'}
              </div>
              <Tag color={statusMap[user.status].color} style={{ marginTop: 4 }}>
                {statusMap[user.status].label}
              </Tag>
            </div>

            <Descriptions title="基本信息" column={2} bordered size="small">
              <Descriptions.Item label="用户ID" span={2}>{user.id}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
              <Descriptions.Item label="手机">{user.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="性别">
                {user.gender ? genderMap[user.gender] || user.gender : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {dayjs(user.createdAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="最后登录" span={2}>
                {user.lastLoginAt ? dayjs(user.lastLoginAt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="用户画像" column={2} bordered size="small">
              <Descriptions.Item label="体型">{profile?.bodyType || '-'}</Descriptions.Item>
              <Descriptions.Item label="肤色">{profile?.skinTone || '-'}</Descriptions.Item>
              <Descriptions.Item label="风格偏好" span={2}>
                {profile?.stylePreferences?.length
                  ? profile.stylePreferences.map((s) => <Tag key={s}>{s}</Tag>)
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="预算">{profile?.budget || '-'}</Descriptions.Item>
              <Descriptions.Item label="色彩季型">{profile?.colorSeason || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="行为统计" column={3} bordered size="small">
              <Descriptions.Item label="试衣次数">{stats?.tryOnCount ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="收藏数量">{stats?.favoriteCount ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="AI咨询次数">{stats?.aiConsultCount ?? '-'}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Spin>
    </Drawer>
  );
}
