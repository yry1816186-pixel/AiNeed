# AiNeed V3 - 项目宪法

> **版本**: 3.3 | **日期**: 2026-04-12 | **状态**: 执行就绪 (AI核心竞争力+文生图可视化+全流程定制)
> **适用范围**: 所有开发会话(Trae GLM5.1 / Claude Code)必须遵守本文档

---

## 一、项目定义

### 1.0 核心竞争力优先级 (V3.2修正)

| 优先级 | 功能 | 定位 | 说明 |
|--------|------|------|------|
| **#1** | AI造型师+深度个性化推荐 | **核心竞争力** | Agent模式(LLM+规则引擎+知识图谱)，先MVP后迭代微调 |
| **#2** | 文生图搭配可视化+Q版换装 | **重要** | GLM-5文生图生成穿搭效果图+Q版形象颜色类型映射，MVP主力可视化方案 |
| **#3** | 服装定制+设计市集+高端定制 | **差异化** | 核心功能编辑器+EPROLO POD(全Mock)+免费分享市集+全流程高端定制App内集成 |
| **#4** | Q版形象(首页伴侣) | **情绪价值** | MVP极简占位(圆形头+五官+色块)，react-native-skia动态绘制 |
| **#5** | 真实VTO虚拟试衣 | **延后** | 阿里云百炼OutfitAnyone延后到Phase 5+，MVP用文生图替代 |

### 1.1 产品定位

**AiNeed** = AI私人造型师App，面向全球市场（首发中国大陆）。

**核心价值**: AI理解用户意图+画像+衣橱 → 生成5-6件完整搭配方案 → 文生图可视化展示 → Q版形象映射 → 定制生产 → 社区分享

**功能范围**:
- AI造型师对话（GLM-5 Agent模式：LLM+知识图谱+规则引擎，MVP先上后迭代）
- 文生图搭配可视化（GLM-5文生图API生成穿搭效果图，~0.01元/张，MVP主力可视化方案）
- 真实VTO虚拟试衣（延后到Phase 5+，阿里云百炼OutfitAnyone备选）
- Q版个人形象（react-native-skia动态绘制，MVP极简占位，简化颜色+类型映射）
- 服装定制（核心功能编辑器+EPROLO POD全Mock+免费分享设计市集+AI预审审核）
- 高端私人定制（全流程App内集成: 工作室入驻+在线沟通+报价+支付+订单跟踪）
- 设计市集（免费分享设计+仅收定制生产费，AI预审+人工复审防侵权）
- 定制产品不支持退货（质量问题除外）
- 用户衣橱管理
- 完整社区（发帖/关注/私信/评论/分享）
- 电商导购（CPS跳转淘宝/京东）
- 体型分析+色彩季型
- 全文+语义混合搜索

### 1.2 技术栈(锁定)

| 层 | 技术 | 版本 | 备注 |
|----|------|------|------|
| 移动端 | React Native + Expo | SDK 52 | Dev Client模式 |
| 移动端语言 | TypeScript | 5.x | strict mode |
| 状态管理 | Zustand + TanStack Query | 最新 | - |
| 导航 | Expo Router | 最新 | 文件路由 |
| 后端 | NestJS | 11.x | 模块化单体 |
| ORM | Prisma | 6.x | 最新版 |
| 主数据库 | PostgreSQL | 16.x | + pgvector扩展 |
| 缓存 | Redis | 7.x | 会话+缓存 |
| 对象存储 | MinIO | 最新 | S3兼容 |
| 向量数据库 | Qdrant | v1.12+ | FashionCLIP+BGE-M3 |
| 知识图谱 | Neo4j | 5.x | 社区版 |
| 全文搜索 | Elasticsearch | 8.x | + 中文分词插件 |
| AI造型师 | GLM-5 API | 智谱AI | 云端调用 |
| LLM备选 | DeepSeek API | 备选 | Fallback |
| Q版形象渲染 | react-native-skia | Shopify | 动态绘制简化映射 |
| 图案编辑器 | WebView+Canvas | - | 定制图案编辑(上传+定位+缩放+旋转) |
| POD对接 | EPROLO | API | eprolo.com/eprolo-api，1500+产品 |
| 搭配可视化 | GLM-5 文生图API | 智谱AI | 搭配描述→穿搭效果图，~0.01元/张 |
| 视觉嵌入 | FashionCLIP | v1.0 | LoRA微调(延后) |
| 文本嵌入 | BGE-M3 | 最新 | 1024d |
| 搭配兼容性 | NGNN/FGAT | 自训练 | Polyvore数据集 |
| 序列推荐 | SASRec | 自训练 | 行为数据 |
| 色彩分类 | ResNet50 | 自训练 | 2000张标注 |
| 认证 | JWT + bcrypt + SMS | - | 手机号+短信验证码 |
| 容器 | Docker Compose | - | 开发+生产 |

**v3.2关键变更**(相比v3.1):
- **AI造型师升级为Agent模式**: LLM(GLM-5)+规则引擎+知识图谱，先MVP后迭代微调
- **VTO回归真实试穿**: 阿里云百炼OutfitAnyone(~0.50元/张)，非3D模板换装
- **Q版形象简化**: react-native-skia动态绘制(颜色+类型映射)，非Spine/Blender/预渲染
- **POD供应商确定**: EPROLO(eprolo.com/eprolo-api)，API文档公开
- **审美标准**: 混合方案(时尚规则打底+高赞搭配学习+用户反馈迭代)
- **训练数据**: 全部混合(Polyvore公开+LLM合成+小红书爬取+人工标注)
- **MVP不用GPU**: 纯Agent模式调用LLM API，RTX 4060留待后续微调
- **开发节奏**: 全面并行，按Phase计划执行
- 移除: Spine 2D, Blender, MediaPipe Face Mesh, HICUSTOM

### 1.3 项目目录结构

