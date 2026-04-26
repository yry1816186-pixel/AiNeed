/**
 * AdminDetailDrawer — Admin 后台通用详情抽屉
 *
 * 提供标准化的 Drawer 容器 + 标题 + 关闭按钮
 * 所有 Admin 详情抽屉共享此组件
 *
 * @example
 * <AdminDetailDrawer
 *   open={drawerVisible}
 *   title="用户详情"
 *   onClose={() => setDrawerVisible(false)}
 *   width={560}
 * >
 *   <UserDetailContent userId={selectedUserId} />
 * </AdminDetailDrawer>
 */
import React from "react";
import { Drawer } from "antd";
import type { DrawerProps } from "antd";

export interface AdminDetailDrawerProps {
  /** 抽屉是否打开 */
  open: boolean;
  /** 抽屉标题 */
  title: string;
  /** 关闭回调 */
  onClose: () => void;
  /** Drawer props 透传 */
  drawerProps?: Partial<DrawerProps>;
  children: React.ReactNode;
}

export const AdminDetailDrawer: React.FC<AdminDetailDrawerProps> = ({
  open,
  title,
  onClose,
  drawerProps,
  children,
}) => {
  return (
    <Drawer open={open} title={title} onClose={onClose} width={560} destroyOnClose {...drawerProps}>
      {children}
    </Drawer>
  );
};
