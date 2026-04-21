import type { ThemeConfig } from "antd";

export const xunoTheme: ThemeConfig = {
  token: {
    colorPrimary: "#C4724F",
    colorSuccess: "#8B9D83",
    colorWarning: "#C9B99A",
    colorError: "#D46A5E",
    colorInfo: "#8B9D83",
    colorBgLayout: "#FAF8F5",
    colorTextBase: "#1A1714",
    borderRadius: 10,
    fontFamily: "'Helvetica Neue', 'PingFang SC', 'Noto Sans SC', sans-serif",
    fontSize: 14,
    controlHeight: 36,
    wireframe: false,
  },
  components: {
    Card: {
      colorBgContainer: "#FFFFFF",
      colorBorderSecondary: "#EAE5DF",
      boxShadowTertiary: "0 1px 4px rgba(42, 37, 32, 0.06)",
      borderRadiusLG: 12,
    },
    Button: {
      borderRadius: 10,
      controlHeight: 38,
    },
    Table: {
      colorBgContainer: "#FFFFFF",
      borderRadius: 12,
      headerBg: "#FAF8F5",
      headerColor: "#1A1714",
      rowHoverBg: "#F5F0EB",
    },
    Statistic: {
      fontSize: 28,
    },
  },
};
