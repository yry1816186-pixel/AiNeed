# Ai霓 - 智能服装推荐应用

一款基于AI的智能服装推荐安卓应用，提供服装分析、体型分析、色彩推荐等功能。

## 功能特点

- 📷 **服装分析** - 拍照识别服装风格、颜色、场合
- 👤 **体型分析** - 分析用户体型特征，提供穿搭建议
- 🎨 **色彩指南** - 根据肤色推荐适合的颜色
- 🤖 **AI推荐** - 智能推荐搭配方案
- ❤️ **收藏管理** - 收藏喜欢的服装

## 技术栈

- React Native + Expo
- TypeScript
- Zustand (状态管理)
- Tailwind CSS (NativeWind)
- Axios (网络请求)

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 运行Android
npm run android
```

## 构建

```bash
# 构建APK (需要EAS账号)
npm run build:apk
```

## 项目结构

```
apps/mobile/
├── app/                    # 路由页面
│   ├── (tabs)/            # 底部导航页面
│   ├── _layout.tsx        # 根布局
│   ├── login.tsx          # 登录页
│   └── register.tsx       # 注册页
├── src/
│   ├── components/        # 组件
│   ├── screens/           # 页面组件
│   ├── services/          # API服务
│   └── stores/            # 状态管理
├── app.json               # Expo配置
├── package.json           # 依赖配置
└── tailwind.config.js     # 样式配置
```

## API配置

应用默认连接到本地服务：
- 后端API: `http://10.0.2.2:3001/api/v1`
- AI服务: `http://10.0.2.2:8001`

修改 `app.json` 中的 `extra` 字段可以更改API地址。
