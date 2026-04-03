# AiNeed 鸿蒙端 (HarmonyOS)

基于 ArkUI-X 框架开发的鸿蒙原生应用，与 AiNeed 主项目共享后端 API 服务。

## 技术栈

- **ArkUI-X 1.0.x** - 华为官方跨平台框架
- **ArkTS** - 基于 TypeScript 的声明式 UI 语言
- **DevEco Studio** - 华为官方 IDE

## 项目结构

```
apps/harmony/
├── AppScope/                    # 应用全局配置
│   ├── app.json5               # 应用配置
│   └── resources/              # 全局资源
│       └── base/
│           ├── element/       # 字符串、颜色等
│           └── media/          # 图片资源
├── entry/                      # 主模块
│   ├── src/main/
│   │   ├── ets/
│   │   │   ├── entryability/  # 应用入口
│   │   │   ├── pages/           # 页面组件
│   │   │   │   ├── Index.ets   # 主页面（Tab导航）
│   │   │   │   ├── Home.ets    # 首页
│   │   │   │   ├── Wardrobe.ets # 衣橱
│   │   │   │   ├── AIStylist.ets # AI造型师
│   │   │   │   ├── TryOn.ets   # 虚拟试衣
│   │   │   │   └── Profile.ets # 个人中心
│   │   │   ├── components/   # 公共组件
│   │   │   ├── services/     # API服务
│   │   │   └── common/       # 公共配置
│   │   └── resources/
│   │       └── base/
│   │           ├── element/   # 字符串、颜色
│   │           ├── media/    # 图片资源
│   │           └── profile/  # 页面配置
│   └── build-profile.json5    # 模块构建配置
├── hvigor/                     # 构建工具配置
└── oh-package.json5           # 依赖配置
```

## 开发环境

### 必备软件

1. **DevEco Studio** 4.0+
   - 下载地址: https://developer.huawei.com/consumer/cn/deveco-studio/
   
2. **HarmonyOS SDK** API 12+
   - 通过 DevEco Studio 自动下载

3. **Node.js** 18+
   - 用于部分构建工具

### 环境配置

```bash
# 配置 HarmonyOS SDK 路径 (DevEco Studio 会自动配置)
# Windows: C:\Users\<用户名>\Huawei\Sdk
# macOS: ~/Huawei/Sdk
```

## 快速开始

### 1. 打开项目

```bash
# 使用 DevEco Studio 打开
# File -> Open -> 选择 apps/harmony 目录
```

### 2. 同步依赖

```bash
cd apps/harmony
ohpm install
```

### 3. 运行项目

在 DevEco Studio 中点击运行按钮，或使用命令行:

```bash
hvigorw assembleHap
```

### 4. 构建签名

```bash
# Debug 构建
hvigorw assembleHap --mode module -p product=default

# Release 构建（需要签名配置）
hvigorw assembleHap --mode release -p product=default
```

## 功能模块

### 已实现功能

- ✅ 首页展示
- ✅ AI 造型师对话界面
- ✅ 虚拟试衣功能
- ✅ 衣橱管理
- ✅ 个人中心
- ✅ Tab 导航

### 待开发功能

- 🔄 身体分析
- 🔄 色彩诊断
- 🔄 风格档案
- 🔄 社区分享

## API 配置

修改 `entry/src/main/ets/common/config.ets` 配置后端地址:

```typescript
export const API_CONFIG = {
  baseUrl: 'http://YOUR_SERVER_IP:3001/api',
  // ...
};
```

## 注意事项

1. **签名配置**: 发布前需在 `build-profile.json5` 中配置签名
2. **权限配置**: 已在 `module.json5` 中配置必要权限
3. **网络配置**: 确保设备能访问后端服务

## 相关链接

- [ArkUI-X 官方文档](https://gitee.com/arkui-x)
- [HarmonyOS 开发指南](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides)
- [DevEco Studio 下载](https://developer.huawei.com/consumer/cn/deveco-studio/)