```
C:\AiNeed\V3\
├── apps/
│   ├── backend/                    # NestJS后端
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # 认证(手机号+短信)
│   │   │   │   ├── users/          # 用户管理
│   │   │   │   ├── clothing/       # 服装目录
│   │   │   │   ├── upload/         # 文件上传
│   │   │   │   ├── stylist/        # AI造型师
│   │   │   │   ├── recommendation/ # 推荐引擎
│   │   │   │   ├── knowledge/      # 知识图谱(Neo4j)
│   │   │   │   ├── embedding/      # 向量嵌入
│   │   │   │   ├── body-analysis/  # 体型分析
│   │   │   │   ├── tryon/          # 虚拟试衣(延后到Phase 5+)
│   │   │   │   ├── outfit-image/   # 文生图搭配可视化(NEW)
│   │   │   │   ├── avatar/         # 虚拟形象管理(NEW)
│   │   │   │   ├── avatar-template/# 形象模板管理(NEW)
│   │   │   │   ├── customize/        # 服装定制设计管理(NEW)
│   │   │   │   ├── custom-order/   # 定制订单管理(NEW)
│   │   │   │   ├── design-market/  # 设计市集(NEW)
│   │   │   │   ├── bespoke/        # 高端私人定制全流程(NEW)
│   │   │   │   ├── community/      # 社区帖子
│   │   │   │   ├── social/         # 关注/粉丝
│   │   │   │   ├── messaging/      # 私信
│   │   │   │   ├── notification/   # 通知
│   │   │   │   ├── wardrobe/       # 用户衣橱
│   │   │   │   ├── outfit/         # 搭配方案管理(NEW)
│   │   │   │   ├── favorites/      # 收藏
│   │   │   │   ├── search/         # 搜索
│   │   │   │   └── data-pipeline/  # 数据管线(Phase 5+延后，非独立模块)
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   ├── filters/
│   │   │   │   ├── decorators/
│   │   │   │   ├── interceptors/
│   │   │   │   └── types/
│   │   │   └── config/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── test/
│   ├── mobile/                     # React Native App
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── register.tsx
│   │   │   │   └── phone-verify.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx       # 首页 (Q版形象+推荐)
│   │   │   │   ├── stylist.tsx     # AI造型 (卡片交互式)
│   │   │   │   ├── wardrobe.tsx    # 衣橱 (Q版形象可视化)
│   │   │   │   └── profile.tsx     # 我的
│   │   │   ├── avatar/             # Q版形象页(NEW)
│   │   │   │   ├── create.tsx      # 选择+创建Q版形象
│   │   │   │   ├── edit.tsx        # 编辑形象参数
│   │   │   │   └── showcase.tsx    # 形象展示+换装映射
│   │   │   ├── customize/          # 服装定制页(NEW, 5步向导)
│   │   │   │   ├── select-product.tsx # 步骤1: 选产品类型
│   │   │   │   ├── upload-pattern.tsx # 步骤2: 上传/画图案
│   │   │   │   ├── edit-layout.tsx    # 步骤3: 编辑布局
│   │   │   │   ├── preview.tsx        # 步骤4: 预览效果
│   │   │   │   └── order.tsx          # 步骤5: 确认下单
│   │   │   ├── market/             # 设计市集(NEW)
│   │   │   │   ├── index.tsx       # 市集首页
│   │   │   │   └── [designId].tsx  # 设计详情
│   │   │   ├── clothing/
│   │   │   │   └── [id].tsx
│   │   │   ├── tryon/
│   │   │   │   └── index.tsx
│   │   │   ├── community/           # 社区(小红书风格双列瀑布流)
│   │   │   │   ├── index.tsx        # 社区Feed流(独立页面)
│   │   │   │   ├── [postId].tsx     # 帖子详情
│   │   │   │   ├── create.tsx       # 发帖
│   │   │   │   └── user/[userId].tsx # 用户主页
│   │   │   ├── actions/              # 中间"+"按钮弹出面板
│   │   │   │   └── index.tsx        # 快捷操作(试衣/定制/发帖/高端定制)
│   │   │   ├── bespoke/              # 高端私人定制(全流程App内集成)
│   │   │   │   ├── index.tsx        # 定制首页(工作室列表+服务分类)
│   │   │   │   ├── [studioId].tsx   # 工作室详情页(作品集+服务+评价)
│   │   │   │   ├── submit.tsx       # 提交定制需求(上传照片+描述+预算)
│   │   │   │   ├── chat/[orderId].tsx # 与工作室在线沟通(复用私信)
│   │   │   │   ├── quote/[orderId].tsx # 查看报价+确认+支付
│   │   │   │   └── orders.tsx       # 我的定制订单列表
│   │   │   ├── messages/
│   │   │   │   ├── index.tsx       # 消息列表
│   │   │   │   └── [chatId].tsx    # 聊天详情
│   │   │   ├── search/
│   │   │   │   └── index.tsx
│   │   │   ├── onboarding/
│   │   │   │   └── index.tsx
│   │   │   ├── settings/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── preferences.tsx
│   │   │   │   └── privacy.tsx
│   │   │   └── _layout.tsx
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/             # 基础UI组件
│   │   │   │   ├── avatar/         # 虚拟形象组件(NEW)
│   │   │   │   │   ├── QAvatarRenderer.tsx  # Skia动态绘制
│   │   │   │   └── QAvatarMini.tsx      # 小头像(评论/通知)
│   │   │   │   └── customize/      # 定制组件(NEW)
│   │   │   │       ├── PatternEditor.tsx
│   │   │   │       └── ProductPreview.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   ├── theme/
│   │   │   └── types/
│   │   └── assets/
│   │       └── avatar/             # 形象资源(NEW)
│   │           └── templates/      # 模板缩略图(用于选择界面)
│   └── shared/
│       └── types/
├── avatar-assets/                   # Q版形象资源(NEW)
│   ├── base-avatars/                # 基础Q版形象素材(发型/五官/肤色组件)
│   └── clothing-maps/               # 服装颜色+类型映射配置
├── ml/                             # ML服务
│   ├── services/                   # FastAPI推理服务
│   ├── models/                     # 模型权重
│   ├── data/                       # 数据集
│   ├── training/                   # 训练脚本
│   └── scripts/                    # 工具脚本
├── docker/
│   └── docker-compose.yml
├── docs/
├── data/                           # 种子数据
├── scripts/                        # 项目脚本
├── .env.example
└── README.md
```

---

## 二、数据库Schema

### 2.1 PostgreSQL 核心表 (35张)

