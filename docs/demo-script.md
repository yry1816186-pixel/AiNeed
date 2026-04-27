# 寻裳 XUNO — 比赛 Demo 脚本

> **校准日期**: 2026-04-27
> **校准基准**: Phase 12 Plan 05 SMOKE-TEST 76 项检查 + demo-warmup.sh 预热
> **总时长**: 2:30（150 秒，含每段 5-10s 缓冲）

## 准备（赛前 10 分钟）

1. 运行 `bash scripts/demo-preflight.sh` — 15 服务健康检查 + 预热
2. 确认 15 个 Docker 服务全部 PASS
3. 预缓存推荐: demo-warmup.sh 自动执行
4. 验证 GLM-4-Flash 响应: 发送测试消息确认 <5s
5. 验证网络: 确认后端 API 可达（WiFi + 热点双备份）

## Demo 流程（2 分 30 秒）

### 第一层：体验革命（30 秒 + 5s 缓冲）

1. 打开 App → Today Tab
2. 展示伊伊主动推送："明天 12°C 面试推荐 3 套"
3. 点击语音按钮，说"帮我搭一套面试穿搭"
4. 伊伊实时响应，展示推荐方案
5. **缓冲**: AI 响应等待 2-3s，展示推荐解释

### 第二层：面试穿搭 Agent（60 秒 + 10s 缓冲）

1. 进入 Stylist Tab
2. 伊伊问："什么公司？" → 回答"互联网公司"
3. 伊伊问："什么岗位？" → 回答"产品经理"
4. 伊伊问："预算？" → 回答"1000 以内"
5. 展示 3 套方案，点击试穿
6. 说"不喜欢正式的" → 伊伊调整推荐
7. **缓冲**: 对话切换 2-3s，试穿加载 3-5s

### 第三层：包容性展示（60 秒 + 5s 缓冲）

1. 点击左下角齿轮图标 → ProfileDebugPanel
2. 切换到"职场精英"Profile → 应用
3. 展示推荐结果变化（不同人不同结果）
4. 切换到"创意达人"Profile → 应用
5. 展示推荐结果再次变化
6. 展示 RecommendationFunnel 6 层漏斗
7. **缓冲**: Profile 切换重新加载 3-5s

### 收尾（15 秒，无缓冲）

1. 回到 Today Tab
2. 强调技术亮点：6 层推荐漏斗 + FashionSigLIP + Agent 状态机
3. 扫码体验页面

## 降级方案

- 网络断开: 使用预缓存数据（demoPreCache 自动刷新）
- LLM 不可用: GLM-4-Flash 5s 超时 → GLM-5 自动降级
- App 崩溃: 播放预录 Demo 视频（Plan B-2）
- 全部失败: PPT 截图序列口述（Plan C）
- 详见 `docs/PRESENTATION/XUNO-DEMO-FALLBACK.md`

## Demo 视频要求

- 时长: 2 分 20 秒（不含缓冲）
- 内容: 面试穿搭场景完整流程 + 漏斗可视化 + Profile 切换
- 工具: Android 屏幕录制或 ADB screenrecord
- 格式: MP4, 1080p
