# Phase 11: 比赛演示冲刺 + 生产验证 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 11-competition-demo-sprint-production-validation
**Areas discussed:** 演示环境搭建与全链路验证, AI 稳定性双保险, 代码修复与软著提交, 评委打动策略

---

## 演示环境搭建与全链路验证

### 部署策略

| Option                      | Description                                               | Selected |
| --------------------------- | --------------------------------------------------------- | -------- |
| 纯本地演示                  | 笔记本跑 Docker Compose，手机连同一 WiFi 访问。零外部依赖 | ✓        |
| Cloudflare Tunnel           | 本地 Docker + Cloudflare Tunnel 暴露到公网                |          |
| 预录视频 + Live Demo 双保险 | 准备完美预录视频作为 backup                               |          |
| AutoDL 云端部署             | AutoDL 实例部署后端服务                                   |          |

**User's choice:** 纯本地演示
**Notes:** 不依赖外部网络，最稳定

### Docker 服务范围

| Option                    | Description                                           | Selected |
| ------------------------- | ----------------------------------------------------- | -------- |
| 全栈 15 服务              | 全部服务包括 Prometheus + Grafana 监控                | ✓        |
| 核心服务精简版（~6 服务） | 仅 PostgreSQL + Redis + Qdrant + Backend + ML + Nginx |          |
| 动态调整                  | 先全栈，内存不够再精简                                |          |

**User's choice:** 全栈 15 服务
**Notes:** 复用 docker-compose.production.yml 已有配置

### 端到端验证覆盖

| Option                 | Description                                                 | Selected |
| ---------------------- | ----------------------------------------------------------- | -------- |
| Demo Script 全流程     | 注册 → Onboarding → 推荐 → 对话 → 面试 → 试穿 → 保存 → 日历 |          |
| Demo Script + 边界测试 | Demo Script + 异常场景 + 边界场景                           | ✓        |

**User's choice:** Demo Script + 边界测试
**Notes:** 更全面覆盖，确保演示稳定

### 演示设备

| Option              | Description                | Selected |
| ------------------- | -------------------------- | -------- |
| Android 真机        | 真机连同一 WiFi 访问后端   |          |
| Android 模拟器      | Expo Go 模拟器在电脑上跑   |          |
| 真机 + 模拟器双备份 | 真机为主 + 模拟器做 backup |          |

**User's choice:** 模拟器先行，开发调试完成后再上真机
**Notes:** 用户明确说"用模拟器跑，等所有开发调试完成再上真机"

### 预录 Backup

| Option            | Description                              | Selected |
| ----------------- | ---------------------------------------- | -------- |
| 必须预录 backup   | 录制完美 3 分钟视频，live 失败时立刻切换 | ✓        |
| 不预录，全靠 live | 不准备预录视频                           |          |

**User's choice:** 必须预录 backup

### Docker 内存优化

| Option                  | Description                          | Selected |
| ----------------------- | ------------------------------------ | -------- |
| 复用现有 production.yml | Phase 10 已压缩 memory limit，直接用 | ✓        |
| 新建 demo 专用 Compose  | 进一步压缩内存                       |          |

**User's choice:** 复用现有 production.yml

### 演示顺序

| Option               | Description                  | Selected |
| -------------------- | ---------------------------- | -------- |
| 体验先行 → 技术收尾  | 先 App 后技术展示            |          |
| PPT 引入 → Live Demo | 先架构图再切 live demo       |          |
| 纯 App 演示          | 全程 App 内，技术用 PPT 补充 | ✓        |

**User's choice:** 纯 App 演示

### 预热策略

| Option          | Description                                   | Selected |
| --------------- | --------------------------------------------- | -------- |
| 演示前完整预热  | 演示前 10 分钟启动 Docker，跑一遍 demo script | ✓        |
| Docker 常驻不关 | Docker 常驻后台                               |          |
| 预导入种子数据  | 种子数据预导入 Docker volume                  |          |

**User's choice:** 演示前完整预热

### 演示检查清单

| Option       | Description                          | Selected |
| ------------ | ------------------------------------ | -------- |
| 新建检查清单 | docs/DEMO-CHECKLIST.md，10-15 项检查 | ✓        |
| 口头确认即可 | 不需要正式文档                       |          |

**User's choice:** 新建检查清单

---

## AI 稳定性双保险

### GLM Fallback 触发机制

| Option                | Description                         | Selected |
| --------------------- | ----------------------------------- | -------- |
| 后端自动 fallback     | AIServiceRouter：GLM → 重试 → GLM-5 | ✓        |
| 单模型（无 fallback） | 仅 GLM-4-Flash                      |          |
| 默认 Qwen，GLM 备选   | 反过来                              |          |

**User's choice:** 后端自动 fallback

### 种子数据打磨

| Option                      | Description              | Selected |
| --------------------------- | ------------------------ | -------- |
| 精心构造 10 个 seed profile | 手动构造，每个有完整数据 | ✓        |
| 复用现有种子数据            | seed-user-data.json      |          |
| 2-3 个精选 profile          | 深度打磨                 |          |

**User's choice:** 精心构造 10 个 seed profile

### Fallback 超时阈值