```sql
-- ========== 原有20张表 ==========

-- 1. 用户
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  nickname VARCHAR(50),
  avatar_url TEXT,
  gender VARCHAR(10),
  birth_year INT,
  height INT,
  weight INT,
  body_type VARCHAR(20),
  color_season VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user',
  language VARCHAR(10) DEFAULT 'zh',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1a. 用户体型档案
CREATE TABLE body_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  body_type VARCHAR(20),
  color_season VARCHAR(20),
  measurements JSONB,
  analysis_result JSONB,
  source_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_body_profiles_user ON body_profiles(user_id);

-- 2. 用户风格偏好
CREATE TABLE user_style_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  style_tags TEXT[],
  occasion_tags TEXT[],
  color_preferences TEXT[],
  budget_range VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 服装分类
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id),
  sort_order INT DEFAULT 0
);

-- 4. 品牌
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  logo_url TEXT,
  description TEXT
);

-- 5. 服装商品
CREATE TABLE clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  category_id UUID REFERENCES categories(id),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'CNY',
  gender VARCHAR(10),
  seasons TEXT[],
  occasions TEXT[],
  style_tags TEXT[],
  colors TEXT[],
  materials TEXT[],
  fit_type VARCHAR(20),
  image_urls TEXT[],
  source_url TEXT,
  purchase_url TEXT,
  source_name VARCHAR(100),
  embedding VECTOR(1024),  -- 1024维与BGE-M3模型输出一致，对齐Qdrant textual collection
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 搭配方案
CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(200),
  description TEXT,
  occasion VARCHAR(50),
  season VARCHAR(20),
  style_tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 搭配-服装关联
CREATE TABLE outfit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID REFERENCES outfits(id) ON DELETE CASCADE,
  clothing_id UUID REFERENCES clothing_items(id),
  slot VARCHAR(20) NOT NULL,
  sort_order INT DEFAULT 0
);

-- 8. AI聊天会话
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200),
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 聊天消息
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 试衣记录
CREATE TABLE tryon_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clothing_id UUID REFERENCES clothing_items(id),
  source_image_url TEXT NOT NULL,
  result_image_url TEXT,
  provider VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. 用户行为
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clothing_id UUID REFERENCES clothing_items(id),
  interaction_type VARCHAR(20) NOT NULL,
  duration_ms INT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. 用户衣橱
-- 注意: category/color/brand等字段为有意冗余设计，保存添加时的快照，
-- 即使原服装商品信息变更也不影响用户衣橱记录
CREATE TABLE wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clothing_id UUID REFERENCES clothing_items(id),
  custom_name VARCHAR(200),
  image_url TEXT,
  category VARCHAR(50),
  color VARCHAR(50),
  brand VARCHAR(100),
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. 收藏
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

-- 14. 时尚规则
CREATE TABLE style_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  rule_type VARCHAR(20) NOT NULL,
  condition JSONB NOT NULL,
  recommendation TEXT NOT NULL,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 15. 社区帖子
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200),
  content TEXT NOT NULL,
  image_urls TEXT[],
  tags TEXT[],
  outfit_id UUID REFERENCES outfits(id),
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. 帖子评论
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES post_comments(id),
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. 用户关系(关注)
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- 18. 私信会话
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18a. 聊天室参与者
CREATE TABLE chat_room_participants (
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX idx_room_participants_user ON chat_room_participants(user_id);
CREATE INDEX idx_room_participants_room ON chat_room_participants(room_id);

-- 19. 私信消息
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. 通知
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(200),
  content TEXT,
  reference_id UUID,
  reference_type VARCHAR(30),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 新增12张表: Q版形象+服装定制+文生图搭配+高端私人定制 ==========

-- 21. Q版形象模板(Skia绘制用,管理员维护)
CREATE TABLE avatar_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(10) NOT NULL,        -- male/female/neutral
  thumbnail_url VARCHAR(500),         -- 缩略图
  drawing_config JSONB NOT NULL,      -- Skia绘制配置(脸型路径/五官组件ID/肤色色值/发型SVG路径等)
  parameters JSONB NOT NULL,          -- 可调参数定义(脸型值范围/眼型选项/肤色选项/发型选项等)
  default_clothing_map JSONB,         -- 默认服装颜色+类型映射 {slot: {color, type}}
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. 用户Q版形象(每个用户一个活跃形象,客户端Skia实时绘制)
CREATE TABLE user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES avatar_templates(id),
  avatar_params JSONB NOT NULL,       -- 用户个性化参数(脸型值/眼型值/肤色值/发型ID/配饰等)
  clothing_map JSONB,                 -- 当前穿戴映射 {slot: {color, type, pattern}} 换装时更新
  thumbnail_url VARCHAR(500),         -- 头像缩略图(客户端截图上传)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) WHERE is_active = true
);

-- 24. 定制设计(用户创作的图案+产品组合)
CREATE TABLE custom_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  design_data JSONB NOT NULL,         -- 编辑器状态(图案URL/位置/大小/旋转/平铺设置)
  pattern_image_url VARCHAR(500),     -- 原始图案图片URL
  preview_image_url VARCHAR(500),     -- 预览渲染图URL
  product_type VARCHAR(50) NOT NULL,  -- tshirt/hoodie/hat/bag/shoes/phone_case
  product_template_id UUID,           -- 关联产品模板
  is_public BOOLEAN DEFAULT false,    -- 是否发布到设计市集
  price INTEGER,                      -- 市集售价(分), NULL=不出售
  likes_count INTEGER DEFAULT 0,
  purchases_count INTEGER DEFAULT 0,
  tags TEXT[],
  status VARCHAR(20) DEFAULT 'draft', -- draft/under_review/published/rejected/archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. 定制订单
CREATE TABLE custom_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES custom_designs(id),
  product_type VARCHAR(50) NOT NULL,
  material VARCHAR(50) NOT NULL,      -- cotton/polyester/canvas/leather
  size VARCHAR(10) NOT NULL,          -- S/M/L/XL/XXL
  quantity INTEGER DEFAULT 1,
  unit_price INTEGER NOT NULL,        -- 单价(分)
  total_price INTEGER NOT NULL,       -- 总价(分)
  status VARCHAR(20) DEFAULT 'pending', -- pending/paid/producing/shipped/done/refunded
  pod_order_id VARCHAR(100),          -- POD服务商订单号
  tracking_number VARCHAR(100),       -- 物流单号
  shipping_address JSONB NOT NULL,    -- 收货地址
  payment_info JSONB,                 -- 支付信息(脱敏)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. 产品模板(可定制的产品基线)
CREATE TABLE product_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type VARCHAR(50) NOT NULL,
  material VARCHAR(50) NOT NULL,
  base_cost INTEGER NOT NULL,         -- 基础成本(分)
  suggested_price INTEGER NOT NULL,   -- 建议售价(分)
  uv_map_url VARCHAR(500) NOT NULL,   -- UV映射模板图URL
  preview_model_url VARCHAR(500),     -- 3D预览模型URL
  available_sizes TEXT[] NOT NULL,
  print_area JSONB NOT NULL,          -- 可打印区域定义(坐标/尺寸)
  pod_provider VARCHAR(50),           -- POD服务商标识
  pod_product_id VARCHAR(100),        -- POD服务商产品ID
  is_active BOOLEAN DEFAULT true
);

-- 27. 设计点赞
CREATE TABLE design_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES custom_designs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, design_id)
);

-- 27a. 设计举报
CREATE TABLE design_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  design_id UUID NOT NULL REFERENCES custom_designs(id),
  reason VARCHAR(50) NOT NULL,
  description TEXT,
  review_result JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_design_reports_design ON design_reports(design_id);
CREATE INDEX idx_design_reports_status ON design_reports(status);

-- ========== 新增5张表: 高端私人定制(Bespoke) ==========

-- 28. 定制工作室
CREATE TABLE bespoke_studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),              -- 工作室主理人
  name VARCHAR(200) NOT NULL,                              -- 工作室名称
  slug VARCHAR(100) UNIQUE NOT NULL,                       -- URL友好标识
  logo_url VARCHAR(500),
  cover_image_url VARCHAR(500),
  description TEXT,
  city VARCHAR(50),                                        -- 所在城市
  address TEXT,                                             -- 详细地址(可选)
  specialties TEXT[],                                       -- 专长: ['西装','旗袍','汉服','街头','改造']
  service_types TEXT[],                                     -- 服务类型: ['量身定制','面料选购','改衣','设计咨询']
  price_range VARCHAR(20),                                  -- 价格区间: '1000-3000'/ '3000-8000'/ '8000+'
  portfolio_images TEXT[],                                  -- 作品集图片URLs
  rating DECIMAL(3,2) DEFAULT 0,                           -- 平均评分
  review_count INT DEFAULT 0,
  order_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,                       -- 是否通过平台审核
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. 定制订单(高端)
CREATE TABLE bespoke_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES bespoke_studios(id),
  status VARCHAR(20) DEFAULT 'submitted',                  -- submitted/quoted/paid/in_progress/completed/cancelled
  title VARCHAR(200),                                      -- 需求标题
  description TEXT NOT NULL,                                -- 详细需求描述
  reference_images TEXT[],                                  -- 参考图片URLs
  budget_range VARCHAR(50),                                 -- 预算范围
  deadline DATE,                                            -- 期望交付日期
  measurements JSONB,                                       -- 用户身体数据(从body_profile快照)
  assigned_stylist_id UUID REFERENCES users(id),           -- 指定设计师(可选)
  status_history JSONB DEFAULT '[]',                        -- 状态变更历史[{status, at, by, note}]
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. 定制沟通消息
CREATE TABLE bespoke_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES bespoke_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',                 -- text/image/file/quote
  attachments TEXT[],                                       -- 附件URLs
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 31. 定制报价单
CREATE TABLE bespoke_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES bespoke_orders(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES bespoke_studios(id),
  total_price INTEGER NOT NULL,                             -- 总价(分)
  items JSONB NOT NULL,                                     -- 报价明细[{name, description, quantity, unit_price, subtotal}]
  estimated_days INT,                                       -- 预计工期(天)
  valid_until TIMESTAMPTZ,                                  -- 报价有效期
  notes TEXT,                                               -- 补充说明
  status VARCHAR(20) DEFAULT 'pending',                     -- pending/accepted/rejected/expired
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 32. 定制评价
CREATE TABLE bespoke_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES bespoke_orders(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES bespoke_studios(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  images TEXT[],
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)                                          -- 每个订单只能评价一次
);

-- 33. 文生图搭配效果图(NEW)
CREATE TABLE outfit_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outfit_data JSONB NOT NULL,            -- 搭配方案JSON(occasion/items/styleTips等)
  prompt TEXT,                            -- 生成的文生图Prompt
  image_url TEXT,                         -- 结果图URL(MinIO)
  status VARCHAR(20) DEFAULT 'pending',   -- pending/processing/completed/failed
  cost INTEGER DEFAULT 0,                 -- 本次生成成本(分)
  metadata JSONB,                         -- 额外信息(model/cached/retry等)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新增索引
CREATE INDEX idx_outfit_images_user ON outfit_images(user_id, created_at DESC);
CREATE INDEX idx_outfit_images_status ON outfit_images(status);

-- ========== 索引 ==========
-- 原有索引
CREATE INDEX idx_clothing_category ON clothing_items(category_id);
CREATE INDEX idx_clothing_embedding ON clothing_items USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_user_interactions_user ON user_interactions(user_id, created_at DESC);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
CREATE INDEX idx_tryon_results_user ON tryon_results(user_id, created_at DESC);
CREATE INDEX idx_community_posts_user ON community_posts(user_id, created_at DESC);
CREATE INDEX idx_community_posts_featured ON community_posts(is_featured, created_at DESC) WHERE is_featured = true;
CREATE INDEX idx_direct_messages_room ON direct_messages(room_id, created_at ASC);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC) WHERE is_read = false;

-- 新增索引
CREATE INDEX idx_user_avatars_user ON user_avatars(user_id) WHERE is_active = true;
CREATE INDEX idx_custom_designs_user ON custom_designs(user_id, created_at DESC);
CREATE INDEX idx_custom_designs_public ON custom_designs(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX idx_custom_designs_product ON custom_designs(product_type);
CREATE INDEX idx_custom_orders_user ON custom_orders(user_id, created_at DESC);
CREATE INDEX idx_custom_orders_status ON custom_orders(status);
CREATE INDEX idx_product_templates_type ON product_templates(product_type, material);

-- 高端定制索引
CREATE INDEX idx_bespoke_studios_city ON bespoke_studios(city) WHERE is_active = true;
CREATE INDEX idx_bespoke_studios_verified ON bespoke_studios(is_verified, rating DESC) WHERE is_active = true AND is_verified = true;
CREATE INDEX idx_bespoke_orders_user ON bespoke_orders(user_id, created_at DESC);
CREATE INDEX idx_bespoke_orders_studio ON bespoke_orders(studio_id, status);
CREATE INDEX idx_bespoke_orders_status ON bespoke_orders(status);
CREATE INDEX idx_bespoke_messages_order ON bespoke_messages(order_id, created_at ASC);
CREATE INDEX idx_bespoke_quotes_order ON bespoke_quotes(order_id, created_at DESC);
CREATE INDEX idx_bespoke_reviews_studio ON bespoke_reviews(studio_id, created_at DESC);

-- 补充索引(社区/收藏/服装)
CREATE INDEX idx_post_comments_post ON post_comments(post_id, created_at ASC);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_favorites_target ON favorites(target_type, target_id);
CREATE INDEX idx_clothing_brand ON clothing_items(brand_id);
CREATE INDEX idx_clothing_active_gender ON clothing_items(gender) WHERE is_active = true;
CREATE INDEX idx_community_posts_status ON community_posts(status);
```

