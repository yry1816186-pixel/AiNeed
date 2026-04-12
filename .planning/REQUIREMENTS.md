# Requirements: AiNeed

**Defined:** 2026-04-13
**Core Value:** 基于用户画像的精准 AI 穿搭推荐，用多模态 API 生成换装效果图

## MVP Requirements (v1)

### Phase 1: 用户画像 & 风格测试

- [ ] **PROF-01**: 用户能填写身体数据（身高/体重/体型/肤色/脸型）并持久化到 UserProfile
- [ ] **PROF-02**: 新用户通过多步骤风格测试问卷（场合偏好/色彩偏好/风格关键词）
- [ ] **PROF-03**: 风格测试结果生成 StyleProfile 并可视化展示
- [ ] **PROF-04**: 用户能随时编辑和更新个人画像信息
- [ ] **PROF-05**: 移动端有完整的画像展示和编辑页面

### Phase 2: AI 造型师

- [ ] **AIS-01**: 用户能与 AI 造型师进行多轮文字对话获取穿搭建议
- [ ] **AIS-02**: AI 造型师基于用户体型、肤色、风格偏好推荐完整穿搭方案
- [ ] **AIS-03**: AI 造型师集成天气数据，推荐适合当前天气的服装
- [ ] **AIS-04**: 对话历史保存，用户关闭 App 后能恢复之前的对话
- [ ] **AIS-05**: AI 回复经过安全过滤，不包含不当内容
- [ ] **AIS-06**: GLM API 调用有限流和降级机制

### Phase 3: 虚拟试衣

- [ ] **VTO-01**: 用户能上传个人照片（正面全身照）用于试衣
- [ ] **VTO-02**: 选择推荐服装后，系统调用 GLM 图生图 API 生成换装效果图
- [ ] **VTO-03**: 换装效果在 30 秒内返回，有实时进度提示（WebSocket + 轮询）
- [ ] **VTO-04**: 试衣结果保存到历史记录，用户能随时查看
- [ ] **VTO-05**: 同一照片+服装组合有缓存，不重复调用 API
- [ ] **VTO-06**: 试衣图保存在 MinIO，可分享和下载

### Phase 4: 推荐引擎

- [ ] **REC-01**: 首页展示"为你推荐"信息流，基于用户画像和风格偏好
- [ ] **REC-02**: 查看商品时展示"搭配推荐"（上下装、配饰）
- [ ] **REC-03**: 新用户完成风格测试后立即看到相关推荐
- [ ] **REC-04**: 用户的收藏/试衣/购买行为能改善推荐精准度
- [ ] **REC-05**: 推荐结果包含色彩搭配评分

### Phase 5: 电商闭环

- [ ] **COMM-01**: 用户能按分类、价格、品牌筛选商品
- [ ] **COMM-02**: 购物车支持选尺码/颜色，能修改数量
- [ ] **COMM-03**: 支持支付宝支付集成
- [ ] **COMM-04**: 支付后收到订单确认，能查看订单状态（确认/发货/完成）
- [ ] **COMM-05**: 商家能管理商品（创建/编辑/上下架）
- [ ] **COMM-06**: 商家能管理订单（确认/发货/完成）

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROF-01 | Phase 1 | Pending |
| PROF-02 | Phase 1 | Pending |
| PROF-03 | Phase 1 | Pending |
| PROF-04 | Phase 1 | Pending |
| PROF-05 | Phase 1 | Pending |
| AIS-01 | Phase 2 | Pending |
| AIS-02 | Phase 2 | Pending |
| AIS-03 | Phase 2 | Pending |
| AIS-04 | Phase 2 | Pending |
| AIS-05 | Phase 2 | Pending |
| AIS-06 | Phase 2 | Pending |
| VTO-01 | Phase 3 | Pending |
| VTO-02 | Phase 3 | Pending |
| VTO-03 | Phase 3 | Pending |
| VTO-04 | Phase 3 | Pending |
| VTO-05 | Phase 3 | Pending |
| VTO-06 | Phase 3 | Pending |
| REC-01 | Phase 4 | Pending |
| REC-02 | Phase 4 | Pending |
| REC-03 | Phase 4 | Pending |
| REC-04 | Phase 4 | Pending |
| REC-05 | Phase 4 | Pending |
| COMM-01 | Phase 5 | Pending |
| COMM-02 | Phase 5 | Pending |
| COMM-03 | Phase 5 | Pending |
| COMM-04 | Phase 5 | Pending |
| COMM-05 | Phase 5 | Pending |
| COMM-06 | Phase 5 | Pending |

**Coverage:** 28 requirements, all mapped to phases.

## v2 (Deferred)

| Feature | Reason |
|---------|--------|
| 社区功能 (发帖/评论/关注) | v1 专注核心 AI 体验 |
| 推送通知 | v2 功能 |
| 微信支付 | v1 先支付宝 |
| 退款流程 | v2 完善 |
| 商家数据看板 | v2 完善 |
| Web 端 | 移动端优先 |
| 国际化 | v1 先中文 |
| 完整监控 (Prometheus/Grafana) | v2 |
| 完整测试覆盖 (80%+) | v2 |

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after roadmap redesign*
