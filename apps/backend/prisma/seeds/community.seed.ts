// @ts-nocheck
import { PrismaClient, CommunityPost } from '@prisma/client';
import { randomDate, randomInt, randomElement, generatePicsumUrl } from './utils';

const POSTS_DATA = [
  {
    title: '早秋通勤穿搭｜5分钟出门也能很精致',
    content: '早秋的早晨总是让人纠结穿什么，既要应对早晚温差，又要在办公室保持得体。今天分享我的5分钟出门公式：基础款白T+西装外套+高腰阔腿裤，踩上一双小白鞋就能轻松出门。外套选米色或灰色，百搭又不沉闷，到了办公室脱掉外套也完全OK。关键是要把上衣扎进裤子里，腰线一出来整个人就精神了！',
    tags: ['通勤穿搭', '早秋', '5分钟出门', '西装外套', '阔腿裤'],
    category: 'outfit_share',
    isFeatured: true,
    imageCount: 4,
  },
  {
    title: '小个子显高秘籍！160cm穿搭分享',
    content: '作为一个160的小个子，这些年踩过无数坑总结出来的显高法则：第一，高腰线是生命线，所有裤子裙子都选高腰款；第二，同色系穿搭拉长视觉比例，全黑或全白最安全；第三，鞋底厚一点但不要夸张，3-5cm最自然；第四，短上衣+高腰下装=黄金比例。今天这套就是短针织衫配高腰A字裙，视觉上至少显高5cm！',
    tags: ['小个子', '显高', '160cm', '高腰', '比例穿搭', 'A字裙'],
    category: 'outfit_share',
    isFeatured: false,
    imageCount: 3,
  },
  {
    title: '周末约会Look 💕 法式茶歇裙太美了',
    content: '终于等到周末约会啦！这条法式碎花茶歇裙真的是我的心头好，V领设计修饰脸型，收腰剪裁勾勒曲线，裙摆飘逸又浪漫。搭配一双裸色高跟鞋和链条小包，温柔又不会太用力。外面披一件米色针织开衫，进餐厅脱掉开衫就是最优雅的样子。男朋友说这是他见过我最好看的一次！',
    tags: ['约会穿搭', '法式', '茶歇裙', '碎花', '浪漫'],
    category: 'outfit_share',
    isFeatured: true,
    imageCount: 5,
  },
  {
    title: '极简主义衣橱｜30件单品搞定全季',
    content: '践行极简衣橱第三年，从满柜子衣服到30件单品，生活质量反而提升了。核心思路是：基础色为主（黑白灰驼），每件单品至少能搭3套look，材质要好打理。我的30件包括：5件上衣、4条裤子、3条裙子、4件外套、3双鞋、3个包、2条围巾、6件内搭。每天早上不用想穿什么，随手拿都协调，省下的时间用来多睡半小时不香吗？',
    tags: ['极简主义', '胶囊衣橱', '30件单品', '基础款', '断舍离', '高效穿搭'],
    category: 'wardrobe_tips',
    isFeatured: false,
    imageCount: 3,
  },
  {
    title: '运动风也能很时髦！Athleisure穿搭',
    content: '谁说运动风只能去健身房？Athleisure运动休闲风才是现在最火的穿搭趋势！关键是混搭：运动bra外穿配西装外套，卫衣搭皮裙，瑜伽裤配长款大衣。今天这套是Nike运动上衣配工装束脚裤，外面套一件牛仔夹克，脚踩Air Max，运动又街头。记住一点：运动单品只占整套的一半，另一半要有质感，这样才不会像真的要去跑步。',
    tags: ['运动风', 'Athleisure', '混搭', '街头', '运动休闲'],
    category: 'outfit_share',
    isFeatured: false,
    imageCount: 4,
  },
  {
    title: '职场新人穿搭指南｜第一印象很重要',
    content: '刚入职场的姐妹看过来！第一周穿搭真的很关键，既要专业又不能太老气。我的建议是：投资一件好西装外套，黑色或深蓝色最稳妥；内搭选真丝或缎面衬衫，比棉质更有质感；下装高腰西裤或铅笔裙都可以；鞋子选3-5cm的方跟，比细跟实用太多。颜色控制在黑白灰驼蓝这五个色系内，怎么搭都不会出错。等摸清公司氛围再慢慢加个性元素。',
    tags: ['职场穿搭', '新人', '第一印象', '西装', '通勤', '面试'],
    category: 'outfit_share',
    isFeatured: true,
    imageCount: 4,
  },
  {
    title: '秋冬大衣怎么选？5款对比测评',
    content: '秋冬大衣真的是最值得投资的单品，一件好大衣穿十年不是问题。今天对比5款不同价位的大衣：1. UNIQLO轻型羽绒服（799）- 性价比之王，轻便保暖；2. ZARA羊毛混纺大衣（1299）- 版型好但容易起球；3. Massimo Dutti羊绒混纺（2999）- 质感拉满，投资级单品；4. COS风衣（1890）- 春秋必备，经典不过时；5. 双面呢大衣（4990）- 奢华之选，无内衬工艺。个人最推荐第3款，穿5年依然像新的。',
    tags: ['大衣', '秋冬', '测评', '对比', '投资单品', '羊毛'],
    category: 'review',
    isFeatured: false,
    imageCount: 5,
  },
  {
    title: '微胖女孩穿搭｜显瘦不是梦',
    content: '微胖姐妹们不要怕！穿搭真的能改变很多。我的显瘦心得：第一，深色系是好朋友，但不要全黑，选深蓝、深绿、酒红更有层次；第二，A字版型最包容，高腰A字裙和A字大衣都是显瘦神器；第三，V领和方领比圆领显瘦，露出锁骨拉长颈部线条；第四，垂坠感面料比硬挺面料更修饰身形。今天这套深蓝色A字连衣裙配黑色高跟鞋，同事都说我瘦了十斤！',
    tags: ['微胖穿搭', '显瘦', 'A字裙', '深色系', 'V领', '包容性'],
    category: 'outfit_share',
    isFeatured: false,
    imageCount: 3,
  },
  {
    title: '男生日常穿搭｜简约不简单',
    content: '男生日常穿搭其实没那么复杂，掌握几个原则就够了。首先，合身比品牌重要，一件合身的优衣库比不合身的奢侈品好看100倍；其次，颜色不超过3种，黑白灰驼是安全牌；第三，细节决定质感，一条好皮带、一块手表就能提升整体。今天这套：白T+牛仔夹克+深色直筒裤+白板鞋，经典不过时，10分钟出门毫无压力。记住：干净整洁就是最好的穿搭。',
    tags: ['男生穿搭', '简约', '日常', '基础款', '干净'],
    category: 'outfit_share',
    isFeatured: false,
    imageCount: 3,
  },
  {
    title: '度假穿搭打包清单✈️ 三亚5天4夜',
    content: '三亚度假穿搭打包攻略来啦！5天4夜只需要一个20寸行李箱。Day1抵达：吊带长裙+牛仔外套，飞机上保暖到了海边脱掉就美；Day2海边：比基尼+罩衫+短裤+拖鞋；Day3景点：茶歇裙+草编包+凉鞋，拍照超出片；Day4晚餐：小黑裙+高跟鞋，餐厅里最靓的仔；Day5返程：T恤+阔腿裤+运动鞋，舒适回家。配饰带：墨镜、帽子、丝巾，体积小但造型感强。防晒霜一定要多带！',
    tags: ['度假穿搭', '三亚', '打包清单', '海边', '旅行', '5天4夜'],
    category: 'outfit_share',
    isFeatured: false,
    imageCount: 5,
  },
  {
    title: '一衣多穿｜白衬衫的7种搭配',
    content: '白衬衫绝对是衣橱里最值得投资的单品，没有之一！今天展示7种完全不同风格的穿法：1. 扎进高腰裤+细腰带=干练职场风；2. 解开三颗扣+半裙=法式慵懒风；3. 当外套内搭吊带=休闲街头风；4. 系在腰间+T恤=美式校园风；5. 反穿露背+阔腿裤=性感约会风；6. 叠穿毛衣露出领口袖口=英伦学院风；7. 配西装套装=正式商务风。一件白衬衫穿出7种风格，性价比爆表！',
    tags: ['一衣多穿', '白衬衫', '7种搭配', '百搭', '性价比', '基础款'],
    category: 'wardrobe_tips',
    isFeatured: true,
    imageCount: 4,
  },
  {
    title: '学生党平价穿搭｜月入3K也能很时尚',
    content: '学生党看过来！谁说时尚一定要花大钱？我的穿搭均价不超过200块。秘诀就是：基础款去优衣库买，T恤79、衬衫149、牛仔裤299，质量好还百搭；流行款去ZARA，打折季入手超划算；配饰去淘宝，几十块的耳环项链一样好看。今天这套全身上下不到500：优衣库T恤79+ZARA短裙159+淘宝包包89+小白鞋199。时尚不是价格战，是搭配功力！',
    tags: ['学生党', '平价穿搭', '月入3K', '优衣库', '性价比', '省钱'],
    category: 'outfit_share',
    isFeatured: false,
    imageCount: 3,
  },
  {
    title: '配色灵感｜莫兰迪色系穿搭合集',
    content: '莫兰迪色系真的太高级了！低饱和度的温柔感让人看一眼就沦陷。今天分享4组莫兰迪配色方案：1. 灰粉+米白+浅驼，温柔到骨子里；2. 雾霾蓝+灰白+卡其，知性又高级；3. 豆沙绿+奶油白+浅灰，清新脱俗；4. 灰紫+淡粉+米色，浪漫不甜腻。关键技巧：全身莫兰迪色不超过3个，用一个深色做点缀（比如深棕包包），这样不会显得太寡淡。发色和妆容也建议走低饱和路线，整体才和谐。',
    tags: ['莫兰迪', '配色', '低饱和', '高级感', '温柔', '色系穿搭'],
    category: 'color_inspiration',
    isFeatured: false,
    imageCount: 4,
  },
  {
    title: '面试穿搭攻略｜不同行业不同风格',
    content: '面试穿搭不是一套公式走天下，不同行业差别太大了！金融/法律：深色西装+白衬衫+皮鞋，越正式越好；互联网/科技：商务休闲，西装外套+内搭T恤+休闲裤，专业但不死板；创意/设计：可以适当展现个性，但不要夸张，一件有设计感的衬衫就够了；教育/医疗：端庄大方为主，连衣裙+小外套很安全。通用原则：衣服一定要熨烫，鞋子一定要干净，配饰越少越好，香水淡到闻不到。',
    tags: ['面试', '行业穿搭', '金融', '互联网', '创意', '商务休闲'],
    category: 'outfit_share',
    isFeatured: false,
    imageCount: 4,
  },
  {
    title: '复古风回潮｜90年代穿搭灵感',
    content: '90年代复古风今年彻底回来了！妈妈那个年代的穿搭现在看依然时髦。关键元素：高腰牛仔裤、格纹西装、老爹鞋、发箍、珍珠配饰。今天这套就是致敬90年代：格纹西装外套+高腰直筒牛仔裤+白T恤+老爹鞋，再配一个发箍，瞬间穿越回《老友记》。不过复古不是照搬，要融入现代元素，比如把老式大垫肩换成微垫肩，把夸张首饰换成简约款，这样才叫复古新穿。',
    tags: ['复古', '90年代', '格纹', '老爹鞋', '怀旧', '复古新穿'],
    category: 'outfit_share',
    isFeatured: false,
    imageCount: 3,
  },
  {
    title: '运动鞋搭配指南｜不止运动那么简单',
    content: '运动鞋早就不只是运动专属了，现在什么风格都能搭！通勤Look：西装套装+白板鞋，正式中带点休闲感；约会Look：碎花裙+老爹鞋，甜美和帅气碰撞；街头Look：卫衣+工装裤+跑鞋，酷到没朋友；极简Look：白T+阔腿裤+小白鞋，less is more。选鞋建议：白色最百搭，黑色最酷，彩色最个性但不好搭。鞋柜里备一双白AF1和一双黑Air Max，基本覆盖所有场景。',
    tags: ['运动鞋', '搭配', '白板鞋', '老爹鞋', '百搭', '混搭'],
    category: 'shoe_guide',
    isFeatured: false,
    imageCount: 4,
  },
  {
    title: '夏日清凉穿搭｜透气又好看',
    content: '夏天穿搭最大的敌人就是热！但热也不能穿得邋遢啊。我的清凉穿搭法则：材质选亚麻、棉、真丝，远离聚酯纤维；版型选宽松但不垮，有型又通风；颜色选浅色系，白色米色浅蓝视觉上都凉快。今天这套：亚麻衬衫+棉质短裤+凉鞋，全身上下没有一个闷热的地方。小技巧：衬衫不扎进去，下摆随风飘，又凉快又有型。再戴个草帽和墨镜，海边度假即视感！',
    tags: ['夏日穿搭', '清凉', '透气', '亚麻', '浅色系', '降温'],
    category: 'outfit_share',
    isFeatured: false,
    imageCount: 3,
  },
  {
    title: '西装外套的N种穿法｜从通勤到约会',
    content: '西装外套是衣橱里的万能选手！通勤穿：黑色西装+白衬衫+西裤+高跟鞋，气场全开；休闲穿：米色西装+白T+牛仔裤+板鞋，随性有型；约会穿：深色西装+真丝吊带+半裙+细跟，又飒又美；周末穿：oversize西装+运动内衣+瑜伽裤，Athleisure风。买西装建议：第一件选黑色或米色，版型选微宽松，长度盖住臀部最佳。肩线要对，大了显垮小了拘束，合身最重要。',
    tags: ['西装外套', '一衣多穿', '通勤', '约会', '休闲', '百搭'],
    category: 'wardrobe_tips',
    isFeatured: false,
    imageCount: 5,
  },
  {
    title: '配饰点睛｜小物件大改变',
    content: '穿搭好不好看，配饰占了一半功劳！同样的白T牛仔裤，加条丝巾就是法式风，加条项链就是韩系风，加顶帽子就是日系风。我的配饰心法：1. 一套look只突出一个配饰，不要项链耳环手链全上；2. 金属色配饰最百搭，金色温暖银色冷感；3. 丝巾系在包带上比系脖子上更时髦；4. 腰带不只是功能性的，细腰带扎在外套外面立刻有腰线；5. 墨镜是最偷懒的配饰，戴上就有型。今天重点展示5组配饰搭配，同样的衣服完全不同的感觉！',
    tags: ['配饰', '丝巾', '项链', '帽子', '腰带', '点睛之笔'],
    category: 'accessory_guide',
    isFeatured: false,
    imageCount: 4,
  },
  {
    title: '换季衣橱整理｜断舍离与添新',
    content: '换季最痛苦的就是整理衣橱，但整理完真的神清气爽！我的整理三步法：第一步断舍离，一年没穿过的、起球变形的、尺码不合适的，统统处理掉，可以闲鱼卖掉或捐赠；第二步分类收纳，当季常穿的挂起来，过季的真空压缩收好，内衣袜子用收纳盒；第三步查缺补漏，列出需要添置的单品清单，按优先级购买。今年秋冬我只需要添置：一件驼色大衣、一条深色牛仔裤、一双黑色短靴。少而精，每件都是心头好。',
    tags: ['换季整理', '断舍离', '衣橱管理', '收纳', '购物清单'],
    category: 'wardrobe_tips',
    isFeatured: false,
    imageCount: 2,
  },
];

