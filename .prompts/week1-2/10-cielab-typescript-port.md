# 任务10: CIELAB色彩分析 + CIEDE2000色差 移植到TypeScript

## 你的角色

你是寻裳(AiNeed)项目的算法工程师。项目位于 C:\AiNeed。

## 背景

端侧推理架构要求CIELAB色彩分析和CIEDE2000色差计算在手机端运行。当前实现是Python(numpy)，需要翻译为纯TypeScript（无numpy依赖）。

## 必读文件

1. `ml/services/analysis/color_utils.py` — 完整读取（约450行），这是核心文件
2. `ml/services/analysis/color_season_analyzer.py` — 读取色彩季型相关阈值和面板数据

## 任务

### 1. 创建 TypeScript 版本

创建 `packages/shared/src/color-science/` 目录，实现以下文件：

#### `packages/shared/src/color-science/cielab.ts`

将 color_utils.py 中所有函数翻译为TypeScript。核心函数：

**rgb_to_lab(r, g, b) → {L, a, b}**

```
1. sRGB线性化: 如果值<=0.04045则 v/12.92, 否则 ((v+0.055)/1.055)^2.4
2. 线性RGB转XYZ (D65白点):
   X = 0.4124564*R + 0.3575761*G + 0.1804375*B
   Y = 0.2126729*R + 0.7151522*G + 0.0721750*B
   Z = 0.0193339*R + 0.1191920*G + 0.9503041*B
3. XYZ转CIELAB:
   f(t) = t>δ³ ? ∛t : t/(3δ²) + 4/29, 其中δ=6/29
   L = 116*f(Y/Yn) - 16
   a = 500*(f(X/Xn) - f(Y/Yn))
   b = 200*(f(Y/Yn) - f(Z/Zn))
   D65参考: Xn=0.95047, Yn=1.0, Zn=1.08883
```

**delta_e_ciede2000(lab1, lab2) → number**
完整的CIEDE2000色差公式实现，包含KL/KC/KH加权参数。这个公式很复杂（约100行），确保从color_utils.py逐行翻译，不要简化。

**hex_to_lab(hex) → {L, a, b}**
**lab_to_hex(lab) → string**

#### `packages/shared/src/color-science/season-classifier.ts`

从 color_season_analyzer.py 翻译以下数据：

1. **SEASON_PALETTES** — 12季色彩面板（找到 `_SEASON_PALETTES` 字典，约第228-387行）
2. **分类函数**：
   - `_classify_tone(l, a, b, ita)` → "warm"/"cool"/"neutral"
   - `_classify_depth(l)` → "light"/"deep"
   - `_classify_chroma(c)` → "bright"/"muted"
   - `_determine_season(tone, depth, chroma)` → 季型枚举

3. **compute_ita(lab)** — ITA角度计算（用于肤色判定）

4. **is_skin_pixel_cielab(L, a, b)** — CIELAB空间的皮肤像素检测

### 2. 导出

在 `packages/shared/src/index.ts` 中添加导出：

```typescript
export * from "./color-science/cielab";
export * from "./color-science/season-classifier";
```

### 3. 单元测试

创建 `packages/shared/src/color-science/__tests__/cielab.test.ts`：

```typescript
describe("CIELAB", () => {
  test("rgb_to_lab: pure red", () => {
    const lab = rgb_to_lab(255, 0, 0);
    expect(lab.L).toBeCloseTo(53.23, 1);
    expect(lab.a).toBeCloseTo(80.11, 0);
    expect(lab.b).toBeCloseTo(67.22, 0);
  });

  test("rgb_to_lab: white", () => {
    const lab = rgb_to_lab(255, 255, 255);
    expect(lab.L).toBeCloseTo(100, 0);
    expect(lab.a).toBeCloseTo(0, 0);
    expect(lab.b).toBeCloseTo(0, 0);
  });

  test("rgb_to_lab: black", () => {
    const lab = rgb_to_lab(0, 0, 0);
    expect(lab.L).toBeCloseTo(0, 0);
  });

  test("delta_e_ciede2000: identical colors", () => {
    const lab = { L: 50, a: 30, b: -20 };
    expect(delta_e_ciede2000(lab, lab)).toBeCloseTo(0, 5);
  });

  test("delta_e_ciede2000: known pair", () => {
    // CIEDE2000测试用例 — 两个相近的Lab值
    const lab1 = { L: 50.0, a: 2.6772, b: -79.7751 };
    const lab2 = { L: 50.0, a: 0.0, b: -82.7485 };
    // 预期值来自CIEDE2000论文测试集
    expect(delta_e_ciede2000(lab1, lab2)).toBeCloseTo(2.0425, 2);
  });

  test("hex_to_lab roundtrip", () => {
    const hex = "#FF6B6B";
    const lab = hex_to_lab(hex);
    const roundtrip = lab_to_hex(lab);
    // 允许1个色值误差
    expect(roundtrip).toBeCloseToHex(hex, 1);
  });
});
```

### 4. 翻译精度验证

对比Python和TypeScript的输出，确保关键函数的精度误差<0.01。

用以下测试值：

- rgb_to_lab(255, 0, 0) — 纯红
- rgb_to_lab(0, 255, 0) — 纯绿
- rgb_to_lab(0, 0, 255) — 纯蓝
- rgb_to_lab(128, 128, 128) — 中灰
- delta_e_ciede2000({L:50,a:2.68,b:-79.78}, {L:50,a:0,b:-82.75})

## 验证标准

- [ ] packages/shared/src/color-science/cielab.ts 创建
- [ ] rgb_to_lab/lab_to_rgb/delta_e_ciede2000/hex_to_lab/lab_to_hex 全部实现
- [ ] season-classifier.ts 包含12季面板+分类函数
- [ ] 单元测试通过
- [ ] delta_e_ciede2000 精度与Python版本误差<0.01
- [ ] 无numpy/外部依赖，纯TypeScript