### 2.2 Neo4j Schema

```cypher
// 节点类型
(:Color {id, name, hex, category})
(:Style {id, name, description})
(:Occasion {id, name, requirements})
(:BodyType {id, name, recommendations})
(:Season {id, name})
(:Fabric {id, name, properties})
(:Trend {id, name, keywords, ttl})
(:Clothing {id, name, category})

// 关系类型
(:Color)-[:COMPLEMENTS {strength}]->(:Color)
(:Color)-[:CONFLICTS_WITH {strength}]->(:Color)
(:Style)-[:PAIRS_WELL_WITH {strength}]->(:Style)
(:Occasion)-[:REQUIRES]->(:Style)
(:Occasion)-[:FORBIDS]->(:Clothing)
(:BodyType)-[:SUITABLE_FOR]->(:Clothing)
(:BodyType)-[:AVOID_FOR]->(:Clothing)
(:Season)-[:RECOMMENDS_COLOR]->(:Color)
(:Season)-[:RECOMMENDS_FABRIC]->(:Fabric)
(:Trend)-[:FEATURES]->(:Style)
(:Clothing)-[:BELONGS_TO_STYLE]->(:Style)
(:Clothing)-[:HAS_COLOR]->(:Color)
```

### 2.3 Qdrant Collections

```
clothing_items:   visual(512) + textual(1024) + fused(256)
outfit_templates: fused(256)
community_posts:  semantic(512)
fashion_knowledge: semantic(512)
user_embeddings:  preference(256)
custom_designs:   semantic(512)            -- NEW: 设计图案语义搜索
outfit_images: semantic(512) -- NEW: 文生图搭配效果图语义搜索
```

---

## 三、API契约

### 3.1 通用约定

