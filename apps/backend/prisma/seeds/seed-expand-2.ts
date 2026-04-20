// @ts-nocheck
import {
  PrismaClient,
  ConsultantStatus,
  ServiceType,
  BookingStatus,
  SenderType,
  MessageType,
  EarningStatus,
  WithdrawalStatus,
  CustomizationType,
  CustomizationStatus,
  ProductTemplateType,
  DesignLayerType,
  SettlementStatus,
  PaymentRecordStatus,
  PaymentStatus,
  MerchantRole,
  BehaviorEventType,
  AiStylistSessionStatus,
} from "@prisma/client";
import { hash } from "../../src/common/security/bcrypt";
import { randomDate, randomInt, randomElement, generatePicsumUrl } from "./utils";

// ==================== Consultant System Data ====================

const CONSULTANT_DEFS = [
  {
    emailKey: "user7@test.com",
    studioName: "Linda优雅造型工作室",
    specialties: ["色彩分析", "职场穿搭", "晚宴造型"],
    yearsOfExperience: 12,
    certifications: [
      { name: "AICI国际形象顾问", year: 2016 },
      { name: "CMB色彩顾问认证", year: 2018 },
    ],
    portfolioCases: [
      {
        title: "职场精英形象重塑",
        description: "为一位金融行业高管打造从日常通勤到商务晚宴的全场景形象方案",
        beforeImage: "https://picsum.photos/seed/case1-before/400/600",
        afterImage: "https://picsum.photos/seed/case1-after/400/600",
      },
      {
        title: "产后妈妈气质回归",
        description: "帮助新手妈妈找回自信，从休闲居家到优雅知性的风格转变",
        beforeImage: "https://picsum.photos/seed/case2-before/400/600",
        afterImage: "https://picsum.photos/seed/case2-after/400/600",
      },
    ],
    rating: 4.8,
    reviewCount: 35,
    bio: "深耕形象顾问行业12年，擅长将法式优雅与东方气质完美融合。曾为数百位职场女性打造专属形象，帮助她们在不同场合自信绽放。我相信，每个人都值得拥有属于自己的风格语言。",
    avatar: "https://picsum.photos/seed/consultant-linda/200/200",
    location: "上海市静安区",
    responseTimeAvg: 45,
  },
  {
    emailKey: "user13@test.com",
    studioName: "美琪形象设计",
    specialties: ["日常穿搭", "色彩搭配", "小个子显高"],
    yearsOfExperience: 8,
    certifications: [
      { name: "日本色彩搭配师二级", year: 2019 },
      { name: "中国形象设计协会认证", year: 2020 },
    ],
    portfolioCases: [
      {
        title: "小个子穿搭秘籍",
        description: "为158cm的上班族女生打造显高10cm的穿搭方案，兼顾职场与日常",
        beforeImage: "https://picsum.photos/seed/case3-before/400/600",
        afterImage: "https://picsum.photos/seed/case3-after/400/600",
      },
      {
        title: "色彩诊断改变人生",
        description: "通过专业色彩分析，帮助客户找到最适合自己的色系，焕然一新",
        beforeImage: "https://picsum.photos/seed/case4-before/400/600",
        afterImage: "https://picsum.photos/seed/case4-after/400/600",
      },
      {
        title: "四季衣橱规划",
        description: "为忙碌的都市白领规划精简高效的四季胶囊衣橱，30件单品搞定全年穿搭",
        beforeImage: "https://picsum.photos/seed/case5-before/400/600",
        afterImage: "https://picsum.photos/seed/case5-after/400/600",
      },
    ],
    rating: 4.6,
    reviewCount: 28,
    bio: "专注小个子女生穿搭8年，深知身材不完美也能穿出高级感。我的理念是：用最少的单品搭配最多的造型，让每一天都精致而不费力。",
    avatar: "https://picsum.photos/seed/consultant-meiqi/200/200",
    location: "杭州市西湖区",
    responseTimeAvg: 60,
  },
  {
    emailKey: "user12@test.com",
    studioName: "志远绅士衣橱",
    specialties: ["男士正装", "商务穿搭", "绅士礼仪"],
    yearsOfExperience: 15,
    certifications: [
      { name: "Savile Row定制顾问", year: 2017 },
      { name: "国际礼仪培训师", year: 2019 },
    ],
    portfolioCases: [
      {
        title: "新郎婚礼全套造型",
        description: "从西装定制到配饰搭配，打造完美婚礼日形象",
        beforeImage: "https://picsum.photos/seed/case6-before/400/600",
        afterImage: "https://picsum.photos/seed/case6-after/400/600",
      },
      {
        title: "职场晋升形象升级",
        description: "帮助中层管理者打造高管级商务形象，从休闲到正式全覆盖",
        beforeImage: "https://picsum.photos/seed/case7-before/400/600",
        afterImage: "https://picsum.photos/seed/case7-after/400/600",
      },
    ],
    rating: 4.9,
    reviewCount: 42,
    bio: "15年男装定制与形象设计经验，曾服务于多位企业高管和公众人物。我坚信，绅士风度从穿搭开始，得体的着装是最无声的自我介绍。",
    avatar: "https://picsum.photos/seed/consultant-zhiyuan/200/200",
    location: "北京市朝阳区",
    responseTimeAvg: 90,
  },
  {
    emailKey: "user25@test.com",
    studioName: "佳怡知性穿搭工作室",
    specialties: ["职场知性", "轻奢简约", "衣橱管理"],
    yearsOfExperience: 6,
    certifications: [
      { name: "AICI国际形象顾问", year: 2020 },
      { name: "衣橱管理师认证", year: 2021 },
    ],
    portfolioCases: [
      {
        title: "30+女性职场进阶穿搭",
        description: "帮助30+职场女性摆脱穿搭困境，打造知性优雅又不失个性的通勤风格",
        beforeImage: "https://picsum.photos/seed/case8-before/400/600",
        afterImage: "https://picsum.photos/seed/case8-after/400/600",
      },
      {
        title: "极简衣橱断舍离",
        description: "将200件单品精简至50件，打造高效胶囊衣橱系统",
        beforeImage: "https://picsum.photos/seed/case9-before/400/600",
        afterImage: "https://picsum.photos/seed/case9-after/400/600",
      },
    ],
    rating: 4.5,
    reviewCount: 18,
    bio: "从金融行业转型形象顾问，深知职场女性的穿搭痛点。擅长用极简理念打造高级感，让每一件衣服都物尽其用。少即是多，是我一直坚持的穿搭哲学。",
    avatar: "https://picsum.photos/seed/consultant-jiayi/200/200",
    location: "深圳市南山区",
    responseTimeAvg: 75,
  },
  {
    emailKey: "user29@test.com",
    studioName: "雅琴名媛造型",
    specialties: ["晚宴造型", "社交穿搭", "奢侈品搭配"],
    yearsOfExperience: 10,
    certifications: [
      { name: "伦敦艺术学院时尚造型", year: 2015 },
      { name: "奢侈品鉴定师", year: 2018 },
    ],
    portfolioCases: [
      {
        title: "慈善晚宴惊艳亮相",
        description: "为企业家夫人打造慈善晚宴全套造型，从礼服到珠宝一站式服务",
        beforeImage: "https://picsum.photos/seed/case10-before/400/600",
        afterImage: "https://picsum.photos/seed/case10-after/400/600",
      },
      {
        title: "品牌活动社交穿搭",
        description: "为时尚博主打造品牌活动社交场景穿搭，兼顾品味与辨识度",
        beforeImage: "https://picsum.photos/seed/case11-before/400/600",
        afterImage: "https://picsum.photos/seed/case11-after/400/600",
      },
      {
        title: "年会造型大改造",
        description: "从日常休闲到年会闪耀，三天完成形象蜕变",
        beforeImage: "https://picsum.photos/seed/case12-before/400/600",
        afterImage: "https://picsum.photos/seed/case12-after/400/600",
      },
    ],
    rating: 4.7,
    reviewCount: 22,
    bio: "专注高端社交场景造型10年，对奢侈品搭配有独到见解。我相信，每一次出场都应该是一次完美的自我表达。让优雅成为习惯，让品味成为标签。",
    avatar: "https://picsum.photos/seed/consultant-yaqin/200/200",
    location: "上海市黄浦区",
    responseTimeAvg: 120,
  },
];

