// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seeds/users.seed';
import { seedProfiles } from './seeds/profiles.seed';
import { seedQuizQuestions } from './seeds/quiz-questions.seed';
import { seedBrands } from './seeds/brands.seed';
import { seedClothing } from './seeds/clothing.seed';
import { seedCommunity } from './seeds/community.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始填充寻裳开发数据...');
  console.log('='.repeat(60));

  const startTime = Date.now();

  console.log('\n📦 Step 1/6: 创建品牌数据...');
  const { brands, brandMap } = await seedBrands(prisma);
  console.log(`   ✅ ${brands.length} 个品牌`);

  console.log('\n👤 Step 2/6: 创建测试用户 + 画像...');
  const { users, userMap } = await seedUsers(prisma);
  console.log(`   ✅ ${users.length} 个用户`);

  console.log('\n📐 Step 3/6: 创建用户画像详情...');
  await seedProfiles(prisma, userMap);
  console.log(`   ✅ 画像数据完成`);

  console.log('\n👗 Step 4/6: 创建服装商品...');
  const { items, itemMap } = await seedClothing(prisma, brandMap);
  console.log(`   ✅ ${items.length} 件商品`);

  console.log('\n📝 Step 5/6: 创建风格测试题...');
  const { quiz, questions } = await seedQuizQuestions(prisma);
  console.log(`   ✅ 1 套问卷, ${questions.length} 道题目`);

  console.log('\n💬 Step 6/6: 创建社区帖子...');
  const { posts } = await seedCommunity(prisma, userMap, itemMap);
  console.log(`   ✅ ${posts.length} 篇帖子`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('✅ 寻裳开发数据填充完成！');
  console.log('='.repeat(60));

  console.log('\n📊 数据统计:');
  console.log(`   👤 测试用户: ${users.length}`);
  console.log(`   🏪 品牌: ${brands.length}`);
  console.log(`   👗 服装商品: ${items.length}`);
  console.log(`   📝 风格测试题: ${questions.length}`);
  console.log(`   💬 社区帖子: ${posts.length}`);
  console.log(`   ⏱️ 耗时: ${elapsed}s`);

  console.log('\n🔑 测试账号:');
  console.log('-'.repeat(50));
  const testAccounts = [
    { email: 'test@example.com', password: 'Test123456!', nickname: '测试用户' },
    { email: 'demo@xuno.app', password: 'Demo123456!', nickname: 'Demo演示账号' },
    { email: 'judge@competition.ai', password: 'Judge123456!', nickname: '评委体验账号' },
    { email: 'admin@xuno.app', password: 'Admin123456!', nickname: '管理员' },
    { email: 'user5@test.com', password: 'Test123456!', nickname: '时尚达人小美' },
    { email: 'user6@test.com', password: 'Test123456!', nickname: '运动型男阿杰' },
    { email: 'user7@test.com', password: 'Test123456!', nickname: '优雅女士Linda' },
    { email: 'user8@test.com', password: 'Test123456!', nickname: '街头潮人小K' },
    { email: 'user9@test.com', password: 'Test123456!', nickname: '极简主义者' },
    { email: 'user10@test.com', password: 'Test123456!', nickname: '商务精英David' },
  ];
  for (const acc of testAccounts) {
    console.log(`   📧 ${acc.email} / ${acc.password} (${acc.nickname})`);
  }

  console.log('\n💡 使用提示:');
  console.log('   npx prisma db seed    一键填充数据');
  console.log('   npx ts-node prisma/seeds/clean.ts  清理所有seed数据');
}

main()
  .catch((e) => {
    console.error('❌ 填充数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
