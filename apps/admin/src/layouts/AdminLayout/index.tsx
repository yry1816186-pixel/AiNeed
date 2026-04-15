import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import type { MenuDataItem } from '@ant-design/pro-components';
import {
  DashboardOutlined,
  UserOutlined,
  FormOutlined,
  ShopOutlined,
  TeamOutlined,
  LogoutOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { Dropdown, message, Modal, Input, Form } from 'antd';
import { useAuthStore } from '@/stores/auth';

const menuData: MenuDataItem[] = [
  {
    path: '/dashboard',
    name: '仪表盘',
    icon: <DashboardOutlined />,
  },
  {
    path: '/users',
    name: '用户管理',
    icon: <UserOutlined />,
  },
  {
    path: '/style-quiz',
    name: '风格题库',
    icon: <FormOutlined />,
  },
  {
    path: '/merchants',
    name: '商家管理',
    icon: <ShopOutlined />,
  },
  {
    path: '/community',
    name: '社区管理',
    icon: <TeamOutlined />,
  },
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm] = Form.useForm();
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login', { replace: true });
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的新密码不一致');
        return;
      }
      setPasswordLoading(true);
      // TODO: 调用后端修改密码 API
      // await post('/auth/change-password', { oldPassword: values.oldPassword, newPassword: values.newPassword });
      message.info('修改密码功能后端接口开发中，请稍后再试');
      setPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch {
      // form validation failed, ignore
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <ProLayout
      title="xuno Admin"
      logo={
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #1677ff, #69b1ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          A
        </div>
      }
      layout="mix"
      fixedHeader
      fixSiderbar
      location={{ pathname: location.pathname }}
      menuDataRender={() => menuData}
      menuItemRender={(item, dom) => (
        <div onClick={() => item.path && navigate(item.path)}>{dom}</div>
      )}
      avatarProps={{
        src: undefined,
        title: user?.nickname || user?.email || 'Admin',
        size: 'small',
        render: (_, dom) => (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'password',
                  icon: <KeyOutlined />,
                  label: '修改密码',
                  onClick: () => setPasswordModalOpen(true),
                },
                { type: 'divider' },
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            {dom}
          </Dropdown>
        ),
      }}
      token={{
        header: {
          colorBgHeader: '#001529',
          colorHeaderTitle: '#fff',
          colorTextMenu: 'rgba(255,255,255,0.65)',
          colorTextMenuActive: '#fff',
          colorTextMenuSecondary: 'rgba(255,255,255,0.45)',
        },
        sider: {
          colorMenuBackground: '#fff',
          colorTextMenu: 'rgba(0,0,0,0.65)',
          colorTextMenuActive: '#1677ff',
          colorBgMenuItemActive: '#e6f4ff',
        },
      }}
    >
      <Outlet />
      <Modal
        title="修改密码"
        open={passwordModalOpen}
        onOk={handleChangePassword}
        onCancel={() => {
          setPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        confirmLoading={passwordLoading}
        okText="确认修改"
        cancelText="取消"
      >
        <Form form={passwordForm} layout="vertical" autoComplete="off">
          <Form.Item
            name="oldPassword"
            label="旧密码"
            rules={[{ required: true, message: '请输入旧密码' }]}
          >
            <Input.Password placeholder="请输入旧密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            rules={[{ required: true, message: '请确认新密码' }]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </ProLayout>
  );
};

export default AdminLayout;