- 基础路径: `/api/v1`
- 认证: Bearer Token (JWT)
- 响应格式:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: { code: string; message: string };
  meta?: { total?: number; page?: number; limit?: number };
}
```

### 3.2 端点清单

**认证**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /auth/send-code | 发送短信验证码 | 无 |
| POST | /auth/verify-code | 验证码登录/注册 | 无 |
| POST | /auth/refresh | 刷新Token | 无 |
| POST | /auth/logout | 登出 | 需要 |

**用户**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /users/me | 当前用户 | 需要 |
| PATCH | /users/me | 更新资料 | 需要 |
| POST | /users/me/avatar | 上传头像 | 需要 |
| PUT | /users/me/preferences | 更新风格偏好 | 需要 |
| GET | /users/:id/profile | 用户公开主页 | 可选 |

**服装**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /clothing | 创建服装(管理员) | 需要 |
| GET | /clothing | 列表(分页+过滤) | 可选 |
| GET | /clothing/:id | 详情 | 可选 |
| GET | /clothing/recommend | 个性化推荐 | 需要 |
| GET | /clothing/search | 搜索(ES+Qdrant) | 可选 |
| GET | /clothing/home-feed | 首页Feed | 可选 |
| POST | /interactions | 记录用户行为 | 需要 |

**AI造型师**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /stylist/sessions | 创建会话 | 需要 |
| GET | /stylist/sessions | 会话列表 | 需要 |
| GET | /stylist/sessions/:id | 会话详情 | 需要 |
| DELETE | /stylist/sessions/:id | 删除会话 | 需要 |
| POST | /stylist/sessions/:id/messages | 发送消息 | 需要 |
| GET | /stylist/sessions/:id/stream | SSE流式 | 需要 |

**Q版形象 (Skia客户端渲染)**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /avatar/templates | 可用形象模板列表 | 需要 |
| POST | /avatar/create | 选择模板+参数创建形象 | 需要 |
| GET | /avatar/me | 获取当前用户形象参数 | 需要 |
| PATCH | /avatar/me | 更新形象参数(脸型/发型/肤色等) | 需要 |
| POST | /avatar/me/dress | 换装(更新clothing_map颜色+类型映射) | 需要 |
| POST | /avatar/me/thumbnail | 客户端截图上传缩略图 | 需要 |
> **管理员端点** (POST/PATCH/DELETE /avatar/templates) 由 AV2 Session实现，用于模板管理，不在此公开API清单中列出。

**虚拟试衣(延后到Phase 5+)**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /tryon | 发起试衣(云端API) | 需要 |
| GET | /tryon/:id | 查询结果 | 需要 |
| GET | /tryon/history | 历史记录 | 需要 |

**文生图搭配可视化 (NEW)**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /outfit-image/generate | 根据搭配方案生成穿搭效果图 | 需要 |
| GET | /outfit-image/:id | 获取生成结果 | 需要 |
| GET | /outfit-image/history | 历史记录 | 需要 |

**服装定制**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /customize/templates | 可定制产品模板 | 需要 |
| POST | /customize/designs | 保存设计 | 需要 |
| GET | /customize/designs | 我的设计列表 | 需要 |
| GET | /customize/designs/:id | 设计详情 | 需要 |
| PATCH | /customize/designs/:id | 更新设计 | 需要 |
| DELETE | /customize/designs/:id | 删除设计 | 需要 |
| POST | /customize/designs/:id/preview | 渲染预览图 | 需要 |
| POST | /customize/designs/:id/publish | 发布到市集(免费分享) | 需要 |

**定制订单**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /custom-orders | 创建订单(EPROLO全Mock) | 需要 |
| GET | /custom-orders | 我的订单 | 需要 |
| GET | /custom-orders/:id | 订单详情 | 需要 |
| PATCH | /custom-orders/:id/cancel | 取消订单 | 需要 |

**设计市集(免费分享+仅收定制费)**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /market/designs | 市集设计列表 | 可选 |
| GET | /market/designs/:id | 设计详情 | 可选 |
| POST | /market/designs/:id/like | 点赞 | 需要 |
| GET | /market/designs/:id/reviews | 设计评价 | 可选 |
| POST | /market/designs/:id/report | 举报侵权(AI预审) | 需要 |

**高端私人定制(全流程App内集成)**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /bespoke/studios | 工作室列表(分类+排序) | 可选 |
| GET | /bespoke/studios/:id | 工作室详情(作品集+服务+评价) | 可选 |
| POST | /bespoke/orders | 提交定制需求(照片+描述+预算) | 需要 |
| GET | /bespoke/orders | 我的定制订单 | 需要 |
| GET | /bespoke/orders/:id/messages | 获取沟通记录(需JWT) | 需要 |
| GET | /bespoke/orders/:id | 定制订单详情 | 需要 |
| POST | /bespoke/orders/:id/message | 与工作室沟通(复用私信) | 需要 |
| GET | /bespoke/orders/:id/quote | 查看报价 | 需要 |
| POST | /bespoke/orders/:id/accept-quote | 接受报价并支付 | 需要 |
| PATCH | /bespoke/orders/:id/cancel | 取消定制 | 需要 |
| POST | /bespoke/studios | 工作室入驻申请(需JWT) | 需要 |
| PATCH | /bespoke/studios/:id | 更新工作室信息(需JWT+所有者) | 需要 |
| POST | /bespoke/studios/:id/review | 评价工作室 | 需要 |
| POST | /bespoke/orders/:id/quotes | 工作室提交报价(需JWT+工作室所有者) | 需要 |
| GET | /bespoke/studio/orders | 工作室收到的新订单(需JWT+工作室角色) | 需要 |
| PATCH | /bespoke/studio/orders/:id/status | 工作室更新订单状态(需JWT+工作室角色) | 需要 |

**体型分析**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /body-analysis/analyze | 上传照片分析体型 | 需要 |
| GET | /body-analysis/profile | 获取体型档案 | 需要 |

**衣橱**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /wardrobe | 我的衣橱 | 需要 |
| POST | /wardrobe | 添加到衣橱 | 需要 |
| GET | /wardrobe/stats | 衣橱统计 | 需要 |
| DELETE | /wardrobe/:id | 从衣橱移除 | 需要 |

**搭配方案**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /outfits | 创建搭配方案 | 需要 |
| GET | /outfits | 我的搭配列表 | 需要 |
| GET | /outfits/:id | 搭配详情(含items) | 可选 |
| PATCH | /outfits/:id | 更新搭配 | 需要 |
| DELETE | /outfits/:id | 删除搭配 | 需要 |
| POST | /outfits/:id/items | 添加服装到搭配 | 需要 |
| DELETE | /outfits/:id/items/:itemId | 从搭配移除服装 | 需要 |

**收藏**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /favorites | 收藏/取消 | 需要 |
| GET | /favorites | 收藏列表 | 需要 |

**社区**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /community/posts | 帖子信息流 | 可选 |
| POST | /community/posts | 发帖 | 需要 |
| GET | /community/posts/:id | 帖子详情 | 可选 |
| DELETE | /community/posts/:id | 删除帖子 | 需要 |
| POST | /community/posts/:id/like | 点赞 | 需要 |
| POST | /community/posts/:id/comment | 评论 | 需要 |
| GET | /community/posts/:id/comments | 评论列表 | 可选 |
| POST | /community/posts/:id/share | 分享 | 需要 |

**社交**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /social/follow/:userId | 关注 | 需要 |
| DELETE | /social/follow/:userId | 取关 | 需要 |
| GET | /social/followers | 粉丝列表 | 需要 |
| GET | /social/following | 关注列表 | 需要 |
| GET | /social/users/:id/profile | 用户主页 | 可选 |

**私信**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /messages/rooms | 会话列表 | 需要 |
| POST | /messages/rooms | 创建会话 | 需要 |
| GET | /messages/rooms/:id | 消息历史 | 需要 |
| POST | /messages/rooms/:id | 发送消息 | 需要 |

**通知**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /notifications | 通知列表 | 需要 |
| PATCH | /notifications/:id/read | 标记已读 | 需要 |
| PATCH | /notifications/read-all | 全部已读 | 需要 |

**上传**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /upload/image | 上传图片 | 需要 |

**管理员(Admin CRUD)**
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /admin/categories | 分类列表 | 需要Admin |
| POST | /admin/categories | 创建分类 | 需要Admin |
| PATCH | /admin/categories/:id | 更新分类 | 需要Admin |
| DELETE | /admin/categories/:id | 删除分类 | 需要Admin |
| GET | /admin/brands | 品牌列表 | 需要Admin |
| POST | /admin/brands | 创建品牌 | 需要Admin |
| PATCH | /admin/brands/:id | 更新品牌 | 需要Admin |
| DELETE | /admin/brands/:id | 删除品牌 | 需要Admin |
| GET | /admin/style-rules | 风格规则列表 | 需要Admin |
| POST | /admin/style-rules | 创建风格规则 | 需要Admin |
| PATCH | /admin/style-rules/:id | 更新风格规则 | 需要Admin |
| DELETE | /admin/style-rules/:id | 删除风格规则 | 需要Admin |
| GET | /admin/product-templates | 产品模板列表 | 需要Admin |
| POST | /admin/product-templates | 创建产品模板 | 需要Admin |
| PATCH | /admin/product-templates/:id | 更新产品模板 | 需要Admin |
| DELETE | /admin/product-templates/:id | 删除产品模板 | 需要Admin |

### 3.3 共享TypeScript类型

```typescript
// enums.ts
export enum Gender { Male = 'male', Female = 'female', Other = 'other' }
export enum Season { Spring = 'spring', Summer = 'summer', Autumn = 'autumn', Winter = 'winter' }
export enum Occasion { Work = 'work', Casual = 'casual', Date = 'date', Sport = 'sport', Formal = 'formal', Party = 'party' }
export enum ClothingSlot { Top = 'top', Bottom = 'bottom', Outer = 'outer', Shoes = 'shoes', Accessory = 'accessory', Dress = 'dress' }
export enum InteractionType { View = 'view', Click = 'click', Favorite = 'favorite', TryOn = 'tryon', Share = 'share' }
export enum AvatarAnimationType { Idle = 'idle', Happy = 'happy', Wave = 'wave', Walk = 'walk', TryOn = 'tryon', Pose1 = 'pose1', Pose2 = 'pose2', Pose3 = 'pose3', Think = 'think', Heart = 'heart' } // 客户端Skia本地动画，非预渲染
export enum CustomOrderStatus { Pending = 'pending', Paid = 'paid', Producing = 'producing', Shipped = 'shipped', Done = 'done', Refunded = 'refunded' }
export enum ProductType { TShirt = 'tshirt', Hoodie = 'hoodie', Hat = 'hat', Bag = 'bag', Shoes = 'shoes', PhoneCase = 'phone_case' }

// models.ts
export interface User {
  id: string; phone?: string; email?: string; nickname?: string;
  avatarUrl?: string; gender?: Gender; height?: number; weight?: number;
  bodyType?: string; colorSeason?: string; role?: string; language?: string;
}

