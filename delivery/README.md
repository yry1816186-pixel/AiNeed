# AiNeed Android APK 交付包

## 📦 交付物

| 文件 | 大小 | 说明 |
|------|------|------|
| `aineed-v1.0.0-debug.apk` | 167 MB | Android Debug APK (可安装运行) |

## 🚀 安装说明

### 系统要求
- Android 7.0 (API 24) 或更高版本
- 至少 500 MB 可用存储空间

### 安装步骤

1. **启用未知来源**
   - 进入 设置 > 安全
   - 启用"允许安装未知来源应用"

2. **安装APK**
   ```bash
   adb install aineed-v1.0.0-debug.apk
   ```
   或直接在设备上打开APK文件

3. **启动应用**
   ```bash
   adb shell am start -n com.aineed.app/.MainActivity
   ```

## 🔧 后端服务配置

应用需要连接到后端服务才能完整运行。默认配置：

| 服务 | 地址 | 说明 |
|------|------|------|
| API Server | `http://10.0.2.2:3001/api/v1` | Android模拟器访问主机 |
| AI Service | `http://10.0.2.2:8001` | AI分析服务 |

### 启动后端服务

```bash
cd C:/AiNeed

# 启动Docker服务
docker compose --env-file .env up -d postgres redis minio qdrant ai-service

# 启动NestJS后端
cd apps/backend && pnpm run dev
```

## ✅ 功能验证清单

### 已验证功能
- [x] 用户注册 (`POST /api/v1/auth/register`)
- [x] 用户登录 (`POST /api/v1/auth/login`)
- [x] 用户信息获取 (`GET /api/v1/users/me`)
- [x] 服装列表 (`GET /api/v1/clothing`) - 31,018条数据
- [x] 体型分析 (`POST /api/v1/ai/body-analysis`)

### Mock功能 (待配置API Key)
- [ ] AI造型师对话 - 需配置 `GLM_API_KEY`
- [ ] 风格分析 - 需配置 `GLM_API_KEY` 或 `OPENAI_API_KEY`

### 已禁用功能
- [x] 虚拟试穿 (IDM-VTON) - 内存不足，使用占位UI

## 📱 测试账号

首次运行时自动创建测试账号，或手动注册。

## 🐛 已知问题

### P1 - Release构建问题
- **问题**: Metro bundler无法从正确的目录找到入口文件
- **影响**: 当前仅能提供Debug APK
- **解决方案**: 需要修复Metro配置或使用EAS Build

### P2 - 端口冲突
- **问题**: Metro默认端口8081可能被其他Vite项目占用
- **影响**: Debug模式可能无法热重载
- **解决方案**: 终止占用进程或更改Metro端口

## 📊 构建信息

```
版本: 1.0.0
构建类型: Debug
构建时间: 2026-03-19
签名: Debug Keystore
最低SDK: 24 (Android 7.0)
目标SDK: 35 (Android 15)
```

## 🔗 相关文档

- [Mock功能清单](../docs/MOCK_FEATURES.md)
- [实现计划](../docs/plans/2026-03-19-android-apk-delivery.md)
- [修复日志](../06_FIX_LOG.md)
