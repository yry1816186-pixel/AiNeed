# 🚀 AiNeed APK 快速开始指南

## 📋 概述

本指南帮助您快速编译 AiNeed Android APK 并进行功能测试。

---

## ⚡ 快速开始

### 方案A：EAS 云端编译（推荐新手）

**优点：** 无需配置环境，稳定可靠

```bash
# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 登录 Expo（免费）
eas login

# 3. 编译 APK
cd apps/mobile
eas build --platform android --profile preview

# 4. 下载并安装 APK
```

**编译时间：** 10-15 分钟

---

### 方案B：本地编译（推荐开发者）

**优点：** 编译快速，适合频繁调试

#### 步骤1：安装依赖
```bash
cd apps/mobile
npm install
```

#### 步骤2：使用 Android Studio 编译
1. 打开 Android Studio
2. 打开项目：`File → Open → C:/AiNeed/apps/mobile/android`
3. 等待 Gradle Sync
4. 编译：`Build → Build Bundle(s) / APK(s) → Build APK(s)`

#### 步骤3：或使用命令行
```bash
cd apps/mobile/android
gradlew.bat assembleRelease
```

**APK 位置：** `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

**编译时间：** 首次 5-10 分钟，后续 1-3 分钟

---

### 方案C：使用编译脚本

```bash
# 运行编译脚本
compile-apk.bat
```

---

## 📱 安装与测试

### 自动安装测试
```bash
# 运行自动化测试脚本
test-apk.bat
```

### 手动安装
```bash
# 安装到设备
adb install apps/mobile/android/app/build/outputs/apk/release/app-release.apk

# 启动应用
adb shell am start -n com.aineed.app/.MainActivity
```

---

## 🧪 功能测试

### 快速测试清单

#### ✅ 基础功能（5分钟）
- [ ] 应用启动
- [ ] 底部导航切换
- [ ] 页面浏览

#### ✅ 用户功能（10分钟）
- [ ] 用户注册
- [ ] 用户登录
- [ ] 自动登录

#### ✅ AI功能（30分钟）
- [ ] 相机扫描
- [ ] 身体分析
- [ ] 色彩指南
- [ ] AI造型师对话
- [ ] 虚拟试衣

#### ✅ 购物功能（15分钟）
- [ ] 商品浏览
- [ ] 购物车
- [ ] 订单管理

#### ✅ 社交功能（10分钟）
- [ ] 收藏管理
- [ ] 个人中心

**详细测试指南：** [TEST-GUIDE.md](./TEST-GUIDE.md)

---

## 🐛 问题排查

### 编译问题

#### 问题1：Gradle Sync 失败
**解决方案：**
```bash
# 清理缓存
cd apps/mobile/android
gradlew.bat clean
gradlew.bat assembleRelease
```

#### 问题2：SDK 版本不匹配
**解决方案：**
- 打开 Android Studio → SDK Manager
- 安装 Android SDK Platform 35
- 安装 Build-Tools 35.0.1
- 安装 NDK 27.1.12297006

#### 问题3：内存不足
**解决方案：**
编辑 `apps/mobile/android/gradle.properties`：
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### 测试问题

#### 问题1：API 连接失败
**解决方案：**
1. 确认后端服务正在运行
```bash
cd apps/backend
npm run dev
```
2. 检查 API 地址配置（默认：http://10.0.2.2:3001）

#### 问题2：相机权限被拒绝
**解决方案：**
- 卸载应用重新安装
- 或在系统设置中手动授予权限

#### 问题3：应用崩溃
**解决方案：**
```bash
# 查看日志
adb logcat | findstr /i "aineed"

# 清除应用数据
adb shell pm clear com.aineed.app
```

---

## 📊 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| APK 大小 | < 50MB | Release 版本 |
| 启动时间 | < 3秒 | 冷启动 |
| 内存占用 | < 200MB | 运行时 |
| API 响应 | < 2秒 | 正常网络 |
| AI 分析 | < 10秒 | 图片分析 |

---

## 📁 文件结构

```
C:/AiNeed/
├── compile-apk.bat          # 编译脚本
├── test-apk.bat             # 测试脚本
├── docs/
│   ├── COMPILE-GUIDE.md     # 详细编译指南
│   ├── TEST-GUIDE.md        # 详细测试指南
│   └── QUICK-START.md       # 本文件
└── apps/mobile/
    ├── android/             # Android 原生代码
    ├── app/                 # 应用页面
    ├── src/                 # 源代码
    └── package.json         # 依赖配置
```

---

## 🔗 相关链接

- [详细编译指南](./COMPILE-GUIDE.md)
- [详细测试指南](./TEST-GUIDE.md)
- [项目文档](../README.md)

---

## 💡 提示

1. **首次编译推荐使用 EAS 云端编译**，成功率最高
2. **本地编译需要完整配置 Android 开发环境**
3. **测试时确保后端服务正在运行**
4. **查看日志可以帮助快速定位问题**

---

## 📞 获取帮助

如果遇到问题：
1. 查看详细文档
2. 检查错误日志
3. 搜索错误信息
4. 提交 Issue

---

**祝您编译和测试顺利！🎉**