const BOOKING_DEFS = [
  {
    userEmail: "test@example.com",
    consultantEmailKey: "user7@test.com",
    serviceType: "styling_consultation" as ServiceType,
    daysOffset: -25,
    durationMinutes: 90,
    status: "completed" as BookingStatus,
    price: 899,
    depositAmount: 200,
  },
  {
    userEmail: "user5@test.com",
    consultantEmailKey: "user13@test.com",
    serviceType: "color_analysis" as ServiceType,
    daysOffset: -20,
    durationMinutes: 60,
    status: "completed" as BookingStatus,
    price: 599,
    depositAmount: 150,
  },
  {
    userEmail: "user14@test.com",
    consultantEmailKey: "user12@test.com",
    serviceType: "wardrobe_audit" as ServiceType,
    daysOffset: -15,
    durationMinutes: 90,
    status: "completed" as BookingStatus,
    price: 1299,
    depositAmount: 200,
  },
  {
    userEmail: "user15@test.com",
    consultantEmailKey: "user13@test.com",
    serviceType: "styling_consultation" as ServiceType,
    daysOffset: -10,
    durationMinutes: 60,
    status: "completed" as BookingStatus,
    price: 499,
    depositAmount: 100,
  },
  {
    userEmail: "user19@test.com",
    consultantEmailKey: "user25@test.com",
    serviceType: "wardrobe_audit" as ServiceType,
    daysOffset: -5,
    durationMinutes: 90,
    status: "completed" as BookingStatus,
    price: 999,
    depositAmount: 150,
  },
  {
    userEmail: "user21@test.com",
    consultantEmailKey: "user29@test.com",
    serviceType: "special_event" as ServiceType,
    daysOffset: -3,
    durationMinutes: 90,
    status: "completed" as BookingStatus,
    price: 1299,
    depositAmount: 200,
  },
  {
    userEmail: "user8@test.com",
    consultantEmailKey: "user7@test.com",
    serviceType: "shopping_companion" as ServiceType,
    daysOffset: 5,
    durationMinutes: 60,
    status: "confirmed" as BookingStatus,
    price: 699,
    depositAmount: 150,
  },
  {
    userEmail: "user11@test.com",
    consultantEmailKey: "user13@test.com",
    serviceType: "styling_consultation" as ServiceType,
    daysOffset: 7,
    durationMinutes: 60,
    status: "confirmed" as BookingStatus,
    price: 499,
    depositAmount: 100,
  },
  {
    userEmail: "user16@test.com",
    consultantEmailKey: "user12@test.com",
    serviceType: "styling_consultation" as ServiceType,
    daysOffset: 10,
    durationMinutes: 60,
    status: "pending" as BookingStatus,
    price: 799,
    depositAmount: 150,
  },
  {
    userEmail: "user23@test.com",
    consultantEmailKey: "user25@test.com",
    serviceType: "color_analysis" as ServiceType,
    daysOffset: 12,
    durationMinutes: 60,
    status: "pending" as BookingStatus,
    price: 599,
    depositAmount: 100,
  },
  {
    userEmail: "user9@test.com",
    consultantEmailKey: "user7@test.com",
    serviceType: "wardrobe_audit" as ServiceType,
    daysOffset: -8,
    durationMinutes: 90,
    status: "cancelled" as BookingStatus,
    price: 999,
    depositAmount: 150,
  },
  {
    userEmail: "user17@test.com",
    consultantEmailKey: "user29@test.com",
    serviceType: "special_event" as ServiceType,
    daysOffset: -2,
    durationMinutes: 60,
    status: "completed" as BookingStatus,
    price: 899,
    depositAmount: 200,
  },
];

const CHAT_ROOM_DEFS = [
  {
    userEmail: "test@example.com",
    consultantEmailKey: "user7@test.com",
    messages: [
      {
        senderType: "user" as SenderType,
        content: "你好Linda，我最近换了新工作，需要重新规划职场穿搭，能帮我看看吗？",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "你好！当然可以。先了解一下，你的新工作是什么行业？公司氛围偏正式还是休闲？",
        messageType: "text" as MessageType,
      },
      {
        senderType: "user" as SenderType,
        content: "是金融行业的，感觉应该偏正式一些",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "金融行业确实需要更正式的着装。我给你做了一个初步的职场衣橱方案，你看看：",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "",
        messageType: "proposal" as MessageType,
        imageUrl: "https://picsum.photos/seed/proposal1/600/800",
      },
      {
        senderType: "user" as SenderType,
        content: "这个方案我很喜欢！特别是那套藏青色西装搭配，感觉很适合",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content:
          "藏青色是金融行业的经典选择，比黑色更有层次感。我建议再搭配一条酒红色领带，增加辨识度",
        messageType: "text" as MessageType,
      },
      {
        senderType: "user" as SenderType,
        content: "好的，那我们约个时间详细聊聊吧！",
        messageType: "text" as MessageType,
      },
    ],
  },
  {
    userEmail: "user15@test.com",
    consultantEmailKey: "user13@test.com",
    messages: [
      {
        senderType: "user" as SenderType,
        content: "美琪老师好！我158cm，想学习怎么穿搭显高",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "你好呀！小个子穿搭我太有经验了。先发一张你的日常穿搭照片给我看看？",
        messageType: "text" as MessageType,
      },
      {
        senderType: "user" as SenderType,
        content: "",
        messageType: "image" as MessageType,
        imageUrl: "https://picsum.photos/seed/user15-outfit/400/600",
      },
      {
        senderType: "consultant" as SenderType,
        content:
          "看到了！你现在的穿搭偏宽松，这反而会压个子。我建议：1.提高腰线 2.选择合身版型 3.同色系搭配",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "给你看看我之前帮一个同样身高的客户做的改造方案：",
        messageType: "text" as MessageType,
      },
      {
        senderType: "user" as SenderType,
        content: "哇，效果太明显了！我也要试试高腰阔腿裤",
        messageType: "text" as MessageType,
      },
    ],
  },
  {
    userEmail: "user14@test.com",
    consultantEmailKey: "user12@test.com",
    messages: [
      {
        senderType: "user" as SenderType,
        content: "志远老师，我最近要参加一个重要的商务晚宴，需要一套得体的正装",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "商务晚宴的话，建议选择深色系三件套西装。你的体型偏瘦，我可以推荐一些版型",
        messageType: "text" as MessageType,
      },
      {
        senderType: "user" as SenderType,
        content: "三件套会不会太正式了？",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "商务晚宴恰恰需要这种正式感。马甲可以选择暗纹面料，既正式又有细节",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "",
        messageType: "proposal" as MessageType,
        imageUrl: "https://picsum.photos/seed/proposal2/600/800",
      },
    ],
  },
  {
    userEmail: "user21@test.com",
    consultantEmailKey: "user29@test.com",
    messages: [
      {
        senderType: "user" as SenderType,
        content: "雅琴老师，下周有个品牌发布会要参加，我该穿什么？",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "品牌发布会是展示个人品味的绝佳场合。你平时偏好什么风格？",
        messageType: "text" as MessageType,
      },
      {
        senderType: "user" as SenderType,
        content: "我比较喜欢甜美少女风，但觉得这种场合可能不太合适",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content:
          "可以保留你的甜美元素，但用更高级的方式表达。比如选择一条有设计感的A字裙，搭配精致的配饰",
        messageType: "text" as MessageType,
      },
      {
        senderType: "user" as SenderType,
        content: "听起来不错！能帮我搭配一套吗？",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "当然，我给你准备两套方案，一套偏优雅一套偏时尚，你选喜欢的",
        messageType: "text" as MessageType,
      },
      {
        senderType: "consultant" as SenderType,
        content: "",
        messageType: "proposal" as MessageType,
        imageUrl: "https://picsum.photos/seed/proposal3/600/800",
      },
      {
        senderType: "user" as SenderType,
        content: "两套都好好看！我选第一套优雅风格的，谢谢老师！",
        messageType: "text" as MessageType,
      },
    ],
  },
];

