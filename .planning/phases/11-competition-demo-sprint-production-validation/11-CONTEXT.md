# Phase 11: 比赛演示冲刺 + 生产验证 - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 ensures XUNO has a complete, stable, persuasive demo path for the 互联网+ school competition (May-June 2026):

1. **演示环境搭建** — 本地 Docker 全栈 15 服务跑通 + 模拟器/真机验证 + Demo Script + 边界测试
2. **AI 稳定性双保险** — GLM-4-Flash → GLM-5 fallback 热切换 + Edge-TTS 预缓存 + 10 seed profile + 推荐效果验证
3. **代码质量修复** — 全局 tsc --noEmit 一次性修复所有 TS 编译错误
4. **软著材料打磨** — 现有软著材料审校后提交
5. **评委打动策略** — Demo Script 校准 + PPT 微调 + OBS 录屏 backup + Q&A 补充

验证标准：本地 Docker 全链路零崩溃；Demo Script 2:20 完整走通；tsc --noEmit 零错误；软著材料提交；3 分钟 backup 视频录制完成

**优先级：** 演示稳定性 > 功能新增 > 代码优化

</domain>

<decisions>
## Implementation Decisions

### 演示环境搭建

- **D-01:** 纯本地演示 — 笔记本跑 Docker Compose，模拟器连本地后端。零外部网络依赖，不受比赛现场网络影响
- **D-02:** 全栈 15 服务 — 复用 docker-compose.production.yml（Phase 10 已压缩 memory limit 50%）。包括 Prometheus + Grafana 监控（技术深度展示亮点，虽然演示时不展示，但可用在 PPT 中）
- **D-03:** 模拟器先行 — 先用 Android 模拟器完成所有开发调试，确认稳定后再上真机验证
- **D-04:** 演示前完整预热 — 演示前 10 分钟启动 Docker，等待所有服务健康检查通过，跑一遍完整 demo script 确认缓存热起，reset 数据后开始演示
- **D-05:** 必须预录 backup 视频 — 录制一段完美 3 分钟视频。Live demo 失败时立刻切换，零延迟（应对 Risk R4: Demo 崩溃概率高）
- **D-06:** 纯 App 演示 — 全程在 App 内展示，技术点用 PPT 补充。不中途切换到 Docker Dashboard 或 Grafana
- **D-07:** 新建演示检查清单 — docs/DEMO-CHECKLIST.md，列出 10-15 项检查项（Docker 健康、数据 seeded、缓存热起、音频设备正常等）。演示前逐项确认

### AI 稳定性双保险

- **D-08:** 后端自动 fallback — 新建 AIServiceRouter：请求 GLM-4-Flash → 超时/报错 → 自动重试 1 次 → 仍失败则切 GLM-5。前端无感知。代码改动仅在后端 ML Service 层
- **D-09:** 5 秒超时触发 — GLM 请求超时 5 秒即触发 fallback。比赛场景响应优先，用户体感延迟 < 8 秒
- **D-10:** Fallback 模型为 GLM-5 — 不用 Qwen，保持智谱生态一致性
- **D-11:** Edge-TTS + 预缓存 — 预缓存常见回复语音（问候语、面试流程固定话术），减少实时 TTS 延迟
- **D-12:** 10 个精心构造的 seed profile — 手动构造 10 个用户 profile，每个有完整 onboarding + 衣橱 + 偏好。确保推荐效果惊艳
- **D-13:** 自动化脚本验证推荐效果 — 为每个 seed profile 写自动化脚本，检查输出格式完整性、搭配包含上下装鞋配饰
- **D-14:** 全场景对话打磨 — 打磨所有场景（日常推荐、风格咨询、面试、换装）的对话质量，确保伊伊回复符合人格、不出现禁用词（"亲~"、"根据算法分析"）
- **D-15:** 纯实时 AI — 演示时全部走实时 AI，不预设回复模板。展示真实 AI 能力

### 代码修复 + 软著提交

- **D-16:** 全局 tsc --noEmit 一次性修复 — 不仅修 StyleEvolutionChart.tsx 的 9 个错误，扫描全部编译错误一次性修复
- **D-17:** 软著打磨后提交 — 审校现有 docs/software-copyright/ 材料（application.md + software-manual.md + source-code-excerpt.md），打磨后提交。不等待 demo 完成

### 评委打动策略

- **D-18:** Demo Script 根据实际代码校准 — 已有 2:20 逐秒脚本（8 幕、3 个"哇"时刻），但需要根据当前代码实现状态校准（如 FashionCLIP → FashionSigLIP、匹配度雷达图是否已实现等）
- **D-19:** 微调现有 PPT — 已有 XUNO-FINAL.pptx（15 页三层叙事），仅做细微调整（更新截图、补充实际数据），不重新设计结构
- **D-20:** OBS 录屏 + 后期剪辑 — 模拟器投屏录屏 + 旁白配音。产出 2-3 分钟 MP4 作为 backup + 比赛材料
- **D-21:** 复用 Q-A-PREP.md + 补充追问 — 已有答辩材料覆盖技术/商业/社会价值类问题，根据当前代码状态更新答案，补充更多可能的追问

### 执行优先级

- **D-22:** 按 3 个 Wave 推进：
  - **Wave 1（核心稳定性）:** Docker 全链路跑通 + GLM fallback 实现 + tsc 全局修复
  - **Wave 2（演示打磨）:** 10 seed profile 构造 + 推荐效果验证 + Demo Script 校准 + 对话质量打磨
  - **Wave 3（比赛材料）:** PPT 微调 + backup 视频录制 + 软著提交 + Q&A 补充

### Claude's Discretion

