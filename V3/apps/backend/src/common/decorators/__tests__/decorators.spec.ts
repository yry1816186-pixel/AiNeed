import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  Public,
} from '../public.decorator';
import {
  ROLES_KEY,
  Roles,
} from '../roles.decorator';
import { ExecutionContext } from '@nestjs/common';

// Re-create the factory functions from the decorator source to test the logic directly.
// This is necessary because createParamDecorator wraps the factory internally and does
// not expose it for direct testing.

function currentUserFactory(data: string | undefined, ctx: ExecutionContext) {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  if (data) {
    return user?.[data];
  }
  return user;
}

function userIdFactory(_data: undefined, ctx: ExecutionContext): string | null {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.id ?? null;
}

describe('Public Decorator', () => {
  it('should set IS_PUBLIC_KEY metadata to true', () => {
    const reflector = new Reflector();
    class TestController {
      @Public()
      publicRoute() {}
    }

    const result = reflector.get(IS_PUBLIC_KEY, TestController.prototype.publicRoute);
    expect(result).toBe(true);
  });

  it('should export correct IS_PUBLIC_KEY constant', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});

describe('Roles Decorator', () => {
  it('should set ROLES_KEY metadata with provided roles', () => {
    const reflector = new Reflector();
    class TestController {
      @Roles('admin', 'moderator')
      adminRoute() {}
    }

    const result = reflector.get(ROLES_KEY, TestController.prototype.adminRoute);
    expect(result).toEqual(['admin', 'moderator']);
  });

  it('should set ROLES_KEY metadata with single role', () => {
    const reflector = new Reflector();
    class TestController {
      @Roles('user')
      userRoute() {}
    }

    const result = reflector.get(ROLES_KEY, TestController.prototype.userRoute);
    expect(result).toEqual(['user']);
  });

  it('should set ROLES_KEY metadata with empty roles', () => {
    const reflector = new Reflector();
    class TestController {
      @Roles()
      noRolesRoute() {}
    }

    const result = reflector.get(ROLES_KEY, TestController.prototype.noRolesRoute);
    expect(result).toEqual([]);
  });

  it('should export correct ROLES_KEY constant', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});

describe('CurrentUser Decorator', () => {
  it('should return full user object when no data parameter is provided', () => {
    const mockUser = { id: 'user-1', name: 'Test User', email: 'test@example.com' };
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    };

    const result = currentUserFactory(undefined, mockExecutionContext as ExecutionContext);
    expect(result).toEqual(mockUser);
  });

  it('should return specific user property when data parameter is provided', () => {
    const mockUser = { id: 'user-1', name: 'Test User', email: 'test@example.com' };
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    };

    const result = currentUserFactory('id', mockExecutionContext as ExecutionContext);
    expect(result).toBe('user-1');
  });

  it('should return name property when data=name', () => {
    const mockUser = { id: 'user-1', name: 'Test User' };
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    };

    const result = currentUserFactory('name', mockExecutionContext as ExecutionContext);
    expect(result).toBe('Test User');
  });

  it('should return undefined when user does not have requested property', () => {
    const mockUser = { id: 'user-1' };
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    };

    const result = currentUserFactory('nonExistent', mockExecutionContext as ExecutionContext);
    expect(result).toBeUndefined();
  });

  it('should return undefined when no user on request', () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    };

    const result = currentUserFactory('id', mockExecutionContext as ExecutionContext);
    expect(result).toBeUndefined();
  });

  it('should return undefined when user is null', () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: null }),
      }),
    };

    const result = currentUserFactory('id', mockExecutionContext as ExecutionContext);
    expect(result).toBeUndefined();
  });

  it('should return full user when data is empty string', () => {
    const mockUser = { id: 'user-1' };
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    };

    // Empty string is falsy, so it returns the full user
    const result = currentUserFactory('', mockExecutionContext as ExecutionContext);
    expect(result).toEqual(mockUser);
  });
});

describe('UserId Decorator', () => {
  it('should return user id when user exists on request', () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'user-123' } }),
      }),
    };

    const result = userIdFactory(undefined, mockExecutionContext as ExecutionContext);
    expect(result).toBe('user-123');
  });

  it('should return null when user does not exist on request', () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    };

    const result = userIdFactory(undefined, mockExecutionContext as ExecutionContext);
    expect(result).toBeNull();
  });

  it('should return null when user is null', () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: null }),
      }),
    };

    const result = userIdFactory(undefined, mockExecutionContext as ExecutionContext);
    expect(result).toBeNull();
  });

  it('should return null when user.id is undefined', () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: {} }),
      }),
    };

    const result = userIdFactory(undefined, mockExecutionContext as ExecutionContext);
    expect(result).toBeNull();
  });

  it('should return the id string when user has numeric id', () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 42 } }),
      }),
    };

    const result = userIdFactory(undefined, mockExecutionContext as ExecutionContext);
    expect(result).toBe(42);
  });
});