// ==================== Behavior Data ====================

const BEHAVIOR_EVENT_TEMPLATES: Array<{
  eventType: BehaviorEventType;
  category: string;
  action: string;
  metadataFactory: (itemId?: string, userId?: string) => any;
}> = [
  {
    eventType: BehaviorEventType.page_view,
    category: "navigation",
    action: "view",
    metadataFactory: () => ({
      page: randomElement([
        "/home",
        "/explore",
        "/wardrobe",
        "/profile",
        "/community",
        "/cart",
        "/try-on",
        "/stylist",
      ]),
    }),
  },
  {
    eventType: BehaviorEventType.item_view,
    category: "product",
    action: "view",
    metadataFactory: (itemId) => ({
      itemId: itemId || `item-${randomInt(1, 50)}`,
      category: randomElement([
        "tops",
        "bottoms",
        "dresses",
        "outerwear",
        "footwear",
        "accessories",
      ]),
      source: randomElement(["recommendation", "search", "browse"]),
    }),
  },
  {
    eventType: BehaviorEventType.search,
    category: "search",
    action: "query",
    metadataFactory: () => ({
      query: randomElement([
        "法式连衣裙",
        "高腰牛仔裤",
        "羊绒毛衣",
        "通勤穿搭",
        "约会裙",
        "运动鞋",
        "小个子显高",
        "西装外套",
        "秋冬大衣",
        "碎花裙",
        "极简穿搭",
        "男士衬衫",
        "皮衣",
        "针织开衫",
      ]),
      resultCount: randomInt(5, 200),
    }),
  },
  {
    eventType: BehaviorEventType.try_on_start,
    category: "try_on",
    action: "start",
    metadataFactory: (itemId) => ({
      itemId: itemId || `item-${randomInt(1, 50)}`,
      photoId: `photo-${randomInt(1, 20)}`,
    }),
  },
  {
    eventType: BehaviorEventType.try_on_complete,
    category: "try_on",
    action: "complete",
    metadataFactory: (itemId) => ({
      itemId: itemId || `item-${randomInt(1, 50)}`,
      photoId: `photo-${randomInt(1, 20)}`,
    }),
  },
  {
    eventType: BehaviorEventType.favorite,
    category: "product",
    action: "favorite",
    metadataFactory: (itemId) => ({ itemId: itemId || `item-${randomInt(1, 50)}` }),
  },
  {
    eventType: BehaviorEventType.unfavorite,
    category: "product",
    action: "unfavorite",
    metadataFactory: (itemId) => ({ itemId: itemId || `item-${randomInt(1, 50)}` }),
  },
  {
    eventType: BehaviorEventType.add_to_cart,
    category: "commerce",
    action: "add",
    metadataFactory: (itemId) => ({
      itemId: itemId || `item-${randomInt(1, 50)}`,
      color: randomElement(["黑色", "白色", "驼色", "藏青"]),
      size: randomElement(["S", "M", "L", "XL"]),
      quantity: randomInt(1, 3),
    }),
  },
  {
    eventType: BehaviorEventType.remove_from_cart,
    category: "commerce",
    action: "remove",
    metadataFactory: (itemId) => ({
      itemId: itemId || `item-${randomInt(1, 50)}`,
      color: randomElement(["黑色", "白色"]),
      size: randomElement(["S", "M", "L"]),
      quantity: 1,
    }),
  },
  {
    eventType: BehaviorEventType.purchase,
    category: "commerce",
    action: "purchase",
    metadataFactory: () => ({ orderId: `order-${randomInt(1, 30)}`, amount: randomInt(99, 2999) }),
  },
  {
    eventType: BehaviorEventType.recommendation_view,
    category: "recommendation",
    action: "view",
    metadataFactory: () => ({
      type: randomElement(["daily", "occasion", "seasonal", "trending"]),
      itemId: `item-${randomInt(1, 50)}`,
    }),
  },
  {
    eventType: BehaviorEventType.recommendation_click,
    category: "recommendation",
    action: "click",
    metadataFactory: () => ({
      type: randomElement(["daily", "occasion", "seasonal"]),
      itemId: `item-${randomInt(1, 50)}`,
    }),
  },
  {
    eventType: BehaviorEventType.post_create,
    category: "community",
    action: "create",
    metadataFactory: () => ({ postId: `post-${randomInt(1, 30)}` }),
  },
  {
    eventType: BehaviorEventType.post_like,
    category: "community",
    action: "like",
    metadataFactory: () => ({ postId: `post-${randomInt(1, 30)}` }),
  },
  {
    eventType: BehaviorEventType.post_comment,
    category: "community",
    action: "comment",
    metadataFactory: () => ({ postId: `post-${randomInt(1, 30)}` }),
  },
  {
    eventType: BehaviorEventType.user_follow,
    category: "social",
    action: "follow",
    metadataFactory: (_itemId, userId) => ({ userId: userId || `user-${randomInt(1, 30)}` }),
  },
];

const PREFERENCE_WEIGHT_DEFS = [
  {
    category: "style",
    weights: [
      { key: "法式", weight: 0.85 },
      { key: "极简", weight: 0.72 },
      { key: "优雅通勤", weight: 0.68 },
      { key: "韩系", weight: 0.55 },
    ],
  },
  {
    category: "color",
    weights: [
      { key: "驼色", weight: 0.9 },
      { key: "黑色", weight: 0.88 },
      { key: "白色", weight: 0.82 },
      { key: "藏青", weight: 0.75 },
      { key: "酒红", weight: 0.65 },
    ],
  },
  {
    category: "category",
    weights: [
      { key: "tops", weight: 0.75 },
      { key: "dresses", weight: 0.68 },
      { key: "outerwear", weight: 0.62 },
      { key: "bottoms", weight: 0.58 },
      { key: "accessories", weight: 0.45 },
    ],
  },
  {
    category: "brand",
    weights: [
      { key: "cos", weight: 0.8 },
      { key: "zara", weight: 0.72 },
      { key: "uniqlo", weight: 0.65 },
      { key: "xuno-studio", weight: 0.6 },
    ],
  },
  {
    category: "occasion",
    weights: [
      { key: "work", weight: 0.85 },
      { key: "date", weight: 0.7 },
      { key: "casual", weight: 0.6 },
      { key: "party", weight: 0.4 },
    ],
  },
  {
    category: "price",
    weights: [
      { key: "mid_range", weight: 0.7 },
      { key: "budget", weight: 0.5 },
      { key: "premium", weight: 0.35 },
    ],
  },
];

