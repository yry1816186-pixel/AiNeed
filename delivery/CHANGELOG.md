# AiNeed v1.0.0 变更日志

## [1.0.0] - 2026-03-19

### 新增
- 完整的用户认证系统（注册/登录/JWT）
- 服装数据库集成（31,018件服装数据）
- 体型分析功能（MediaPipe PoseLandmarker）
- FashionCLIP服装推荐系统
- Qdrant向量搜索集成
- MinIO对象存储集成

### 修复
- **触摸事件阻塞问题**：修复了`AISmartBall`和`HomeScreen`中绝对定位视图阻止触摸事件的问题
  - 在`AISmartBall.tsx`的`outerGlow`视图上添加`pointerEvents="none"`
  - 在`AISmartBall.tsx`的`PlatformBlurView`组件上添加`pointerEvents="none"`
  - 在`HomeScreen.tsx`的装饰性元素上添加`pointerEvents="none"`
  - 在`HomeScreen.tsx`的背景渐变上添加`pointerEvents="none"`

### 已知限制
- AI造型师对话功能需要配置LLM API Key
- 风格分析服务使用Mock后端
- 虚拟试穿功能因内存限制已禁用

### 技术栈
- React Native 0.76.9 (Expo 52)
- NestJS 10.x 后端
- PostgreSQL 16
- Redis 7
- Qdrant 1.12.1
- MinIO
- Python FastAPI (AI服务)

### 交付物
- `aineed-v1.0.0-debug.apk` (170 MB)
- Mock功能清单文档
- 测试报告
