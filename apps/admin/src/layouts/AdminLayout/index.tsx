import React from 'react';
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
import { Dropdown, message } from 'antd';
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

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login', { replace: true });
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
                  onClick: () => message.info('修改密码功能开发中'),
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
    </ProLayout>
  );
};

export default AdminLayout;