const SEARCH_QUERIES = [
  {
    query: "法式连衣裙",
    filters: { category: "dresses", priceRange: [200, 800], colors: ["白色", "碎花"] },
    results: 87,
  },
  { query: "高腰牛仔裤", filters: { category: "bottoms", priceRange: [150, 500] }, results: 124 },
  {
    query: "羊绒毛衣",
    filters: { category: "tops", priceRange: [300, 1500], colors: ["驼色", "灰色"] },
    results: 56,
  },
  { query: "通勤穿搭", filters: { occasion: "work" }, results: 203 },
  { query: "约会裙", filters: { category: "dresses", priceRange: [300, 1000] }, results: 145 },
  { query: "运动鞋", filters: { category: "footwear", priceRange: [200, 800] }, results: 178 },
  { query: "小个子显高", filters: {}, results: 92 },
  {
    query: "西装外套",
    filters: { category: "outerwear", priceRange: [300, 2000], colors: ["黑色", "藏青"] },
    results: 67,
  },
  {
    query: "秋冬大衣",
    filters: { category: "outerwear", priceRange: [500, 3000], colors: ["驼色", "黑色", "灰色"] },
    results: 43,
  },
  { query: "碎花裙", filters: { category: "dresses", priceRange: [200, 600] }, results: 156 },
  { query: "极简穿搭", filters: { style: "minimalist" }, results: 78 },
  {
    query: "男士衬衫",
    filters: { category: "tops", gender: "male", priceRange: [150, 800] },
    results: 112,
  },
  { query: "皮衣", filters: { category: "outerwear", priceRange: [500, 3000] }, results: 34 },
  {
    query: "针织开衫",
    filters: { category: "tops", priceRange: [200, 800], colors: ["米白", "灰色"] },
    results: 89,
  },
];

const AI_STYLIST_SESSION_DEFS = [
  {
    payload: {
      style: "法式浪漫",
      occasion: "约会",
      budget: "500-1000",
      preferences: ["优雅", "浪漫"],
    },
  },
  {
    payload: {
      style: "职场知性",
      occasion: "通勤",
      budget: "300-800",
      preferences: ["干练", "简约"],
    },
  },
  {
    payload: {
      style: "极简主义",
      occasion: "日常",
      budget: "200-600",
      preferences: ["简约", "质感"],
    },
  },
  {
    payload: {
      style: "韩系甜美",
      occasion: "约会",
      budget: "200-500",
      preferences: ["甜美", "清新"],
    },
  },
  {
    payload: {
      style: "商务精英",
      occasion: "正式",
      budget: "1000-3000",
      preferences: ["正式", "高级"],
    },
  },
  {
    payload: {
      style: "街头潮流",
      occasion: "日常",
      budget: "300-800",
      preferences: ["个性", "潮流"],
    },
  },
  {
    payload: {
      style: "度假风",
      occasion: "度假",
      budget: "300-1000",
      preferences: ["轻松", "浪漫"],
    },
  },
  {
    payload: {
      style: "运动休闲",
      occasion: "运动",
      budget: "200-600",
      preferences: ["舒适", "活力"],
    },
  },
];

// ==================== E-commerce Closure Data ====================

const CUSTOMIZATION_TEMPLATES = [
  {
    type: ProductTemplateType.tshirt,
    name: "纯棉T恤定制",
    description: "100%精梳棉面料，支持全幅印花定制，舒适透气，适合日常穿搭和团队定制",
    imageUrl: "https://picsum.photos/seed/template-tshirt/600/600",
    basePrice: 99.0,
    printableArea: { x: 0.15, y: 0.1, width: 0.7, height: 0.6, maxWidth: 2400, maxHeight: 2800 },
    sortOrder: 1,
  },
  {
    type: ProductTemplateType.hat,
    name: "棒球帽定制",
    description: "6片式棒球帽，可定制帽身和帽檐，适合品牌推广和个人风格表达",
    imageUrl: "https://picsum.photos/seed/template-hat/600/600",
    basePrice: 79.0,
    printableArea: { x: 0.2, y: 0.15, width: 0.6, height: 0.35, maxWidth: 1800, maxHeight: 800 },
    sortOrder: 2,
  },
  {
    type: ProductTemplateType.bag,
    name: "帆布包定制",
    description: "加厚帆布材质，大容量设计，支持双面印花，环保又时尚",
    imageUrl: "https://picsum.photos/seed/template-bag/600/600",
    basePrice: 69.0,
    printableArea: { x: 0.1, y: 0.15, width: 0.8, height: 0.7, maxWidth: 2800, maxHeight: 3200 },
    sortOrder: 3,
  },
  {
    type: ProductTemplateType.phone_case,
    name: "手机壳定制",
    description: "适配iPhone/华为/小米主流机型，高清印花，防摔保护，个性十足",
    imageUrl: "https://picsum.photos/seed/template-phonecase/600/600",
    basePrice: 49.0,
    printableArea: { x: 0.05, y: 0.05, width: 0.9, height: 0.9, maxWidth: 1200, maxHeight: 2400 },
    sortOrder: 4,
  },
];

// ==================== Helper Functions ====================

function generateSessionId(): string {
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function generateDeviceToken(): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 64; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function generateTradeNo(): string {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, "0");
  return `${dateStr}${rand}`;
}

// ==================== Main Seed Function ====================

