import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

import { JwtAuthGuard } from "./jwt-auth.guard";

/**
 * JwtAuthGuard 测试
 *
 * 注意：JwtAuthGuard 继承自 AuthGuard('jwt')，其 canActivate 方法
 * 在非公开端点时会调用 super.canActivate()，这需要 Passport 注册 JWT 策略。
 * 在单元测试中，我们无法注册完整的 Passport 策略，因此：
 * - 公开端点测试：直接测试 guard.canActivate()，因为公开端点会短路返回 true
 * - 受保护端点测试：通过 spy 验证 super.canActivate() 被调用，但不实际执行
 */
describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;

    guard = new JwtAuthGuard(reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createMockExecutionContext = (): ExecutionContext => {
    const mockRequest = {
      headers: { authorization: "Bearer test-token" },
    };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe("canActivate - 公开端点", () => {
    it("should allow access for public endpoints (returns true)", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      const context = createMockExecutionContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should check IS_PUBLIC_KEY metadata via reflector", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      const context = createMockExecutionContext();
      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it("should return true when handler is marked as public", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      const context = createMockExecutionContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return true when class is marked as public", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      const context = createMockExecutionContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should short-circuit and not call super.canActivate for public endpoints", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      const context = createMockExecutionContext();
      // Mock super.canActivate to track if it's called
      const superCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        "canActivate",
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivateSpy).not.toHaveBeenCalled();
    });
  });

  describe("canActivate - 受保护端点", () => {
    it("should call super.canActivate for non-public endpoints", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

      const context = createMockExecutionContext();

      // Mock super.canActivate to avoid the "Unknown authentication strategy" error
      const superCanActivateSpy = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        "canActivate",
      ).mockReturnValue(true as unknown as Observable<boolean>);

      const _result = guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);
    });

    it("should not short-circuit for non-public endpoints", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

      const context = createMockExecutionContext();

      // Mock super.canActivate
      jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        "canActivate",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).mockReturnValue(true as any);

      const result = guard.canActivate(context);

      // Result comes from super.canActivate, not from the public endpoint shortcut
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it("should pass through the result from super.canActivate", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

      const context = createMockExecutionContext();

      // Mock super.canActivate to return false (denied access)
      jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        "canActivate",
      ).mockReturnValue(false as unknown as Observable<boolean>);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe("guard construction", () => {
    it("should be an instance of JwtAuthGuard", () => {
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });

    it("should have Reflector injected", () => {
      expect(guard["reflector"]).toBeDefined();
      expect(guard["reflector"]).toBe(reflector);
    });
  });
});
