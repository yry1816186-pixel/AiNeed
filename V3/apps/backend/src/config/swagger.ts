import { DocumentBuilder } from '@nestjs/swagger';

export function createSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('AiNeed API')
    .setDescription(
      'AiNeed V3 - AI私人造型师App API\n\n' +
      '## 认证方式\n' +
      '大部分接口需要 Bearer JWT 认证。在下方点击 **Authorize** 按钮，输入 `Bearer <your-access-token>` 即可。\n\n' +
      '## 响应格式\n' +
      '所有接口统一返回 `{ success, data, error?, meta? }` 格式。\n\n' +
      '## 分页\n' +
      '列表接口支持 `page` / `limit` 查询参数，返回 `meta.total` / `meta.totalPages` 等分页信息。',
    )
    .setVersion('3.3.0')
    .setContact('AiNeed Team', 'https://aineed.com', 'dev@aineed.com')
    .setLicense('UNLICENSED', '')
    .addServer('http://localhost:3001', '本地开发')
    .addServer('https://staging-api.aineed.com', '预发布')
    .addServer('https://api.aineed.com', '生产环境')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '输入 JWT Access Token（无需加 Bearer 前缀，系统自动补充）',
        in: 'header',
      },
      'bearer',
    )
    .addTag('Auth', '认证 - 手机号+短信验证码登录')
    .addTag('Users', '用户 - 个人资料与风格偏好')
    .addTag('Clothing', '服装 - 商品目录与推荐')
    .addTag('Upload', '上传 - 图片文件上传')
    .addTag('Search', '搜索 - 全文+语义混合搜索')
    .addTag('Wardrobe', '衣橱 - 用户服装管理')
    .addTag('Favorites', '收藏 - 收藏/取消收藏')
    .addTag('Avatar', 'Q版形象 - Skia客户端动态渲染')
    .addTag('Stylist', 'AI造型师 - Agent模式对话')
    .addTag('Knowledge', '知识图谱 - Neo4j时尚规则')
    .addTag('Recommendation', '推荐引擎 - 个性化推荐')
    .addTag('Embedding', '向量嵌入 - FashionCLIP+BGE-M3')
    .addTag('Community', '社区 - 帖子/评论/分享')
    .addTag('Social', '社交 - 关注/粉丝')
    .addTag('Messaging', '私信 - 会话与消息')
    .addTag('Notification', '通知 - 系统通知')
    .addTag('Outfit', '搭配 - 搭配方案管理')
    .addTag('OutfitImage', '文生图搭配可视化 - GLM-5图像生成')
    .addTag('BodyAnalysis', '体型分析 - 体型+色彩季型')
    .addTag('Customize', '服装定制 - 设计编辑器')
    .addTag('CustomOrder', '定制订单 - EPROLO POD')
    .addTag('DesignMarket', '设计市集 - 免费分享+定制生产')
    .addTag('Bespoke', '高端私人定制 - 工作室+全流程')
    .addTag('Health', '健康检查 - K8s探针')
    .build();
}
