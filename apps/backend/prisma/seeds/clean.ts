// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const SEED_USER_EMAILS = [
  'test@example.com',
  'demo@xuno.app',
  'judge@competition.ai',
  'admin@xuno.app',
  'user5@test.com',
  'user6@test.com',
  'user7@test.com',
  'user8@test.com',
  'user9@test.com',
  'user10@test.com',
];

export async function cleanSeedData(prisma: PrismaClient): Promise<void> {
  console.log('🧹 开始清理 seed 数据...');

  // 先获取 seed 用户的 ID 列表
  const seedUsers = await prisma.user.findMany({
    where: { email: { in: SEED_USER_EMAILS } },
    select: { id: true, email: true },
  });
  const seedUserIds = seedUsers.map(u => u.id);
  console.log(`   找到 ${seedUsers.length} 个 seed 用户`);

  if (seedUserIds.length === 0) {
    console.log('   没有找到 seed 用户，跳过清理');
    return;
  }

  // 1. ChatMessage
  const chatRooms = await prisma.chatRoom.findMany({
    where: { userId: { in: seedUserIds } },
    select: { id: true },
  });
  const chatRoomIds = chatRooms.map(r => r.id);
  if (chatRoomIds.length > 0) {
    const deleted = await prisma.chatMessage.deleteMany({
      where: { roomId: { in: chatRoomIds } },
    });
    console.log(`   ✅ 删除 ChatMessage: ${deleted.count} 条`);
  }

  // 2. ChatRoom
  const deleted = await prisma.chatRoom.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 ChatRoom: ${deleted.count} 条`);

  // 3. ServiceBooking
  const d3 = await prisma.serviceBooking.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 ServiceBooking: ${d3.count} 条`);

  // 4. ConsultantProfile
  const d4 = await prisma.consultantProfile.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 ConsultantProfile: ${d4.count} 条`);

  // 5. QuizAnswer
  const d5 = await prisma.quizAnswer.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 QuizAnswer: ${d5.count} 条`);

  // 6. StyleQuizResult
  const d6 = await prisma.styleQuizResult.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 StyleQuizResult: ${d6.count} 条`);

  // 7. QuizQuestion (通过 StyleQuiz cascade 删除)
  const seedQuiz = await prisma.styleQuiz.findUnique({ where: { id: 'style-quiz-default' } });
  if (seedQuiz) {
    const d7 = await prisma.quizQuestion.deleteMany({
      where: { quizId: seedQuiz.id },
    });
    console.log(`   ✅ 删除 QuizQuestion: ${d7.count} 条`);
  }

  // 8. StyleQuiz (seed 创建的固定 ID)
  const d8 = await prisma.styleQuiz.deleteMany({
    where: { id: 'style-quiz-default' },
  });
  console.log(`   ✅ 删除 StyleQuiz: ${d8.count} 条`);

  // 9. CommunityPostItem
  const seedPosts = await prisma.communityPost.findMany({
    where: { authorId: { in: seedUserIds } },
    select: { id: true },
  });
  const seedPostIds = seedPosts.map(p => p.id);
  if (seedPostIds.length > 0) {
    const d9 = await prisma.communityPostItem.deleteMany({
      where: { postId: { in: seedPostIds } },
    });
    console.log(`   ✅ 删除 CommunityPostItem: ${d9.count} 条`);
  }

  // 10. PostComment
  if (seedPostIds.length > 0) {
    const d10 = await prisma.postComment.deleteMany({
      where: { postId: { in: seedPostIds } },
    });
    console.log(`   ✅ 删除 PostComment (帖子评论): ${d10.count} 条`);
  }
  const d10b = await prisma.postComment.deleteMany({
    where: { authorId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 PostComment (用户评论): ${d10b.count} 条`);

  // 11. PostLike
  if (seedPostIds.length > 0) {
    const d11 = await prisma.postLike.deleteMany({
      where: { postId: { in: seedPostIds } },
    });
    console.log(`   ✅ 删除 PostLike (帖子点赞): ${d11.count} 条`);
  }
  const d11b = await prisma.postLike.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 PostLike (用户点赞): ${d11b.count} 条`);

  // 12. CommunityPost
  const d12 = await prisma.communityPost.deleteMany({
    where: { authorId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 CommunityPost: ${d12.count} 条`);

  // 13. UserFollow
  const d13a = await prisma.userFollow.deleteMany({
    where: { followerId: { in: seedUserIds } },
  });
  const d13b = await prisma.userFollow.deleteMany({
    where: { followingId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 UserFollow: ${d13a.count + d13b.count} 条`);

  // 14. StyleRecommendation
  const d14 = await prisma.styleRecommendation.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 StyleRecommendation: ${d14.count} 条`);

  // 15. RankingFeedback
  const d15 = await prisma.rankingFeedback.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 RankingFeedback: ${d15.count} 条`);

  // 16. Favorite
  const d16 = await prisma.favorite.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 Favorite: ${d16.count} 条`);

  // 17. VirtualTryOn
  const d17 = await prisma.virtualTryOn.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 VirtualTryOn: ${d17.count} 条`);

  // 18. UserPhoto
  const d18 = await prisma.userPhoto.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 UserPhoto: ${d18.count} 条`);

  // 19. UserBehavior
  const d19 = await prisma.userBehavior.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 UserBehavior: ${d19.count} 条`);

  // 20. StyleProfile
  const d20 = await prisma.styleProfile.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 StyleProfile: ${d20.count} 条`);

  // 21. UserProfile
  const d21 = await prisma.userProfile.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 UserProfile: ${d21.count} 条`);

  // 22. CartItem
  const d22 = await prisma.cartItem.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 CartItem: ${d22.count} 条`);

  // 23-24. OrderItem + OrderAddress (通过 Order 关联)
  const seedOrders = await prisma.order.findMany({
    where: { userId: { in: seedUserIds } },
    select: { id: true },
  });
  const seedOrderIds = seedOrders.map(o => o.id);
  if (seedOrderIds.length > 0) {
    const d23 = await prisma.orderItem.deleteMany({
      where: { orderId: { in: seedOrderIds } },
    });
    console.log(`   ✅ 删除 OrderItem: ${d23.count} 条`);

    const d24 = await prisma.orderAddress.deleteMany({
      where: { orderId: { in: seedOrderIds } },
    });
    console.log(`   ✅ 删除 OrderAddress: ${d24.count} 条`);
  }

  // 25. Order
  const d25 = await prisma.order.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 Order: ${d25.count} 条`);

  // 26. CustomizationQuote (通过 CustomizationRequest 关联)
  const seedRequests = await prisma.customizationRequest.findMany({
    where: { userId: { in: seedUserIds } },
    select: { id: true },
  });
  const seedRequestIds = seedRequests.map(r => r.id);
  if (seedRequestIds.length > 0) {
    const d26 = await prisma.customizationQuote.deleteMany({
      where: { requestId: { in: seedRequestIds } },
    });
    console.log(`   ✅ 删除 CustomizationQuote: ${d26.count} 条`);
  }

  // 27. CustomizationRequest
  const d27 = await prisma.customizationRequest.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 CustomizationRequest: ${d27.count} 条`);

  // 28. ClothingItem (seed 创建的商品，通过 sku 前缀 AN- 判断)
  const d28 = await prisma.clothingItem.deleteMany({
    where: { sku: { startsWith: 'AN-' } },
  });
  console.log(`   ✅ 删除 ClothingItem: ${d28.count} 条`);

  // 29. BrandMerchant (通过 Brand slug 关联清理)
  const seedBrandSlugs = ['aineed-studio', 'zara', 'uniqlo', 'cos', 'nike'];
  const seedBrands = await prisma.brand.findMany({
    where: { slug: { in: seedBrandSlugs } },
    select: { id: true },
  });
  const seedBrandIds = seedBrands.map(b => b.id);
  if (seedBrandIds.length > 0) {
    const d29 = await prisma.brandMerchant.deleteMany({
      where: { brandId: { in: seedBrandIds } },
    });
    console.log(`   ✅ 删除 BrandMerchant: ${d29.count} 条`);
  }

  // 30. BrandSettlement
  if (seedBrandIds.length > 0) {
    const d30 = await prisma.brandSettlement.deleteMany({
      where: { brandId: { in: seedBrandIds } },
    });
    console.log(`   ✅ 删除 BrandSettlement: ${d30.count} 条`);
  }

  // 31. Brand (seed 创建的品牌)
  const d31 = await prisma.brand.deleteMany({
    where: { slug: { in: seedBrandSlugs } },
  });
  console.log(`   ✅ 删除 Brand: ${d31.count} 条`);

  // 32. User (只删除 seed 创建的测试用户)
  // 先删除其他与用户关联的数据
  const d32a = await prisma.refreshToken.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 RefreshToken: ${d32a.count} 条`);

  const d32b = await prisma.notification.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 Notification: ${d32b.count} 条`);

  const d32c = await prisma.userClothing.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 UserClothing: ${d32c.count} 条`);

  const d32d = await prisma.outfit.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 Outfit: ${d32d.count} 条`);

  const d32e = await prisma.userAddress.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 UserAddress: ${d32e.count} 条`);

  const d32f = await prisma.paymentOrder.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 PaymentOrder: ${d32f.count} 条`);

  const d32g = await prisma.userSubscription.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 UserSubscription: ${d32g.count} 条`);

  const d32h = await prisma.wardrobeCollection.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 WardrobeCollection: ${d32h.count} 条`);

  const d32i = await prisma.userConsent.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 UserConsent: ${d32i.count} 条`);

  const d32j = await prisma.dataExportRequest.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 DataExportRequest: ${d32j.count} 条`);

  const d32k = await prisma.dataDeletionRequest.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 DataDeletionRequest: ${d32k.count} 条`);

  // 删除 User
  const d32 = await prisma.user.deleteMany({
    where: { id: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 User: ${d32.count} 条`);

  // 33. SearchHistory (只删除 seed 用户的)
  const d33 = await prisma.searchHistory.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 SearchHistory: ${d33.count} 条`);

  // 34. AiStylistSession (只删除 seed 用户的)
  const d34 = await prisma.aiStylistSession.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 AiStylistSession: ${d34.count} 条`);

  // 35. UserDecision (只删除 seed 用户的)
  const d35 = await prisma.userDecision.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`   ✅ 删除 UserDecision: ${d35.count} 条`);

  console.log('\n✅ Seed 数据清理完成！');
}
