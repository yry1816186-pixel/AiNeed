import { jest } from '@jest/globals';

Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true,
});

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_PORT = '9000';
process.env.MINIO_ACCESS_KEY = 'minioadmin';
process.env.MINIO_SECRET_KEY = 'minioadmin';
process.env.MINIO_BUCKET = 'aineed';
process.env.ZHIPU_API_KEY = 'test-key';
process.env.APP_PORT = '3001';
process.env.APP_ENV = 'test';
process.env.CORS_ORIGIN = '*';

jest.mock('ioredis', () => {
  const mockRedisInstance = {
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve('OK')),
    del: jest.fn(() => Promise.resolve(1)),
    keys: jest.fn(() => Promise.resolve([])),
    flushdb: jest.fn(() => Promise.resolve('OK')),
    exists: jest.fn(() => Promise.resolve(0)),
    expire: jest.fn(() => Promise.resolve(1)),
    ttl: jest.fn(() => Promise.resolve(-2)),
    incr: jest.fn(() => Promise.resolve(1)),
    decr: jest.fn(() => Promise.resolve(0)),
    hget: jest.fn(() => Promise.resolve(null)),
    hset: jest.fn(() => Promise.resolve(1)),
    hdel: jest.fn(() => Promise.resolve(1)),
    hgetall: jest.fn(() => Promise.resolve({})),
    sadd: jest.fn(() => Promise.resolve(1)),
    srem: jest.fn(() => Promise.resolve(1)),
    smembers: jest.fn(() => Promise.resolve([])),
    ping: jest.fn(() => Promise.resolve('PONG')),
    quit: jest.fn(() => Promise.resolve('OK')),
    on: jest.fn().mockReturnThis(),
    connect: jest.fn(() => Promise.resolve(undefined)),
    status: 'ready',
  };

  return {
    __esModule: true,
    default: jest.fn(() => mockRedisInstance),
    Redis: jest.fn(() => mockRedisInstance),
  };
});

jest.mock('minio', () => {
  const mockMinioClient = {
    putObject: jest.fn(() => Promise.resolve({ etag: 'test-etag' })),
    getObject: jest.fn(() => Promise.resolve({})),
    removeObject: jest.fn(() => Promise.resolve(undefined)),
    bucketExists: jest.fn(() => Promise.resolve(true)),
    makeBucket: jest.fn(() => Promise.resolve(undefined)),
    presignedGetObject: jest.fn(() => Promise.resolve('https://cdn.aineed.com/test/presigned-url')),
    presignedPutObject: jest.fn(() => Promise.resolve('https://cdn.aineed.com/test/upload-url')),
  };

  return {
    __esModule: true,
    Client: jest.fn(() => mockMinioClient),
  };
});

jest.mock('@qdrant/js-client-rest', () => ({
  __esModule: true,
  QdrantClient: jest.fn(() => ({
    search: jest.fn(() => Promise.resolve([])),
    upsert: jest.fn(() => Promise.resolve({ status: 'ok' })),
    getCollection: jest.fn(() => Promise.resolve({ status: 'green' })),
    createCollection: jest.fn(() => Promise.resolve({ status: 'ok' })),
    deleteCollection: jest.fn(() => Promise.resolve({ status: 'ok' })),
  })),
}));

jest.mock('neo4j-driver', () => {
  const mockSession = {
    run: jest.fn(() => Promise.resolve({ records: [] })),
    close: jest.fn(() => Promise.resolve(undefined)),
  };

  const mockDriver = {
    session: jest.fn(() => mockSession),
    close: jest.fn(() => Promise.resolve(undefined)),
    verifyConnectivity: jest.fn(() => Promise.resolve(undefined)),
  };

  return {
    __esModule: true,
    default: {
      driver: jest.fn(() => mockDriver),
      auth: {
        basic: jest.fn(() => ({})),
      },
    },
    driver: jest.fn(() => mockDriver),
    auth: {
      basic: jest.fn(() => ({})),
    },
  };
});

jest.mock('@elastic/elasticsearch', () => ({
  __esModule: true,
  Client: jest.fn(() => ({
    search: jest.fn(() => Promise.resolve({ hits: { hits: [], total: { value: 0 } } })),
    index: jest.fn(() => Promise.resolve({ result: 'created' })),
    update: jest.fn(() => Promise.resolve({ result: 'updated' })),
    delete: jest.fn(() => Promise.resolve({ result: 'deleted' })),
    bulk: jest.fn(() => Promise.resolve({ errors: false })),
    ping: jest.fn(() => Promise.resolve(true)),
    indices: {
      exists: jest.fn(() => Promise.resolve(true)),
      create: jest.fn(() => Promise.resolve({ acknowledged: true })),
    },
  })),
}));
