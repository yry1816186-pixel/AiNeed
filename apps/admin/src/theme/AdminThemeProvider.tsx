import React from "react";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { antdThemeToken } from "./tokens";

export interface AdminThemeProviderProps {
  children: React.ReactNode;
}

export const AdminThemeProvider: React.FC<AdminThemeProviderProps> = ({ children }) => {
  return (
    <ConfigProvider
      theme={{
        token: antdThemeToken,
      }}
      locale={zhCN}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
};

export default AdminThemeProvider;
