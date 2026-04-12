import { jest } from '@jest/globals';

type MockPrismaModel = {
  findUnique: ReturnType<typeof jest.fn>;
  findFirst: ReturnType<typeof jest.fn>;
  findMany: ReturnType<typeof jest.fn>;
  create: ReturnType<typeof jest.fn>;
  createMany: ReturnType<typeof jest.fn>;
  update: ReturnType<typeof jest.fn>;
  updateMany: ReturnType<typeof jest.fn>;
  upsert: ReturnType<typeof jest.fn>;
  delete: ReturnType<typeof jest.fn>;
  deleteMany: ReturnType<typeof jest.fn>;
  count: ReturnType<typeof jest.fn>;
  aggregate: ReturnType<typeof jest.fn>;
  groupBy: ReturnType<typeof jest.fn>;
};

function createMockModel(): MockPrismaModel {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  };
}

type MockPrismaCompositeKey = {
  findUnique: ReturnType<typeof jest.fn>;
  findMany: ReturnType<typeof jest.fn>;
  create: ReturnType<typeof jest.fn>;
  update: ReturnType<typeof jest.fn>;
  delete: ReturnType<typeof jest.fn>;
  count: ReturnType<typeof jest.fn>;
};

function createMockCompositeKeyModel(): MockPrismaCompositeKey {
  return {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

export interface MockPrismaService {
  user: MockPrismaModel;
  bodyProfile: MockPrismaModel;
  userStylePreference: MockPrismaModel;
  category: MockPrismaModel;
  brand: MockPrismaModel;
  clothingItem: MockPrismaModel;
  outfit: MockPrismaModel;
  outfitItem: MockPrismaModel;
  chatSession: MockPrismaModel;
  chatMessage: MockPrismaModel;
  tryonResult: MockPrismaModel;
  userInteraction: MockPrismaModel;
  wardrobeItem: MockPrismaModel;
  favorite: MockPrismaModel;
  styleRule: MockPrismaModel;
  communityPost: MockPrismaModel;
  postComment: MockPrismaModel;
  userFollow: MockPrismaModel;
  chatRoom: MockPrismaModel;
  chatRoomParticipant: MockPrismaCompositeKey;
  directMessage: MockPrismaModel;
  notification: MockPrismaModel;
  avatarTemplate: MockPrismaModel;
  userAvatar: MockPrismaModel;
  customDesign: MockPrismaModel;
  customOrder: MockPrismaModel;
  productTemplate: MockPrismaModel;
  designLike: MockPrismaCompositeKey;
  designReport: MockPrismaModel;
  bespokeStudio: MockPrismaModel;
  bespokeOrder: MockPrismaModel;
  bespokeMessage: MockPrismaModel;
  bespokeQuote: MockPrismaModel;
  bespokeReview: MockPrismaModel;
  outfitImage: MockPrismaModel;
  $connect: ReturnType<typeof jest.fn>;
  $disconnect: ReturnType<typeof jest.fn>;
  $transaction: ReturnType<typeof jest.fn>;
  $queryRaw: ReturnType<typeof jest.fn>;
  $queryRawUnsafe: ReturnType<typeof jest.fn>;
  $executeRaw: ReturnType<typeof jest.fn>;
  $executeRawUnsafe: ReturnType<typeof jest.fn>;
}

export function createMockPrismaService(): MockPrismaService {
  const mockTransaction = jest.fn();
  mockTransaction.mockImplementation(async (fn: unknown) => {
    if (typeof fn === 'function') {
      return fn(createMockPrismaService());
    }
    return Promise.resolve([]);
  });

  return {
    user: createMockModel(),
    bodyProfile: createMockModel(),
    userStylePreference: createMockModel(),
    category: createMockModel(),
    brand: createMockModel(),
    clothingItem: createMockModel(),
    outfit: createMockModel(),
    outfitItem: createMockModel(),
    chatSession: createMockModel(),
    chatMessage: createMockModel(),
    tryonResult: createMockModel(),
    userInteraction: createMockModel(),
    wardrobeItem: createMockModel(),
    favorite: createMockModel(),
    styleRule: createMockModel(),
    communityPost: createMockModel(),
    postComment: createMockModel(),
    userFollow: createMockModel(),
    chatRoom: createMockModel(),
    chatRoomParticipant: createMockCompositeKeyModel(),
    directMessage: createMockModel(),
    notification: createMockModel(),
    avatarTemplate: createMockModel(),
    userAvatar: createMockModel(),
    customDesign: createMockModel(),
    customOrder: createMockModel(),
    productTemplate: createMockModel(),
    designLike: createMockCompositeKeyModel(),
    designReport: createMockModel(),
    bespokeStudio: createMockModel(),
    bespokeOrder: createMockModel(),
    bespokeMessage: createMockModel(),
    bespokeQuote: createMockModel(),
    bespokeReview: createMockModel(),
    outfitImage: createMockModel(),
    $connect: jest.fn(() => Promise.resolve(undefined)),
    $disconnect: jest.fn(() => Promise.resolve(undefined)),
    $transaction: mockTransaction,
    $queryRaw: jest.fn(() => Promise.resolve([])),
    $queryRawUnsafe: jest.fn(() => Promise.resolve([])),
    $executeRaw: jest.fn(() => Promise.resolve(0)),
    $executeRawUnsafe: jest.fn(() => Promise.resolve(0)),
  };
}

export function resetMockPrismaService(prisma: MockPrismaService): void {
  const modelKeys = [
    'user', 'bodyProfile', 'userStylePreference', 'category', 'brand',
    'clothingItem', 'outfit', 'outfitItem', 'chatSession', 'chatMessage',
    'tryonResult', 'userInteraction', 'wardrobeItem', 'favorite', 'styleRule',
    'communityPost', 'postComment', 'userFollow', 'chatRoom', 'chatRoomParticipant',
    'directMessage', 'notification', 'avatarTemplate', 'userAvatar',
    'customDesign', 'customOrder', 'productTemplate', 'designLike', 'designReport',
    'bespokeStudio', 'bespokeOrder', 'bespokeMessage', 'bespokeQuote',
    'bespokeReview', 'outfitImage',
  ] as const;

  for (const key of modelKeys) {
    const model = prisma[key];
    const methods = Object.keys(model) as Array<keyof typeof model>;
    for (const method of methods) {
      const fn = model[method];
      if (typeof fn === 'function' && 'mockClear' in fn) {
        fn.mockClear();
      }
    }
  }

  prisma.$connect.mockClear();
  prisma.$disconnect.mockClear();
  prisma.$transaction.mockClear();
  prisma.$queryRaw.mockClear();
  prisma.$queryRawUnsafe.mockClear();
  prisma.$executeRaw.mockClear();
  prisma.$executeRawUnsafe.mockClear();
}