| Option          | Description      | Selected |
| --------------- | ---------------- | -------- |
| 5 秒超时        | 比赛场景响应优先 | ✓        |
| 10 秒超时       | 给 GLM 更多机会  |          |
| 比赛模式全 Qwen | 跳过 GLM         |          |

**User's choice:** 5 秒超时

### 对话预设/缓存

| Option                        | Description               | Selected |
| ----------------------------- | ------------------------- | -------- |
| 预设对话模板 + Live AI 双模式 | 预设 3-5 组模板 + 实时 AI |          |
| 纯实时 AI                     | 全部走实时                | ✓        |
| 纯预设回复                    | 不调 AI API               |          |

**User's choice:** 纯实时 AI

### Fallback 模型选择

| Option                 | Description    | Selected |
| ---------------------- | -------------- | -------- |
| Qwen-Plus API          | 阿里云通义千问 |          |
| AutoDL 本地 Qwen2.5-7B | 本地推理       |          |
| DeepSeek Chat API      | 备选方案       |          |

**User's choice:** GLM-5（用户自定义选择，不走 Qwen）
**Notes:** 用户说"还是用 glm-5"，保持智谱生态一致性

### Edge-TTS 稳定性

| Option            | Description        | Selected |
| ----------------- | ------------------ | -------- |
| Edge-TTS + 预缓存 | 预缓存常见回复语音 | ✓        |
| Edge-TTS 实时生成 | 不做额外处理       |          |
| 演示时关闭语音    | 减少不稳定因素     |          |

**User's choice:** Edge-TTS + 预缓存

### 种子数据验证

| Option          | Description                   | Selected |
| --------------- | ----------------------------- | -------- |
| 人工逐个验证    | 每个 profile 人工检查推荐效果 |          |
| 自动化脚本验证  | 写脚本批量检查格式和完整性    | ✓        |
| 自动 + 人工抽查 | 折中方案                      |          |

**User's choice:** 自动化脚本验证

### 对话质量保证

| Option           | Description    | Selected |
| ---------------- | -------------- | -------- |
| 面试场景深度打磨 | 专注面试场景   |          |
| 全场景均衡打磨   | 所有场景都打磨 | ✓        |
| 不验证，纯实时   | 不做质量保证   |          |

**User's choice:** 全场景最优打磨
**Notes:** 用户明确选择全场景打磨

---

## 代码修复 + 软著提交

### TS 编译错误修复策略

| Option                              | Description                | Selected |
| ----------------------------------- | -------------------------- | -------- |
| 先修 StyleEvolutionChart 再全局检查 | 逐文件修复                 |          |
| 全局 tsc 一次性修复                 | 扫描全部编译错误一次性修复 | ✓        |
| 只修这 9 个错误                     | 最低限度                   |          |

**User's choice:** 全局 tsc --noEmit 一次性修复

### 软著申请策略

| Option               | Description              | Selected |
| -------------------- | ------------------------ | -------- |
| 现有材料直接提交     | 不额外打磨               |          |
| 打磨后提交           | 审校后提交               | ✓        |
| 等 demo 完成后再提交 | 代码变更后材料可能需更新 |          |

**User's choice:** 打磨后提交

---

## 评委打动策略

### Demo Script 策略

| Option                 | Description                              | Selected |
| ---------------------- | ---------------------------------------- | -------- |
| 复用现有脚本，微调即可 | 2:20 脚本很完整                          |          |
| 根据实际代码状态校准   | FashionCLIP→FashionSigLIP 等变更需要同步 | ✓        |
| 重写演示脚本           | 工作量大但最准确                         |          |

**User's choice:** 需要根据实际代码状态校准

### PPT 策略

| Option       | Description            | Selected |
| ------------ | ---------------------- | -------- |
| 微调现有 PPT | 更新截图、补充实际数据 | ✓        |
| 重新制作 PPT | 视觉效果升级           |          |
| 不迭代       | 现有版本直接用         |          |

**User's choice:** 微调现有 PPT

### 视频制作方式

| Option              | Description            | Selected |
| ------------------- | ---------------------- | -------- |
| OBS 录屏 + 后期剪辑 | 模拟器投屏 + 旁白配音  | ✓        |
| 手机直接录屏        | 最快但画质音质可能不够 |          |
| 专业制作            | 质量最高但成本不可控   |          |

**User's choice:** OBS 录屏 + 后期剪辑

### 答辩 Q&A 策略

| Option                      | Description         | Selected |
| --------------------------- | ------------------- | -------- |
| 复用 Q-A-PREP.md + 补充追问 | 更新答案 + 补充追问 | ✓        |
| 重新准备答辩材料            | 更全面但工作量大    |          |
| 不准备，临场发挥            | 风险高              |          |

**User's choice:** 复用 Q-A-PREP.md + 补充追问

---

## Claude's Discretion

- Docker Compose 启动顺序和健康检查配置细节
- AIServiceRouter 的具体实现架构
- 10 个 seed profile 的风格偏好/体型/场景分布设计
- 自动化验证脚本的断言规则
- Edge-TTS 预缓存话术列表和缓存失效策略
- Demo Script 校准的具体差异点识别
- PPT 截图设备/分辨率选择
- OBS 录屏参数配置
- 软著材料审校的具体修改方向
- DEMO-CHECKLIST.md 的检查项设计

## Deferred Ideas

None — discussion stayed within phase scope