export async function seedExpand2(
  prisma: PrismaClient,
  userMap: Map<string, any>,
  itemMap: Map<string, any>,
  brandMap: Map<string, any>
): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("  扩展数据填充 (Part 2)");
  console.log("=".repeat(60));

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const allUserEntries = Array.from(userMap.entries());
  const allUserIds = allUserEntries.map(([, u]: [string, any]) => u.id);

  // ===== Section 1: Consultant System =====
  console.log("\n  [1/10] 创建顾问系统数据...");

  // 1a. ConsultantProfile
  let consultantsCreated = 0;
  const consultantMap = new Map<string, any>();

  for (const def of CONSULTANT_DEFS) {
    const user = userMap.get(def.emailKey);
    if (!user) {
      console.log(`    跳过顾问 ${def.emailKey}: 用户不存在`);
      continue;
    }

    const existing = await prisma.consultantProfile.findUnique({ where: { userId: user.id } });
    if (existing) {
      consultantMap.set(def.emailKey, existing);
      continue;
    }

    const consultant = await prisma.consultantProfile.create({
      data: {
        userId: user.id,
        studioName: def.studioName,
        specialties: def.specialties,
        yearsOfExperience: def.yearsOfExperience,
        certifications: def.certifications,
        portfolioCases: def.portfolioCases,
        rating: def.rating,
        reviewCount: def.reviewCount,
        bio: def.bio,
        avatar: def.avatar,
        location: def.location,
        responseTimeAvg: def.responseTimeAvg,
        status: "active" as ConsultantStatus,
      },
    });
    consultantMap.set(def.emailKey, consultant);
    consultantsCreated++;
  }
  console.log(`    + ${consultantsCreated} 个顾问档案`);

  // 1b. ConsultantAvailability
  let availabilitiesCreated = 0;
  for (const [emailKey, consultant] of consultantMap) {
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      const startTime = dayOfWeek <= 3 ? "09:00" : "10:00";
      const endTime = dayOfWeek <= 3 ? "18:00" : "19:00";

      const existing = await prisma.consultantAvailability.findUnique({
        where: {
          consultantId_dayOfWeek_startTime: { consultantId: consultant.id, dayOfWeek, startTime },
        },
      });
      if (existing) continue;

      await prisma.consultantAvailability.create({
        data: {
          consultantId: consultant.id,
          dayOfWeek,
          startTime,
          endTime,
          slotDuration: 60,
          isAvailable: true,
        },
      });
      availabilitiesCreated++;
    }
  }
  console.log(`    + ${availabilitiesCreated} 个可用时段`);

  // 1c. ServiceBooking
  let bookingsCreated = 0;
  const bookingMap = new Map<string, any>();

  for (let i = 0; i < BOOKING_DEFS.length; i++) {
    const def = BOOKING_DEFS[i];
    const user = userMap.get(def.userEmail);
    const consultant = consultantMap.get(def.consultantEmailKey);
    if (!user || !consultant) continue;

    const scheduledAt = new Date(now.getTime() + def.daysOffset * 24 * 60 * 60 * 1000);
    const existing = await prisma.serviceBooking.findFirst({
      where: {
        userId: user.id,
        consultantId: consultant.id,
        serviceType: def.serviceType,
        scheduledAt,
      },
    });
    if (existing) {
      bookingMap.set(`${def.userEmail}-${i}`, existing);
      continue;
    }

    const platformFeeRate = 0.1;
    const bookingData: any = {
      userId: user.id,
      consultantId: consultant.id,
      serviceType: def.serviceType,
      scheduledAt,
      durationMinutes: def.durationMinutes,
      status: def.status,
      price: def.price,
      currency: "CNY",
      depositAmount: def.depositAmount,
    };

    if (def.status === "completed") {
      const finalPaymentAmount = def.price - def.depositAmount;
      const platformFee = Math.round(def.price * platformFeeRate * 100) / 100;
      const consultantPayout = def.price - platformFee;
      const completedAt = new Date(scheduledAt.getTime() + def.durationMinutes * 60 * 1000);

      bookingData.finalPaymentAmount = finalPaymentAmount;
      bookingData.platformFee = platformFee;
      bookingData.consultantPayout = consultantPayout;
      bookingData.completedAt = completedAt;
      bookingData.depositPaidAt = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
      bookingData.finalPaidAt = completedAt;
    } else if (def.status === "cancelled") {
      bookingData.cancelledAt = new Date(scheduledAt.getTime() - 12 * 60 * 60 * 1000);
      bookingData.cancelReason = "用户临时有事取消";
    } else if (def.status === "confirmed") {
      bookingData.depositPaidAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    }

    const booking = await prisma.serviceBooking.create({ data: bookingData });
    bookingMap.set(`${def.userEmail}-${i}`, booking);
    bookingsCreated++;
  }
  console.log(`    + ${bookingsCreated} 个服务预约`);

  // 1d. ConsultantReview (for completed bookings)
  let reviewsCreated = 0;
  const reviewTags = [
    "专业",
    "耐心",
    "有品味",
    "建议实用",
    "性价比高",
    "沟通顺畅",
    "效果显著",
    "值得推荐",
  ];
  const reviewContents = [
    "非常专业的顾问，给了很多实用的建议，穿搭效果超出预期！",
    "Linda老师很有耐心，帮我分析了我的身材特点，推荐的单品都很适合我。",
    "志远老师对男装太了解了，帮我选的西装剪裁非常合身，同事们都说好看。",
    "色彩分析让我大开眼界，原来我适合的颜色和我想的完全不一样，现在穿衣服自信多了。",
    "佳怡老师帮我做的衣橱整理太实用了，现在每天出门不用纠结穿什么了。",
    "雅琴老师的品味没话说，帮我搭配的晚宴造型收到了好多赞美！",
    "服务很贴心，顾问会根据我的预算推荐合适的单品，不会一味推荐贵的。",
    "整体体验很好，唯一小遗憾是预约时间不太灵活，希望周末也能约。",
  ];

  for (const [, booking] of bookingMap) {
    if (booking.status !== "completed") continue;

    const existing = await prisma.consultantReview.findUnique({ where: { bookingId: booking.id } });
    if (existing) continue;

    const rating = randomElement([4, 4, 4, 5, 5, 5, 5, 3]);
    const selectedTags = [...reviewTags].sort(() => Math.random() - 0.5).slice(0, randomInt(2, 4));
    const content = randomElement(reviewContents);
    const isAnonymous = Math.random() < 0.2;

    await prisma.consultantReview.create({
      data: {
        bookingId: booking.id,
        userId: booking.userId,
        consultantId: booking.consultantId,
        rating,
        content,
        tags: selectedTags,
        beforeImages: [generatePicsumUrl(`review-before-${booking.id.slice(0, 8)}`, 400, 600)],
        afterImages: [generatePicsumUrl(`review-after-${booking.id.slice(0, 8)}`, 400, 600)],
        isAnonymous,
        createdAt: randomDate(new Date(booking.completedAt.getTime()), now),
      },
    });
    reviewsCreated++;
  }
  console.log(`    + ${reviewsCreated} 条顾问评价`);

  // 1e. ChatRoom + ChatMessage
  let chatRoomsCreated = 0;
  let chatMessagesCreated = 0;

  for (const roomDef of CHAT_ROOM_DEFS) {
    const user = userMap.get(roomDef.userEmail);
    const consultant = consultantMap.get(roomDef.consultantEmailKey);
    if (!user || !consultant) continue;

    const existing = await prisma.chatRoom.findFirst({
      where: { userId: user.id, consultantId: consultant.id },
    });
    let room;
    if (existing) {
      room = existing;
    } else {
      room = await prisma.chatRoom.create({
        data: {
          userId: user.id,
          consultantId: consultant.id,
          lastMessageAt: randomDate(thirtyDaysAgo, now),
          lastMessagePreview: roomDef.messages[roomDef.messages.length - 1].content.slice(0, 50),
          isActive: true,
        },
      });
      chatRoomsCreated++;
    }

    const existingMsgCount = await prisma.chatMessage.count({ where: { roomId: room.id } });
    if (existingMsgCount > 0) continue;

    for (let i = 0; i < roomDef.messages.length; i++) {
      const msg = roomDef.messages[i];
      const senderId = msg.senderType === "user" ? user.id : consultant.userId;

      await prisma.chatMessage.create({
        data: {
          roomId: room.id,
          senderId,
          senderType: msg.senderType,
          content: msg.content,
          messageType: msg.messageType,
          imageUrl: msg.imageUrl || null,
          isRead: i < roomDef.messages.length - 2,
          readAt: i < roomDef.messages.length - 2 ? randomDate(thirtyDaysAgo, now) : null,
          createdAt: randomDate(thirtyDaysAgo, now),
        },
      });
      chatMessagesCreated++;
    }
  }
  console.log(`    + ${chatRoomsCreated} 个聊天室, ${chatMessagesCreated} 条聊天消息`);

  // 1f. ConsultantEarning (for completed bookings)
  let earningsCreated = 0;
  for (const [, booking] of bookingMap) {
    if (booking.status !== "completed") continue;

    const existing = await prisma.consultantEarning.findUnique({
      where: { bookingId: booking.id },
    });
    if (existing) continue;

    const amount = booking.price;
    const platformFee = booking.platformFee;
    const netAmount = booking.consultantPayout;
    const isOld =
      booking.completedAt &&
      new Date(booking.completedAt) < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    await prisma.consultantEarning.create({
      data: {
        consultantId: booking.consultantId,
        bookingId: booking.id,
        userId: booking.userId,
        amount,
        platformFee,
        netAmount,
        status: isOld ? ("settled" as EarningStatus) : ("pending" as EarningStatus),
        settlementDate: isOld
          ? new Date(booking.completedAt.getTime() + 3 * 24 * 60 * 60 * 1000)
          : null,
      },
    });
    earningsCreated++;
  }
  console.log(`    + ${earningsCreated} 条顾问收益`);

  // 1g. ConsultantWithdrawal
  let withdrawalsCreated = 0;
  const bankNames = ["中国工商银行", "中国建设银行", "招商银行", "中国银行", "交通银行"];

  for (const [emailKey, consultant] of consultantMap) {
    const earnings = await prisma.consultantEarning.findMany({
      where: { consultantId: consultant.id, status: "settled" },
    });
    if (earnings.length === 0) continue;

    const totalSettled = earnings.reduce((sum: number, e: any) => sum + Number(e.netAmount), 0);
    const user = userMap.get(emailKey);
    if (!user) continue;

    const withdrawalCount = randomInt(1, 2);
    for (let i = 0; i < withdrawalCount; i++) {
      const amount = Math.round(totalSettled * (0.3 + Math.random() * 0.4) * 100) / 100;
      if (amount <= 0) continue;

      const existing = await prisma.consultantWithdrawal.findFirst({
        where: { consultantId: consultant.id, amount },
      });
      if (existing) continue;

      const isCompleted = i === 0;
      await prisma.consultantWithdrawal.create({
        data: {
          consultantId: consultant.id,
          userId: user.id,
          amount,
          status: isCompleted ? ("completed" as WithdrawalStatus) : ("pending" as WithdrawalStatus),
          bankName: randomElement(bankNames),
          bankAccount: `6222****${randomInt(1000, 9999)}`,
          accountHolder: user.nickname || "顾问",
          processedAt: isCompleted ? randomDate(thirtyDaysAgo, now) : null,
        },
      });
      withdrawalsCreated++;
    }
  }
  console.log(`    + ${withdrawalsCreated} 条提现记录`);

  // ===== Section 2: Behavior Data =====
  console.log("\n  [2/10] 创建行为数据...");

  // 2a. UserBehaviorEvent
  let behaviorEventsCreated = 0;
  const behaviorUserEntries = allUserEntries.slice(0, 15);
  const itemIds = Array.from(itemMap.values()).map((item: any) => item.id);

  for (const [email, user] of behaviorUserEntries) {
    const eventCount = randomInt(10, 20);
    const sessionId = generateSessionId();
    const deviceTypes = [
      { type: "ios", os: "iOS 17", browser: "App" },
      { type: "android", os: "Android 14", browser: "App" },
    ];
    const deviceInfo = randomElement(deviceTypes);
    const cities = ["上海", "北京", "杭州", "深圳", "广州", "成都", "南京"];
    const location = { city: randomElement(cities) };

    for (let i = 0; i < eventCount; i++) {
      const template = randomElement(BEHAVIOR_EVENT_TEMPLATES);
      const metadata = template.metadataFactory(
        itemIds.length > 0 ? randomElement(itemIds) : undefined,
        allUserIds.length > 0 ? randomElement(allUserIds) : undefined
      );

      const existing = await prisma.userBehaviorEvent.findFirst({
        where: {
          userId: user.id,
          sessionId,
          eventType: template.eventType,
          createdAt: { gt: thirtyDaysAgo },
        },
        take: 1,
      });
      // Skip idempotency check for behavior events - they are high-volume and unique by nature
      // Just limit creation to avoid excessive duplicates across runs

      await prisma.userBehaviorEvent.create({
        data: {
          userId: user.id,
          sessionId,
          eventType: template.eventType,
          category: template.category,
          action: template.action,
          targetType: metadata.itemId
            ? "clothing_item"
            : metadata.postId
              ? "community_post"
              : metadata.userId
                ? "user"
                : null,
          targetId: metadata.itemId || metadata.postId || metadata.userId || null,
          metadata,
          deviceInfo,
          location: Math.random() < 0.7 ? location : null,
          createdAt: randomDate(thirtyDaysAgo, now),
        },
      });
      behaviorEventsCreated++;
    }
  }
  console.log(`    + ${behaviorEventsCreated} 条行为事件`);

  // 2b. UserPreferenceWeight
  let preferenceWeightsCreated = 0;
  const prefUserEntries = allUserEntries.slice(0, 10);
  const sources = ["behavior", "quiz", "explicit"];

  for (const [email, user] of prefUserEntries) {
    for (const prefDef of PREFERENCE_WEIGHT_DEFS) {
      const source = randomElement(sources);
      for (const w of prefDef.weights) {
        const weightVariation = w.weight + (Math.random() - 0.5) * 0.15;
        const clampedWeight = Math.max(0.1, Math.min(1.0, weightVariation));

        const existing = await prisma.userPreferenceWeight.findUnique({
          where: {
            userId_category_key: { userId: user.id, category: prefDef.category, key: w.key },
          },
        });
        if (existing) continue;

        await prisma.userPreferenceWeight.create({
          data: {
            userId: user.id,
            category: prefDef.category,
            key: w.key,
            weight: clampedWeight,
            source,
          },
        });
        preferenceWeightsCreated++;
      }
    }
  }
  console.log(`    + ${preferenceWeightsCreated} 条偏好权重`);

  // 2c. SearchHistory
  let searchHistoriesCreated = 0;
  const searchUserEntries = allUserEntries.slice(0, 15);

  for (const [email, user] of searchUserEntries) {
    const searchCount = randomInt(3, 8);
    for (let i = 0; i < searchCount; i++) {
      const queryDef = randomElement(SEARCH_QUERIES);

      await prisma.searchHistory.create({
        data: {
          userId: user.id,
          sessionId: generateSessionId(),
          query: queryDef.query,
          filters: queryDef.filters,
          results: queryDef.results + randomInt(-10, 10),
          createdAt: randomDate(thirtyDaysAgo, now),
        },
      });
      searchHistoriesCreated++;
    }
  }
  console.log(`    + ${searchHistoriesCreated} 条搜索历史`);

  // 2d. AiStylistSession
  let aiSessionsCreated = 0;
  const sessionUserEntries = allUserEntries.slice(0, 10);

  for (const [email, user] of sessionUserEntries) {
    const sessionCount = randomInt(1, 3);
    for (let i = 0; i < sessionCount; i++) {
      const sessionDef = randomElement(AI_STYLIST_SESSION_DEFS);
      const isActive = Math.random() < 0.4;

      const existing = await prisma.aiStylistSession.findFirst({
        where: { userId: user.id, status: isActive ? "active" : "archived" },
      });
      if (existing && !isActive) continue;

      await prisma.aiStylistSession.create({
        data: {
          userId: user.id,
          payload: sessionDef.payload,
          status: isActive
            ? ("active" as AiStylistSessionStatus)
            : ("archived" as AiStylistSessionStatus),
          expiresAt: isActive
            ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          createdAt: randomDate(thirtyDaysAgo, now),
        },
      });
      aiSessionsCreated++;
    }
  }
  console.log(`    + ${aiSessionsCreated} 个AI造型师会话`);

  // ===== Section 3: E-commerce Closure Data =====
  console.log("\n  [3/10] 创建电商闭环数据...");

  // 3a. BrandMerchant
  let merchantsCreated = 0;
  const brandEntries = Array.from(brandMap.entries()).slice(0, 5);
  const merchantMap = new Map<string, any>();

  for (const [brandName, brand] of brandEntries) {
    const merchantEmail = `merchant@${brandName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    const existing = await prisma.brandMerchant.findUnique({ where: { email: merchantEmail } });
    if (existing) {
      merchantMap.set(brandName, existing);
      continue;
    }

    const passwordHash = await hash("Merchant123!");
    const merchant = await prisma.brandMerchant.create({
      data: {
        brandId: brand.id,
        email: merchantEmail,
        password: passwordHash,
        name: `${brandName}运营管理员`,
        role: "admin" as MerchantRole,
        isActive: true,
        lastLoginAt: randomDate(thirtyDaysAgo, now),
      },
    });
    merchantMap.set(brandName, merchant);
    merchantsCreated++;
  }
  console.log(`    + ${merchantsCreated} 个品牌商家账号`);

  // 3b. BrandSettlement
  let settlementsCreated = 0;
  const periods = ["2026-01", "2026-02", "2026-03"];

  for (const [brandName, brand] of brandEntries) {
    for (const period of periods) {
      const existing = await prisma.brandSettlement.findUnique({
        where: { brandId_period: { brandId: brand.id, period } },
      });
      if (existing) continue;

      const totalSales = randomInt(5000, 50000);
      const commission = Math.round(totalSales * 0.1 * 100) / 100;
      const netAmount = totalSales - commission;
      const isPaid = period < "2026-03";

      await prisma.brandSettlement.create({
        data: {
          brandId: brand.id,
          period,
          totalSales,
          commission,
          netAmount,
          status: isPaid ? ("paid" as SettlementStatus) : ("pending" as SettlementStatus),
          paidAt: isPaid ? randomDate(thirtyDaysAgo, now) : null,
        },
      });
      settlementsCreated++;
    }
  }
  console.log(`    + ${settlementsCreated} 条品牌结算`);

  // 3c. ProductSalesStats
  let salesStatsCreated = 0;
  const clothingItems = Array.from(itemMap.values()).slice(0, 20);

  for (const item of clothingItems) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(now.getTime() - (6 - d) * 24 * 60 * 60 * 1000);
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const existing = await prisma.productSalesStats.findUnique({
        where: { itemId_date: { itemId: item.id, date: dateOnly } },
      });
      if (existing) continue;

      const views = randomInt(50, 500);
      const clicks = Math.round(views * (0.1 + Math.random() * 0.3));
      const tryOns = Math.round(clicks * (0.05 + Math.random() * 0.15));
      const favorites = Math.round(clicks * (0.03 + Math.random() * 0.1));
      const addToCart = Math.round(favorites * (0.2 + Math.random() * 0.4));
      const purchases = Math.round(addToCart * (0.1 + Math.random() * 0.3));
      const price = Number(item.price) || randomInt(99, 999);
      const revenue = purchases * price;

      await prisma.productSalesStats.create({
        data: {
          itemId: item.id,
          date: dateOnly,
          views,
          clicks,
          tryOns,
          favorites,
          addToCart,
          purchases,
          revenue,
        },
      });
      salesStatsCreated++;
    }
  }
  console.log(`    + ${salesStatsCreated} 条商品销售统计`);

  // 3d. PaymentRecord (for existing orders)
  let paymentRecordsCreated = 0;
  const existingOrders = await prisma.order.findMany({
    where: { status: { in: ["paid", "shipped", "delivered"] } },
    take: 20,
  });

  for (const order of existingOrders) {
    const existing = await prisma.paymentRecord.findUnique({ where: { orderId: order.id } });
    if (existing) continue;

    const provider = randomElement(["wechat", "alipay"]);
    await prisma.paymentRecord.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        provider,
        amount: order.finalAmount,
        currency: "CNY",
        status: "paid" as PaymentRecordStatus,
        tradeNo: generateTradeNo(),
        paidAt: order.paidAt || randomDate(thirtyDaysAgo, now),
        createdAt: order.createdAt,
      },
    });
    paymentRecordsCreated++;
  }
  console.log(`    + ${paymentRecordsCreated} 条支付记录`);

  // 3e. PaymentOrder (for subscriptions)
  let paymentOrdersCreated = 0;
  const existingSubscriptions = await prisma.userSubscription.findMany({ take: 15 });

  for (const sub of existingSubscriptions) {
    const existing = await prisma.paymentOrder.findFirst({
      where: { subscriptionId: sub.id },
    });
    if (existing) continue;

    const plan = await prisma.membershipPlan.findUnique({ where: { id: sub.planId } });
    if (!plan) continue;

    await prisma.paymentOrder.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount: plan.price,
        currency: "CNY",
        status: "paid" as PaymentStatus,
        paymentMethod: randomElement(["wechat", "alipay"]),
        paidAt: sub.startedAt,
        createdAt: sub.createdAt,
      },
    });
    paymentOrdersCreated++;
  }
  console.log(`    + ${paymentOrdersCreated} 条订阅支付订单`);

  // 3f. CustomizationTemplate
  let templatesCreated = 0;
  const templateMap = new Map<string, any>();

  for (const tplDef of CUSTOMIZATION_TEMPLATES) {
    const existing = await prisma.customizationTemplate.findFirst({ where: { name: tplDef.name } });
    if (existing) {
      templateMap.set(tplDef.name, existing);
      continue;
    }

    const template = await prisma.customizationTemplate.create({
      data: {
        type: tplDef.type,
        name: tplDef.name,
        description: tplDef.description,
        imageUrl: tplDef.imageUrl,
        basePrice: tplDef.basePrice,
        printableArea: tplDef.printableArea,
        isActive: true,
        sortOrder: tplDef.sortOrder,
      },
    });
    templateMap.set(tplDef.name, template);
    templatesCreated++;
  }
  console.log(`    + ${templatesCreated} 个定制模板`);

  // 3g. CustomizationDesign + CustomizationDesignLayer
  let designsCreated = 0;
  let designLayersCreated = 0;
  const designUserEntries = allUserEntries.slice(0, 3);
  const templateArray = Array.from(templateMap.values());

  for (let idx = 0; idx < designUserEntries.length; idx++) {
    const [email, user] = designUserEntries[idx];
    const template = templateArray[idx % templateArray.length];
    if (!template) continue;

    const existing = await prisma.customizationDesign.findFirst({
      where: { userId: user.id, templateId: template.id },
    });
    if (existing) continue;

    const canvasData = {
      version: "1.0",
      width: 800,
      height: 800,
      background: "#ffffff",
      zoom: 1,
      offset: { x: 0, y: 0 },
    };

    const design = await prisma.customizationDesign.create({
      data: {
        userId: user.id,
        templateId: template.id,
        canvasData,
        previewUrl: generatePicsumUrl(`design-${user.id.slice(0, 8)}`, 600, 600),
      },
    });

    // Create layers
    const layerDefs = [
      {
        type: "text" as DesignLayerType,
        content: "寻裳定制",
        x: 100,
        y: 50,
        width: 200,
        height: 60,
        fontSize: 32,
        color: "#333333",
        fontFamily: "sans-serif",
      },
      {
        type: "image" as DesignLayerType,
        content: "logo",
        x: 50,
        y: 150,
        width: 300,
        height: 300,
        imageUrl: generatePicsumUrl(`design-img-${idx}`, 300, 300),
      },
      {
        type: "shape" as DesignLayerType,
        content: "rectangle",
        x: 200,
        y: 400,
        width: 400,
        height: 200,
        shapeType: "rect",
        fillColor: "#f5f5f5",
        strokeColor: "#cccccc",
        strokeWidth: 2,
      },
    ];

    const selectedLayers = layerDefs.slice(0, randomInt(1, 3));
    for (let l = 0; l < selectedLayers.length; l++) {
      const layerDef = selectedLayers[l];
      await prisma.customizationDesignLayer.create({
        data: {
          designId: design.id,
          type: layerDef.type,
          content: layerDef.content,
          x: layerDef.x,
          y: layerDef.y,
          width: layerDef.width,
          height: layerDef.height,
          scale: 1,
          rotation: 0,
          opacity: 1,
          zIndex: l,
          fontSize: (layerDef as any).fontSize || null,
          color: (layerDef as any).color || null,
          fontFamily: (layerDef as any).fontFamily || null,
          imageUrl: (layerDef as any).imageUrl || null,
          shapeType: (layerDef as any).shapeType || null,
          fillColor: (layerDef as any).fillColor || null,
          strokeColor: (layerDef as any).strokeColor || null,
          strokeWidth: (layerDef as any).strokeWidth || null,
        },
      });
      designLayersCreated++;
    }
    designsCreated++;
  }
  console.log(`    + ${designsCreated} 个定制设计, ${designLayersCreated} 个设计图层`);

  // 3h. CustomizationRequest + CustomizationQuote
  let requestsCreated = 0;
  let quotesCreated = 0;
  const requestUserEntries = allUserEntries.slice(0, 3);
  const requestDefs = [
    {
      type: "tailored" as CustomizationType,
      title: "商务西装定制",
      description: "需要一套深蓝色商务西装，修身版型，适合175cm/72kg体型，预算2000-3000元",
      status: "confirmed" as CustomizationStatus,
    },
    {
      type: "bespoke" as CustomizationType,
      title: "婚礼礼服定制",
      description: "想要一件法式风格的婚纱，A字裙摆，蕾丝细节，预算5000-8000元",
      status: "submitted" as CustomizationStatus,
    },
    {
      type: "design" as CustomizationType,
      title: "个性T恤设计",
      description: "想在T恤上印一个自己设计的图案，简约风格，黑白配色",
      status: "in_progress" as CustomizationStatus,
    },
  ];

  for (let idx = 0; idx < requestDefs.length; idx++) {
    const [email, user] = requestUserEntries[idx];
    const reqDef = requestDefs[idx];

    const existing = await prisma.customizationRequest.findFirst({
      where: { userId: user.id, type: reqDef.type, title: reqDef.title },
    });
    if (existing) continue;

    const design = idx < templateArray.length ? null : null; // No design link for now
    const request = await prisma.customizationRequest.create({
      data: {
        userId: user.id,
        type: reqDef.type,
        title: reqDef.title,
        description: reqDef.description,
        referenceImages: [generatePicsumUrl(`ref-${user.id.slice(0, 8)}-${idx}`, 400, 600)],
        preferences: {
          budget: randomInt(500, 5000),
          style: randomElement(["简约", "法式", "商务", "个性"]),
          colorPreference: randomElement(["深蓝", "白色", "黑色"]),
        },
        status: reqDef.status,
        createdAt: randomDate(thirtyDaysAgo, now),
      },
    });
    requestsCreated++;

    // Create quotes for the request
    const quoteCount = randomInt(1, 2);
    const providers = [
      {
        id: "provider-1",
        name: "匠心定制工坊",
        logo: "https://picsum.photos/seed/provider1/100/100",
      },
      {
        id: "provider-2",
        name: "优裁定制中心",
        logo: "https://picsum.photos/seed/provider2/100/100",
      },
    ];

    for (let q = 0; q < quoteCount; q++) {
      const provider = providers[q % providers.length];
      const price = randomInt(800, 5000);

      await prisma.customizationQuote.create({
        data: {
          requestId: request.id,
          providerId: provider.id,
          providerName: provider.name,
          providerLogo: provider.logo,
          price,
          currency: "CNY",
          estimatedDays: randomInt(7, 30),
          description: `根据您的需求，我们提供${reqDef.title}定制方案，选用优质面料，精细做工，确保合身舒适。`,
          terms: "定制定金50%，完工验收后付尾款。如需修改可免费调整一次。",
        },
      });
      quotesCreated++;
    }
  }
  console.log(`    + ${requestsCreated} 个定制请求, ${quotesCreated} 个报价`);

  // ===== Section 4: Compliance Data =====
  console.log("\n  [4/10] 创建合规数据...");

  // 4a. UserConsent
  let consentsCreated = 0;
  const consentTypes = [
    { type: "privacy_policy", granted: true },
    { type: "terms_of_service", granted: true },
    { type: "data_processing", granted: true },
    { type: "marketing_communication", granted: false },
  ];

  for (const [, user] of allUserEntries) {
    for (const consentDef of consentTypes) {
      const granted =
        consentDef.type === "marketing_communication" ? Math.random() < 0.4 : consentDef.granted;

      const existing = await prisma.userConsent.findUnique({
        where: { userId_consentType: { userId: user.id, consentType: consentDef.type } },
      });
      if (existing) continue;

      await prisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: consentDef.type,
          granted,
          grantedAt: granted ? randomDate(thirtyDaysAgo, now) : null,
          revokedAt: !granted ? randomDate(thirtyDaysAgo, now) : null,
          version: "1.0",
          ipAddress: `192.168.1.${randomInt(1, 254)}`,
          userAgent: "XunO/1.0 (iOS 17; iPhone 15)",
        },
      });
      consentsCreated++;
    }
  }
  console.log(`    + ${consentsCreated} 条用户授权`);

  // 4b. UserNotificationSetting
  let notificationSettingsCreated = 0;
  const notifUserEntries = allUserEntries.slice(0, 15);

  for (const [email, user] of notifUserEntries) {
    const existing = await prisma.userNotificationSetting.findUnique({
      where: { userId: user.id },
    });
    if (existing) continue;

    await prisma.userNotificationSetting.create({
      data: {
        userId: user.id,
        email: { subscription: true, recommendation: true, social: true, marketing: false },
        push: { subscription: true, try_on: true, social: true, order: true },
        inApp: { all: true },
      },
    });
    notificationSettingsCreated++;
  }
  console.log(`    + ${notificationSettingsCreated} 条通知设置`);

  // 4c. PushDeviceToken
  let deviceTokensCreated = 0;
  const tokenUserEntries = allUserEntries.slice(0, 10);

  for (const [email, user] of tokenUserEntries) {
    const token = generateDeviceToken();
    const platform = Math.random() < 0.6 ? "ios" : "android";

    const existing = await prisma.pushDeviceToken.findUnique({
      where: { userId_token: { userId: user.id, token } },
    });
    if (existing) continue;

    // Check if user already has a token
    const existingToken = await prisma.pushDeviceToken.findFirst({ where: { userId: user.id } });
    if (existingToken) continue;

    await prisma.pushDeviceToken.create({
      data: {
        userId: user.id,
        token,
        platform,
        appId: "com.xuno.app",
        isActive: true,
      },
    });
    deviceTokensCreated++;
  }
  console.log(`    + ${deviceTokensCreated} 个推送设备令牌`);

  // ===== Final Summary =====
  console.log("\n" + "-".repeat(60));
  console.log("  扩展数据填充完成 (Part 2)");
  console.log("-".repeat(60));
  console.log(`  顾问档案: ${consultantsCreated}`);
  console.log(`  可用时段: ${availabilitiesCreated}`);
  console.log(`  服务预约: ${bookingsCreated}`);
  console.log(`  顾问评价: ${reviewsCreated}`);
  console.log(`  聊天室: ${chatRoomsCreated} (${chatMessagesCreated} 条消息)`);
  console.log(`  顾问收益: ${earningsCreated}`);
  console.log(`  提现记录: ${withdrawalsCreated}`);
  console.log(`  行为事件: ${behaviorEventsCreated}`);
  console.log(`  偏好权重: ${preferenceWeightsCreated}`);
  console.log(`  搜索历史: ${searchHistoriesCreated}`);
  console.log(`  AI造型师会话: ${aiSessionsCreated}`);
  console.log(`  品牌商家: ${merchantsCreated}`);
  console.log(`  品牌结算: ${settlementsCreated}`);
  console.log(`  商品销售统计: ${salesStatsCreated}`);
  console.log(`  支付记录: ${paymentRecordsCreated}`);
  console.log(`  订阅支付: ${paymentOrdersCreated}`);
  console.log(`  定制模板: ${templatesCreated}`);
  console.log(`  定制设计: ${designsCreated} (${designLayersCreated} 个图层)`);
  console.log(`  定制请求: ${requestsCreated} (${quotesCreated} 个报价)`);
  console.log(`  用户授权: ${consentsCreated}`);
  console.log(`  通知设置: ${notificationSettingsCreated}`);
  console.log(`  推送令牌: ${deviceTokensCreated}`);
}
