import { validate, EnvironmentVariables } from './env';

describe('EnvironmentVariables / validate', () => {
  const baseRequired = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'my-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    MINIO_ENDPOINT: 'localhost',
    MINIO_PORT: 9000,
    MINIO_ACCESS_KEY: 'access',
    MINIO_SECRET_KEY: 'secret',
    MINIO_BUCKET: 'bucket',
    ZHIPU_API_KEY: 'test-key',
  };

  // ---------------------------------------------------------------
  // Branch coverage: each required key missing / null / empty
  // ---------------------------------------------------------------
  const requiredKeys: (keyof EnvironmentVariables)[] = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'JWT_ACCESS_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN',
    'MINIO_ENDPOINT',
    'MINIO_PORT',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY',
    'MINIO_BUCKET',
  ];

  for (const key of requiredKeys) {
    describe(`required key: ${key}`, () => {
      it('throws when undefined', () => {
        const config = { ...baseRequired };
        delete config[key];
        expect(() => validate(config)).toThrow(
          `Missing required environment variable: ${key}`,
        );
      });

      it('throws when null', () => {
        const config = { ...baseRequired, [key]: null };
        expect(() => validate(config)).toThrow(
          `Missing required environment variable: ${key}`,
        );
      });

      it('throws when empty string', () => {
        const config = { ...baseRequired, [key]: '' };
        expect(() => validate(config)).toThrow(
          `Missing required environment variable: ${key}`,
        );
      });
    });
  }

  // ---------------------------------------------------------------
  // Happy path: all required present
  // ---------------------------------------------------------------
  it('returns valid config when all required keys are present', () => {
    const result = validate(baseRequired);
    expect(result).toBeInstanceOf(EnvironmentVariables);
    expect(result.DATABASE_URL).toBe(baseRequired.DATABASE_URL);
    expect(result.REDIS_URL).toBe(baseRequired.REDIS_URL);
    expect(result.JWT_SECRET).toBe(baseRequired.JWT_SECRET);
    expect(result.MINIO_PORT).toBe(9000);
  });

  // ---------------------------------------------------------------
  // Branch coverage: optional keys assigned when present
  // ---------------------------------------------------------------
  it('assigns optional keys when provided', () => {
    const config = {
      ...baseRequired,
      ZHIPU_API_KEY: 'zhipu-key',
      ZHIPU_MODEL: 'glm-4',
      DEEPSEEK_API_KEY: 'deepseek-key',
      SMS_PROVIDER: 'aliyun',
      ALIYUN_SMS_ACCESS_KEY: 'sms-ak',
      ALIYUN_SMS_SECRET_KEY: 'sms-sk',
      ALIYUN_SMS_SIGN_NAME: 'sign',
      ALIYUN_SMS_TEMPLATE_CODE: 'tpl',
      QDRANT_URL: 'http://qdrant:6333',
      EMBEDDING_SERVICE_URL: 'http://embed:8003',
      EMBEDDING_MODEL: 'bge-large',
      NEO4J_URL: 'bolt://neo4j:7687',
      NEO4J_USER: 'neo4j',
      NEO4J_PASSWORD: 'pass',
      ELASTICSEARCH_URL: 'http://es:9200',
    };

    const result = validate(config);
    expect(result.ZHIPU_API_KEY).toBe('zhipu-key');
    expect(result.ZHIPU_MODEL).toBe('glm-4');
    expect(result.DEEPSEEK_API_KEY).toBe('deepseek-key');
    expect(result.SMS_PROVIDER).toBe('aliyun');
    expect(result.ALIYUN_SMS_ACCESS_KEY).toBe('sms-ak');
    expect(result.ALIYUN_SMS_SECRET_KEY).toBe('sms-sk');
    expect(result.ALIYUN_SMS_SIGN_NAME).toBe('sign');
    expect(result.ALIYUN_SMS_TEMPLATE_CODE).toBe('tpl');
    expect(result.QDRANT_URL).toBe('http://qdrant:6333');
    expect(result.EMBEDDING_SERVICE_URL).toBe('http://embed:8003');
    expect(result.EMBEDDING_MODEL).toBe('bge-large');
    expect(result.NEO4J_URL).toBe('bolt://neo4j:7687');
    expect(result.NEO4J_USER).toBe('neo4j');
    expect(result.NEO4J_PASSWORD).toBe('pass');
    expect(result.ELASTICSEARCH_URL).toBe('http://es:9200');
  });

  // ---------------------------------------------------------------
  // Branch coverage: optional keys skipped when null/undefined
  // ---------------------------------------------------------------
  it('skips optional keys when null', () => {
    const config = { ...baseRequired, ZHIPU_API_KEY: null };
    const result = validate(config);
    expect(result.ZHIPU_API_KEY).toBeUndefined();
  });

  it('skips optional keys when undefined', () => {
    const config = { ...baseRequired, ZHIPU_MODEL: undefined };
    const result = validate(config);
    expect(result.ZHIPU_MODEL).toBeUndefined();
  });

  // ---------------------------------------------------------------
  // Branch coverage: defaults applied when value is falsy / missing
  // ---------------------------------------------------------------
  it('applies APP_PORT default when missing', () => {
    const result = validate(baseRequired);
    expect(result.APP_PORT).toBe(3001);
  });

  it('applies APP_PORT default when value is non-numeric', () => {
    const result = validate({ ...baseRequired, APP_PORT: 'abc' });
    expect(result.APP_PORT).toBe(3001);
  });

  it('uses provided APP_PORT when numeric string', () => {
    const result = validate({ ...baseRequired, APP_PORT: 4000 });
    expect(result.APP_PORT).toBe(4000);
  });

  it('applies APP_ENV default when missing', () => {
    const result = validate(baseRequired);
    expect(result.APP_ENV).toBe('development');
  });

  it('uses provided APP_ENV', () => {
    const result = validate({
      ...baseRequired,
      JWT_SECRET: 'a-very-long-and-secure-secret-key-for-production-use-at-least-32-chars',
      APP_ENV: 'production',
    });
    expect(result.APP_ENV).toBe('production');
  });

  it('applies CORS_ORIGIN default when missing', () => {
    const result = validate(baseRequired);
    expect(result.CORS_ORIGIN).toBe('http://localhost:3000');
  });

  it('uses provided CORS_ORIGIN', () => {
    const result = validate({ ...baseRequired, CORS_ORIGIN: 'https://example.com' });
    expect(result.CORS_ORIGIN).toBe('https://example.com');
  });

  it('applies RATE_LIMIT_TTL default when missing', () => {
    const result = validate(baseRequired);
    expect(result.RATE_LIMIT_TTL).toBe(60);
  });

  it('applies RATE_LIMIT_TTL default when non-numeric', () => {
    const result = validate({ ...baseRequired, RATE_LIMIT_TTL: 'bad' });
    expect(result.RATE_LIMIT_TTL).toBe(60);
  });

  it('uses provided RATE_LIMIT_TTL', () => {
    const result = validate({ ...baseRequired, RATE_LIMIT_TTL: 120 });
    expect(result.RATE_LIMIT_TTL).toBe(120);
  });

  it('applies RATE_LIMIT_MAX default when missing', () => {
    const result = validate(baseRequired);
    expect(result.RATE_LIMIT_MAX).toBe(100);
  });

  it('applies RATE_LIMIT_MAX default when non-numeric', () => {
    const result = validate({ ...baseRequired, RATE_LIMIT_MAX: 'bad' });
    expect(result.RATE_LIMIT_MAX).toBe(100);
  });

  it('uses provided RATE_LIMIT_MAX', () => {
    const result = validate({ ...baseRequired, RATE_LIMIT_MAX: 200 });
    expect(result.RATE_LIMIT_MAX).toBe(200);
  });

  it('applies QDRANT_URL default when missing', () => {
    const result = validate(baseRequired);
    expect(result.QDRANT_URL).toBe('http://localhost:6333');
  });

  it('uses provided QDRANT_URL', () => {
    const result = validate({ ...baseRequired, QDRANT_URL: 'http://qdrant:6333' });
    expect(result.QDRANT_URL).toBe('http://qdrant:6333');
  });

  it('applies EMBEDDING_SERVICE_URL default when missing', () => {
    const result = validate(baseRequired);
    expect(result.EMBEDDING_SERVICE_URL).toBe('http://localhost:8003');
  });

  it('uses provided EMBEDDING_SERVICE_URL', () => {
    const result = validate({ ...baseRequired, EMBEDDING_SERVICE_URL: 'http://custom:9999' });
    expect(result.EMBEDDING_SERVICE_URL).toBe('http://custom:9999');
  });

  it('applies EMBEDDING_MODEL default when missing', () => {
    const result = validate(baseRequired);
    expect(result.EMBEDDING_MODEL).toBe('bge-m3');
  });

  it('uses provided EMBEDDING_MODEL', () => {
    const result = validate({ ...baseRequired, EMBEDDING_MODEL: 'bge-large' });
    expect(result.EMBEDDING_MODEL).toBe('bge-large');
  });
});