const COMMENT_TEMPLATES = [
  '太好看了！求链接！',
  '同款哪里买的？',
  '这个配色绝了，学到了',
  '姐妹身材太好了吧！',
  '收藏了，明天就照着穿',
  '请问外套是什么牌子的？',
  '这套好适合面试啊，正好需要',
  '小个子亲测有效！显高效果真的绝',
  '颜色搭配好高级，莫兰迪yyds',
  '终于有人说到点子上了，合身真的最重要',
  '白衬衫真的百搭，我也有同款',
  '学生党表示优衣库真的是救星',
  '运动鞋配裙子我也超爱！',
  '这个穿搭公式太实用了，直接抄作业',
  '求出更多配色方案！',
  '复古风真的永不过时',
  '配饰那篇写得太好了，丝巾系包带上我试了超好看',
  '换季整理太需要了，我的衣柜已经爆炸了',
  '显瘦穿搭太需要了，感谢分享！',
  '这套约会穿太合适了，男朋友肯定喜欢',
];

export async function seedCommunity(
  prisma: PrismaClient,
  userMap: Map<string, any>,
  itemMap: Map<string, any>,
): Promise<{ posts: CommunityPost[] }> {
  console.log('\n📝 开始创建社区帖子数据...');

  const userIds = Array.from(userMap.values()).map((u: any) => u.id);
  const itemIds = Array.from(itemMap.values()).map((item: any) => item.id).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const posts: CommunityPost[] = [];

  for (let i = 0; i < POSTS_DATA.length; i++) {
    const postData = POSTS_DATA[i];

    const existing = await prisma.communityPost.findFirst({
      where: { title: postData.title },
    });
    if (existing) {
      console.log(`   ⏭️ 帖子已存在，跳过: "${postData.title}"`);
      posts.push(existing);
      continue;
    }

    const authorId = randomElement(userIds);
    const createdAt = randomDate(thirtyDaysAgo, now);

    const images: string[] = [];
    for (let j = 0; j < postData.imageCount; j++) {
      images.push(generatePicsumUrl(`post-${i + 1}-img-${j + 1}`, 800, 800));
    }

    const viewCount = randomInt(200, 8000);
    const likeCount = randomInt(10, 500);
    const commentCount = randomInt(2, 80);
    const shareCount = randomInt(0, 100);

    const post = await prisma.communityPost.create({
      data: {
        authorId,
        title: postData.title,
        content: postData.content,
        images,
        tags: postData.tags,
        category: postData.category,
        viewCount,
        likeCount,
        commentCount,
        shareCount,
        isFeatured: postData.isFeatured,
        createdAt,
      },
    });
    posts.push(post);

    // 部分帖子关联 CommunityPostItem（标注帖子中出现的单品）
    if (i % 2 === 0 && itemIds.length > 0) {
      const itemCount = randomInt(1, Math.min(3, itemIds.length));
      const shuffledItems = [...itemIds].sort(() => Math.random() - 0.5);
      const selectedItems = shuffledItems.slice(0, itemCount);

      for (const itemId of selectedItems) {
        await prisma.communityPostItem.create({
          data: {
            postId: post.id,
            itemId,
          },
        }).catch(() => {});
      }
    }

    // 部分帖子有点赞
    if (i % 3 !== 2) {
      const likeUserCount = randomInt(2, Math.min(8, userIds.length));
      const shuffledUsers = [...userIds].filter(id => id !== authorId).sort(() => Math.random() - 0.5);
      const likeUsers = shuffledUsers.slice(0, likeUserCount);

      for (const userId of likeUsers) {
        await prisma.postLike.create({
          data: {
            userId,
            postId: post.id,
            createdAt: randomDate(createdAt, now),
          },
        }).catch(() => {});
      }
    }

    // 部分帖子有评论
    if (i % 3 !== 1) {
      const commentCountForPost = randomInt(1, 5);
      const commenters = [...userIds].filter(id => id !== authorId).sort(() => Math.random() - 0.5);

      for (let c = 0; c < Math.min(commentCountForPost, commenters.length); c++) {
        await prisma.postComment.create({
          data: {
            authorId: commenters[c],
            postId: post.id,
            content: COMMENT_TEMPLATES[(i * 3 + c) % COMMENT_TEMPLATES.length],
            images: [],
            likeCount: randomInt(0, 20),
            createdAt: randomDate(createdAt, now),
          },
        });
      }
    }

    console.log(`   ✅ 创建帖子: "${postData.title}"`);
  }

  console.log(`   📊 共创建/跳过 ${posts.length} 篇社区帖子`);
  return { posts };
}
