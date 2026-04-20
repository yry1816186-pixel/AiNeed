# 任务13: 登录失败锁定 + 图像清洗器修复

## 你的角色

寻裳(AiNeed)项目的安全工程师。项目位于 C:\AiNeed，NestJS后端。

## 背景

安全审计发现：

1. 无登录失败锁定机制——存在暴力破解风险
2. SMS验证码使用Math.random()——不具备密码学安全性
3. 图像清洗器(image-sanitizer)是空操作——缺少EXIF GPS数据移除

## 必读文件

1. `apps/backend/src/domains/auth/auth.service.ts` — 找到登录逻辑
2. `apps/backend/src/common/` — 找到image-sanitizer和验证码相关文件
3. 用Grep搜索 `Math.random` 找到SMS验证码生成代码

## 任务

### 1. 登录失败锁定机制

在 auth.service.ts 的登录方法中添加锁定逻辑：

```typescript
// 常量
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

async login(dto: LoginDto, ip: string): Promise<LoginResponse> {
  // 检查锁定状态
  const lockKey = `auth:lock:${dto.email}`;
  const lockData = await this.redis.get(lockKey);
  if (lockData) {
    const { lockedUntil } = JSON.parse(lockData);
    if (Date.now() < lockedUntil) {
      const remainingMinutes = Math.ceil((lockedUntil - Date.now()) / 60000);
      throw new UnauthorizedException(
        `账户已锁定，请${remainingMinutes}分钟后再试`
      );
    }
    // 锁定已过期，清除
    await this.redis.del(lockKey);
  }

  // 验证密码
  const user = await this.findUserByEmail(dto.email);
  if (!user || !(await this.passwordService.verify(dto.password, user.password))) {
    // 记录失败次数
    const failKey = `auth:failed:${dto.email}`;
    const failCount = await this.redis.incr(failKey);
    await this.redis.expire(failKey, LOCK_DURATION_MINUTES * 60);

    if (failCount >= MAX_FAILED_ATTEMPTS) {
      // 锁定账户
      await this.redis.set(
        lockKey,
        JSON.stringify({ lockedUntil: Date.now() + LOCK_DURATION_MINUTES * 60000 }),
        'EX',
        LOCK_DURATION_MINUTES * 60
      );
      throw new UnauthorizedException(
        `连续${MAX_FAILED_ATTEMPTS}次登录失败，账户已锁定${LOCK_DURATION_MINUTES}分钟`
      );
    }

    throw new UnauthorizedException(
      `邮箱或密码错误（还有${MAX_FAILED_ATTEMPTS - failCount}次机会）`
    );
  }

  // 登录成功，清除失败记录
  await this.redis.del(`auth:failed:${dto.email}`);

  // ... 后续登录逻辑
}
```

### 2. 修复SMS验证码生成

用Grep搜索 `Math.random` 和 `Math.floor` 的验证码生成代码，替换为密码学安全随机数：

```typescript
import * as crypto from "crypto";

// 旧代码（找到并替换）
// const code = Math.floor(100000 + Math.random() * 900000);

// 新代码
function generateSecureSmsCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}
```

### 3. 修复图像清洗器

找到 image-sanitizer 文件（应该在 `apps/backend/src/common/` 附近），当前 sanitizeImage 方法是空操作。

实现真正的EXIF清洗：

```typescript
import * as sharp from "sharp";

async function sanitizeImage(inputBuffer: Buffer): Promise<Buffer> {
  // 使用sharp重新编码，自动移除所有EXIF数据（包括GPS、缩略图、ICC profile中的敏感信息）
  return sharp(inputBuffer)
    .rotate() // 自动根据EXIF方向旋转，然后移除EXIF
    .jpeg({ quality: 95 }) // 重新编码为JPEG，不含EXIF
    .toBuffer();
}

async function stripExifFromBuffer(buffer: Buffer): Promise<Buffer> {
  return sanitizeImage(buffer);
}
```

如果项目没有安装 `sharp`，用 `npm list sharp` 或 `grep sharp package.json` 检查。如果没有，用替代方案：

```typescript
// 替代方案：使用原生方法（适用于小文件）
// 通过重新编码Canvas来移除EXIF（在Node.js中需要canvas库）
// 最简方案：直接重新编码

import { createCanvas, loadImage } from "canvas";

async function sanitizeImage(inputBuffer: Buffer): Promise<Buffer> {
  const image = await loadImage(inputBuffer);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  // canvas.toBuffer 不包含EXIF数据
  return canvas.toBuffer("image/jpeg", { quality: 0.95 });
}
```

或者如果两种方案都不可行，在package.json中添加sharp依赖：

```bash
cd apps/backend && pnpm add sharp
```

### 4. CSRF Session ID修复（可选）

找到 `csrf.guard.ts`，确认 Session ID 是否使用 userId。如果是，改为会话级唯一标识：

```typescript
// 旧
// const sessionId = user.id;

// 新
const sessionId = crypto.randomUUID();
```

## 验证标准

- [ ] 连续5次错误密码后账户锁定15分钟
- [ ] 锁定期间登录返回锁定提示和剩余时间
- [ ] 登录成功后清除失败记录
- [ ] SMS验证码使用 crypto.randomInt 生成
- [ ] 图像清洗器真正移除EXIF数据（不是空操作）
- [ ] 全局搜索无 `Math.random()` 用于安全相关代码