export interface ClothingItem {
  id: string; brandId?: string; categoryId: string;
  name: string; description?: string; price?: number;
  originalPrice?: number; purchaseUrl?: string;
  gender?: Gender; seasons: Season[]; occasions: Occasion[];
  styleTags: string[]; colors: string[]; materials: string[];
  fitType?: string; imageUrls: string[];
}

export interface CommunityPost {
  id: string; userId: string; title?: string; content: string;
  imageUrls: string[]; tags: string[]; outfitId?: string;
  likesCount: number; commentsCount: number; sharesCount: number;
  isFeatured: boolean; createdAt: string;
  user?: { id: string; nickname: string; avatarUrl?: string };
}

export interface ChatMessage {
  id: string; sessionId: string; role: 'user' | 'assistant' | 'system';
  content: string; metadata?: Record<string, unknown>; createdAt: string;
}

export interface Outfit {
  id: string; userId: string; name?: string; description?: string;
  occasion?: string; season?: string; items: OutfitItem[];
  isPublic: boolean; likesCount: number;
}

export interface TryOnResult {
  id: string; userId: string; clothingId: string;
  sourceImageUrl: string; resultImageUrl?: string;
  provider: string; status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface Notification {
  id: string; userId: string; type: string;
  title?: string; content?: string;
  referenceId?: string; referenceType?: string;
  isRead: boolean; createdAt: string;
}

export interface OutfitItem {
  id: string; outfitId: string; clothingId: string;
  slot: ClothingSlot; sortOrder: number;
}

export interface ChatRoom {
  id: string; createdAt: string;
  participants?: User[];
  lastMessage?: DirectMessage;
}

export interface DirectMessage {
  id: string; roomId: string; senderId: string;
  content: string; messageType: 'text' | 'image' | 'file';
  isRead: boolean; createdAt: string;
}

export interface PostComment {
  id: string; postId: string; userId: string;
  parentId?: string; content: string;
  likesCount: number; createdAt: string;
  user?: { id: string; nickname: string; avatarUrl?: string };
}

export interface WardrobeItem {
  id: string; userId: string; clothingId: string;
  customName?: string; imageUrl?: string;
  category?: string; color?: string;
  brand?: string; notes?: string; addedAt: string;
}

export interface UserInteraction {
  id: string; userId: string; clothingId: string;
  interactionType: InteractionType;
  durationMs?: number; context?: Record<string, unknown>;
  createdAt: string;
}

export interface StyleRule {
  id: string; category: string; ruleType: string;
  condition: Record<string, unknown>; recommendation: string;
  priority: number; isActive: boolean;
}

export interface UserFollow {
  id: string; followerId: string; followingId: string;
  createdAt: string;
}

export interface UserStylePreference {
  id: string; userId: string;
  styleTags: string[]; occasionTags: string[];
  colorPreferences: string[]; budgetRange?: string;
}

export interface BespokeMessage {
  id: string; orderId: string; senderId: string;
  content: string; messageType: 'text' | 'image' | 'file' | 'quote';
  attachments: string[]; isRead: boolean; createdAt: string;
}

// 文生图搭配效果图(NEW)
export interface OutfitImage {
  id: string; userId: string;
  outfitData: Record<string, unknown>;
  prompt?: string; imageUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  cost: number; metadata?: Record<string, unknown>;
  createdAt: string;
}

// NEW: Q版形象类型(Skia客户端动态绘制)
export interface AvatarTemplate {
  id: string; name: string; gender: string;
  thumbnailUrl?: string;
  drawingConfig: Record<string, unknown>;  // Skia绘制配置
  parameters: AvatarParameterDefs;
  defaultClothingMap: Record<string, ClothingMapEntry>;
}

export interface AvatarParameterDefs {
  faceShape: { min: number; max: number; default: number; label: string };
  eyeShape: { options: string[]; default: string; label: string };
  skinTone: { options: string[]; default: string; label: string };
  hairStyle: { options: Array<{ id: string; name: string; thumbnailUrl: string }>; default: string };
  hairColor: { options: string[]; default: string };
}

export interface ClothingMapEntry {
  color: string;        // 主色hex
  type: string;         // 服装类型标识(tshirt/jeans/sneakers等)
  pattern?: string;     // 可选图案
}

export interface UserAvatar {
  id: string; userId: string; templateId: string;
  avatarParams: Record<string, unknown>;
  clothingMap?: Record<string, ClothingMapEntry>;  // 当前穿戴映射
  thumbnailUrl?: string;
}

// NEW: 服装定制类型
export interface CustomDesign {
  id: string; userId: string; name: string;
  designData: DesignData; patternImageUrl?: string;
  previewImageUrl?: string; productType: ProductType;
  isPublic: boolean; price?: number;
  likesCount: number; purchasesCount: number;
  tags: string[];
}

export interface DesignData {
  patternId?: string; patternUrl?: string;
  position: { x: number; y: number };
  scale: number; rotation: number;
  tileMode: 'none' | 'repeat' | 'mirror';
  opacity: number;
  filters?: { brightness?: number; contrast?: number; hue?: number };
}

export interface ProductTemplate {
  id: string; productType: ProductType; material: string;
  baseCost: number; suggestedPrice: number;
  uvMapUrl: string; previewModelUrl?: string;
  availableSizes: string[];
  printArea: { x: number; y: number; width: number; height: number };
}

export interface CustomOrder {
  id: string; userId: string; designId: string;
  productType: ProductType; material: string;
  size: string; quantity: number;
  unitPrice: number; totalPrice: number;
  status: CustomOrderStatus;
  podOrderId?: string; trackingNumber?: string;
  shippingAddress: ShippingAddress;
}

export interface ShippingAddress {
  name: string; phone: string;
  province: string; city: string; district: string;
  detail: string; postalCode?: string;
}

// NEW: 高端定制类型
export enum BespokeOrderStatus {
  Submitted = 'submitted', Quoted = 'quoted', Paid = 'paid',
  InProgress = 'in_progress', Completed = 'completed', Cancelled = 'cancelled'
}

export interface BespokeStudio {
  id: string; userId: string; name: string; slug: string;
  logoUrl?: string; coverImageUrl?: string;
  description?: string; city?: string;
  specialties: string[]; serviceTypes: string[];
  priceRange?: string; portfolioImages: string[];
  rating: number; reviewCount: number; orderCount: number;
  isVerified: boolean; isActive: boolean;
}

export interface BespokeOrder {
  id: string; userId: string; studioId: string;
  status: BespokeOrderStatus;
  title?: string; description: string;
  referenceImages: string[]; budgetRange?: string;
  deadline?: string; measurements?: Record<string, number>;
  assignedStylistId?: string;
  statusHistory: Array<{ status: string; at: string; by: string; note?: string }>;
}

export interface BespokeQuote {
  id: string; orderId: string; studioId: string;
  totalPrice: number; items: Array<{
    name: string; description?: string;
    quantity: number; unitPrice: number; subtotal: number;
  }>;
  estimatedDays?: number; validUntil?: string;
  notes?: string; status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface BespokeReview {
  id: string; orderId: string; userId: string; studioId: string;
  rating: number; content?: string; images?: string[];
  isAnonymous: boolean;
}

// api.ts
export interface PaginatedResponse<T> {
  success: true; data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface AuthResponse {
  success: true;
  data: { accessToken: string; refreshToken: string; user: User };
}

// NEW: 补充缺失类型

// -- 枚举 --
export enum TryOnStatus { Pending = 'pending', Processing = 'processing', Completed = 'completed', Failed = 'failed' }
export enum PostStatus { Draft = 'draft', Published = 'published', Archived = 'archived' }
export enum PaymentStatus { Pending = 'pending', Paid = 'paid', Refunded = 'refunded', Failed = 'failed', Cancelled = 'cancelled' }
export enum ErrorCode {
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED_TOKEN = 'AUTH_EXPIRED_TOKEN',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  CLOTHING_NOT_FOUND = 'CLOTHING_NOT_FOUND',
  OUTFIT_NOT_FOUND = 'OUTFIT_NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// -- 接口 --
export interface Favorite {
  id: string; userId: string;
  targetType: string; targetId: string;
  createdAt: string;
}

export interface SearchResult {
  items: Array<ClothingItem | CommunityPost | CustomDesign>;
  total: number;
  page: number;
  limit: number;
  query: string;
  searchType: 'text' | 'semantic' | 'hybrid';
}

export interface BodyAnalysisResult {
  bodyType: string;
  colorSeason: string;
  measurements: Record<string, number>;
  confidence: number;
  recommendations: string[];
}

export interface BodyProfile {
  id: string; userId: string;
  bodyType?: string; colorSeason?: string;
  measurements?: Record<string, number>;
  analysisResult?: BodyAnalysisResult;
  sourceImageUrl?: string;
  createdAt: string; updatedAt: string;
}

export interface ChatRoomParticipant {
  roomId: string; userId: string;
  joinedAt: string;
  user?: Pick<User, 'id' | 'nickname' | 'avatarUrl'>;
}

export interface DesignReport {
  id: string; reporterId: string; designId: string;
  reason: string; description?: string;
  reviewResult?: Record<string, unknown>;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reviewedBy?: string; reviewedAt?: string;
  createdAt: string;
}

// -- DTO --
export interface PaginationDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

---

## 四、ML模型与AI架构

### 4.1 AI造型师架构 (Agent模式，MVP)

```
用户消息 → LLM(GLM-5) → 意图理解+参数提取
    → 规则引擎(知识图谱Neo4j, 1000+条时尚规则)
    → 用户画像分析(风格/体型/肤色/预算/历史)
    → 商品检索排序(PostgreSQL+Qdrant向量搜索)
    → LLM组装回复(含outfit JSON搭配方案)
    → SSE流式输出
```

**迭代路线**: MVP纯Agent → 积累用户数据3个月 → 评估是否微调LLM或训练专用搭配模型

### 4.2 模型清单

| 模型 | 用途 | 参数量 | 训练/微调需求 | 部署方式 | 优先级 |
|------|------|--------|-------------|----------|--------|
| ~~AnyDressing~~ | ~~多件虚拟试穿~~ | - | - | - | **已移除** |
| ~~SMPLify-X~~ | ~~3D人体重建~~ | - | - | - | **已移除** |
| ~~YOLOv8-pose~~ | ~~人体检测~~ | - | - | - | **已移除** |
| ~~MediaPipe Face~~ | ~~面部特征提取~~ | - | - | - | **已移除** |
| FashionCLIP | 服装视觉嵌入 | ~400M | LoRA微调(可延后) | 云端/本地 | **P1** |
| BGE-M3 | 中文文本嵌入 | ~560M | 预训练即可 | 云端/本地 | **P0** |
| NGNN/FGAT | 搭配兼容性 | ~10M | Polyvore训练 | 本地CPU | **P1** |
| SASRec | 序列推荐 | ~5M | 行为数据训练 | 本地CPU | **P1** |
| Color Season | 色彩季型分类 | ~25M | 2000张标注 | 本地GPU/CPU | **P2** |

### 4.3 训练数据策略 (已确认)

| 数据来源 | 用途 | 成本 | 时间 |
|---------|------|------|------|
| Polyvore公开数据集(20万+搭配) | 搭配规则+兼容性 | 免费 | 1周 |
| LLM合成数据(中文搭配描述) | 中文场景训练 | API费用~500元 | 1周 |
| 小红书高赞穿搭爬取 | 本土搭配模式 | 免费(版权风险) | 2周 |
| 时尚专业学生标注500-1000套 | 金标准评估集 | ~1-2万元 | 3-4周 |
| 时尚理论规则(色彩学/体型学) | 规则引擎种子 | 免费 | 1周 |

### 4.4 搭配可视化方案 (V3.3修正)

| 项目 | 方案 |
|------|------|
| MVP方案 | **文生图穿搭效果图** (GLM-5文生图API，~0.01元/张) |
| 工作流程 | AI造型师生成搭配文字描述 → 构造文生图Prompt → 调用GLM-5图像生成 → 返回穿搭效果图 |
| Q版形象换装 | 搭配方案同步映射到Q版形象(颜色+类型)，提供轻量可视化 |
| 真实VTO | **延后到Phase 5+**，阿里云百炼OutfitAnyone(~0.50元/张)待验证需求后对接 |
| 文生图+视频 | **Phase 5+备选**，Kling/可灵图生视频API生成3-5秒动态展示 |

### 4.5 Q版形象方案 (V3.3修正)

| 项目 | 方案 |
|------|------|
| 渲染技术 | react-native-skia 动态绘制 |
| MVP素材 | **极简占位**: 圆形头+简单五官+色块，后续迭代POP MART风格 |
| 映射级别 | 简化(服装颜色+类型，非精确UV纹理) |
| 交互 | 换装结果→首页Q版形象同步更新颜色/类型 |
| 存储 | 无需预渲染动画帧，客户端实时绘制 |
| 成本 | 零(无外包、无GPU、无CDN) |

### 4.6 高端私人定制方案 (V3.3新增)

| 项目 | 方案 |
|------|------|
| 集成程度 | **全流程App内集成** (非轻量入口转微信) |
| 工作室入驻 | 注册+审核+展示页+服务项目+价格区间 |
| 在线沟通 | 复用私信模块(文字+图片) |
| 报价流程 | 工作室发送报价单→用户确认→支付(微信/支付宝) |
| 订单跟踪 | 复用定制订单模块，增加工作室状态更新 |
| 平台角色 | 交易撮合+担保+佣金 |
| 分成模式 | 待定(平台/工作室按比例分成，用户端只付总价) |

### 4.7 设计市集方案 (V3.3新增)

| 项目 | 方案 |
|------|------|
| 分成模式 | **免费分享+仅收定制费** (无设计师分成) |
| 审核机制 | AI预审(图片相似度检测vs已知IP) + 人工复审队列 |
| 退换货 | **不支持退货**(定制产品无法二次销售，质量问题除外) |
| 首饰定制 | **延后**，MVP只做服装+包包+手机壳+帽子 |
| 图案编辑器 | **核心功能**: 上传+拖拽定位+缩放+旋转+文字叠加(不做画笔/滤镜/平铺) |
| EPROLO POD | **MVP全Mock Provider**，上线前再对接真实API |

#### 4.7.1 AI预审技术实现

**审核Pipeline (发布设计时自动触发)**

```
用户发布设计 → 上传图案图片
    │
    ├─ Step 1: 感知哈希去重 (pHash)
    │     · 计算图案的pHash (64-bit)
    │     · 与已有设计的pHash比对 (汉明距离<8 = 疑似重复)
    │     · 快速过滤完全相同/轻微修改的图案
    │     · 耗时: <100ms (纯CPU)
    │
    ├─ Step 2: FashionCLIP语义相似度
    │     · 图案图片 → FashionCLIP embedding (512d向量)
    │     · 在Qdrant custom_designs collection中搜索Top-5最相似
    │     · 相似度>0.92 = 高度相似，标记可疑
    │     · 相似度>0.85 = 中度相似，加入复审队列
    │     · 耗时: ~200ms
    │
    ├─ Step 3: 已知IP库比对
    │     · 数据源: 
    │       · 开源IP数据库(迪士尼/漫威/任天堂等知名IP角色图片)
    │       · 自建黑名单图案库(平台历史违规图案)
    │     · 比对方式: FashionCLIP embedding余弦相似度
    │     · 阈值: 相似度>0.80 = 疑似侵权
    │     · 耗时: ~300ms (Qdrant ANN搜索)
    │
    ├─ Step 4: GLM-5辅助判断 (仅Step 2/3命中时触发)
    │     · 输入: 原始图案 + 相似参考图 + 相似度分数
    │     · Prompt: "判断这个图案是否涉嫌抄袭/侵权以下参考作品"
    │     · 输出: {is_copycat: bool, confidence: float, reason: string}
    │     · 成本: ~¥0.01/次 (仅可疑设计触发)
    │     · 耗时: ~2s
    │
    └─ 综合判定
          · PASS (全部通过) → 直接发布
          · FLAG (可疑但不确定) → 进入人工复审队列
          · REJECT (AI高置信度判定侵权) → 拒绝发布 + 通知用户
```

**预审结果枚举**

```typescript
export enum PreReviewResult {
  PASS = 'pass',         // 通过，直接发布
  FLAG = 'flag',         // 可疑，进入人工复审
  REJECT = 'reject'      // 拒绝，AI高置信度侵权
}

export interface PreReviewDetail {
  result: PreReviewResult;
  phash_duplicate: boolean;           // pHash去重命中
  semantic_similars: Array<{          // 语义相似结果
    designId: string;
    similarity: number;
    reason: string;
  }>;
  ip_matches: Array<{                 // IP库命中
    ipName: string;
    similarity: number;
    category: string;                 // disney/marvel/anime/...
  }>;
  llm_verdict?: {                     // GLM-5判断(仅可疑时)
    isCopycat: boolean;
    confidence: number;               // 0-1
    reason: string;
  };
  reviewed_by?: string;               // 人工复审人(FLAG时)
  reviewed_at?: string;               // 复审时间
}
```

**人工复审队列**

| 触发条件 | 数量预期 | 处理方式 |
|---------|---------|---------|
| pHash重复 | 5-10%/天 | 人工确认是否确实重复 |
| 语义相似度0.85-0.92 | 3-5%/天 | 人工判断是否借鉴 |
| IP库命中0.75-0.80 | 1-2%/天 | 人工确认是否侵权 |
| GLM-5不确定(confidence<0.7) | 1-2%/天 | 人工最终判断 |

**已知IP库构建策略**

| 数据源 | 规模 | 获取方式 | 更新频率 |
|--------|------|----------|---------|
| 知名动漫角色 | ~500个 | 公开图片资源 | 每季度 |
| 品牌Logo | ~1000个 | 品牌官网/商标库 | 每月 |
| 体育IP | ~200个 | 公开资源 | 每季度 |
| 平台黑名单 | 持续增长 | 用户举报积累 | 实时 |

---

## 五、编码标准

### 5.1 通用规则

1. **TypeScript strict mode** - 所有代码必须通过strict检查
2. **零any** - 禁止使用any类型，用unknown或具体类型
3. **函数<50行** - 超过50行必须拆分
4. **文件<500行** - 超过500行必须拆分模块
5. **错误处理** - 每个async函数必须有try/catch
6. **输入验证** - 所有API输入必须验证(class-validator)
7. **不可变数据** - 优先const，使用展开运算符而非直接修改
8. **无console.log** - 使用Logger服务

### 5.2 后端约定

- 模块结构: `.module.ts / .controller.ts / .service.ts / .dto.ts`
- 依赖注入: 构造函数注入
- 数据库: 全部通过Prisma Client
- API响应: 统一使用TransformInterceptor包装
- Count字段更新: 所有count字段(likes_count/comments_count/shares_count等)必须通过Prisma原子操作在同一事务中更新，如: `prisma.x.update({ data: { likesCount: { increment: 1 } } })`，禁止先读后写

### 5.3 移动端约定

- 导航: Expo Router文件路由
- 状态: Zustand全局 + TanStack Query服务端状态
- 缓存: TanStack Query缓存(替代WatermelonDB)
- 样式: StyleSheet.create + 设计Token
- 组件: 函数组件 + Hooks

### 5.4 Git规范

- 分支: main / feature/* / fix/*
- 提交: `feat:` / `fix:` / `refactor:` / `chore:`

---

## 六、环境变量

```env
# 数据库
DATABASE_URL=postgresql://aineed:password@localhost:5432/aineed_v3
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
ELASTICSEARCH_URL=http://localhost:9200

# 认证
JWT_SECRET=your-256-bit-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 对象存储
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=aineed

# AI服务
ZHIPU_API_KEY=your-zhipu-api-key
ZHIPU_MODEL=glm-5
DEEPSEEK_API_KEY=your-deepseek-api-key

# 短信服务
SMS_PROVIDER=aliyun
ALIYUN_SMS_ACCESS_KEY=your-access-key
ALIYUN_SMS_SECRET_KEY=your-secret-key
ALIYUN_SMS_SIGN_NAME=AiNeed
ALIYUN_SMS_TEMPLATE_CODE=SMS_123456

# 支付服务
WECHAT_PAY_APP_ID=
WECHAT_PAY_MCH_ID=
WECHAT_PAY_API_KEY=
WECHAT_PAY_CERT_PATH=
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
PAYMENT_CALLBACK_URL=http://localhost:3001/api/v1/payment/callback

# ML推理服务(精简)
EMBEDDING_SERVICE_URL=http://localhost:8003
BODY_ANALYSIS_URL=http://localhost:8004

# 搭配可视化(文生图)
OUTFIT_IMAGE_API_PROVIDER=zhipu
OUTFIT_IMAGE_API_KEY=your-zhipu-api-key
OUTFIT_IMAGE_API_URL=https://open.bigmodel.cn/api/paas/v4/images/generations

# 虚拟试衣(延后到Phase 5+)
# TRYON_API_PROVIDER=aliyun-bailian
# TRYON_API_KEY=your-tryon-api-key
# TRYON_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation

# Q版形象(Skia客户端渲染，无需服务端)
# 无需额外环境变量

# POD定制服务(EPROLO)
POD_PROVIDER=eprolo
POD_API_KEY=your-eprolo-api-key
POD_API_URL=https://api.eprolo.com

# 应用
APP_PORT=3001
APP_ENV=development
CORS_ORIGIN=*
CDN_BASE_URL=https://cdn.aineed.com

# 限流
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# 监控
SENTRY_DSN=
```

---

## 七、月度成本估算

| 项目 | 月成本 | 说明 |
|------|--------|------|
| 云服务器(2C4G) | ¥200 | 后端+数据库 |
| GLM-5 API | ¥500-2,000 | AI造型师(Agent模式)+文生图搭配可视化 |
| 对象存储(MinIO/阿里OSS) | ¥50-200 | 图片 |
| 阿里云短信 | ¥100-500 | 登录验证 |
| 文生图搭配展示 | ¥10-100 | ~0.01元/张，日均<50张时极低 |
| 域名+SSL | ¥100 | |
| **MVP月总计** | **¥960-3,100** | 无GPU、无VTO API、无外包 |

**成本降低原因**: MVP不做真实VTO(省¥0-500/月)，用文生图替代(~0.01元/张)；Q版形象用Skia客户端渲染(零服务端成本)；AI用Agent模式调API(无需GPU训练)；EPROLO全Mock(无POD API成本)。

**一次性开发成本**:

| 项目 | 成本 | 说明 |
|------|------|------|
| ~~3D头像模板制作~~ | ~~¥5,000-15,000~~ | **已取消**，改用Skia动态绘制 |
| 时尚规则+标注数据 | ¥1,000-2,000 | 规则整理+学生标注 |
| FashionCLIP微调(可选) | ¥500 | 按需，MVP可用预训练模型 |

---

## 八、验证命令

每个会话完成后必须运行:

```bash
# 后端
cd apps/backend
npx tsc --noEmit
npx prisma validate
npm run test

# 移动端
cd apps/mobile
npx tsc --noEmit
npx expo export --dry-run
```

---

*本文档为所有开发会话的强制性参考。任何与本文档冲突的实现都是错误的。*
