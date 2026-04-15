import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsObject,
  ValidateNested,
} from "class-validator";

// ==================== 枚举 ====================

export enum QuizQuestionType {
  VISUAL_CHOICE = "visual_choice",
  TEXT_CHOICE = "text_choice",
  SLIDER = "slider",
}

// ==================== 问卷 DTOs ====================

export class CreateStyleQuizDto {
  @ApiProperty({ description: "问卷标题", example: "发现你的风格" })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: "问卷描述", example: "通过10道题发现你的专属穿搭风格" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "封面图片URL", example: "https://example.com/cover.jpg" })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ description: "是否启用", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStyleQuizDto {
  @ApiPropertyOptional({ description: "问卷标题", example: "发现你的风格" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "问卷描述", example: "通过10道题发现你的专属穿搭风格" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "封面图片URL", example: "https://example.com/cover.jpg" })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ description: "是否启用", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==================== 题目 DTOs ====================

export class CreateQuizQuestionDto {
  @ApiProperty({ description: "所属问卷ID", example: "quiz-001" })
  @IsString()
  quizId!: string;

  @ApiProperty({ description: "题目内容", example: "你更喜欢哪种穿搭风格？" })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: "题目图片URL列表", example: ["https://example.com/q1.jpg"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiProperty({ description: "题目类型", example: "visual_choice", enum: QuizQuestionType })
  @IsEnum(QuizQuestionType)
  questionType!: QuizQuestionType;

  @ApiProperty({ description: "维度标识，如 color, style, occasion", example: "style" })
  @IsString()
  dimension!: string;

  @ApiProperty({ description: "排序序号", example: 0 })
  @IsNumber()
  @Min(0)
  sortOrder!: number;

  @ApiPropertyOptional({ description: "是否启用", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateQuizQuestionDto {
  @ApiPropertyOptional({ description: "题目内容", example: "你更喜欢哪种穿搭风格？" })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "题目图片URL列表", example: ["https://example.com/q1.jpg"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ description: "题目类型", example: "visual_choice", enum: QuizQuestionType })
  @IsOptional()
  @IsEnum(QuizQuestionType)
  questionType?: QuizQuestionType;

  @ApiPropertyOptional({ description: "维度标识", example: "style" })
  @IsOptional()
  @IsString()
  dimension?: string;

  @ApiPropertyOptional({ description: "排序序号", example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: "是否启用", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==================== 答案 DTOs ====================

export class SubmitQuizAnswerDto {
  @ApiProperty({ description: "题目ID", example: "question-001" })
  @IsString()
  questionId!: string;

  @ApiPropertyOptional({ description: "选择的图片索引", example: 0 })
  @IsOptional()
  @IsNumber()
  selectedImageIndex?: number;

  @ApiPropertyOptional({ description: "选择的选项文本", example: "简约风" })
  @IsOptional()
  @IsString()
  selectedOption?: string;

  @ApiPropertyOptional({ description: "滑块值", example: 75 })
  @IsOptional()
  @IsNumber()
  sliderValue?: number;

  @ApiPropertyOptional({ description: "响应时间（毫秒）", example: 2500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  responseTimeMs?: number;
}

export class BatchSubmitAnswersDto {
  @ApiProperty({ description: "问卷ID", example: "quiz-001" })
  @IsString()
  quizId!: string;

  @ApiProperty({ description: "答案列表", type: [SubmitQuizAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitQuizAnswerDto)
  answers!: SubmitQuizAnswerDto[];
}

// ==================== 结果 DTOs ====================

export class QuizResultQueryDto {
  @ApiPropertyOptional({ description: "问卷ID", example: "quiz-001" })
  @IsOptional()
  @IsString()
  quizId?: string;

  @ApiPropertyOptional({ description: "是否仅最新结果", example: true })
  @IsOptional()
  @IsBoolean()
  isLatest?: boolean;

  @ApiPropertyOptional({ description: "页码", example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

// ==================== 通用查询 DTOs ====================

export class StyleQuizQueryDto {
  @ApiPropertyOptional({ description: "是否仅启用的问卷", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "页码", example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class QuizQuestionQueryDto {
  @ApiPropertyOptional({ description: "维度筛选", example: "style" })
  @IsOptional()
  @IsString()
  dimension?: string;

  @ApiPropertyOptional({ description: "题目类型", example: "visual_choice", enum: QuizQuestionType })
  @IsOptional()
  @IsEnum(QuizQuestionType)
  questionType?: QuizQuestionType;

  @ApiPropertyOptional({ description: "是否仅启用的题目", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==================== 用户端测试流程 DTOs ====================

export class GetQuizQuestionsDto {
  @ApiProperty({ description: "问卷ID", example: "quiz-001" })
  @IsString()
  quizId!: string;
}

export class SaveAnswerDto {
  @ApiProperty({ description: "题目ID", example: "question-001" })
  @IsString()
  questionId!: string;

  @ApiProperty({ description: "选择的图片索引", example: 0 })
  @IsNumber()
  selectedImageIndex!: number;

  @ApiPropertyOptional({ description: "答题耗时（毫秒）", example: 3000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}

export class CompleteQuizDto {
  @ApiProperty({ description: "问卷ID", example: "quiz-001" })
  @IsString()
  quizId!: string;
}

export class QuizProgressDto {
  @ApiProperty({ description: "问卷ID", example: "quiz-001" })
  @IsString()
  quizId!: string;
}
