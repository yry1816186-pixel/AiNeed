import {
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../http-exception.filter';

function createMockArgumentsHost(_statusCode: number) {
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const mockRequest = {};

  return {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
    _mockResponse: mockResponse,
  };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with string response', () => {
      const host = createMockArgumentsHost(500);
      const exception = new HttpException('Custom error message', HttpStatus.BAD_GATEWAY);

      filter.catch(exception, host as never);

      expect(host._mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          data: null,
          error: expect.objectContaining({
            message: 'Custom error message',
          }),
        }),
      );
    });

    it('should handle HttpException with object response containing message string', () => {
      const host = createMockArgumentsHost(500);
      const exception = new HttpException(
        { message: 'Object error message', error: 'Some Error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(exception, host as never);

      expect(host._mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Object error message',
          }),
        }),
      );
    });

    it('should handle HttpException with array messages joined by semicolons', () => {
      const host = createMockArgumentsHost(500);
      const exception = new HttpException(
        { message: ['Field A is required', 'Field B is invalid'], error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host as never);

      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Field A is required; Field B is invalid',
          }),
        }),
      );
    });
  });

  describe('Status code to error code mapping', () => {
    it('should map 400 to VALIDATION_ERROR', () => {
      const host = createMockArgumentsHost(400);
      const exception = new BadRequestException('Bad input');

      filter.catch(exception, host as never);

      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
        }),
      );
    });

    it('should map 401 to AUTH_INVALID_TOKEN', () => {
      const host = createMockArgumentsHost(401);
      const exception = new UnauthorizedException('No auth');

      filter.catch(exception, host as never);

      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'AUTH_INVALID_TOKEN' }),
        }),
      );
    });

    it('should map 403 to FORBIDDEN', () => {
      const host = createMockArgumentsHost(403);
      const exception = new ForbiddenException('Access denied');

      filter.catch(exception, host as never);

      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'FORBIDDEN' }),
        }),
      );
    });

    it('should map 404 to NOT_FOUND', () => {
      const host = createMockArgumentsHost(404);
      const exception = new NotFoundException('Not found');

      filter.catch(exception, host as never);

      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'NOT_FOUND' }),
        }),
      );
    });

    it('should use default code for unmapped status codes', () => {
      const host = createMockArgumentsHost(500);
      const exception = new HttpException('Server error', HttpStatus.CONFLICT);

      filter.catch(exception, host as never);

      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: expect.not.stringMatching('VALIDATION_ERROR'),
          }),
        }),
      );
    });
  });

  describe('Non-HttpException errors', () => {
    it('should handle generic Error with 500 status', () => {
      const host = createMockArgumentsHost(500);
      const error = new Error('Something went wrong');

      filter.catch(error, host as never);

      expect(host._mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          }),
        }),
      );
    });

    it('should handle unknown non-Error exceptions', () => {
      const host = createMockArgumentsHost(500);

      filter.catch('string exception', host as never);

      expect(host._mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          }),
        }),
      );
    });

    it('should handle null exception', () => {
      const host = createMockArgumentsHost(500);

      filter.catch(null, host as never);

      expect(host._mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
          }),
        }),
      );
    });

    it('should handle undefined exception', () => {
      const host = createMockArgumentsHost(500);

      filter.catch(undefined, host as never);

      expect(host._mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should handle numeric exception', () => {
      const host = createMockArgumentsHost(500);

      filter.catch(42, host as never);

      expect(host._mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('Response format', () => {
    it('should always return success: false', () => {
      const host = createMockArgumentsHost(500);
      const exception = new NotFoundException('Missing');

      filter.catch(exception, host as never);

      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it('should always return data: null', () => {
      const host = createMockArgumentsHost(500);
      const exception = new BadRequestException('Invalid');

      filter.catch(exception, host as never);

      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: null }),
      );
    });

    it('should include error with code and message', () => {
      const host = createMockArgumentsHost(500);
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, host as never);

      const call = host._mockResponse.json.mock.calls[0][0];
      expect(call.error).toHaveProperty('code');
      expect(call.error).toHaveProperty('message');
    });
  });

  describe('Edge cases', () => {
    it('should handle object response without message field', () => {
      const host = createMockArgumentsHost(500);
      const exception = new HttpException(
        { error: 'Conflict' } as never,
        HttpStatus.CONFLICT,
      );

      filter.catch(exception, host as never);

      // When response has no 'message' key, falls back to exception.message
      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Http Exception',
            code: 'CONFLICT',
          }),
        }),
      );
    });

    it('should uppercase and underscore error name from response', () => {
      const host = createMockArgumentsHost(500);
      const exception = new HttpException(
        { message: 'test', error: 'some error name' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(exception, host as never);

      expect(host._mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SOME_ERROR_NAME',
          }),
        }),
      );
    });
  });
});