- Docker Compose 启动顺序和健康检查配置
- AIServiceRouter 的具体实现（重试次数、错误分类、日志记录）
- 10 个 seed profile 的具体数据设计（风格偏好、体型、场景分布）
- 自动化验证脚本的具体实现和断言规则
- Edge-TTS 预缓存的具体话术列表和缓存策略
- Demo Script 校准的具体差异点
- PPT 截图的设备和分辨率选择
- OBS 录屏参数和后期剪辑细节
- 软著材料的具体修改内容
- DEMO-CHECKLIST.md 的具体检查项

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 演示环境

- `docker-compose.production.yml` — 生产 Docker Compose（15 服务，已压缩 memory limit）
- `infrastructure/nginx/nginx.conf` — Nginx 配置（TLS + rate limiting）
- `docs/demo-script.md` — Phase 5 Demo 脚本（3 分钟面试穿搭流程，原始版本）
- `docs/PRESENTATION/XUNO-DEMO-SCRIPT.md` — 详细 2:20 逐秒演示脚本（8 幕、3 哇时刻）
- `docs/PRESENTATION/XUNO-DEMO-FALLBACK.md` — Demo 故障恢复方案

### AI 稳定性

- `ml/services/stylist/dialog_engine.py` — DialogEngine + AIService 集成点
- `ml/services/stylist/ai_service.py` — 当前 AI 调用实现（GLM-4-Flash）
- `apps/backend/src/domains/ai/` — 后端 AI 域模块
- `docs/PRESENTATION/seed-user-data.json` — 现有种子用户数据

### 代码修复

- `apps/mobile/src/features/home/components/StyleEvolutionChart.tsx` — 9 个 TS 编译错误待修复

### 软著材料

- `docs/software-copyright/application.md` — 软著申请表
- `docs/software-copyright/software-manual.md` — 软件说明书
- `docs/software-copyright/source-code-excerpt.md` — 源代码文档

### 比赛材料

- `docs/PRESENTATION/PPT-STRUCTURE.md` — PPT 15 页结构
- `docs/PRESENTATION/XUNO-FINAL.pptx` — 现有 PPT
- `docs/PRESENTATION/VIDEO-SCRIPT.md` — 视频脚本
- `docs/PRESENTATION/DEMO-RECORDING-GUIDE.md` — 录屏指南
- `docs/PRESENTATION/Q-A-PREP.md` — 答辩 Q&A 准备
- `docs/PRESENTATION/PITCH-CHEAT-SHEET.md` — Pitch 速查卡

### 项目级

- `docs/XUNO_FINAL_PLAN.md` — 42 冻结决策（#19 互联网+ 5-6 月校赛、#41 软著+商标）
- `.planning/REQUIREMENTS.md` — 全部 PRD 需求
- `.planning/ROADMAP.md` — 10 Phase 路线图
- `.planning/phases/05-e2e-integration-competition-demo/05-CONTEXT.md` — Phase 5 比赛策略
- `.planning/phases/10-production-launch-competition/10-CONTEXT.md` — Phase 10 部署决策

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `docker-compose.production.yml`: 完整 15 服务生产配置，memory limit 已压缩，直接复用
- `nginx.conf`: TLS + security headers + rate limiting，直接复用
- `AIService` (ml/services/stylist/): 当前 GLM-4-Flash 调用实现，新增 fallback 在此基础上扩展
- `DialogEngine`: 状态机 + FashionRuleLoader + StudioSignalDetector，对话打磨修改 prompt 层
- `XUNO-DEMO-SCRIPT.md`: 2:20 逐秒脚本，需校准而非重写
- `Q-A-PREP.md`: 已覆盖技术/商业/社会价值类问答
- `seed-user-data.json`: 已有种子数据格式参考
- `generate_pptx.py`: PPT 生成脚本，微调用

### Established Patterns

- Docker Compose 健康检查 + 依赖顺序 + 资源限制
- NestJS 后端域驱动 + RESTful + Guard 模式（AIServiceRouter 可参考 Guard 模式）
- ML Service Python FastAPI — AI 调用层在 Python 端，fallback 需在 Python 实现
- React Native + Expo 移动端 — 模拟器测试 + 真机验证流程
- Edge-TTS 语音服务 — 预缓存策略需在 ml/services/tts/ 层实现

### Integration Points

- Mobile App → Docker Local API → Backend → ML Service → GLM-4-Flash → (fallback) → GLM-5
- Mobile App → Edge-TTS → 预缓存音频
- Docker Compose 启动 → 健康检查 → seed 数据导入 → 缓存预热 → 演示就绪
- Demo Script → 模拟器录屏 → OBS → MP4 backup
- 软著材料 → 审校 → 提交

</code_context>

<specifics>
## Specific Ideas

- 比赛核心差异化已明确：首页即推荐 + 全年龄段 + AI 角色情感化（全球无完整竞品）
- Demo 的 3 个"哇"时刻：3 套个性化推荐瞬间弹出 → 匹配度雷达图实时优化 → 跨场景记忆"你说过不喜欢高领"
- 竞争情报报告位置：`docs/COMPETITIVE_INTELLIGENCE_REPORT.md`
- 演示情绪曲线设计：紧张 → 释放 → 惊叹 → 惊叹 → 震撼 → 专业 → 感动 → 自信
- 软著 60-90 天审批周期，需尽早提交
- Edge-TTS 预缓存话术优先级：问候语 → 面试固定话术 → 常见推荐解释
- 比赛时间窗口：2026 年 5-6 月校赛，距现在不到 1 个月

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope
</deferred>

---

_Phase: 11-competition-demo-sprint-production-validation_
_Context gathered: 2026-04-26_
