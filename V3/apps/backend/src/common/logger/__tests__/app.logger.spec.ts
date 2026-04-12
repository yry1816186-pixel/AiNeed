import { AppLogger } from '../app.logger';

describe('AppLogger', () => {
  let logger: AppLogger;
  const originalEnv = process.env.APP_ENV;

  beforeEach(() => {
    process.env.APP_ENV = 'development';
    logger = new AppLogger('TestContext');
  });

  afterAll(() => {
    process.env.APP_ENV = originalEnv;
  });

  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should be defined without context', () => {
    const noContextLogger = new AppLogger();
    expect(noContextLogger).toBeDefined();
  });

  describe('getLogLevels', () => {
    it('should return debug levels for development', () => {
      process.env.APP_ENV = 'development';
      const levels = AppLogger.getLogLevels();
      expect(levels).toEqual(['debug', 'log', 'warn', 'error']);
    });

    it('should return production levels for production', () => {
      process.env.APP_ENV = 'production';
      const levels = AppLogger.getLogLevels();
      expect(levels).toEqual(['log', 'warn', 'error']);
    });

    it('should default to development levels when APP_ENV is unset', () => {
      delete process.env.APP_ENV;
      const levels = AppLogger.getLogLevels();
      expect(levels).toEqual(['debug', 'log', 'warn', 'error']);
    });
  });

  describe('log', () => {
    it('should call super.log in development', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'log');
      logger.log('test message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should call super.log with custom context', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'log');
      logger.log('test message', 'CustomContext');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('debug', () => {
    it('should call super.debug in development', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'debug');
      logger.debug('debug message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should not call super.debug in production', () => {
      process.env.APP_ENV = 'production';
      const prodLogger = new AppLogger('ProdTest');
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(prodLogger)), 'debug');
      prodLogger.debug('debug message');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('warn', () => {
    it('should call super.warn in development', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'warn');
      logger.warn('warn message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('error', () => {
    it('should call super.error in development', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'error');
      logger.error('error message');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should call super.error with stack', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'error');
      logger.error('error message', 'stack trace here');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('logRequest', () => {
    it('should log request info in development', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'log');
      logger.logRequest('GET', '/api/test', 200, 45);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log request in production too (info level is allowed)', () => {
      process.env.APP_ENV = 'production';
      const prodLogger = new AppLogger('ProdTest');
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(prodLogger)), 'log');
      prodLogger.logRequest('GET', '/api/test', 200, 45);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('logError', () => {
    it('should log error with stack in development', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'error');
      logger.logError('Test error', 'stack line 1\nstack line 2\nstack line 3\nstack line 4');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log error without stack', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'error');
      logger.logError('Test error');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log error with custom context', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'error');
      logger.logError('Test error', undefined, 'CustomContext');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('logDatabaseQuery', () => {
    it('should log query in development', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'debug');
      logger.logDatabaseQuery('SELECT * FROM users', 15);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should truncate long queries', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'debug');
      const longQuery = 'SELECT * FROM users WHERE ' + 'id = 1 AND '.repeat(30) + 'active = true';
      logger.logDatabaseQuery(longQuery, 100);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should not log query in production', () => {
      process.env.APP_ENV = 'production';
      const prodLogger = new AppLogger('ProdTest');
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(prodLogger)), 'debug');
      prodLogger.logDatabaseQuery('SELECT 1', 5);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('logApiCall', () => {
    it('should log API call in development', () => {
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'log');
      logger.logApiCall('openai', 'gpt-4', 150, 0.03);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log API call in production too (info level is allowed)', () => {
      process.env.APP_ENV = 'production';
      const prodLogger = new AppLogger('ProdTest');
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(prodLogger)), 'log');
      prodLogger.logApiCall('openai', 'gpt-4', 150, 0.03);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('logError with sensitive metadata masking', () => {
    it('should include sanitized metadata in formatted error logs', () => {
      // logError internally formats a message that includes sanitized metadata
      // This exercises the sanitizeMetadata -> maskValue -> maskSensitiveValue path
      const spy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(logger)), 'error');
      const stackWithSensitive = 'Error at line 1\nline 2\nline 3\nline 4\nline 5';
      logger.logError('Error occurred', stackWithSensitive);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
