import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import LoginPage from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UserManage from '@/pages/UserManage/UserList';
import StyleQuizManage from '@/pages/StyleQuiz/QuestionList';
import MerchantManage from '@/pages/MerchantManage';
import CommunityManage from '@/pages/CommunityManage';
import { useAuthStore } from '@/stores/auth';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <GuestGuard>
        <LoginPage />
      </GuestGuard>
    ),
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'users',
        element: <UserManage />,
      },
      {
        path: 'style-quiz',
        element: <StyleQuizManage />,
      },
      {
        path: 'merchants',
        element: <MerchantManage />,
      },
      {
        path: 'community',
        element: <CommunityManage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
];

export const router = createBrowserRouter(routes);
