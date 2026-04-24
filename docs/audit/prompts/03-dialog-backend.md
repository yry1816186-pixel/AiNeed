# 轨道 3: 后端对话状态机 NestJS 实现

你是 XUNO 项目的后端工程师。你的任务是在 NestJS 侧实现 AI Stylist 的对话状态机，使 NestJS 能正确管理对话状态并调用 ML Python 服务。

## 当前状态

NestJS 侧 `apps/backend/src/domains/ai-core/ai-stylist/` 下有 12 个文件，其中 `context.service.ts` 有状态机雏形但未完成。Python 侧的对话引擎（轨道 8）正在独立实现。

## 目标

NestJS 侧实现：

1. 对话状态管理（Redis 存储）
2. Slot 提取调用（调用 ML Python API）
3. 快速回复选项生成
4. 对话历史管理

## 具体修改

### 1. 对话状态 DTO

文件: `apps/backend/src/domains/ai-core/ai-stylist/dto/dialog.dto.ts`

```typescript
export enum DialogState {
  GREET = "GREET",
  CONTEXT = "CONTEXT",
  GENERATE = "GENERATE",
  REFINE = "REFINE",
  ACTION = "ACTION",
  WRAP = "WRAP",
}

export class DialogSlotDto {
  occasion?: string;
  bodyType?: string;
  stylePreference?: string[];
  budget?: { min: number; max: number };
  colorPreference?: string[];
  avoidItems?: string[];
  temperature?: number;
}

export class DialogContextDto {
  state: DialogState = DialogState.GREET;
  slots: DialogSlotDto = new DialogSlotDto();
  turnCount: number = 0;
  generatedOutfits?: any[];
}

export class ChatRequestDto {
  message: string;
  sessionId: string;
}

export class ChatResponseDto {
  reply: string;
  outfits?: any[];
  quickReplies: string[];
  state: DialogState;
  slots: DialogSlotDto;
}
```

### 2. 对话状态管理 Service

文件: `apps/backend/src/domains/ai-core/ai-stylist/dialog-state.service.ts`

```typescript
@Injectable()
export class DialogStateService {
  constructor(@Inject("REDIS") private redis: Redis) {}

  async getContext(sessionId: string): Promise<DialogContextDto> {
    const data = await this.redis.get(`dialog:${sessionId}`);
    if (data) return JSON.parse(data);
    return new DialogContextDto();
  }

  async saveContext(sessionId: string, context: DialogContextDto): Promise<void> {
    await this.redis.setex(`dialog:${sessionId}`, 1800, JSON.stringify(context)); // 30min TTL
  }

  async clearContext(sessionId: string): Promise<void> {
    await this.redis.del(`dialog:${sessionId}`);
  }
}
```

### 3. AI Stylist Service

文件: `apps/backend/src/domains/ai-core/ai-stylist/ai-stylist.service.ts`

核心方法：

```typescript
async chat(request: ChatRequestDto, userId: string): Promise<ChatResponseDto> {
  // 1. 获取对话上下文
  const context = await this.dialogState.getContext(request.sessionId);

  // 2. 调用ML Python API处理消息
  const mlResponse = await this.mlClient.post('/stylist/chat', {
    message: request.message,
    context: context,
    user_id: userId,
  });

  // 3. 更新对话上下文
  const updatedContext = mlResponse.data.context;
  await this.dialogState.saveContext(request.sessionId, updatedContext);

  // 4. 返回结构化响应
  return {
    reply: mlResponse.data.reply,
    outfits: mlResponse.data.outfits,
    quickReplies: mlResponse.data.quick_replies,
    state: mlResponse.data.state,
    slots: mlResponse.data.slots,
  };
}
```

### 4. Controller

```typescript
@Controller("ai-stylist")
export class AiStylistController {
  @Post("chat")
  async chat(@Body() dto: ChatRequestDto, @CurrentUser() user: User) {
    return this.stylistService.chat(dto, user.id);
  }

  @Post("session")
  async createSession(@CurrentUser() user: User) {
    const sessionId = uuid();
    return { sessionId };
  }

  @Delete("session/:id")
  async endSession(@Param("id") sessionId: string) {
    await this.dialogState.clearContext(sessionId);
  }
}
```

### 5. 体正面措辞过滤器

```typescript
const BODY_POSITIVE_FILTERS = {
  遮住粗腿: "A字裙的版型很衬你的比例",
  遮住肚子: "高腰设计的剪裁让整体线条更流畅",
  显瘦: "利落的剪裁让整体线条更流畅",
  遮肉: "宽松版型让穿着更舒适自在",
  胖: "丰满",
  粗: "有力量感",
};

@Injectable()
export class BodyPositiveFilter {
  filter(text: string): string {
    let result = text;
    for (const [negative, positive] of Object.entries(BODY_POSITIVE_FILTERS)) {
      result = result.replace(new RegExp(negative, "g"), positive);
    }
    return result;
  }
}
```

## 接口契约

与轨道 8（ML 对话状态机）的接口：

- NestJS 调用 `POST http://ml-service:8001/stylist/chat`
- 请求: `{ message, context: DialogContextDto, user_id }`
- 响应: `{ reply, outfits?, quick_replies, state, slots }`

与轨道 5（移动端）的接口：

- 移动端调用 `POST /api/ai-stylist/chat`
- 请求: `{ message, sessionId }`
- 响应: ChatResponseDto

## 验收标准

1. `POST /api/ai-stylist/session` 创建新对话 session
2. `POST /api/ai-stylist/chat` 返回结构化响应（reply + quickReplies + state + slots）
3. 多轮对话的 session 状态在 Redis 中保持
4. 输出经过体正面过滤器处理
5. `npx tsc --noEmit` 0 错误
