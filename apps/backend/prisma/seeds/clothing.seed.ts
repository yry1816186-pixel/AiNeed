// @ts-nocheck
import { PrismaClient, ClothingCategory } from '@prisma/client';

// ============================================================================
// 服装商品 Seed 数据 - 500+ 件商品，覆盖 8 大分类
// ============================================================================

const clothingData = [
  // ==================== tops: 8 件 ====================
  {
    sku: 'AN-TOP-001',
    name: '经典圆领纯棉T恤',
    description: '采用100%精梳棉面料，亲肤透气，圆领设计简约百搭，四季皆宜的基础款T恤。版型微宽松，适合各种身材。',
    category: ClothingCategory.tops,
    subcategory: 'tshirt',
    colors: ['白色', '黑色', '灰色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['基础款', '纯棉', '百搭', '简约'],
    price: 79,
    originalPrice: 129,
    stock: 200,
    brandSlug: 'uniqlo',
    isFeatured: false,
    attributes: {
      material: '100%精梳棉，160g/m²',
      sizeChart: [
        { size: 'S', bust: '92', shoulder: '42', length: '64' },
        { size: 'M', bust: '96', shoulder: '44', length: '66' },
        { size: 'L', bust: '100', shoulder: '46', length: '68' },
        { size: 'XL', bust: '104', shoulder: '48', length: '70' },
      ],
      pairingSuggestions: ['搭配牛仔裤打造休闲风', '外搭西装外套提升正式感', '配半裙营造优雅气质'],
      careInstructions: '机洗30°C，不可漂白，低温烘干，中温熨烫',
    },
  },
  {
    sku: 'AN-TOP-002',
    name: '法式方领泡泡袖衬衫',
    description: '浪漫法式风格方领设计，展露锁骨线条，泡泡袖增添俏皮感。采用天丝棉混纺面料，垂坠感佳，优雅不失灵动。',
    category: ClothingCategory.tops,
    subcategory: 'blouse',
    colors: ['奶白色', '淡蓝色', '樱花粉'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['法式', '方领', '泡泡袖', '浪漫', '约会'],
    price: 199,
    originalPrice: 299,
    stock: 80,
    brandSlug: 'xuno-studio',
    isFeatured: true,
    attributes: {
      material: '65%天丝 35%棉，柔软垂坠',
      sizeChart: [
        { size: 'S', bust: '86', waist: '68', shoulder: '38', length: '58' },
        { size: 'M', bust: '90', waist: '72', shoulder: '40', length: '59' },
        { size: 'L', bust: '94', waist: '76', shoulder: '42', length: '60' },
      ],
      pairingSuggestions: ['搭配高腰阔腿裤通勤优雅', '配A字半裙法式浪漫', '外搭针织开衫温柔知性'],
      careInstructions: '手洗或机洗轻柔模式30°C，悬挂晾干，低温熨烫',
    },
  },
  {
    sku: 'AN-TOP-003',
    name: '极简高领羊绒毛衣',
    description: '甄选内蒙古优质羊绒，细腻柔软不扎肤。高领设计保暖有型，修身剪裁勾勒身形，是秋冬衣橱的质感之选。',
    category: ClothingCategory.tops,
    subcategory: 'sweater',
    colors: ['驼色', '黑色', '米白色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['羊绒', '高领', '保暖', '极简', '质感'],
    price: 599,
    originalPrice: null,
    stock: 50,
    brandSlug: 'cos',
    isFeatured: true,
    attributes: {
      material: '100%羊绒，12针编织',
      sizeChart: [
        { size: 'S', bust: '88', shoulder: '40', sleeve: '56', length: '60' },
        { size: 'M', bust: '92', shoulder: '42', sleeve: '58', length: '62' },
        { size: 'L', bust: '96', shoulder: '44', sleeve: '60', length: '64' },
      ],
      pairingSuggestions: ['搭配西装裤干练职场', '配百褶裙优雅知性', '外搭大衣层次感穿搭'],
      careInstructions: '建议干洗，手洗需用羊绒专用洗涤剂，平铺晾干，不可悬挂',
    },
  },
  {
    sku: 'AN-TOP-004',
    name: '宽松落肩条纹长袖T恤',
    description: '经典条纹元素永不过时，落肩设计增添休闲感。宽松版型包容各种身材，棉质面料柔软舒适，日常穿搭轻松驾驭。',
    category: ClothingCategory.tops,
    subcategory: 'tshirt',
    colors: ['蓝白条纹', '黑白条纹'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['条纹', '休闲', '落肩', '日常'],
    price: 119,
    originalPrice: 159,
    stock: 150,
    brandSlug: 'zara',
    isFeatured: false,
    attributes: {
      material: '100%棉，180g/m²',
      sizeChart: [
        { size: 'S', bust: '100', shoulder: '50', length: '66' },
        { size: 'M', bust: '104', shoulder: '52', length: '68' },
        { size: 'L', bust: '108', shoulder: '54', length: '70' },
      ],
      pairingSuggestions: ['搭配白色长裤清爽度假风', '配牛仔短裤休闲随性', '叠穿吊带裙层次丰富'],
      careInstructions: '机洗30°C，翻面洗涤，不可漂白，低温烘干',
    },
  },
  {
    sku: 'AN-TOP-005',
    name: '丝质V领印花衬衫',
    description: '桑蚕丝面料自带高级光泽感，V领修饰脸型拉长颈部线条。抽象艺术印花独具品味，通勤约会皆可驾驭。',
    category: ClothingCategory.tops,
    subcategory: 'blouse',
    colors: ['墨绿印花', '酒红印花'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['真丝', '印花', 'V领', '高级感', '通勤'],
    price: 459,
    originalPrice: 599,
    stock: 40,
    brandSlug: 'aineed-studio',
    isFeatured: true,
    attributes: {
      material: '100%桑蚕丝，16姆米',
      sizeChart: [
        { size: 'S', bust: '88', shoulder: '39', length: '62' },
        { size: 'M', bust: '92', shoulder: '41', length: '63' },
        { size: 'L', bust: '96', shoulder: '43', length: '64' },
      ],
      pairingSuggestions: ['搭配西装裤职场精英范', '配缎面半裙晚宴优雅', '塞进高腰牛仔裤法式随性'],
      careInstructions: '建议干洗，手洗需用丝毛专用洗涤剂，不可拧干，阴凉处晾干',
    },
  },
  {
    sku: 'AN-TOP-006',
    name: 'Oversize连帽卫衣',
    description: '加厚毛圈面料内里抓绒，保暖性出色。Oversize版型潮流感十足，袋鼠口袋实用又时尚，秋冬街头必备单品。',
    category: ClothingCategory.tops,
    subcategory: 'hoodie',
    colors: ['燕麦色', '深灰色', '黑色'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['卫衣', 'oversize', '街头', '保暖', '潮流'],
    price: 249,
    originalPrice: null,
    stock: 120,
    brandSlug: 'uniqlo',
    isFeatured: false,
    attributes: {
      material: '80%棉 20%聚酯纤维，毛圈抓绒420g/m²',
      sizeChart: [
        { size: 'S', bust: '110', shoulder: '54', sleeve: '58', length: '68' },
        { size: 'M', bust: '116', shoulder: '57', sleeve: '60', length: '70' },
        { size: 'L', bust: '122', shoulder: '60', sleeve: '62', length: '72' },
        { size: 'XL', bust: '128', shoulder: '63', sleeve: '64', length: '74' },
      ],
      pairingSuggestions: ['搭配工装裤街头酷感', '配瑜伽裤运动休闲', '叠穿长款大衣混搭层次'],
      careInstructions: '机洗30°C，翻面洗涤，不可漂白，低温烘干，不可熨烫印花处',
    },
  },
  {
    sku: 'AN-TOP-007',
    name: '复古盘扣立领棉麻衬衫',
    description: '中式立领搭配手工盘扣，东方韵味十足。棉麻混纺面料透气舒适，宽松版型自在随性，文艺气质满分。',
    category: ClothingCategory.tops,
    subcategory: 'blouse',
    colors: ['月白色', '靛蓝色', '竹青色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['中式', '棉麻', '立领', '文艺', '复古'],
    price: 269,
    originalPrice: null,
    stock: 60,
    brandSlug: 'aineed-studio',
    isFeatured: false,
    attributes: {
      material: '55%棉 45%亚麻，天然透气',
      sizeChart: [
        { size: 'S', bust: '96', shoulder: '43', length: '64' },
        { size: 'M', bust: '100', shoulder: '45', length: '66' },
        { size: 'L', bust: '104', shoulder: '47', length: '68' },
      ],
      pairingSuggestions: ['搭配阔腿裤新中式风格', '配棉麻长裙禅意优雅', '外搭马甲层次分明'],
      careInstructions: '手洗或机洗轻柔模式，低温熨烫，棉麻面料初次洗涤有轻微缩水属正常',
    },
  },
  {
    sku: 'AN-TOP-008',
    name: '一字领露肩针织上衣',
    description: '一字领设计展露优美肩线，弹力针织面料贴合身形。可拉至肩部做露肩穿法，也可拉高做船领，一衣两穿。',
    category: ClothingCategory.tops,
    subcategory: 'knitwear',
    colors: ['黑色', '焦糖色', '雾霾蓝'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['露肩', '针织', '性感', '一衣两穿', '约会'],
    price: 189,
    originalPrice: 259,
    stock: 70,
    brandSlug: 'zara',
    isFeatured: false,
    attributes: {
      material: '60%粘胶纤维 35%锦纶 5%氨纶',
      sizeChart: [
        { size: 'S', bust: '82', waist: '66', length: '52' },
        { size: 'M', bust: '86', waist: '70', length: '53' },
        { size: 'L', bust: '90', waist: '74', length: '54' },
      ],
      pairingSuggestions: ['搭配高腰西装裤性感职场', '配半裙优雅约会', '叠穿在吊带裙内层次穿搭'],
      careInstructions: '手洗30°C，平铺晾干，低温熨烫',
    },
  },

  // ==================== bottoms: 7 件 ====================
  {
    sku: 'AN-BOT-001',
    name: '高腰直筒牛仔裤',
    description: '经典高腰直筒版型，修饰腿型拉长比例。采用优质丹宁面料，微弹力设计穿着舒适，复古水洗色调百搭不挑人。',
    category: ClothingCategory.bottoms,
    subcategory: 'jeans',
    colors: ['深蓝色', '浅蓝色', '黑色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['高腰', '直筒', '牛仔裤', '百搭', '显瘦'],
    price: 259,
    originalPrice: null,
    stock: 180,
    brandSlug: 'zara',
    isFeatured: true,
    attributes: {
      material: '98%棉 2%氨纶，12oz丹宁',
      sizeChart: [
        { size: 'S', waist: '66', hip: '90', inseam: '76', length: '102' },
        { size: 'M', waist: '70', hip: '94', inseam: '78', length: '104' },
        { size: 'L', waist: '74', hip: '98', inseam: '80', length: '106' },
        { size: 'XL', waist: '78', hip: '102', inseam: '82', length: '108' },
      ],
      pairingSuggestions: ['搭配白T恤经典休闲', '配衬衫通勤干练', '塞入针织上衣温柔知性'],
      careInstructions: '翻面机洗30°C，不可漂白，悬挂晾干，低温熨烫',
    },
  },
  {
    sku: 'AN-BOT-002',
    name: '垂坠感阔腿西装裤',
    description: '高腰阔腿版型气场全开，西装面料垂坠感极佳。裤腰褶皱设计增加层次感，九分长度露出脚踝显瘦显高。',
    category: ClothingCategory.bottoms,
    subcategory: 'trousers',
    colors: ['黑色', '卡其色', '深灰色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['阔腿裤', '西装裤', '高腰', '通勤', '显瘦'],
    price: 329,
    originalPrice: 429,
    stock: 100,
    brandSlug: 'cos',
    isFeatured: false,
    attributes: {
      material: '68%聚酯纤维 28%粘胶纤维 4%氨纶',
      sizeChart: [
        { size: 'S', waist: '66', hip: '92', inseam: '74', length: '98' },
        { size: 'M', waist: '70', hip: '96', inseam: '76', length: '100' },
        { size: 'L', waist: '74', hip: '100', inseam: '78', length: '102' },
      ],
      pairingSuggestions: ['搭配衬衫职场精英', '配针织衫温柔通勤', '搭T恤休闲西装风'],
      careInstructions: '建议干洗，机洗需翻面轻柔模式，悬挂晾干，中温熨烫',
    },
  },
  {
    sku: 'AN-BOT-003',
    name: '百褶中长半裙',
    description: '细密百褶工艺，走动间裙摆飘逸灵动。中长款及膝长度优雅得体，高腰设计优化身材比例，通勤约会两相宜。',
    category: ClothingCategory.bottoms,
    subcategory: 'skirt',
    colors: ['黑色', '香槟色', '墨绿色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['百褶裙', '中长裙', '优雅', '通勤', '飘逸'],
    price: 279,
    originalPrice: null,
    stock: 75,
    brandSlug: 'aineed-studio',
    isFeatured: false,
    attributes: {
      material: '100%聚酯纤维，高密度褶皱定型',
      sizeChart: [
        { size: 'S', waist: '66', hip: '90', length: '72' },
        { size: 'M', waist: '70', hip: '94', length: '74' },
        { size: 'L', waist: '74', hip: '98', length: '76' },
      ],
      pairingSuggestions: ['搭配修身针织衫优雅气质', '配衬衫知性通勤', '搭卫衣混搭减龄'],
      careInstructions: '建议干洗保持褶皱定型，机洗需用洗衣袋轻柔模式，悬挂晾干',
    },
  },
  {
    sku: 'AN-BOT-004',
    name: '工装风束脚裤',
    description: '多口袋设计实用又帅气，束脚抽绳可调节裤型。军绿色调复古硬朗，宽松版型舒适自在，街头潮流必备。',
    category: ClothingCategory.bottoms,
    subcategory: 'cargo',
    colors: ['军绿色', '卡其色', '黑色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['工装裤', '束脚', '街头', '多口袋', '中性'],
    price: 219,
    originalPrice: 299,
    stock: 90,
    brandSlug: 'zara',
    isFeatured: false,
    attributes: {
      material: '100%棉，斜纹布260g/m²',
      sizeChart: [
        { size: 'S', waist: '68', hip: '96', inseam: '72', length: '98' },
        { size: 'M', waist: '72', hip: '100', inseam: '74', length: '100' },
        { size: 'L', waist: '76', hip: '104', inseam: '76', length: '102' },
      ],
      pairingSuggestions: ['搭配卫衣街头潮流', '配短靴酷飒有型', '搭背心夏日工装风'],
      careInstructions: '机洗30°C，不可漂白，悬挂晾干，中温熨烫',
    },
  },
  {
    sku: 'AN-BOT-005',
    name: '弹力修身小脚裤',
    description: '高弹力面料完美贴合腿部线条，修身不紧绷。小脚设计利落显瘦，搭配各种鞋型都好看，日常穿搭万能裤。',
    category: ClothingCategory.bottoms,
    subcategory: 'leggings',
    colors: ['黑色', '深灰色', '藏青色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['弹力', '修身', '小脚裤', '显瘦', '日常'],
    price: 149,
    originalPrice: null,
    stock: 200,
    brandSlug: 'uniqlo',
    isFeatured: false,
    attributes: {
      material: '78%棉 20%聚酯纤维 2%氨纶',
      sizeChart: [
        { size: 'S', waist: '64', hip: '88', inseam: '76', length: '100' },
        { size: 'M', waist: '68', hip: '92', inseam: '78', length: '102' },
        { size: 'L', waist: '72', hip: '96', inseam: '80', length: '104' },
      ],
      pairingSuggestions: ['搭配长款上衣休闲舒适', '配短靴利落干练', '搭运动鞋活力日常'],
      careInstructions: '机洗30°C，不可漂白，低温烘干，不可高温熨烫',
    },
  },
  {
    sku: 'AN-BOT-006',
    name: 'A字牛仔半裙',
    description: '经典A字版型修饰臀腿线条，前排扣设计增添复古韵味。中长长度端庄大方，后开叉行走自如，春夏百搭单品。',
    category: ClothingCategory.bottoms,
    subcategory: 'skirt',
    colors: ['浅蓝色', '深蓝色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['牛仔裙', 'A字裙', '复古', '春夏', '百搭'],
    price: 199,
    originalPrice: null,
    stock: 110,
    brandSlug: 'zara',
    isFeatured: false,
    attributes: {
      material: '100%棉，10oz丹宁，微弹',
      sizeChart: [
        { size: 'S', waist: '66', hip: '90', length: '60' },
        { size: 'M', waist: '70', hip: '94', length: '62' },
        { size: 'L', waist: '74', hip: '98', length: '64' },
      ],
      pairingSuggestions: ['搭配条纹T恤法式休闲', '配白衬衫清爽文艺', '搭针织衫温柔日常'],
      careInstructions: '翻面机洗30°C，不可漂白，悬挂晾干',
    },
  },
  {
    sku: 'AN-BOT-007',
    name: '羊毛混纺宽腰头西裤',
    description: '含羊毛成分面料质感上乘，宽腰头设计舒适不勒。微锥形裤腿修饰腿型，裤脚微开叉细节考究，商务场合首选。',
    category: ClothingCategory.bottoms,
    subcategory: 'trousers',
    colors: ['藏青色', '炭灰色', '黑色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['羊毛', '西裤', '商务', '质感', '微锥形'],
    price: 499,
    originalPrice: null,
    stock: 45,
    brandSlug: 'cos',
    isFeatured: true,
    attributes: {
      material: '50%羊毛 45%聚酯纤维 5%弹性纤维',
      sizeChart: [
        { size: 'S', waist: '68', hip: '92', inseam: '76', length: '100' },
        { size: 'M', waist: '72', hip: '96', inseam: '78', length: '102' },
        { size: 'L', waist: '76', hip: '100', inseam: '80', length: '104' },
      ],
      pairingSuggestions: ['搭配同色系西装套装商务正式', '配高领毛衣知性优雅', '搭衬衫干练职场'],
      careInstructions: '建议干洗，保持裤线笔挺，存放时使用衣架悬挂',
    },
  },

  // ==================== dresses: 6 件 ====================
  {
    sku: 'AN-DRE-001',
    name: '小黑裙经典款',
    description: '永恒经典的小黑裙，收腰A字版型修饰身材。及膝长度端庄优雅，方领设计展露锁骨，从晚宴到约会一裙搞定。',
    category: ClothingCategory.dresses,
    subcategory: 'cocktail',
    colors: ['黑色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['小黑裙', '经典', '优雅', '晚宴', '约会'],
    price: 399,
    originalPrice: 549,
    stock: 60,
    brandSlug: 'aineed-studio',
    isFeatured: true,
    attributes: {
      material: '95%聚酯纤维 5%氨纶，重工面料',
      sizeChart: [
        { size: 'S', bust: '84', waist: '66', hip: '90', length: '90' },
        { size: 'M', bust: '88', waist: '70', hip: '94', length: '92' },
        { size: 'L', bust: '92', waist: '74', hip: '98', length: '94' },
      ],
      pairingSuggestions: ['搭配细高跟优雅晚宴', '配珍珠项链经典名媛', '外搭小西装干练职场'],
      careInstructions: '建议干洗，手洗需轻柔，不可拧干，悬挂晾干',
    },
  },
  {
    sku: 'AN-DRE-002',
    name: '碎花雪纺连衣裙',
    description: '轻盈雪纺面料随风飘逸，小碎花图案清新浪漫。V领设计拉长颈部线条，收腰系带勾勒腰身，春夏约会首选。',
    category: ClothingCategory.dresses,
    subcategory: 'floral',
    colors: ['蓝底白花', '粉底碎花', '黄底小花'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['碎花', '雪纺', '连衣裙', '春夏', '约会', '清新'],
    price: 259,
    originalPrice: null,
    stock: 85,
    brandSlug: 'zara',
    isFeatured: false,
    attributes: {
      material: '100%聚酯纤维，雪纺面料',
      sizeChart: [
        { size: 'S', bust: '84', waist: '66', hip: '90', length: '105' },
        { size: 'M', bust: '88', waist: '70', hip: '94', length: '107' },
        { size: 'L', bust: '92', waist: '74', hip: '98', length: '109' },
      ],
      pairingSuggestions: ['搭配草编帽度假风情', '配小白鞋清新日常', '外搭牛仔外套休闲减龄'],
      careInstructions: '手洗或机洗轻柔模式30°C，不可漂白，悬挂晾干，低温熨烫',
    },
  },
  {
    sku: 'AN-DRE-003',
    name: '极简针织连衣裙',
    description: '极简主义设计，一体式剪裁利落大方。弹力针织面料贴合身形，中长袖设计四季可穿，单穿或叠搭皆出彩。',
    category: ClothingCategory.dresses,
    subcategory: 'knit',
    colors: ['驼色', '黑色', '灰色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['针织裙', '极简', '通勤', '百搭', '叠穿'],
    price: 349,
    originalPrice: null,
    stock: 55,
    brandSlug: 'cos',
    isFeatured: false,
    attributes: {
      material: '70%粘胶纤维 25%锦纶 5%氨纶',
      sizeChart: [
        { size: 'S', bust: '84', waist: '66', hip: '90', length: '100' },
        { size: 'M', bust: '88', waist: '70', hip: '94', length: '102' },
        { size: 'L', bust: '92', waist: '74', hip: '98', length: '104' },
      ],
      pairingSuggestions: ['外搭长款大衣秋冬层次感', '配腰带强调腰线', '搭靴子帅气有型'],
      careInstructions: '手洗30°C，平铺晾干，低温熨烫',
    },
  },
  {
    sku: 'AN-DRE-004',
    name: '丝绒吊带长裙',
    description: '奢华丝绒面料自带光泽质感，细吊带设计性感优雅。高腰线分割优化比例，长至脚踝气场全开，派对晚宴焦点之选。',
    category: ClothingCategory.dresses,
    subcategory: 'evening',
    colors: ['酒红色', '墨绿色', '黑色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['丝绒', '吊带裙', '长裙', '晚宴', '派对', '奢华'],
    price: 529,
    originalPrice: 699,
    stock: 35,
    brandSlug: 'aineed-studio',
    isFeatured: true,
    attributes: {
      material: '92%粘胶纤维 8%氨纶，丝绒面料',
      sizeChart: [
        { size: 'S', bust: '82', waist: '64', hip: '88', length: '135' },
        { size: 'M', bust: '86', waist: '68', hip: '92', length: '137' },
        { size: 'L', bust: '90', waist: '72', hip: '96', length: '139' },
      ],
      pairingSuggestions: ['搭配高跟鞋晚宴女王', '外搭皮衣酷飒混搭', '配闪亮配饰派对焦点'],
      careInstructions: '建议干洗，手洗需轻柔，不可拧干，平铺晾干，不可熨烫',
    },
  },
  {
    sku: 'AN-DRE-005',
    name: '衬衫式连衣裙',
    description: '衬衫裙版型利落有型，系带收腰设计勾勒曲线。翻领+前开扣经典不过时，中长长度通勤休闲两不误。',
    category: ClothingCategory.dresses,
    subcategory: 'shirt_dress',
    colors: ['白色', '浅蓝色', '卡其色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['衬衫裙', '通勤', '系带', '经典', '休闲'],
    price: 289,
    originalPrice: null,
    stock: 90,
    brandSlug: 'uniqlo',
    isFeatured: false,
    attributes: {
      material: '100%棉，府绸面料',
      sizeChart: [
        { size: 'S', bust: '88', waist: '68', hip: '92', length: '100' },
        { size: 'M', bust: '92', waist: '72', hip: '96', length: '102' },
        { size: 'L', bust: '96', waist: '76', hip: '100', length: '104' },
      ],
      pairingSuggestions: ['搭配乐福鞋通勤知性', '配帆布鞋休闲日常', '系带穿法或敞开当外套叠搭'],
      careInstructions: '机洗30°C，不可漂白，悬挂晾干，中温熨烫',
    },
  },
  {
    sku: 'AN-DRE-006',
    name: '复古方领泡泡袖连衣裙',
    description: '复古方领搭配泡泡袖，宫廷风优雅。收腰大摆裙设计，行走间裙摆摇曳生姿。后背隐形拉链，穿脱方便。',
    category: ClothingCategory.dresses,
    subcategory: 'retro',
    colors: ['复古红', '墨绿色', '藏青色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['复古', '方领', '泡泡袖', '宫廷风', '大摆裙'],
    price: 369,
    originalPrice: 459,
    stock: 50,
    brandSlug: 'aineed-studio',
    isFeatured: false,
    attributes: {
      material: '65%棉 35%聚酯纤维，定型面料',
      sizeChart: [
        { size: 'S', bust: '84', waist: '66', hip: '90', length: '95' },
        { size: 'M', bust: '88', waist: '70', hip: '94', length: '97' },
        { size: 'L', bust: '92', waist: '74', hip: '98', length: '99' },
      ],
      pairingSuggestions: ['搭配玛丽珍鞋复古优雅', '配宽檐帽度假风情', '搭短靴帅气混搭'],
      careInstructions: '建议干洗，手洗需轻柔，不可拧干，悬挂晾干，低温熨烫',
    },
  },

  // ==================== outerwear: 7 件 ====================
  {
    sku: 'AN-OUT-001',
    name: '经典双排扣风衣',
    description: '英伦经典双排扣设计，肩章与袖袢细节考究。中长款防风防雨面料，春秋换季必备，职场休闲通吃。',
    category: ClothingCategory.outerwear,
    subcategory: 'trench_coat',
    colors: ['卡其色', '黑色', '藏青色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['风衣', '双排扣', '英伦', '经典', '春秋'],
    price: 599,
    originalPrice: null,
    stock: 65,
    brandSlug: 'zara',
    isFeatured: true,
    attributes: {
      material: '65%棉 35%聚酯纤维，防水涂层',
      sizeChart: [
        { size: 'S', bust: '96', shoulder: '42', sleeve: '58', length: '100' },
        { size: 'M', bust: '100', shoulder: '44', sleeve: '60', length: '102' },
        { size: 'L', bust: '104', shoulder: '46', sleeve: '62', length: '104' },
      ],
      pairingSuggestions: ['搭配衬衫+西裤职场精英', '配T恤+牛仔裤休闲英伦', '系带穿法强调腰线'],
      careInstructions: '建议干洗，机洗需翻面轻柔模式，悬挂晾干，中温熨烫',
    },
  },
  {
    sku: 'AN-OUT-002',
    name: '极简廓形羊毛大衣',
    description: '宽松廓形设计，不挑身材气场十足。双面羊毛工艺轻盈保暖，无扣开放式穿着洒脱随性，极简主义风格典范。',
    category: ClothingCategory.outerwear,
    subcategory: 'wool_coat',
    colors: ['驼色', '黑色', '燕麦色'],
    sizes: ['S', 'M', 'L'],
    tags: ['羊毛大衣', '廓形', '双面呢', '极简', '秋冬'],
    price: 899,
    originalPrice: 1199,
    stock: 30,
    brandSlug: 'cos',
    isFeatured: true,
    attributes: {
      material: '100%双面羊毛，900g/m²',
      sizeChart: [
        { size: 'S', bust: '104', shoulder: '46', sleeve: '56', length: '110' },
        { size: 'M', bust: '108', shoulder: '48', sleeve: '58', length: '112' },
        { size: 'L', bust: '112', shoulder: '50', sleeve: '60', length: '114' },
      ],
      pairingSuggestions: ['搭配高领毛衣+阔腿裤优雅大气', '配连衣裙+长靴秋冬气质', '内搭同色系高级感穿搭'],
      careInstructions: '必须干洗，存放时使用宽肩衣架，换季收纳需防蛀',
    },
  },
  {
    sku: 'AN-OUT-003',
    name: '短款机车皮衣',
    description: '经典机车款皮衣，不对称拉链设计酷感十足。绵羊皮面料柔软有型，短款版型提升腰线，搭配裙装裤装都出彩。',
    category: ClothingCategory.outerwear,
    subcategory: 'leather_jacket',
    colors: ['黑色', '深棕色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['皮衣', '机车', '短款', '酷感', '百搭'],
    price: 799,
    originalPrice: null,
    stock: 40,
    brandSlug: 'aineed-studio',
    isFeatured: false,
    attributes: {
      material: '100%绵羊皮，里料100%聚酯纤维',
      sizeChart: [
        { size: 'S', bust: '90', shoulder: '40', sleeve: '56', length: '50' },
        { size: 'M', bust: '94', shoulder: '42', sleeve: '58', length: '52' },
        { size: 'L', bust: '98', shoulder: '44', sleeve: '60', length: '54' },
      ],
      pairingSuggestions: ['搭配碎花裙甜酷混搭', '配T恤+牛仔裤经典机车风', '搭连衣裙刚柔并济'],
      careInstructions: '专业皮革护理，不可水洗，不可熨烫，存放时避免折叠，定期上皮革保养油',
    },
  },
  {
    sku: 'AN-OUT-004',
    name: '轻量羽绒服',
    description: '90%白鸭绒填充，轻盈保暖不臃肿。立领设计防风保暖，可收纳便携设计出行无忧，秋冬通勤好搭档。',
    category: ClothingCategory.outerwear,
    subcategory: 'puffer',
    colors: ['黑色', '深蓝色', '酒红色'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['羽绒服', '轻量', '保暖', '便携', '秋冬'],
    price: 499,
    originalPrice: null,
    stock: 100,
    brandSlug: 'uniqlo',
    isFeatured: false,
    attributes: {
      material: '面料100%锦纶，填充90%白鸭绒10%羽毛',
      sizeChart: [
        { size: 'S', bust: '100', shoulder: '44', sleeve: '58', length: '62' },
        { size: 'M', bust: '104', shoulder: '46', sleeve: '60', length: '64' },
        { size: 'L', bust: '108', shoulder: '48', sleeve: '62', length: '66' },
        { size: 'XL', bust: '112', shoulder: '50', sleeve: '64', length: '68' },
      ],
      pairingSuggestions: ['搭配针织衫+牛仔裤日常保暖', '配卫衣+运动裤休闲运动', '内搭连衣裙优雅保暖'],
      careInstructions: '机洗轻柔模式30°C，使用中性洗涤剂，低温烘干或平铺晾干，定期拍打恢复蓬松',
    },
  },
  {
    sku: 'AN-OUT-005',
    name: '针织开衫',
    description: '粗针编织纹理感丰富，落肩设计休闲舒适。前开扣穿脱方便，可做外套可做内搭，春秋换季实用单品。',
    category: ClothingCategory.outerwear,
    subcategory: 'cardigan',
    colors: ['米白色', '焦糖色', '雾霾蓝'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['针织开衫', '粗针', '休闲', '叠穿', '春秋'],
    price: 229,
    originalPrice: 299,
    stock: 95,
    brandSlug: 'uniqlo',
    isFeatured: false,
    attributes: {
      material: '60%棉 40%腈纶，粗针编织',
      sizeChart: [
        { size: 'S', bust: '100', shoulder: '48', sleeve: '54', length: '60' },
        { size: 'M', bust: '104', shoulder: '50', sleeve: '56', length: '62' },
        { size: 'L', bust: '108', shoulder: '52', sleeve: '58', length: '64' },
      ],
      pairingSuggestions: ['搭配T恤+牛仔裤休闲日常', '配连衣裙温柔知性', '叠穿在衬衫外层次穿搭'],
      careInstructions: '手洗或机洗轻柔模式30°C，平铺晾干，低温熨烫',
    },
  },
  {
    sku: 'AN-OUT-006',
    name: '西装外套',
    description: '修身剪裁西装外套，垫肩设计撑起气场。微收腰版型不显臃肿，内衬丝滑穿脱方便，职场穿搭利器。',
    category: ClothingCategory.outerwear,
    subcategory: 'blazer',
    colors: ['黑色', '深灰色', '驼色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['西装', '职场', '修身', '垫肩', '通勤'],
    price: 449,
    originalPrice: null,
    stock: 70,
    brandSlug: 'zara',
    isFeatured: false,
    attributes: {
      material: '72%聚酯纤维 25%粘胶纤维 3%氨纶，里料100%聚酯纤维',
      sizeChart: [
        { size: 'S', bust: '88', shoulder: '40', sleeve: '56', length: '62' },
        { size: 'M', bust: '92', shoulder: '42', sleeve: '58', length: '64' },
        { size: 'L', bust: '96', shoulder: '44', sleeve: '60', length: '66' },
      ],
      pairingSuggestions: ['搭配西裤套装职场正式', '配牛仔裤休闲西装风', '搭半裙优雅通勤'],
      careInstructions: '建议干洗，保持版型，存放时使用宽肩衣架悬挂',
    },
  },
  {
    sku: 'AN-OUT-007',
    name: '连帽中长棉服',
    description: '中长款设计保暖覆盖面积大，连帽可拆卸灵活多变。填充仿丝棉轻盈保暖，多个口袋实用方便，冬日出行首选。',
    category: ClothingCategory.outerwear,
    subcategory: 'padded_coat',
    colors: ['黑色', '军绿色', '米白色'],
    sizes: ['M', 'L', 'XL', 'XXL'],
    tags: ['棉服', '连帽', '中长款', '保暖', '冬日'],
    price: 399,
    originalPrice: 549,
    stock: 80,
    brandSlug: 'uniqlo',
    isFeatured: false,
    attributes: {
      material: '面料100%锦纶，填充仿丝棉，里料100%聚酯纤维',
      sizeChart: [
        { size: 'M', bust: '108', shoulder: '48', sleeve: '60', length: '85' },
        { size: 'L', bust: '112', shoulder: '50', sleeve: '62', length: '87' },
        { size: 'XL', bust: '116', shoulder: '52', sleeve: '64', length: '89' },
      ],
      pairingSuggestions: ['搭配毛衣+牛仔裤冬日日常', '配卫衣+运动裤休闲保暖', '内搭连衣裙+长靴优雅过冬'],
      careInstructions: '机洗30°C，使用中性洗涤剂，低温烘干，悬挂晾干',
    },
  },

  // ==================== footwear: 6 件 ====================
  {
    sku: 'AN-FOT-001',
    name: '经典白色运动鞋',
    description: '简约白色鞋身搭配厚底设计，增高显瘦。透气网面+皮革拼接，脚感轻盈舒适，百搭各种风格。',
    category: ClothingCategory.footwear,
    subcategory: 'sneakers',
    colors: ['白色', '黑白'],
    sizes: ['36', '37', '38', '39', '40', '41'],
    tags: ['运动鞋', '小白鞋', '厚底', '百搭', '休闲'],
    price: 399,
    originalPrice: null,
    stock: 150,
    brandSlug: 'nike',
    isFeatured: false,
    attributes: {
      material: '鞋面：皮革+网布，鞋底：橡胶+EVA',
      sizeChart: [
        { size: '36', footLength: '230' },
        { size: '37', footLength: '235' },
        { size: '38', footLength: '240' },
        { size: '39', footLength: '245' },
        { size: '40', footLength: '250' },
      ],
      pairingSuggestions: ['搭配牛仔裤休闲日常', '配连衣裙运动混搭', '搭西装裤休闲职场'],
      careInstructions: '用软布擦拭清洁，避免长时间浸泡，存放时放入鞋撑保持形状',
    },
  },
  {
    sku: 'AN-FOT-002',
    name: '尖头细高跟鞋',
    description: '经典尖头细跟设计，8cm跟高拉长腿部线条。优质漆皮面料光泽感佳，通勤约会提升气场的秘密武器。',
    category: ClothingCategory.footwear,
    subcategory: 'heels',
    colors: ['黑色', '裸色', '红色'],
    sizes: ['35', '36', '37', '38', '39', '40'],
    tags: ['高跟鞋', '尖头', '细跟', '通勤', '优雅'],
    price: 459,
    originalPrice: null,
    stock: 60,
    brandSlug: 'aineed-studio',
    isFeatured: true,
    attributes: {
      material: '鞋面：漆皮，内里：羊皮，鞋底：橡胶',
      sizeChart: [
        { size: '35', footLength: '225' },
        { size: '36', footLength: '230' },
        { size: '37', footLength: '235' },
        { size: '38', footLength: '240' },
        { size: '39', footLength: '245' },
      ],
      pairingSuggestions: ['搭配西装裤职场精英', '配连衣裙优雅约会', '搭牛仔裤+衬衫休闲精致'],
      careInstructions: '用软布擦拭，避免刮擦，存放时放入鞋撑，建议使用鞋拔穿脱',
    },
  },
  {
    sku: 'AN-FOT-003',
    name: '乐福鞋',
    description: '经典乐福鞋型，方头设计舒适不挤脚。软底软面走路不累，金属扣装饰增添精致感，通勤休闲两相宜。',
    category: ClothingCategory.footwear,
    subcategory: 'loafers',
    colors: ['黑色', '棕色', '酒红色'],
    sizes: ['36', '37', '38', '39', '40', '41'],
    tags: ['乐福鞋', '方头', '通勤', '舒适', '金属扣'],
    price: 329,
    originalPrice: 429,
    stock: 85,
    brandSlug: 'zara',
    isFeatured: false,
    attributes: {
      material: '鞋面：牛皮，内里：猪皮，鞋底：TPR',
      sizeChart: [
        { size: '36', footLength: '230' },
        { size: '37', footLength: '235' },
        { size: '38', footLength: '240' },
        { size: '39', footLength: '245' },
        { size: '40', footLength: '250' },
      ],
      pairingSuggestions: ['搭配西装裤知性通勤', '配牛仔裤休闲精致', '搭半裙优雅学院风'],
      careInstructions: '用皮革专用清洁剂擦拭，定期上保养油，存放时放入鞋撑',
    },
  },
  {
    sku: 'AN-FOT-004',
    name: '切尔西短靴',
    description: '经典切尔西靴型，弹力侧边穿脱方便。尖头设计修饰脚型，低跟舒适增高，秋冬百搭靴款。',
    category: ClothingCategory.footwear,
    subcategory: 'boots',
    colors: ['黑色', '深棕色'],
    sizes: ['36', '37', '38', '39', '40'],
    tags: ['短靴', '切尔西', '秋冬', '百搭', '尖头'],
    price: 499,
    originalPrice: null,
    stock: 55,
    brandSlug: 'aineed-studio',
    isFeatured: false,
    attributes: {
      material: '鞋面：牛皮，内里：人造短毛绒，鞋底：橡胶',
      sizeChart: [
        { size: '36', footLength: '230', calf: '22' },
        { size: '37', footLength: '235', calf: '22.5' },
        { size: '38', footLength: '240', calf: '23' },
        { size: '39', footLength: '245', calf: '23.5' },
      ],
      pairingSuggestions: ['搭配紧身裤+大衣秋冬经典', '配连衣裙+袜子靴时髦', '搭牛仔裤休闲帅气'],
      careInstructions: '用皮革专用清洁剂擦拭，避免长时间泡水，存放时放入鞋撑保持形状',
    },
  },
  {
    sku: 'AN-FOT-005',
    name: 'Air Max 气垫跑鞋',
    description: '可视气垫缓震科技，跑步或日常穿着都舒适。网面鞋身透气轻盈，流线型设计动感十足，运动潮流两不误。',
    category: ClothingCategory.footwear,
    subcategory: 'running',
    colors: ['黑白', '灰蓝', '纯黑'],
    sizes: ['37', '38', '39', '40', '41', '42', '43'],
    tags: ['跑鞋', '气垫', '运动', '潮流', '透气'],
    price: 899,
    originalPrice: null,
    stock: 70,
    brandSlug: 'nike',
    isFeatured: false,
    attributes: {
      material: '鞋面：网布+合成材料，鞋底：Air Max气垫+橡胶',
      sizeChart: [
        { size: '37', footLength: '235' },
        { size: '38', footLength: '240' },
        { size: '39', footLength: '245' },
        { size: '40', footLength: '250' },
        { size: '41', footLength: '255' },
      ],
      pairingSuggestions: ['搭配运动裤专业跑步', '配牛仔裤运动休闲', '搭短裤夏日活力'],
      careInstructions: '用软布擦拭清洁，避免长时间浸泡，运动后取出鞋垫通风晾干',
    },
  },
  {
    sku: 'AN-FOT-006',
    name: '穆勒拖鞋',
    description: '半包脚设计穿脱方便，方头舒适不挤脚。软底缓震走路不累，简约设计搭配各种风格，春夏必备懒人鞋。',
    category: ClothingCategory.footwear,
    subcategory: 'mules',
    colors: ['黑色', '米白色', '焦糖色'],
    sizes: ['36', '37', '38', '39', '40'],
    tags: ['穆勒鞋', '拖鞋', '方头', '春夏', '懒人鞋'],
    price: 259,
    originalPrice: 329,
    stock: 100,
    brandSlug: 'zara',
    isFeatured: false,
    attributes: {
      material: '鞋面：羊皮，内里：羊皮，鞋底：橡胶',
      sizeChart: [
        { size: '36', footLength: '230' },
        { size: '37', footLength: '235' },
        { size: '38', footLength: '240' },
        { size: '39', footLength: '245' },
      ],
      pairingSuggestions: ['搭配阔腿裤慵懒时髦', '配连衣裙优雅随性', '搭牛仔裤休闲精致'],
      careInstructions: '用软布擦拭，避免长时间泡水，存放时避免重压变形',
    },
  },

  // ==================== accessories: 8 件 ====================
  {
    sku: 'AN-ACC-001',
    name: '极简金属表带手表',
    description: '简约圆形表盘搭配金属表带，日本机芯走时精准。30米生活防水，日常佩戴无忧，职场休闲皆可搭配。',
    category: ClothingCategory.accessories,
    subcategory: 'watch',
    colors: ['银色', '玫瑰金', '金色'],
    sizes: ['均码'],
    tags: ['手表', '极简', '金属表带', '通勤', '精致'],
    price: 599,
    originalPrice: null,
    stock: 40,
    brandSlug: 'aineed-studio',
    isFeatured: true,
    attributes: {
      material: '表壳：316L不锈钢，表带：不锈钢，表盘直径32mm',
      pairingSuggestions: ['搭配西装职场精英', '配连衣裙优雅精致', '日常佩戴提升整体质感'],
      careInstructions: '30米生活防水，避免热水和蒸汽，定期更换电池，用软布擦拭保养',
    },
  },
  {
    sku: 'AN-ACC-002',
    name: '丝巾',
    description: '100%桑蚕丝面料，手感丝滑光泽柔美。多种系法变化，可做头巾、领巾、包饰，一条丝巾多种搭配。',
    category: ClothingCategory.accessories,
    subcategory: 'scarf',
    colors: ['印花蓝', '印花红', '印花绿'],
    sizes: ['均码'],
    tags: ['丝巾', '真丝', '印花', '百搭', '优雅'],
    price: 199,
    originalPrice: 279,
    stock: 80,
    brandSlug: 'aineed-studio',
    isFeatured: false,
    attributes: {
      material: '100%桑蚕丝，90cm×90cm',
      pairingSuggestions: ['系在颈部点缀衬衫', '做头巾法式浪漫', '绑在包柄增添亮点'],
      careInstructions: '建议干洗，手洗需用丝毛专用洗涤剂，不可拧干，阴凉处晾干',
    },
  },
  {
    sku: 'AN-ACC-003',
    name: '珍珠耳环',
    description: '天然淡水珍珠搭配925银针，温润光泽衬托气质。简约设计不挑脸型，日常佩戴或出席场合皆适宜。',
    category: ClothingCategory.accessories,
    subcategory: 'earrings',
    colors: ['白色珍珠', '粉色珍珠'],
    sizes: ['均码'],
    tags: ['耳环', '珍珠', '925银', '优雅', '气质'],
    price: 159,
    originalPrice: null,
    stock: 100,
    brandSlug: 'aineed-studio',
    isFeatured: false,
    attributes: {
      material: '天然淡水珍珠8-9mm，925银针',
      pairingSuggestions: ['搭配小黑裙经典优雅', '配衬衫知性通勤', '日常佩戴提升精致感'],
      careInstructions: '避免接触化妆品和香水，佩戴后用软布擦拭，单独存放避免刮擦',
    },
  },
  {
    sku: 'AN-ACC-004',
    name: '链条斜挎包',
    description: '经典翻盖链条包设计，皮质细腻手感柔软。金属链条肩带可调节，容量适中满足日常需求，约会通勤百搭包款。',
    category: ClothingCategory.accessories,
    subcategory: 'bag',
    colors: ['黑色', '米白色', '酒红色'],
    sizes: ['均码'],
    tags: ['链条包', '斜挎', '翻盖', '百搭', '通勤'],
    price: 499,
    originalPrice: 699,
    stock: 50,
    brandSlug: 'zara',
    isFeatured: true,
    attributes: {
      material: 'PU皮革，金属链条，内里涤纶，尺寸20×14×7cm',
      pairingSuggestions: ['搭配连衣裙优雅约会', '配西装+西裤职场精英', '搭T恤+牛仔裤休闲精致'],
      careInstructions: '用软布擦拭清洁，避免长时间暴晒，存放时填充保持形状',
    },
  },
  {
    sku: 'AN-ACC-005',
    name: '宽檐礼帽',
    description: '经典宽檐设计修饰脸型，羊毛呢面料挺括有型。可折叠便携设计，度假出游拍照利器，秋冬搭配提升品味。',
    category: ClothingCategory.accessories,
    subcategory: 'hat',
    colors: ['黑色', '驼色', '灰色'],
    sizes: ['M', 'L'],
    tags: ['礼帽', '宽檐', '羊毛', '度假', '秋冬'],
    price: 229,
    originalPrice: null,
    stock: 45,
    brandSlug: 'aineed-studio',
    isFeatured: false,
    attributes: {
      material: '100%羊毛呢，帽檐宽度8cm',
      pairingSuggestions: ['搭配风衣英伦优雅', '配大衣秋冬气质', '搭连衣裙度假风情'],
      careInstructions: '不可水洗，用软毛刷清洁，存放时倒扣放置避免压变形',
    },
  },
  {
    sku: 'AN-ACC-006',
    name: '极简皮质腰带',
    description: '头层牛皮腰带，针扣设计简约大方。3.5cm宽度适中，裤装裙装都适用，细节处彰显品味。',
    category: ClothingCategory.accessories,
    subcategory: 'belt',
    colors: ['黑色', '棕色', '白色'],
    sizes: ['S', 'M', 'L'],
    tags: ['腰带', '皮带', '极简', '百搭', '质感'],
    price: 169,
    originalPrice: null,
    stock: 120,
    brandSlug: 'cos',
    isFeatured: false,
    attributes: {
      material: '头层牛皮，针扣合金，宽度3.5cm',
      pairingSuggestions: ['搭配高腰裤强调腰线', '系在大衣外勾勒身形', '配连衣裙收腰显瘦'],
      careInstructions: '避免弯折，用皮革专用清洁剂擦拭，定期上皮革保养油',
    },
  },
  {
    sku: 'AN-ACC-007',
    name: '墨镜',
    description: '大框猫眼设计修饰脸型，UV400防晒保护双眼。轻量材质佩戴舒适不压鼻梁，夏日出行必备时尚单品。',
    category: ClothingCategory.accessories,
    subcategory: 'sunglasses',
    colors: ['黑框灰片', '棕框棕片', '透明框粉片'],
    sizes: ['均码'],
    tags: ['墨镜', '猫眼', 'UV400', '防晒', '夏日'],
    price: 189,
    originalPrice: 249,
    stock: 90,
    brandSlug: 'zara',
    isFeatured: false,
    attributes: {
      material: '镜框：醋酸纤维，镜片：TAC偏光镜片，UV400防护',
      pairingSuggestions: ['搭配任何夏日穿搭提升气场', '配吊带裙度假风情', '搭休闲装明星出街感'],
      careInstructions: '用眼镜布擦拭，避免高温环境，不戴时放入眼镜盒',
    },
  },
  {
    sku: 'AN-ACC-008',
    name: '编织托特包',
    description: '手工编织设计质感独特，大容量满足通勤需求。内含隔层收纳有序，皮质手柄舒适耐用，工作休闲两不误。',
    category: ClothingCategory.accessories,
    subcategory: 'bag',
    colors: ['自然色', '黑色', '棕色'],
    sizes: ['均码'],
    tags: ['托特包', '编织', '大容量', '通勤', '手工'],
    price: 379,
    originalPrice: null,
    stock: 55,
    brandSlug: 'cos',
    isFeatured: false,
    attributes: {
      material: '纸草编织，皮质手柄，内里棉布，尺寸35×30×15cm',
      pairingSuggestions: ['搭配衬衫+西裤通勤知性', '配连衣裙优雅度假', '搭休闲装随性自然'],
      careInstructions: '避免受潮，用干布擦拭清洁，存放时填充保持形状',
    },
  },

  // ==================== activewear: 5 件 ====================
  {
    sku: 'AN-ACT-001',
    name: '高弹力瑜伽裤',
    description: '四向弹力面料自由伸展无束缚，高腰设计包裹腹部不卷边。吸湿速干科技保持干爽，瑜伽健身日常皆宜。',
    category: ClothingCategory.activewear,
    subcategory: 'leggings',
    colors: ['黑色', '深灰色', '藏青色'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tags: ['瑜伽裤', '高弹力', '高腰', '速干', '健身'],
    price: 299,
    originalPrice: null,
    stock: 130,
    brandSlug: 'nike',
    isFeatured: true,
    attributes: {
      material: '78%锦纶 22%氨纶，Dri-FIT速干科技',
      sizeChart: [
        { size: 'S', waist: '64', hip: '88', inseam: '72' },
        { size: 'M', waist: '68', hip: '92', inseam: '74' },
        { size: 'L', waist: '72', hip: '96', inseam: '76' },
        { size: 'XL', waist: '76', hip: '100', inseam: '78' },
      ],
      pairingSuggestions: ['搭配运动背心专业健身', '配Oversize卫衣运动休闲', '搭长款上衣日常出街'],
      careInstructions: '机洗30°C，不可使用柔顺剂，不可漂白，悬挂晾干，不可熨烫',
    },
  },
  {
    sku: 'AN-ACT-002',
    name: '运动背心',
    description: '中强度支撑适合瑜伽和训练，宽肩带设计减少肩部压力。内置可拆卸胸垫方便清洗，透气网眼拼接散热快。',
    category: ClothingCategory.activewear,
    subcategory: 'sports_bra',
    colors: ['黑色', '白色', '灰色'],
    sizes: ['XS', 'S', 'M', 'L'],
    tags: ['运动背心', '中支撑', '透气', '瑜伽', '训练'],
    price: 199,
    originalPrice: null,
    stock: 110,
    brandSlug: 'nike',
    isFeatured: false,
    attributes: {
      material: '88%聚酯纤维 12%氨纶，Dri-FIT速干科技',
      sizeChart: [
        { size: 'S', bust: '80-84' },
        { size: 'M', bust: '84-88' },
        { size: 'L', bust: '88-92' },
      ],
      pairingSuggestions: ['搭配瑜伽裤完整运动装备', '配运动短裤夏日健身', '外搭透明防晒衣户外运动'],
      careInstructions: '机洗30°C，取出胸垫单独清洗，不可使用柔顺剂，悬挂晾干',
    },
  },
  {
    sku: 'AN-ACT-003',
    name: '速干T恤',
    description: 'Dri-FIT速干科技面料快速排汗，保持运动干爽。宽松版型活动自如，反光Logo设计夜跑更安全。',
    category: ClothingCategory.activewear,
    subcategory: 'tshirt',
    colors: ['黑色', '白色', '荧光绿'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['速干', '运动T恤', '排汗', '夜跑', '健身'],
    price: 199,
    originalPrice: 259,
    stock: 140,
    brandSlug: 'nike',
    isFeatured: false,
    attributes: {
      material: '100%聚酯纤维，Dri-FIT速干科技',
      sizeChart: [
        { size: 'S', bust: '96', length: '66' },
        { size: 'M', bust: '100', length: '68' },
        { size: 'L', bust: '104', length: '70' },
        { size: 'XL', bust: '108', length: '72' },
      ],
      pairingSuggestions: ['搭配运动短裤跑步训练', '配运动裤健身房穿搭', '搭休闲裤运动休闲风'],
      careInstructions: '机洗30°C，不可使用柔顺剂，不可漂白，悬挂晾干，不可熨烫',
    },
  },
  {
    sku: 'AN-ACT-004',
    name: '运动短裤',
    description: '轻量面料无负重感，内衬设计防走光。侧边开叉增加活动范围，隐形口袋可放钥匙卡片，夏日运动首选。',
    category: ClothingCategory.activewear,
    subcategory: 'shorts',
    colors: ['黑色', '深灰色', '藏青色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['运动短裤', '轻量', '内衬', '夏日', '跑步'],
    price: 169,
    originalPrice: null,
    stock: 100,
    brandSlug: 'nike',
    isFeatured: false,
    attributes: {
      material: '100%聚酯纤维，内衬：92%聚酯纤维 8%氨纶',
      sizeChart: [
        { size: 'S', waist: '66', hip: '90', inseam: '10' },
        { size: 'M', waist: '70', hip: '94', inseam: '11' },
        { size: 'L', waist: '74', hip: '98', inseam: '12' },
      ],
      pairingSuggestions: ['搭配运动背心跑步训练', '配速干T恤健身穿搭', '搭运动内衣夏日活力'],
      careInstructions: '机洗30°C，不可使用柔顺剂，不可漂白，悬挂晾干',
    },
  },
  {
    sku: 'AN-ACT-005',
    name: '拉链运动外套',
    description: '全拉链设计穿脱方便，立领防风保暖。拇指孔设计袖口不滑落，侧边口袋可存放物品，运动前后保暖必备。',
    category: ClothingCategory.activewear,
    subcategory: 'jacket',
    colors: ['黑色', '深灰色', '酒红色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['运动外套', '拉链', '防风', '保暖', '拇指孔'],
    price: 349,
    originalPrice: 449,
    stock: 75,
    brandSlug: 'nike',
    isFeatured: false,
    attributes: {
      material: '88%聚酯纤维 12%氨纶，Dri-FIT速干科技',
      sizeChart: [
        { size: 'S', bust: '96', shoulder: '42', sleeve: '60', length: '60' },
        { size: 'M', bust: '100', shoulder: '44', sleeve: '62', length: '62' },
        { size: 'L', bust: '104', shoulder: '46', sleeve: '64', length: '64' },
      ],
      pairingSuggestions: ['搭配瑜伽裤运动套装', '配运动短裤热身穿搭', '搭休闲裤运动休闲风'],
      careInstructions: '机洗30°C，拉好拉链后洗涤，不可使用柔顺剂，悬挂晾干',
    },
  },

  // ==================== swimwear: 3 件 ====================
  {
    sku: 'AN-SWM-001',
    name: '连体泳衣',
    description: '经典连体设计修饰身材，交叉V领展露锁骨线条。聚拢效果自信穿着，内衬设计舒适不透，海边度假必备。',
    category: ClothingCategory.swimwear,
    subcategory: 'one_piece',
    colors: ['黑色', '深蓝色', '酒红色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['连体泳衣', 'V领', '聚拢', '度假', '显瘦'],
    price: 259,
    originalPrice: null,
    stock: 70,
    brandSlug: 'aineed-studio',
    isFeatured: false,
    attributes: {
      material: '82%锦纶 18%氨纶，内衬：100%聚酯纤维',
      sizeChart: [
        { size: 'S', bust: '82', waist: '64', hip: '88' },
        { size: 'M', bust: '86', waist: '68', hip: '92' },
        { size: 'L', bust: '90', waist: '72', hip: '96' },
      ],
      pairingSuggestions: ['搭配防晒衫海边度假', '配宽檐帽+墨镜泳池派对', '搭纱裙度假风情'],
      careInstructions: '手洗冷水，使用中性洗涤剂，不可漂白，不可拧干，阴凉处晾干，避免长时间日晒',
    },
  },
  {
    sku: 'AN-SWM-002',
    name: '比基尼套装',
    description: '三角杯上衣搭配系带比基尼底，性感俏皮。可调节肩带和系带设计贴合身形，度假拍照上镜之选。',
    category: ClothingCategory.swimwear,
    subcategory: 'bikini',
    colors: ['白色', '黑色', '热带印花'],
    sizes: ['S', 'M', 'L'],
    tags: ['比基尼', '系带', '度假', '性感', '夏日'],
    price: 199,
    originalPrice: 269,
    stock: 60,
    brandSlug: 'zara',
    isFeatured: false,
    attributes: {
      material: '82%锦纶 18%氨纶，内衬：100%聚酯纤维',
      sizeChart: [
        { size: 'S', bust: '80-84', waist: '62-66', hip: '86-90' },
        { size: 'M', bust: '84-88', waist: '66-70', hip: '90-94' },
        { size: 'L', bust: '88-92', waist: '70-74', hip: '94-98' },
      ],
      pairingSuggestions: ['搭配透明纱裙海边浪漫', '配草帽+凉拖度假标配', '外搭防晒衣实用防晒'],
      careInstructions: '手洗冷水，使用中性洗涤剂，不可漂白，不可拧干，阴凉处晾干',
    },
  },
  {
    sku: 'AN-SWM-003',
    name: '挂脖分体泳衣',
    description: '挂脖设计展露肩背线条，高腰底裤修饰腹部。运动与时尚兼顾，泳池游泳或海边嬉戏都适合。',
    category: ClothingCategory.swimwear,
    subcategory: 'tankini',
    colors: ['墨绿色', '珊瑚色', '黑色'],
    sizes: ['S', 'M', 'L', 'XL'],
    tags: ['分体泳衣', '挂脖', '高腰', '运动', '度假'],
    price: 279,
    originalPrice: null,
    stock: 50,
    brandSlug: 'aineed-studio',
    isFeatured: true,
    attributes: {
      material: '82%锦纶 18%氨纶，内衬：100%聚酯纤维',
      sizeChart: [
        { size: 'S', bust: '82', waist: '64', hip: '88' },
        { size: 'M', bust: '86', waist: '68', hip: '92' },
        { size: 'L', bust: '90', waist: '72', hip: '96' },
      ],
      pairingSuggestions: ['搭配防晒开衫海边优雅', '配大檐帽+墨镜明星度假风', '搭纱裤飘逸浪漫'],
      careInstructions: '手洗冷水，使用中性洗涤剂，不可漂白，不可拧干，阴凉处晾干，避免接触粗糙表面',
    },
  },
];

// ============================================================================
// Generative expansion to reach 500+ items
// ============================================================================

const brandPool = [
  'xuno-studio', 'zara', 'uniqlo', 'cos', 'nike', 'hm', 'gap',
  'pull-and-bear', 'bershka', 'mango', 'massimo-dutti', 'adidas',
  'puma', 'under-armour', 'lululemon', 'fila', 'anta', 'li-ning',
  'bosideng', 'peacebird', 'gxg', 'semir', 'ochirly', 'mo-co',
  'jnby', 'champion', 'carhartt', 'levis', 'calvin-klein',
  'tommy-hilfiger', 'dr-martens', 'converse', 'vans', 'new-balance',
  'asics', 'furla', 'longchamp', 'coach', 'michael-kors',
];

const colorPalettes = {
  tops: [
    ['白色', '黑色', '灰色'],
    ['奶白色', '浅蓝色', '米色'],
    ['驼色', '焦糖色', '卡其色'],
    ['樱花粉', '薰衣草紫', '薄荷绿'],
    ['酒红色', '墨绿色', '藏青色'],
    ['橘红色', '姜黄色', '孔雀蓝'],
    ['珊瑚色', '雾霾蓝', '燕麦色'],
    ['米白色', '灰蓝色', '深灰色'],
  ],
  bottoms: [
    ['深蓝色', '黑色', '浅蓝色'],
    ['黑色', '灰色', '卡其色'],
    ['白色', '米色', '杏色'],
    ['军绿色', '卡其色', '黑色'],
    ['驼色', '深灰色', '藏青色'],
    ['复古蓝', '烟灰色', '原色'],
  ],
  dresses: [
    ['黑色', '酒红色', '墨绿色'],
    ['白色', '浅粉色', '淡蓝色'],
    ['碎花', '条纹', '波点'],
    ['米白色', '香槟色', '裸色'],
    ['藏青色', '深灰色', '黑色'],
    ['珊瑚色', '鹅黄色', '薄荷绿'],
  ],
  outerwear: [
    ['黑色', '藏青色', '深灰色'],
    ['驼色', '卡其色', '米色'],
    ['军绿色', '黑色', '灰色'],
    ['白色', '米白色', '浅灰色'],
    ['酒红色', '焦糖色', '棕色'],
    ['藏青色', '墨绿色', '炭灰色'],
  ],
  footwear: [
    ['白色', '黑色', '灰色'],
    ['黑色', '棕色', '酒红色'],
    ['米白色', '裸色', '浅灰色'],
    ['白色', '蓝色', '红色'],
    ['黑色', '白色', '绿色'],
    ['棕色', '驼色', '黑色'],
  ],
  accessories: [
    ['黑色', '棕色', '酒红色'],
    ['金色', '银色', '玫瑰金'],
    ['白色', '米色', '灰色'],
    ['红色', '蓝色', '绿色'],
    ['黑色', '白色', '金色'],
  ],
  activewear: [
    ['黑色', '深灰色', '藏青色'],
    ['白色', '灰色', '黑色'],
    ['荧光绿', '亮蓝色', '橙色'],
    ['粉色', '紫色', '蓝色'],
    ['黑色', '白色', '红色'],
  ],
  swimwear: [
    ['黑色', '白色', '红色'],
    ['热带印花', '条纹', '纯色'],
    ['蓝色', '绿色', '橙色'],
    ['碎花', '波点', '几何'],
    ['黑色', '深蓝色', '酒红色'],
  ],
};

const sizeSets = {
  tops: [['XS', 'S', 'M', 'L', 'XL'], ['S', 'M', 'L', 'XL'], ['M', 'L', 'XL']],
  bottoms: [['XS', 'S', 'M', 'L', 'XL'], ['S', 'M', 'L', 'XL'], ['26', '27', '28', '29', '30', '31']],
  dresses: [['XS', 'S', 'M', 'L'], ['S', 'M', 'L', 'XL'], ['S', 'M', 'L']],
  outerwear: [['S', 'M', 'L', 'XL'], ['M', 'L', 'XL', 'XXL'], ['S', 'M', 'L']],
  footwear: [['36', '37', '38', '39', '40'], ['38', '39', '40', '41', '42', '43'], ['35', '36', '37', '38', '39']],
  accessories: [['均码'], ['S', 'M', 'L']],
  activewear: [['XS', 'S', 'M', 'L', 'XL'], ['S', 'M', 'L', 'XL']],
  swimwear: [['XS', 'S', 'M', 'L'], ['S', 'M', 'L']],
};

const tagSets = {
  tops: [
    ['基础款', '纯棉', '百搭', '简约'],
    ['法式', '优雅', '浪漫', '约会'],
    ['职场', '通勤', '干练', '知性'],
    ['休闲', '舒适', '日常', '宽松'],
    ['设计感', '小众', '个性', '时尚'],
    ['高领', '保暖', '秋冬', '质感'],
    ['印花', '潮流', '街头', '青春'],
    ['羊绒', '奢华', '经典', '高级'],
  ],
  bottoms: [
    ['修身', '百搭', '经典', '直筒'],
    ['高腰', '显瘦', '阔腿', '优雅'],
    ['休闲', '舒适', '运动', '弹力'],
    ['复古', '宽松', '街头', '潮流'],
    ['职场', '通勤', '西装裤', '知性'],
    ['牛仔', '百搭', '耐穿', '日常'],
  ],
  dresses: [
    ['优雅', '约会', '气质', '显瘦'],
    ['休闲', '日常', '舒适', '简约'],
    ['度假', '波西米亚', '飘逸', '浪漫'],
    ['职场', '知性', '通勤', '大方'],
    ['派对', '性感', '亮片', '夜店'],
    ['清新', '少女', '甜美', '减龄'],
  ],
  outerwear: [
    ['保暖', '厚实', '秋冬', '防风'],
    ['轻薄', '便携', '春秋', '百搭'],
    ['设计感', '时尚', '个性', '潮流'],
    ['经典', '百搭', '职场', '简约'],
    ['运动', '户外', '防水', '透气'],
    ['奢华', '质感', '羊绒', '高级'],
  ],
  footwear: [
    ['百搭', '舒适', '经典', '日常'],
    ['运动', '轻便', '透气', '跑步'],
    ['优雅', '职场', '气质', '高跟'],
    ['休闲', '平底', '舒适', '行走'],
    ['潮流', '街头', '个性', '设计感'],
    ['保暖', '秋冬', '加绒', '厚底'],
  ],
  accessories: [
    ['百搭', '经典', '日常', '简约'],
    ['设计感', '小众', '个性', '时尚'],
    ['优雅', '气质', '职场', '知性'],
    ['运动', '功能', '实用', '户外'],
    ['奢华', '质感', '高级', '品牌'],
  ],
  activewear: [
    ['运动', '透气', '弹力', '速干'],
    ['瑜伽', '舒适', '修身', '柔软'],
    ['跑步', '轻便', '反光', '功能'],
    ['健身', '支撑', '透气', '速干'],
    ['休闲', '运动', '百搭', '日常'],
  ],
  swimwear: [
    ['性感', '比基尼', '度假', '海滩'],
    ['保守', '连体', '遮肚', '显瘦'],
    ['运动', '功能', '竞速', '专业'],
    ['可爱', '少女', '甜美', '清新'],
    ['潮流', '设计感', '个性', '时尚'],
  ],
};

const categoryTemplates = {
  tops: {
    subcategories: ['tshirt', 'blouse', 'sweater', 'hoodie', 'knitwear', 'polo', 'tank_top', 'crop_top'],
    names: [
      (sub, i) => {
        const nameMap = {
          tshirt: ['纯棉圆领T恤', 'V领修身T恤', '宽松印花T恤', '落肩纯色T恤'],
          blouse: ['雪纺飘带衬衫', '丝绸质感衬衫', '荷叶边装饰衬衫', '泡泡袖衬衫'],
          sweater: ['高领针织毛衣', '圆领提花毛衣', 'V领绞花毛衣', '半高领纯色毛衣'],
          hoodie: ['连帽卫衣', '拉链连帽衫', '圆领卫衣', 'oversize卫衣'],
          knitwear: ['开衫针织衫', '套头针织衫', '马海毛针织衫', '粗棒针织衫'],
          polo: ['经典Polo衫', '修身Polo衫', '棉质Polo衫', '条纹Polo衫'],
          tank_top: ['吊带背心', '工字背心', '蕾丝边吊带', '宽肩带背心'],
          crop_top: ['短款T恤', '短款针织衫', '短款衬衫', '短款卫衣'],
        };
        const list = nameMap[sub] || nameMap.tshirt;
        return list[i % list.length];
      },
    ],
    priceRange: [49, 599],
    descTemplates: [
      (n, m) => `${n}，采用优质面料，穿着舒适透气。${m}工艺精湛，适合日常穿搭，百搭实用。`,
      (n, m) => `${n}，${m}设计独特，展现个性风格。面料柔软亲肤，版型修饰身材，是衣橱必备单品。`,
      (n, m) => `${n}，精选${m}面料，手感细腻。简约设计不失细节，轻松驾驭各种场合。`,
    ],
    materials: ['纯棉', '天丝棉', '莫代尔', '涤纶', '羊毛', '羊绒', '亚麻', '锦纶混纺', '丝绸', '竹纤维'],
  },
  bottoms: {
    subcategories: ['jeans', 'pants', 'shorts', 'skirt', 'wide_leg', 'culottes', 'jogger'],
    names: [
      (sub, i) => {
        const nameMap = {
          jeans: ['直筒牛仔裤', '小脚牛仔裤', '高腰阔腿牛仔裤', '弹力修身牛仔裤'],
          pants: ['西装阔腿裤', '休闲直筒裤', '高腰烟管裤', '针织运动裤'],
          shorts: ['高腰牛仔短裤', '休闲五分裤', '西装短裤', '运动短裤'],
          skirt: ['高腰A字裙', '百褶半身裙', '包臀铅笔裙', '网纱半身裙'],
          wide_leg: ['高腰阔腿裤', '垂感西装阔腿裤', '亚麻阔腿裤', '灯芯绒阔腿裤'],
          culottes: ['七分阔腿裤', '休闲七分裤', '通勤七分裤', '棉麻七分裤'],
          jogger: ['束脚运动裤', '休闲卫裤', '针织慢跑裤', '灯芯绒束脚裤'],
        };
        const list = nameMap[sub] || nameMap.pants;
        return list[i % list.length];
      },
    ],
    priceRange: [69, 499],
    descTemplates: [
      (n, m) => `${n}，${m}面料舒适有弹性，版型修饰腿型。百搭日常，适合通勤和休闲场合。`,
      (n, m) => `${n}，精选${m}面料，做工精细。高腰设计拉长腿部比例，穿着舒适有型。`,
    ],
    materials: ['纯棉', '弹力牛仔', '西装面料', '亚麻', '涤纶', '针织', '灯芯绒', '棉麻'],
  },
  dresses: {
    subcategories: ['mini', 'midi', 'maxi', 'shirt_dress', 'wrap_dress', 'slip_dress'],
    names: [
      (sub, i) => {
        const nameMap = {
          mini: ['A字迷你连衣裙', '荷叶边短裙', '格纹短款连衣裙', '泡泡袖迷你裙'],
          midi: ['法式中长连衣裙', 'V领收腰连衣裙', '碎花中长裙', '针织中长裙'],
          maxi: ['波西米亚长裙', '飘逸雪纺长裙', '高开叉长裙', '蕾丝拼接长裙'],
          shirt_dress: ['经典衬衫裙', '系带衬衫裙', '条纹衬衫裙', 'oversize衬衫裙'],
          wrap_dress: ['法式裹身裙', 'V领裹身连衣裙', '碎花裹身裙', '丝质裹身裙'],
          slip_dress: ['吊带连衣裙', '缎面吊带裙', '蕾丝吊带裙', '针织吊带裙'],
        };
        const list = nameMap[sub] || nameMap.midi;
        return list[i % list.length];
      },
    ],
    priceRange: [99, 799],
    descTemplates: [
      (n, m) => `${n}，${m}面料飘逸灵动，剪裁精致优雅。上身展现女性柔美气质，适合约会和派对。`,
      (n, m) => `${n}，采用${m}面料，垂感自然。简约设计凸显品味，轻松打造优雅造型。`,
    ],
    materials: ['雪纺', '丝绸', '棉麻', '针织', '牛仔', '涤纶', '蕾丝', '缎面'],
  },
  outerwear: {
    subcategories: ['jacket', 'blazer', 'coat', 'windbreaker', 'down_jacket', 'trench', 'bomber'],
    names: [
      (sub, i) => {
        const nameMap = {
          jacket: ['机车皮衣', '牛仔外套', '飞行夹克', '灯芯绒夹克'],
          blazer: ['修身西装外套', 'oversize西装', '格纹西装外套', '丝绒西装外套'],
          coat: ['双面羊绒大衣', '毛呢中长款大衣', '茧型大衣', '浴袍式大衣'],
          windbreaker: ['防风冲锋衣', '轻薄风衣', '透气运动外套', '可收纳外套'],
          down_jacket: ['短款羽绒服', '中长款羽绒服', '轻薄羽绒服', '连帽羽绒服'],
          trench: ['经典风衣', '束腰风衣', '短款风衣', '双排扣风衣'],
          bomber: ['经典飞行员夹克', '刺绣棒球夹克', '缎面 bomber', '羊羔毛飞行员夹克'],
        };
        const list = nameMap[sub] || nameMap.jacket;
        return list[i % list.length];
      },
    ],
    priceRange: [129, 2999],
    descTemplates: [
      (n, m) => `${n}，${m}面料挺括有型，剪裁利落。保暖性与时尚感兼具，秋冬衣橱必备。`,
      (n, m) => `${n}，精选${m}面料，做工考究。版型经典不过时，百搭实用。`,
    ],
    materials: ['羊绒', '羊毛', '锦纶', '涤纶', '皮革', '牛仔', '棉', '灯芯绒', '防风面料'],
  },
  footwear: {
    subcategories: ['sneakers', 'heels', 'flats', 'boots', 'sandals', 'loafers', 'mules'],
    names: [
      (sub, i) => {
        const nameMap = {
          sneakers: ['经典小白鞋', '复古老爹鞋', '透气跑步鞋', '低帮板鞋'],
          heels: ['尖头细跟高跟鞋', '方头粗跟单鞋', '猫跟优雅单鞋', '绑带高跟凉鞋'],
          flats: ['芭蕾舞平底鞋', '乐福平底鞋', '尖头平底鞋', '穆勒平底鞋'],
          boots: ['切尔西短靴', '过膝长靴', '马丁靴', '方头短靴'],
          sandals: ['一字带凉鞋', '坡跟凉鞋', '运动凉鞋', '绑带罗马凉鞋'],
          loafers: ['经典乐福鞋', '厚底乐福鞋', '马衔扣乐福鞋', '毛绒乐福鞋'],
          mules: ['半拖鞋穆勒鞋', '方头穆勒鞋', '粗跟穆勒鞋', '皮质穆勒鞋'],
        };
        const list = nameMap[sub] || nameMap.sneakers;
        return list[i % list.length];
      },
    ],
    priceRange: [79, 1299],
    descTemplates: [
      (n, m) => `${n}，${m}材质舒适耐穿。设计时尚百搭，日常出行轻松驾驭。`,
      (n, m) => `${n}，采用${m}材质，脚感柔软。经典款式永不过时，搭配各种风格。`,
    ],
    materials: ['真皮', '合成革', '帆布', '网面', '橡胶底', '绒面', '漆皮'],
  },
  accessories: {
    subcategories: ['bag', 'scarf', 'belt', 'hat', 'jewelry', 'sunglasses', 'watch'],
    names: [
      (sub, i) => {
        const nameMap = {
          bag: ['链条斜挎包', '托特大包', '迷你手提包', '双肩背包'],
          scarf: ['真丝方巾', '羊绒围巾', '印花长巾', '格纹围巾'],
          belt: ['经典皮带', '编织腰带', '细款装饰腰带', '宽版腰带'],
          hat: ['贝雷帽', '渔夫帽', '棒球帽', '报童帽'],
          jewelry: ['珍珠耳环', '简约锁骨链', '手链', '戒指'],
          sunglasses: ['猫眼墨镜', '飞行员墨镜', '圆框墨镜', '方框墨镜'],
          watch: ['简约石英表', '金属链带手表', '皮质表带手表', '运动手表'],
        };
        const list = nameMap[sub] || nameMap.bag;
        return list[i % list.length];
      },
    ],
    priceRange: [29, 899],
    descTemplates: [
      (n, m) => `${n}，${m}材质精致耐用。细节设计感十足，为整体造型加分。`,
      (n, m) => `${n}，采用${m}材质，质感出众。百搭实用，是提升穿搭品质的点睛之笔。`,
    ],
    materials: ['真皮', '帆布', '尼龙', '合金', '纯银', '丝绸', '羊绒', '醋酸纤维'],
  },
  activewear: {
    subcategories: ['sports_bra', 'leggings', 'sports_top', 'tracksuit', 'running_shorts'],
    names: [
      (sub, i) => {
        const nameMap = {
          sports_bra: ['中强度运动内衣', '高强度支撑内衣', '瑜伽内衣', '交叉带运动内衣'],
          leggings: ['高腰紧身运动裤', '提臀瑜伽裤', '口袋运动裤', '九分瑜伽裤'],
          sports_top: ['速干运动T恤', '透气运动背心', '拉链运动外套', '宽松运动衫'],
          tracksuit: ['运动套装', '休闲运动两件套', '针织运动套装', '卫衣运动套装'],
          running_shorts: ['轻量跑步短裤', '内衬运动短裤', '压缩运动短裤', '速干运动短裤'],
        };
        const list = nameMap[sub] || nameMap.leggings;
        return list[i % list.length];
      },
    ],
    priceRange: [49, 599],
    descTemplates: [
      (n, m) => `${n}，${m}面料吸湿排汗，运动时保持干爽。弹力贴合不束缚，适合各种运动场景。`,
      (n, m) => `${n}，采用${m}科技面料，透气速干。专业运动剪裁，助力运动表现。`,
    ],
    materials: ['速干涤纶', '弹力锦纶', '棉涤混纺', '莫代尔', '竹纤维', '聚酯纤维'],
  },
  swimwear: {
    subcategories: ['bikini', 'one_piece', 'tankini', 'swim_trunks', 'rash_guard'],
    names: [
      (sub, i) => {
        const nameMap = {
          bikini: ['三角比基尼套装', '绑带比基尼', '高腰比基尼套装', '荷叶边比基尼'],
          one_piece: ['连体泳衣', '露背连体泳衣', '深V连体泳衣', '撞色连体泳衣'],
          tankini: ['分体式防晒泳衣', '运动分体泳装', '裙式分体泳衣', '宽肩带分体泳衣'],
          swim_trunks: ['男士沙滩裤', '男士平角泳裤', '男士紧身泳裤', '男士花色沙滩裤'],
          rash_guard: ['防晒冲浪服', '长袖防晒泳衣', '短袖防晒衣', '冲浪防护服'],
        };
        const list = nameMap[sub] || nameMap.bikini;
        return list[i % list.length];
      },
    ],
    priceRange: [49, 399],
    descTemplates: [
      (n, m) => `${n}，${m}面料弹性好，亲肤舒适。度假海滩必备，展现自信魅力。`,
      (n, m) => `${n}，采用${m}面料，耐氯耐晒。修身版型，运动休闲两相宜。`,
    ],
    materials: ['氨纶混纺', '锦纶', '涤纶', '弹力面料', '速干面料'],
  },
};

// Generate additional items to reach 500+
const categoryCounts = {
  tops: 75, bottoms: 70, dresses: 65, outerwear: 70,
  footwear: 65, accessories: 70, activewear: 65, swimwear: 45,
};

const skuCounters = {
  tops: 101, bottoms: 101, dresses: 101, outerwear: 101,
  footwear: 101, accessories: 101, activewear: 101, swimwear: 101,
};

const categoryAbbrevs = {
  tops: 'TOP', bottoms: 'BOT', dresses: 'DRE', outerwear: 'OUT',
  footwear: 'FOO', accessories: 'ACC', activewear: 'ACT', swimwear: 'SWI',
};

for (const [cat, target] of Object.entries(categoryCounts)) {
  // Count existing items in this category
  const existingCount = clothingData.filter(item => item.category === ClothingCategory[cat]).length;
  const needed = Math.max(0, target - existingCount);

  const template = categoryTemplates[cat];
  const subcats = template.subcategories;
  const colorPalette = colorPalettes[cat];
  const sizes = sizeSets[cat];
  const tags = tagSets[cat];
  const materials = template.materials;

  for (let i = 0; i < needed; i++) {
    const sub = subcats[i % subcats.length];
    const nameFunc = template.names[0];
    const name = nameFunc(sub, i);
    const fullName = name; // Direct use -- names already descriptive
    const material = materials[i % materials.length];
    const descFunc = template.descTemplates[i % template.descTemplates.length];
    const desc = descFunc(fullName, material);
    const colors = colorPalette[i % colorPalette.length];
    const size = sizes[i % sizes.length];
    const tag = tags[i % tags.length];
    const [minPrice, maxPrice] = template.priceRange;
    const price = Math.round((minPrice + Math.random() * (maxPrice - minPrice)) / 10) * 10;
    const hasDiscount = Math.random() > 0.6;
    const originalPrice = hasDiscount ? Math.round(price * (1.2 + Math.random() * 0.5) / 10) * 10 : null;
    const stock = Math.round(20 + Math.random() * 480);
    const brandSlug = brandPool[i % brandPool.length];
    const skuNum = skuCounters[cat]++;
    const isFeatured = Math.random() < 0.1;

    clothingData.push({
      sku: `AN-${categoryAbbrevs[cat]}-${String(skuNum).padStart(3, '0')}`,
      name: fullName,
      description: desc,
      category: ClothingCategory[cat],
      subcategory: sub,
      colors,
      sizes: size,
      tags: tag,
      price,
      originalPrice,
      stock,
      brandSlug,
      isFeatured,
      attributes: {
        material,
        pairingSuggestions: ['搭配同色系单品打造高级感', '混搭不同风格营造个性', '叠穿增加层次感'],
        careInstructions: '建议按照洗标说明洗涤，避免高温烘干',
      },
    });
  }
}

// ============================================================================
// Seed 函数
// ============================================================================

export async function seedClothing(
  prisma: PrismaClient,
  brandMap: Map<string, any>,
): Promise<{ items: any[]; itemMap: Map<string, any> }> {
  const items: any[] = [];
  const itemMap = new Map<string, any>();

  for (const data of clothingData) {
    // 幂等逻辑：按 sku 查找，存在则跳过
    const existing = await prisma.clothingItem.findFirst({
      where: { sku: data.sku },
    });

    if (existing) {
      items.push(existing);
      itemMap.set(existing.id, existing);
      itemMap.set(data.sku, existing);
      continue;
    }

    // 生成图片：每件 2-3 张
    const imageCount = data.sku.endsWith('001') || data.sku.endsWith('005') ? 3 : 2;
    const images: string[] = [];
    for (let i = 1; i <= imageCount; i++) {
      images.push(`https://picsum.photos/seed/${data.sku}-${i}/800/800`);
    }
    const mainImage = images[0];

    // 获取品牌 ID
    const brand = brandMap.get(data.brandSlug);
    const brandId = brand?.id ?? null;

    // 分离出 brandSlug（不属于 Prisma schema 字段）
    const { brandSlug, ...itemData } = data;

    const item = await prisma.clothingItem.create({
      data: {
        ...itemData,
        brandId,
        images,
        mainImage,
        price: itemData.price,
        originalPrice: itemData.originalPrice ?? null,
      },
    });

    items.push(item);
    itemMap.set(item.id, item);
    itemMap.set(data.sku, item);
  }

  return { items, itemMap };
}
