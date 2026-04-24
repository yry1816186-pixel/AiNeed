import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  MinLength,
  MaxLength,
} from "class-validator";

export enum DialogState {
  GREET = "GREET",
  CONTEXT = "CONTEXT",
  GENERATE = "GENERATE",
  REFINE = "REFINE",
  ACTION = "ACTION",
  WRAP = "WRAP",
}

export class DialogSlotDto {
  @ApiPropertyOptional({ description: "场合" })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ description: "体型" })
  @IsOptional()
  @IsString()
  bodyType?: string;

  @ApiPropertyOptional({ description: "风格偏好", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stylePreference?: string[];

  @ApiPropertyOptional({ description: "预算" })
  @IsOptional()
  budget?: { min: number; max: number };

  @ApiPropertyOptional({ description: "颜色偏好", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colorPreference?: string[];

  @ApiPropertyOptional({ description: "避免单品", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidItems?: string[];

  @ApiPropertyOptional({ description: "温度" })
  @IsOptional()
  @IsNumber()
  temperature?: number;
}

export class DialogContextDto {
  @ApiProperty({ enum: DialogState, description: "对话状态" })
  @IsEnum(DialogState)
  state: DialogState = DialogState.GREET;

  slots: DialogSlotDto = new DialogSlotDto();

  @ApiProperty({ description: "对话轮次" })
  turnCount: number = 0;

  @ApiPropertyOptional({ description: "生成的穿搭方案" })
  generatedOutfits?: any[];
}

export class DialogChatRequestDto {
  @ApiProperty({ description: "用户消息", minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @ApiProperty({ description: "会话ID" })
  @IsString()
  sessionId!: string;
}

export class DialogChatResponseDto {
  @ApiProperty({ description: "AI回复" })
  reply!: string;

  @ApiPropertyOptional({ description: "穿搭方案" })
  outfits?: any[];

  @ApiProperty({ description: "快速回复选项", type: [String] })
  quickReplies!: string[];

  @ApiProperty({ enum: DialogState, description: "当前对话状态" })
  state!: DialogState;

  slots!: DialogSlotDto;
}
