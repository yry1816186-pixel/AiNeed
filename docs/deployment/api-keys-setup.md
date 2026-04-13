# API Keys 配置指南

本文档说明如何配置 xuno 项目所需的各种 API Keys。

## 快速配置清单

| 服务 | 环境变量 | 用途 | 必需性 | 获取地址 |
|------|----------|------|--------|----------|
| GLM API | `GLM_API_KEY` | AI 造型师、风格分析 | **必需** | https://open.bigmodel.cn/ |
| Kolors API | `KOLORS_API_KEY` | 虚拟试衣 | 推荐 | https://kolors.kuaishou.com/ |
| OpenAI API | `OPENAI_API_KEY` | 备选 LLM | 可选 | https://platform.openai.com/ |

---

## 1. GLM API 配置（必需）

GLM 是智谱清言的大语言模型 API，用于 AI 造型师对话和风格分析。

### 获取 API Key

1. 访问 [智谱开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 进入「API Keys」页面
4. 创建新的 API Key

### 配置方式

**方式一：直接配置到后端 .env 文件**

编辑 `apps/backend/.env`：

```env
# GLM API 配置
GLM_API_KEY=your-glm-api-key-here
GLM_API_ENDPOINT=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL=glm-5
```

**方式二：使用系统环境变量（推荐用于生产环境）**

```powershell
# Windows PowerShell (临时)
$env:GLM_API_KEY="your-glm-api-key-here"

# Windows PowerShell (永久 - 用户级别)
[Environment]::SetEnvironmentVariable("GLM_API_KEY", "your-glm-api-key-here", "User")

# Windows CMD (临时)
set GLM_API_KEY=your-glm-api-key-here
```

```bash
# Linux/Mac (临时)
export GLM_API_KEY="your-glm-api-key-here"

# Linux/Mac (永久 - 添加到 ~/.bashrc 或 ~/.zshrc)
echo 'export GLM_API_KEY="your-glm-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

### 模型选择

| 模型 | 特点 | 价格 | 推荐场景 |
|------|------|------|----------|
| `glm-5` | 快速响应 | 最低 | 日常对话、风格分析 |
| `glm-4` | 综合能力 | 中等 | 复杂推理 |
| `glm-4-plus` | 最强能力 | 最高 | 专业场景 |

### 验证配置

```bash
# 启动后端服务
cd apps/backend
pnpm dev

# 测试风格分析 API
curl -X POST http://localhost:3001/api/v1/style/analyze \
  -H "Content-Type: application/json" \
  -d '{"user_input": "小红书同款穿搭"}'
```

---

## 2. 虚拟试衣 API 配置

### 方案 A：Kolors API（推荐）

快手 Kolors 是国内领先的虚拟试衣服务。

**获取 API Key：**
1. 访问 [Kolors 开放平台](https://kolors.kuaishou.com/)
2. 申请 API 接入权限
3. 获取 API Key

**配置：**

```env
# apps/backend/.env
KOLORS_API_KEY=your-kolors-api-key
KOLORS_API_ENDPOINT=https://api.kolors.com/v1/try-on
KOLORS_TIMEOUT=60000
```

### 方案 B：Replicate API（国际）

Replicate 提供多种虚拟试衣模型。

**获取 API Key：**
1. 访问 [Replicate](https://replicate.com/)
2. 注册账号
3. 获取 API Token

**配置：**

```env
# apps/backend/.env
REPLICATE_API_TOKEN=your-replicate-token
```

### 方案 C：Fashn API

专业的虚拟试衣 API 服务。

**获取 API Key：**
1. 访问 [Fashn](https://fashn.ai/)
2. 注册并获取 API Key

**配置：**

```env
# apps/backend/.env
FASHN_API_KEY=your-fashn-api-key
```

---

## 3. OpenAI API 配置（备选）

如果需要使用 OpenAI 作为备选 LLM：

```env
# apps/backend/.env
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

---

## 4. 安全注意事项

### 开发环境

- ✅ `.env` 文件已在 `.gitignore` 中，不会被提交
- ✅ 使用 `.env.example` 作为配置模板

### 生产环境

- ⚠️ **绝不要**将 API Keys 硬编码到代码中
- ⚠️ **绝不要**将 `.env` 文件提交到版本控制
- ✅ 使用环境变量或密钥管理服务（如 AWS Secrets Manager、Azure Key Vault）
- ✅ 定期轮换 API Keys
- ✅ 为不同环境使用不同的 API Keys

### API Key 轮换流程

1. 在服务商平台生成新的 API Key
2. 更新环境变量配置
3. 重启服务
4. 验证服务正常
5. 删除旧的 API Key

---

## 5. 配置验证脚本

运行以下脚本验证配置：

```bash
# 进入后端目录
cd apps/backend

# 检查环境变量
node -e "
const required = ['GLM_API_KEY'];
const optional = ['KOLORS_API_KEY', 'OPENAI_API_KEY'];
console.log('=== 必需配置 ===');
required.forEach(k => console.log(k + ': ' + (process.env[k] ? '✅ 已配置' : '❌ 未配置')));
console.log('\\n=== 可选配置 ===');
optional.forEach(k => console.log(k + ': ' + (process.env[k] ? '✅ 已配置' : '⚠️ 未配置')));
"
```

---

## 6. 常见问题

### Q: GLM API 返回 401 错误

**原因：** API Key 无效或已过期

**解决：**
1. 检查 API Key 是否正确配置
2. 登录智谱开放平台确认 Key 状态
3. 如有必要，重新生成 API Key

### Q: 虚拟试衣返回超时

**原因：** 云端 API 响应较慢

**解决：**
1. 增加 `KOLORS_TIMEOUT` 值（默认 60 秒）
2. 检查网络连接
3. 确认图片 URL 可公开访问

### Q: 如何查看 API 使用量

- **GLM API：** 登录智谱开放平台查看用量统计
- **Kolors API：** 登录快手开放平台查看调用统计

---

## 7. 费用估算

### GLM API 定价（参考）

| 模型 | 输入价格 | 输出价格 |
|------|----------|----------|
| glm-5 | ¥0.001/千tokens | ¥0.001/千tokens |
| glm-4 | ¥0.01/千tokens | ¥0.01/千tokens |

**预估：** 每日 1000 次对话约 ¥2-5

### 虚拟试衣 API 定价（参考）

| 服务商 | 单次价格 | 备注 |
|--------|----------|------|
| Kolors | ¥0.1-0.5/次 | 按图片复杂度 |
| Replicate | $0.01-0.05/次 | 按模型选择 |
| Fashn | $0.02-0.1/次 | 按分辨率 |

**预估：** 每日 100 次试衣约 ¥10-50

---

*最后更新：2026-03-20*
