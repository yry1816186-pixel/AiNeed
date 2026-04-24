# 轨道 13: AI 开发者证据链

你是 XUNO 项目的文档工程师。你要为"一人+AI=完整产品"叙事构建完整的证据链。

## 为什么这很重要

比赛审计评分 4/10——叙事方向对但证据链断裂。评委不信"我用 AI 开发了"因为没有证据。你必须准备 5 个铁证。

## 要准备的 5 个证据

### 证据 1: 开发日志（基于 git log）

运行以下命令获取数据：

```bash
cd C:/AiNeed
git log --oneline | wc -l                    # 总提交数
git log --format='%H' | xargs -I{} git diff --stat {}~1 {} | grep -E "files? changed" | awk '{files+=$1; inserted+=$4; deleted+=$6} END {print "files:", files, "inserted:", inserted, "deleted:", deleted}'
git log --format='%ai' | head -1              # 首次提交
git log --format='%ai' | tail -1              # 最新提交
git log --format='%aN' | sort | uniq -c       # 贡献者统计
git log --all --format='%ai' --diff-filter=A -- '*.ts' '*.tsx' '*.py' | wc -l  # 新增文件数
```

输出到: `docs/EVIDENCE/dev-stats.md`

格式：

```
## 开发统计
- 总提交数: XXX次
- 总代码行数: XXXX行（新增XXXX + 删除XXXX）
- 文件数: XXX个（.ts + .tsx + .py）
- 开发周期: XXXX年X月X日 ~ XXXX年X月X日 = XX天
- 技术栈: React Native / NestJS / Python (ML)
- 贡献者: 1人 + AI辅助
```

### 证据 2: 关键决策记录（ADR）

文件: `docs/EVIDENCE/decisions.md`

列出 5 个"AI 建议了但被创始人否决/修改"的决策：

```
## ADR-001: 为什么选择FashionCLIP而不是CLIP
- AI建议: 使用OpenAI CLIP（更通用）
- 我的判断: CLIP不懂时尚，FashionCLIP在服装数据上表现更好
- 结果: FashionCLIP在搭配检索上的准确率比通用CLIP高X%

## ADR-002: 为什么砍掉协同过滤
- AI建议: 保留协同过滤作为推荐信号之一
- 我的判断: 冷启动阶段没有用户行为数据，协同过滤只会增加噪音
- 结果: 简化后的规则引擎+向量检索在冷启动阶段表现更稳定

## ADR-003: 为什么用Redis存储对话状态而不是JWT
- AI建议: 在JWT token中编码对话状态
- 我的判断: JWT有大小限制，对话状态可能很长，且需要服务端控制TTL
- 结果: Redis方案支持30分钟TTL + 状态即时更新

## ADR-004: 为什么Onboarding从9选3改为6选2
- AI建议: 更多选择=更精确的嵌入
- 我的判断: 9选3认知负荷太高，6选2完成率更高且嵌入质量够用
- 结果: (预期) 完成率从30%提升到50%+

## ADR-005: 为什么不做月订阅而做一次性购买
- AI建议: 19元/月订阅是SaaS标配
- 我的判断: 穿搭建议没有持续价值，用户不会为"更多推荐"续费
- 结果: (预期) 一次性购买转化率比订阅高3倍
```

### 证据 3: 技术难题解决案例

文件: `docs/EVIDENCE/technical-challenges.md`

选择 1-2 个具体的 bug/难题，展示从发现 → 分析 →AI 辅助 → 验证的过程：

```
## 挑战: FashionCLIP向量漂移问题

### 发现
在部署FashionCLIP ONNX模型时，发现fp32→fp16量化后，
同一张图片的嵌入向量余弦相似度从1.0降到0.92。
这意味着量化后的推荐结果和原版不一致。

### 分析过程
1. 逐层对比fp32和fp16的中间输出
2. 发现最后一层attention权重量化损失最大
3. 64维→32维的关键维度发生了符号翻转

### 解决方案
1. 使用混合精度：前面层fp16，最后一层保持fp32
2. 在ONNX导出时添加 calibration 步骤
3. 量化后跑100个测试case验证余弦相似度>0.98

### AI的角色
- Claude帮助定位了attention层的量化损失
- 我设计了混合精度方案
- 最终验证是手工完成的
```

### 证据 4: AI Prompt 策略文档

文件: `docs/EVIDENCE/prompt-strategy.md`

展示 prompt 从"模糊"到"精确"的迭代过程：

```
## Prompt迭代示例: 生成穿搭规则

### V1（太模糊，输出质量差）
"帮我写一些穿搭规则，覆盖不同体型和场景"

### V2（有结构但不够具体）
"帮我写JSON格式的穿搭规则，每条规则包含：
体型、场景、推荐单品、避免单品、色彩建议"

### V3（精确，输出质量高）
"生成穿搭规则JSON，严格遵循以下格式：
{
  "id": "bt_{bodyType}_{occasion}",
  "body_type": "apple|pear|hourglass|rectangle|inverted-triangle",
  "occasion": "interview|date|travel|commute|seasonal|career",
  "strategy": "一句话策略，从衣服特点出发不描述身体",
  "recommended": {
    "tops": ["具体单品名"],
    "bottoms": ["具体单品名"],
    "shoes": ["具体单品名"]
  },
  "recommended_colors": ["#hex颜色"],
  "avoid_items": ["避免的单品"],
  "tips": "穿着建议，遵循体正面措辞",
  "formality": 0.0-1.0
}
注意：
1. 措辞遵循体正面原则：描述服装不描述身体
2. 每个bodyType-occasion组合至少一条
3. avoid_items不超过3个
4. 颜色必须是hex格式"
```

### 证据 5: 速度对比

文件: `docs/EVIDENCE/speed-comparison.md`

```
## 开发速度对比

| 模块 | 传统预估 | AI辅助实际 | 倍率 |
|------|---------|-----------|------|
| 后端骨架 (NestJS) | 2周 | 3天 | 4.7x |
| 推荐引擎 | 1周 | 2天 | 3.5x |
| ML Pipeline | 2周 | 4天 | 3.5x |
| 移动端UI | 3周 | 5天 | 4.2x |
| 测试 | 1周 | 2天 | 3.5x |
| **总计** | **9周** | **~16天** | **~4x** |

AI贡献度估算:
- 代码生成: ~60%（AI写初稿，我审查修改）
- 架构设计: ~30%（AI提供方案，我做决策）
- Bug修复: ~40%（AI定位问题，我设计修复方案）
- 文档: ~80%（AI生成初稿，我补充细节）
```

## 验收标准

1. 5 个证据文件全部保存在 `docs/EVIDENCE/`
2. 开发统计数据来自真实 git log
3. ADR 中有真实的决策理由（不是编造的）
4. 技术难题案例有具体的技术细节
5. Prompt 迭代展示了从模糊到精确的过程
6. 速度对比有基准参考
